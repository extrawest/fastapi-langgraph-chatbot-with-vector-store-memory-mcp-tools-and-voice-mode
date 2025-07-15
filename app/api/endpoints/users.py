from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user, get_user_service
from app.models.user import User as DBUser
from app.schemas.user import User, UserUpdate
from app.services.user import UserService

router = APIRouter()


@router.get("/me", response_model=User)
async def read_users_me(
    current_user: Annotated[DBUser, Depends(get_current_user)],
) -> User:
    return current_user


@router.put("/me", response_model=User)
async def update_user_me(
    *,
    user_in: UserUpdate,
    current_user: Annotated[DBUser, Depends(get_current_user)],
    user_service: UserService = Depends(get_user_service)
) -> User:
    user = await user_service.update(db_obj=current_user, obj_in=user_in)
    return user


@router.get("/{user_id}", response_model=User)
async def read_user_by_id(
    user_id: int,
    current_user: Annotated[DBUser, Depends(get_current_user)],
    user_service: UserService = Depends(get_user_service)
) -> User:
    user = await user_service.get(user_id=user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        return user

    raise HTTPException(status_code=403, detail="Not enough permissions")
