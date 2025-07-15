"""
MCP Server component that provides web scrapping tools via FastMCP.
"""
import os
import sys
from typing import Literal

from fastmcp import FastMCP
from firecrawl import FirecrawlApp
from firecrawl.firecrawl import ScrapeResponse

# Add the project root directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

mcp = FastMCP("stocks")


@mcp.tool()
def web_scrapping(url: str) -> ScrapeResponse:
    """
    Web scrapping related to the url.

    Args:
        url: User url

    Returns:
        Dictionary containing web scrapping results
    """
    logger.info(f"Web scrapping related to the url {url}")

    app = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)
    scrape_result = app.scrape_url(url, formats=['markdown', 'html'])

    logger.info(f"Web scrapping result: {scrape_result}")

    return scrape_result


def run_server(host: str = "127.0.0.1", port: int = 7860, transport: Literal["stdio", "sse", "streamable-http"] = "sse") -> None:
    """
    Run the MCP mcp_server with specified transport, host and port.
    
    Args:
        host: Host address to bind the mcp_server
        port: Port number to listen on
        transport: Transport protocol ("sse" or "stdio")
    """
    logger.info(f"Starting MCP mcp_server on {host}:{port} with {transport} transport...")
    mcp.run(transport=transport, host=host, port=port)


if __name__ == "__main__":
    run_server()
