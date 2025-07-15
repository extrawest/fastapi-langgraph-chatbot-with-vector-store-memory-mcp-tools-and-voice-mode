from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.deps import get_streaming_service, get_current_user
from app.models.user import User as DBUser
from app.schemas.api import LLMRequest
from app.services.streaming import StreamingService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter()

@router.post("/completions")
async def chat_completions(
    request: LLMRequest,
    current_user: Annotated[DBUser, Depends(get_current_user)],
    streaming_service: StreamingService = Depends(get_streaming_service)
) -> StreamingResponse:
    logger.info(f"Received chat completions request {request}")
    return await streaming_service.streaming_chat(request, current_user)



