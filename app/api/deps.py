from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.chat_agent import AISupport
from app.core.config import settings
from app.core.security import ALGORITHM
from app.db.session import get_db
from app.models.user import User
from app.schemas.token import TokenPayload
from app.services.streaming import StreamingService
from app.services.user import UserService
from app.services.vector_store import MultiTenantVectorStore

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


async def get_user_service(
    db: Annotated[AsyncSession, Depends(get_db)]
) -> UserService:
    return UserService(db)

def get_vector_store() -> MultiTenantVectorStore:
    return MultiTenantVectorStore()

def get_ai_support(vector_store: Annotated[MultiTenantVectorStore, Depends(get_vector_store)]) -> AISupport:
    return AISupport(vector_store)

def get_streaming_service(support_agent: Annotated[AISupport, Depends(get_ai_support)]) -> StreamingService:
    return StreamingService(
        support_agent=support_agent
    )

async def get_current_user(
    user_service: Annotated[UserService, Depends(get_user_service)],
    token: Annotated[str, Depends(reusable_oauth2)],
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await user_service.get(user_id=int(token_data.sub))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user