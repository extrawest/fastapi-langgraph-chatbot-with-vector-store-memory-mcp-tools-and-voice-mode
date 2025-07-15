import operator
from typing import Annotated, TypedDict, Literal, Sequence, List, Required, Optional, Dict

from langchain_core.messages import BaseMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph, START
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import create_react_agent
from pydantic import BaseModel

from app.core.config import settings
from app.mcp_client.client import get_mcp_client
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class MCPToolSetup:
    def __init__(self, client_name: Literal["Researcher", "Scrapper"], tools):
        self.client_name = client_name
        self.tools = tools


class MCPConfig(TypedDict):
    client_name: Required[Literal["Researcher", "Scrapper"]]
    server_url: Required[str]


class MCPTools:
    def __init__(self, mcp_configs: List[MCPConfig]):
        self.mcp_configs = mcp_configs or []
        self.tools = []
        self.mcp_clients = []

    async def setup_mcp_tools(self) -> List[MCPToolSetup]:
        setups = []
        all_tools = []

        for config in self.mcp_configs:
            client_name = config.get("client_name")
            server_url = config.get("server_url")

            logger.info(f"Creating MCP client {client_name} connecting to server at {server_url}")

            client, tools = await get_mcp_client(server_url, client_name)

            if client:
                self.mcp_clients.append(client)

                if tools:
                    logger.info(f"Loaded {len(tools)} tools from {server_url}")
                    all_tools.extend(tools)
                    setups.append(MCPToolSetup(tools=tools, client_name=client_name))
                else:
                    logger.warning(f"No tools were loaded from {server_url}")
            else:
                logger.warning(f"Could not establish connection to {server_url}")

        if all_tools:
            self.tools = all_tools
            logger.info(f"MCP client created successfully with {len(all_tools)} tools")
        else:
            logger.error("No tools were loaded from any server, agent cannot be created")

        return setups

    async def cleanup(self) -> None:
        clients_to_close = list(reversed(self.mcp_clients))
        for client in clients_to_close:
            if client:
                try:
                    await client.close()
                except Exception as e:
                    logger.error(f"Error closing client: {str(e)}")

        logger.info(f"Closed {len(self.mcp_clients)} MCP client connections")
        self.mcp_clients = []


_graph: CompiledStateGraph | None = None
_mcp_tools: MCPTools | None = None


class AgentState(TypedDict):
    """State for the multi-agent system."""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next: str
    task_completed: bool
    iterations: int
    max_iterations: int


class RouteResponse(BaseModel):
    """Response from supervisor agent."""
    next: str
    reasoning: str
    response: Optional[str] = None


async def agent_node(state, agent, name):
    """Process the state through an agent and return the updated state."""
    try:
        logger.info(f"Invoking {name} agent with state: {state.get('messages', [])[-1].content if state.get('messages') else 'No messages'}")

        result = await agent.ainvoke(state)
        logger.info(f"Agent {name} result: {result}")

        iterations = state.get("iterations", 0) + 1
        return {
            "messages": [AIMessage(content=result["messages"][-1].content, name=name)],
            "iterations": iterations
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error in {name} agent node: {str(e)}\n{error_details}")

        return {
            "messages": [AIMessage(content=f"I encountered an issue while processing your request. {str(e)}", name=name)],
            "iterations": state.get("iterations", 0) + 1
        }


async def supervisor_agent(state: AgentState) -> Dict:
    """Supervisor agent that decides which agent to use next."""
    messages = state["messages"]
    iterations = state["iterations"]
    max_iterations = state["max_iterations"]

    conversation_summary = "\n".join([f"{msg.type}: {msg.content}" for msg in messages[-5:]])
    
    members = ["Researcher", "Scrapper"]
    options = members + ["FINISH"]
    
    system_prompt = f"""You are the Supervisor Agent that coordinates specialized AI agents to answer user queries.
        
        YOUR ROLE:
        - Analyze user questions and determine which agent to use
        - Route tasks to the most appropriate specialized agent
        - Decide when enough information has been gathered to finish
        - For simple queries that don't require specialized knowledge, provide a direct response
        
        WHEN TO USE RESEARCHER:
        - User asks about facts, data, or general information
        - Questions about current events or trends
        - Need for background information on a topic
        - Queries requiring internet search
        
        WHEN TO USE SCRAPPER:
        - Need to extract specific information from websites
        - Researcher found relevant URLs that need deeper analysis
        - User mentioned specific websites to analyze
        
        WHEN TO FINISH:
        - Question is fully answered with sufficient detail
        - All necessary information has been gathered
        - User's needs are met with current information
        - Maximum iterations reached ({max_iterations})
        
        WHEN TO PROVIDE DIRECT RESPONSE:
        - User makes a simple statement that doesn't require research
        - User asks a basic question that doesn't need specialized tools
        - User provides information about themselves
        - User makes a greeting or farewell
        - User asks about your capabilities
        
        CONVERSATION CONTEXT:
        {conversation_summary}
        
        CURRENT STATUS:
        - Iterations completed: {iterations}/{max_iterations}
        - Available agents: {", ".join(members)}
        
        INSTRUCTIONS:
        - If insufficient information exists, choose the most suitable agent
        - If Researcher provided URLs/sources that need detailed analysis, use Scrapper
        - If general information is needed, use Researcher first
        - Only FINISH when you have comprehensive information to answer the user
        - Provide clear reasoning for your decision
        - Consider the iteration count to avoid infinite loops
        - If you need more information from the user, have the agent ask a clear question
        - For simple queries, provide a direct response in the 'response' field
        """

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        (
            "system",
            """Based on the conversation above, analyze what's needed and decide:

            1. Is the current information sufficient to fully answer the user's question?
            2. What additional information or verification is needed?
            3. Which agent should act next, or should we finish?
            4. For simple queries, can you provide a direct response without using specialized agents?

            Respond with your decision from: {options}

            Provide reasoning for your choice and assess the task status.
            If this is a simple query that doesn't require specialized agents, include a direct response.""",
        ),
    ]).partial(options=str(options), members=", ".join(members))

    llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0, api_key=settings.OPENAI_API_KEY)
    supervisor_chain = prompt | llm.with_structured_output(RouteResponse)
    result = await supervisor_chain.ainvoke(state)

    if iterations >= max_iterations and result.next != "FINISH":
        logger.warning(f"Maximum iterations ({max_iterations}) reached, forcing finish")
        return {
            "next": "FINISH",
            "task_completed": True
        }

    logger.info(f"Supervisor decision (iteration {iterations}): {result.next} - {result.reasoning}")
    
    response_dict = {
        "next": result.next,
        "task_completed": result.next == "FINISH"
    }

    if result.response:
        logger.info(f"Supervisor provided direct response: {result.response[:50]}...")
        response_dict["direct_response"] = result.response
        response_dict["messages"] = messages + [AIMessage(content=result.response, name="Supervisor")]

    return response_dict


async def create_graph():
    """Create the multi-agent workflow graph."""
    llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0, api_key=settings.OPENAI_API_KEY)

    await _mcp_tools.setup_mcp_tools()

    researcher_system_message = SystemMessage(content="""You are a Research Specialist with access to web search tools.
        YOUR ROLE:
        - Conduct thorough internet research on any topic
        - Find current information, news, trends, and facts
        - Provide comprehensive background information
        - Search for multiple sources and perspectives
        - Retrieve real-time data like weather forecasts, stock prices, and news

        WHEN TO USE YOUR TOOLS:
        - User asks about current events, trends, or recent information
        - Need to find general information about topics
        - Looking for statistics, facts, or data
        - Researching background information
        - Finding multiple sources on a subject
        - Retrieving current weather information for specific locations
        - Searching for time-sensitive information

        RESPONSE FORMAT:
        - Provide detailed, well-researched information
        - Include sources and links when available
        - Mention if specific websites were found that might need detailed scraping
        - For weather queries: include temperature, conditions, and forecast when available
        
        IMPORTANT:
        - If you need more information from the user, ask clearly and wait for their response
        - Be specific about what information you need
        - For weather queries, always specify the location and time period (today, tomorrow, etc.)
        - ALWAYS use your web_search tool when asked about weather, current events, or factual information
        - Make multiple search queries if needed to get comprehensive information""")

    researcher_tools = filter_mcp_tools(_mcp_tools, "Researcher")
    researcher_agent = create_react_agent(
        llm,
        tools=researcher_tools.tools,
        prompt=researcher_system_message
    )
    
    async def research_node(state):
        return await agent_node(state, agent=researcher_agent, name="Researcher")

    scrapper_system_message = SystemMessage(content="""You are a Web Scraping Specialist with access to Firecrawl tools.
        YOUR ROLE:
        - Extract detailed content from websites
        - Scrape structured data from web pages
        - Analyze the content of specific URLs
        - Get full page content and details

        WHEN TO USE YOUR TOOLS:
        - Specific websites or URLs need detailed analysis
        - Need to extract structured data from pages
        - Researcher found relevant sources that need deeper investigation
        - User provided specific URLs to analyze
        - Need full content from particular pages
        
        IMPORTANT:
        - If you need more information from the user, ask clearly and wait for their response
        - Be specific about what information you need

        RESPONSE FORMAT:
        - Provide detailed extracted content
        - Structure the information clearly
        - Highlight key findings from the scraped data
        - Mention the source URL and extraction timestamp""")

    scrapper_tools = filter_mcp_tools(_mcp_tools, "Scrapper")
    scrapper_agent = create_react_agent(
        llm,
        tools=scrapper_tools.tools,
        prompt=scrapper_system_message
    )
    
    async def scrapper_node(state):
        return await agent_node(state, agent=scrapper_agent, name="Scrapper")

    workflow = StateGraph(AgentState)

    workflow.add_node("Researcher", research_node)
    workflow.add_node("Scrapper", scrapper_node)
    workflow.add_node("Supervisor", supervisor_agent)

    members = ["Researcher", "Scrapper"]
    for member in members:
        workflow.add_edge(member, "Supervisor")

    conditional_map = {k: k for k in members}
    conditional_map["FINISH"] = END
    workflow.add_conditional_edges("Supervisor", lambda x: x["next"], conditional_map)

    workflow.add_edge(START, "Supervisor")

    checkpointer = MemorySaver()

    return workflow.compile(checkpointer=checkpointer)


def create_initial_state(messages: List[BaseMessage], max_iterations: int) -> AgentState:
    """Create an initial state for the workflow."""
    return {
        "messages": messages,
        "next": "",
        "task_completed": False,
        "iterations": 0,
        "max_iterations": max_iterations
    }


async def initialize_graph():
    """Initialize the graph with MCP tools."""
    global _graph
    global _mcp_tools
    if _graph is None:
        _mcp_tools = MCPTools(mcp_configs=[
            MCPConfig(client_name="Researcher", server_url="http://127.0.0.1:7861/sse"),
            MCPConfig(client_name="Scrapper", server_url=f"http://127.0.0.1:7860/sse") # http://127.0.0.1:7860/sse or https://mcp.firecrawl.dev/{settings.FIRECRAWL_API_KEY}/sse
        ])
        _graph = await create_graph()
        print("✅ LangGraph with MCP tools initialized successfully!")
    return _graph


async def close_graph():
    """Close the graph and clean up MCP connections."""
    global _mcp_tools
    if _mcp_tools is not None:
        await _mcp_tools.cleanup()
        print("✅ LangGraph with MCP tools closed successfully!")


def get_graph():
    """Get the compiled graph instance."""
    if _graph is None:
        raise RuntimeError("❌ Graph not initialized. Call initialize_graph() first.")
    return _graph


def filter_mcp_tools(
        mcp_tools: MCPTools,
        client_name: Literal["Researcher", "Scrapper"]
) -> MCPTools:
    """Filter MCP tools by client name."""
    filtered_configs = [
        config for config in mcp_tools.mcp_configs
        if config["client_name"] == client_name
    ]
    new_mcp_tools = MCPTools(mcp_configs=filtered_configs)
    new_mcp_tools.tools = [tool for tool in mcp_tools.tools if hasattr(tool, 'name')]
    return new_mcp_tools