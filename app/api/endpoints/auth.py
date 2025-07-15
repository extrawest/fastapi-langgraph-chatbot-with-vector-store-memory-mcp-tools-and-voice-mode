from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import get_user_service
from app.core.config import settings
from app.core.security import create_access_token
from app.schemas.token import Token
from app.schemas.user import UserCreate
from app.services.user import UserService

router = APIRouter()


@router.post("/login", response_model=Token)
async def login_access_token(
    user_service: Annotated[UserService, Depends(get_user_service)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    user = await user_service.authenticate(
        username=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=create_access_token(
            subject=str(user.id), expires_delta=access_token_expires
        ),
        token_type="bearer",
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    *,
    user_in: UserCreate,
    user_service: UserService = Depends(get_user_service)
) -> dict:
    user = await user_service.get_by_username(username=user_in.username)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    
    await user_service.create(obj_in=user_in)
    return {"message": "User registered successfully"}
