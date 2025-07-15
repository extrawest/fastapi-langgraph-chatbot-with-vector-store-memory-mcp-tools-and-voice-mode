import json
import traceback

from typing import AsyncGenerator

from fastapi.responses import StreamingResponse
from fastapi import HTTPException

from app.agent.chat_agent import AISupport
from app.models.user import User
from app.schemas.api import LLMRequest
from app.utils.logger import setup_logger
from app.utils.openai_mapper import create_streaming_openai_chunk

logger = setup_logger(__name__)


class StreamingService:
    _instance = None

    def __new__(cls, support_agent: AISupport):
        if cls._instance is None:
            cls._instance = super(StreamingService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, support_agent: AISupport):
        if self._initialized:
            return
        self.support_agent = support_agent
        self._initialized = True

    async def streaming_chat(self, request: LLMRequest, current_user: User) -> StreamingResponse:
        try:
            async def generate_stream() -> AsyncGenerator[str, None]:
                first_chunk = await create_streaming_openai_chunk(role="assistant")
                yield f"data: {json.dumps(first_chunk)}\n\n"

                response = await self.support_agent.ask(
                    question=request.user_message,
                    user_id=str(current_user.id),
                    chat_id=request.chat_id,
                    tenant_id=current_user.tenant_id
                )
                
                if "messages" in response and response["messages"]:
                    full_content = response["messages"][0]

                    chunk_size = 10
                    
                    for i in range(0, len(full_content), chunk_size):
                        content_chunk = full_content[i:i+chunk_size]
                        chunk_data = await create_streaming_openai_chunk(content=content_chunk)
                        yield f"data: {json.dumps(chunk_data)}\n\n"

                final_chunk = await create_streaming_openai_chunk(finish_reason="stop")
                yield f"data: {json.dumps(final_chunk)}\n\n"
                yield "data: [DONE]\n\n"

            return StreamingResponse(
                generate_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        except Exception as e:
            logger.error(f"Error in chat_completions: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))
