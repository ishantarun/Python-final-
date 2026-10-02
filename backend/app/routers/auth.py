from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User
from backend.app.schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    VerifyEmailRequest,
    MessageResponse
)
from backend.app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    generate_random_token,
    get_current_user,
    seed_default_user_data
)
from backend.app.email_service import send_verification_email, send_password_reset_email
from backend.app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account, seed default data, and issue an access token."""
    existing_user = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    verification_token = generate_random_token()
    user = User(
        email=user_in.email.lower().strip(),
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        timezone=user_in.timezone or "UTC",
        is_active=True,
        is_verified=False,
        verification_token=verification_token
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Seed initial categories & notification preferences
    seed_default_user_data(user, db)

    # Send verification email or simulate
    send_verification_email(user.email, user.full_name, verification_token)

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login_user(login_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password and receive a JWT token."""
    user = db.query(User).filter(User.email == login_in.email.lower().strip()).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated."
        )

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user profile."""
    return UserResponse.model_validate(current_user)

@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify an account email with token."""
    user = db.query(User).filter(User.verification_token == payload.token.strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token."
        )

    user.is_verified = True
    user.verification_token = None
    db.commit()

    return MessageResponse(
        message="Email successfully verified! You have full access to Daywise reminders.",
        detail=user.email
    )

@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Resend email verification token for the current logged-in user."""
    if current_user.is_verified:
        return MessageResponse(message="Email is already verified.")

    token = generate_random_token()
    current_user.verification_token = token
    db.commit()

    success, status_msg = send_verification_email(current_user.email, current_user.full_name, token)
    return MessageResponse(
        message="Verification email sent.",
        detail=status_msg,
        simulation_token=token if not settings.is_smtp_configured else None
    )

@router.post("/forgot-password", response_model=MessageResponse)
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    """Request a password reset link for an email address."""
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user:
        # Don't leak user existence in production; return standard confirmation
        return MessageResponse(
            message="If an account matches that email address, a password reset link has been dispatched."
        )

    token = generate_random_token()
    user.reset_password_token = token
    user.reset_password_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    success, status_msg = send_password_reset_email(user.email, user.full_name, token)
    return MessageResponse(
        message="If an account matches that email address, a password reset link has been dispatched.",
        detail=status_msg,
        simulation_token=token if not settings.is_smtp_configured else None
    )

@router.post("/reset-password", response_model=MessageResponse)
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Reset password using token."""
    user = db.query(User).filter(User.reset_password_token == payload.token.strip()).first()
    now_utc = datetime.now(timezone.utc)

    if not user or not user.reset_password_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    expires = user.reset_password_expires.replace(tzinfo=timezone.utc) if user.reset_password_expires.tzinfo is None else user.reset_password_expires
    if now_utc > expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new one."
        )

    user.hashed_password = hash_password(payload.new_password)
    user.reset_password_token = None
    user.reset_password_expires = None
    db.commit()

    return MessageResponse(message="Password successfully reset! You can now sign in with your new password.")

@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)):
    """Sign out the current user."""
    return MessageResponse(message="Signed out successfully.")
