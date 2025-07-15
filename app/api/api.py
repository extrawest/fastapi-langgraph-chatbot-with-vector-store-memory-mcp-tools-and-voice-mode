from fastapi import APIRouter
from app.api.endpoints import auth, users, chat, chat_history, voice_chat

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(chat_history.router, prefix="/history", tags=["chat_history"])
api_router.include_router(voice_chat.router, prefix="/livekit", tags=["livekit"])
