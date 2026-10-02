from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date, time
from backend.app.models import PriorityEnum, RepeatScheduleEnum, ReminderTimingEnum

# --- Auth & User Schemas ---

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: Optional[str] = None
    timezone: Optional[str] = "UTC"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    is_verified: bool
    is_active: bool
    timezone: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    timezone: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(None, min_length=6)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class VerifyEmailRequest(BaseModel):
    token: str

# --- Category Schemas ---

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#4F46E5", max_length=20)
    icon: str = Field(default="tag", max_length=30)

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = Field(None, max_length=20)
    icon: Optional[str] = Field(None, max_length=30)

class CategoryResponse(CategoryBase):
    id: int
    user_id: int
    is_default: bool
    task_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

# --- Subtask Schemas ---

class SubtaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=250)

class SubtaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=250)
    is_completed: Optional[bool] = None

class SubtaskResponse(BaseModel):
    id: int
    task_id: int
    title: str
    is_completed: bool
    position: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Task Schemas ---

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=250)
    notes: Optional[str] = None
    due_date: Optional[date] = None
    due_time: Optional[time] = None
    priority: PriorityEnum = PriorityEnum.MEDIUM
    category_id: Optional[int] = None
    repeat_schedule: RepeatScheduleEnum = RepeatScheduleEnum.NONE

class TaskCreate(TaskBase):
    subtasks: Optional[List[str]] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=250)
    notes: Optional[str] = None
    due_date: Optional[date] = None
    due_time: Optional[time] = None
    priority: Optional[PriorityEnum] = None
    category_id: Optional[int] = None
    is_completed: Optional[bool] = None
    repeat_schedule: Optional[RepeatScheduleEnum] = None

class TaskResponse(TaskBase):
    id: int
    user_id: int
    is_completed: bool
    completed_at: Optional[datetime] = None
    reminder_sent: bool
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None
    subtasks: List[SubtaskResponse] = []

    model_config = ConfigDict(from_attributes=True)

# --- Notification Schemas ---

class NotificationPreferenceUpdate(BaseModel):
    in_app_enabled: Optional[bool] = None
    email_reminders_enabled: Optional[bool] = None
    daily_summary_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    reminder_timing: Optional[ReminderTimingEnum] = None
    daily_summary_time: Optional[str] = None

class NotificationPreferenceResponse(BaseModel):
    id: int
    user_id: int
    in_app_enabled: bool
    email_reminders_enabled: bool
    daily_summary_enabled: bool
    push_enabled: bool
    reminder_timing: str
    daily_summary_time: str
    smtp_configured: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InAppNotificationResponse(BaseModel):
    id: int
    user_id: int
    task_id: Optional[int] = None
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DashboardStats(BaseModel):
    today_total: int
    today_completed: int
    today_percentage: int
    upcoming_total: int
    overdue_total: int
    completed_total: int
    greeting: str
    today_date: str
    user_timezone: str

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
    simulation_token: Optional[str] = None
