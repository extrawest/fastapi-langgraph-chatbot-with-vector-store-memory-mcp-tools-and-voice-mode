from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User as DBUser
from app.schemas.token import LivekitToken
from app.utils.logger import setup_logger
from livekit import api
from app.core.config import settings

logger = setup_logger(__name__)

router = APIRouter()

@router.post("/generate_token", response_model=LivekitToken)
async def chat_completions(
    current_user: Annotated[DBUser, Depends(get_current_user)]
) -> LivekitToken:
    logger.info(f"Received generate livekit token request from user {current_user}")

    token = (
        api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
        .with_identity(f"user_{current_user.username}")
        .with_name(f"User {current_user.username}")
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=current_user.username,
                can_publish=True,
                can_subscribe=True
            )
        )
        .to_jwt()
    )

    return LivekitToken(token=token, room_name=current_user.username)