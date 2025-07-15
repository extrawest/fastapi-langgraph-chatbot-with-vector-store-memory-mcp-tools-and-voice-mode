from datetime import datetime
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph.state import CompiledStateGraph
from mem0 import Memory
from qdrant_client import QdrantClient

from app.agent.langgraph_agent import get_graph, create_initial_state
from app.core.config import settings
from app.services.vector_store import MultiTenantVectorStore
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class AISupport:
    _instance = None

    def __new__(cls, vector_store: MultiTenantVectorStore):
        if cls._instance is None:
            cls._instance = super(AISupport, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, vector_store: MultiTenantVectorStore):
        """
        Initialize the AI Support with Memory Configuration and Langchain OpenAI Chat Model.
        """
        if not hasattr(self, '_initialized') or not self._initialized:
            self._initialized = True

        custom_prompt = """
                Please extract relevant entities containing user information, preferences, context, and important facts that would help personalize future interactions. 
                Here are some few shot examples:

                Input: Hi.
                Output: {{"facts" : []}}

                Input: The weather is nice today.
                Output: {{"facts" : []}}

                Input: I'm a software developer working on Python projects and I prefer using FastAPI.
                Output: {{"facts" : ["User is a software developer", "Works with Python", "Prefers FastAPI framework"]}}

                Input: My name is John Smith, I live in New York and I'm interested in machine learning.
                Output: {{"facts" : ["User name: John Smith", "Lives in New York", "Interested in machine learning"]}}

                Input: I usually work late hours and prefer getting notifications in the evening.
                Output: {{"facts" : ["Works late hours", "Prefers evening notifications"]}}

                Input: I have experience with React and Node.js, but I'm new to TypeScript.
                Output: {{"facts" : ["Experienced with React", "Experienced with Node.js", "New to TypeScript"]}}

                Input: I'm planning a trip to Japan next month and need help with travel recommendations.
                Output: {{"facts" : ["Planning trip to Japan", "Trip scheduled for next month", "Needs travel recommendations"]}}

                Input: I'm a vegetarian and I'm allergic to nuts.
                Output: {{"facts" : ["User is vegetarian", "Allergic to nuts"]}}

                Input: I prefer dark mode interfaces and I use VS Code as my main editor.
                Output: {{"facts" : ["Prefers dark mode interfaces", "Uses VS Code editor"]}}

                Return the facts and user information in a json format as shown above.
                """

        client = QdrantClient(settings.QDRANT_HOST, port=settings.QDRANT_PORT)

        config = {
            "llm": {
                "provider": "openai",
                "config": {
                    "model": "gpt-4.1-mini",
                    "temperature": 0.1,
                    "max_tokens": 2000,
                    "api_key": settings.OPENAI_API_KEY
                }
            },
            "embedder": {
                "provider": "openai",
                "config": {
                    "model": "text-embedding-3-small",
                    "embedding_dims": 768,
                    "api_key": settings.OPENAI_API_KEY
                }
            },
            "vector_store": {
                "provider": "qdrant",
                "config": {
                    "collection_name": "general_chat_history",
                    "embedding_model_dims": 768,
                    "client": client
                }
            },
            "custom_prompt": custom_prompt,
            "version": "v1.1",
        }

        self.__memory = Memory.from_config(config)
        self.__app_id = "AI-general-chatbot"
        self.__vector_store = vector_store
        self.__graph: CompiledStateGraph = get_graph()

    async def ask(self, question: str, user_id: str, chat_id: str, tenant_id: str) -> dict:
        """Process a user question and return an AI response.
        
        Args:
            question: The user's question
            user_id: User identifier for personalization
            chat_id: Chat session identifier
            tenant_id: Tenant identifier for multi-tenant isolation
            
        Returns:
            Dictionary containing the AI response messages
        """
        logger.info("Self ID: {}".format(id(self)))

        memories = await self.__search_memory(question, user_id=user_id)

        relevant_docs = self.__vector_store.get_chat_by_id(
            chat_id=chat_id, 
            user_id=user_id, 
            tenant_id=tenant_id
        )
        logger.info(f"Retrieved {relevant_docs}")

        context = "Relevant information from previous conversations:\n"
        if memories['results']:
            for memory in memories['results']:
                context += f" - {memory['memory']}\n"
        
        if relevant_docs:
            context += "\nRelevant chat history:\n"
            for i, doc in enumerate(relevant_docs):
                question_text = doc.get("user_message", "")
                answer_text = doc.get("assistant_message", "")

                context += f" - User: {question_text}\n"
                context += f" - Assistant: {answer_text}\n"


        thread_id = f"user_{user_id}_chat_{chat_id}"

        config: RunnableConfig = {
            "configurable": {
                "thread_id": thread_id,
                "user_id": user_id,
                "chat_id": chat_id
            }
        }
        messages = [
            SystemMessage(content=f"""You are a helpful, knowledgeable, and versatile AI assistant designed to provide accurate and thoughtful responses on a wide range of topics.
                CAPABILITIES:
                - Answer questions across diverse domains including technology, science, arts, history, current events, and everyday topics
                - Provide explanations, summaries, and analysis on complex subjects
                - Assist with creative tasks like writing, brainstorming, and problem-solving
                - Engage in natural, conversational dialogue while maintaining context

                GUIDELINES:
                - Be accurate, balanced, and objective in your responses
                - Acknowledge limitations when you don't have sufficient information
                - Provide nuanced perspectives on complex topics
                - Maintain a helpful, respectful, and friendly tone
                - Respect user privacy and avoid making assumptions

                CONTEXT AWARENESS:
                {context}

                Use the above context (if provided) to personalize your responses based on the user's previous interactions and preferences, but don't explicitly reference that you're using this context.
            """),
            HumanMessage(content=question)
        ]

        initial_state = create_initial_state(messages, max_iterations=1)
        response_state = await self.__graph.ainvoke(initial_state, config=config)

        response_content = ""
        if "direct_response" in response_state:
            response_content = response_state["direct_response"]
            logger.info("Using direct response from supervisor")
        elif "messages" in response_state and response_state["messages"]:
            for msg in reversed(response_state["messages"]):
                if isinstance(msg, AIMessage) and hasattr(msg, "name") and msg.name in ["Researcher", "Scrapper", "Supervisor"]:
                    response_content = msg.content
                    logger.info(f"Using agent response from {msg.name}")
                    break

        await self.__add_memory(question, response_content, user_id=user_id)

        self.__vector_store.store_conversation(
            question=question,
            answer=response_content,
            tenant_id=tenant_id,
            metadata={
                "user_id": user_id,
                "chat_id": chat_id,
                "timestamp": str(datetime.now())
            }
        )

        return {"messages": [response_content]}

    async def __add_memory(self, question, response, user_id=None):
        self.__memory.add(f"User: {question}\nAssistant: {response}", user_id=user_id, metadata={"app_id": self.__app_id})

    async def __search_memory(self, query, user_id=None):
        related_memories = self.__memory.search(query, user_id=user_id)
        return related_memories