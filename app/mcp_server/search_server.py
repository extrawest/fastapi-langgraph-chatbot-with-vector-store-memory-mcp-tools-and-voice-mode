"""
MCP Server component that provides web search tools via FastMCP.
"""
import os
import sys
from typing import Literal

from fastmcp import FastMCP
from tavily import TavilyClient

# Add the project root directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

mcp = FastMCP("search")


@mcp.tool()
def search(query: str) -> dict[str, str]:
    """
    Search related to the query.

    Args:
        query: User query

    Returns:
        Dictionary containing search results
    """
    logger.info(f"Fetched news for {query}")

    tavily_client = TavilyClient(api_key=settings.TAVILY_API_KEY)
    response = tavily_client.search(query)

    logger.info(f"Fetched results for {response}")

    return response



def run_server(host: str = "127.0.0.1", port: int = 7861, transport: Literal["stdio", "sse", "streamable-http"] = "sse") -> None:
    """
    Run the MCP mcp_server with specified transport, host, and port.

    Args:
        host: Host address to bind the mcp_server
        port: Port number to listen on
        transport: Transport protocol ("sse" or "stdio")
    """
    logger.info(f"Starting MCP mcp_server on {host}:{port} with {transport} transport...")
    mcp.run(transport=transport, host=host, port=port)


if __name__ == "__main__":
    run_server()
