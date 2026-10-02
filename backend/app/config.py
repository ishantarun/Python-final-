from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pathlib import Path

# Base directory for locating .env
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    SECRET_KEY: str = "daywise-super-secret-dev-jwt-key-2026-safe-for-local-testing-only"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Database
    DATABASE_URL: str = "sqlite:///./daywise.db"
    
    # App URLs
    APP_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:8000"
    
    # Email / SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "notifications@daywise.app"
    SMTP_FROM_NAME: str = "Daywise"
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    
    ENVIRONMENT: str = "development"
    ENABLE_BACKGROUND_SCHEDULER: bool = True

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def is_smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_HOST.strip() and self.SMTP_USER and self.SMTP_USER.strip())

settings = Settings()
