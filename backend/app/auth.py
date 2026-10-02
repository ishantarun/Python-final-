import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import User, Category, NotificationPreference

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the hashed password."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta if expires_delta else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def generate_random_token(length: int = 32) -> str:
    """Generate a cryptographically secure URL-safe token."""
    return secrets.token_urlsafe(length)

def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to retrieve the authenticated user from the Bearer token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not auth_credentials or not auth_credentials.credentials:
        raise credentials_exception

    token = auth_credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    return user

def seed_default_user_data(user: User, db: Session):
    """Seed initial categories and notification preferences for a newly registered user."""
    default_categories = [
        {"name": "Personal", "color": "#3B82F6", "icon": "user", "is_default": True},
        {"name": "Work", "color": "#6366F1", "icon": "briefcase", "is_default": True},
        {"name": "Study", "color": "#EC4899", "icon": "book-open", "is_default": True},
        {"name": "Health", "color": "#10B981", "icon": "heart", "is_default": True},
    ]

    for cat_data in default_categories:
        cat = Category(
            user_id=user.id,
            name=cat_data["name"],
            color=cat_data["color"],
            icon=cat_data["icon"],
            is_default=cat_data["is_default"]
        )
        db.add(cat)

    # Initialize notification preferences
    prefs = NotificationPreference(
        user_id=user.id,
        in_app_enabled=True,
        email_reminders_enabled=False,
        daily_summary_enabled=False,
        push_enabled=False,
        reminder_timing="at_due_time",
        daily_summary_time="08:00"
    )
    db.add(prefs)
    db.commit()
