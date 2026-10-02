from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User
from backend.app.schemas import UserResponse, UserProfileUpdate, MessageResponse
from backend.app.auth import get_current_user, verify_password, hash_password

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile details (name, timezone, or change password)."""
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name.strip()

    if profile_in.timezone is not None:
        current_user.timezone = profile_in.timezone.strip()

    if profile_in.new_password:
        if not profile_in.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to set a new password."
            )
        if not verify_password(profile_in.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect."
            )
        current_user.hashed_password = hash_password(profile_in.new_password)

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)

@router.delete("/me", response_model=MessageResponse)
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete user account and all associated data."""
    db.delete(current_user)
    db.commit()
    return MessageResponse(message="Your account and all associated data have been permanently deleted.")
