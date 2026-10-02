from typing import List, Optional
from datetime import datetime, date, time as dtime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, asc

from backend.app.database import get_db
from backend.app.models import Task, Subtask, Category, User, PriorityEnum, RepeatScheduleEnum
from backend.app.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    SubtaskCreate,
    SubtaskUpdate,
    SubtaskResponse,
    DashboardStats,
    MessageResponse
)
from backend.app.auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

def calculate_next_occurrence(current_date: date, schedule: str) -> Optional[date]:
    """Calculate the next date for a repeating task."""
    if schedule == "daily":
        return current_date + timedelta(days=1)
    elif schedule == "weekdays":
        next_day = current_date + timedelta(days=1)
        while next_day.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
            next_day += timedelta(days=1)
        return next_day
    elif schedule == "weekly":
        return current_date + timedelta(days=7)
    elif schedule == "monthly":
        # Rough monthly advance (+30 days)
        return current_date + timedelta(days=30)
    return None

@router.get("", response_model=List[TaskResponse])
def list_tasks(
    filter_by: Optional[str] = Query("all", description="all, today, upcoming, completed"),
    category_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    target_date: Optional[date] = Query(None),
    sort_by: Optional[str] = Query("due_date"),
    sort_order: Optional[str] = Query("asc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve and filter tasks for the authenticated user."""
    today = datetime.now(timezone.utc).date()
    query = db.query(Task).filter(Task.user_id == current_user.id)

    # Filter by specific target date (e.g. for Calendar view)
    if target_date:
        query = query.filter(Task.due_date == target_date)
    else:
        # Standard filter tabs
        if filter_by == "today":
            query = query.filter(Task.due_date == today)
        elif filter_by == "upcoming":
            query = query.filter(Task.due_date > today, Task.is_completed == False)
        elif filter_by == "completed":
            query = query.filter(Task.is_completed == True)

    # Category filter
    if category_id is not None:
        query = query.filter(Task.category_id == category_id)

    # Priority filter
    if priority:
        query = query.filter(Task.priority == priority.lower())

    # Text search
    if search and search.strip():
        search_term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Task.title).like(search_term),
                func.lower(Task.notes).like(search_term)
            )
        )

    # Sorting
    is_desc = (sort_order or "asc").lower() == "desc"
    order_func = desc if is_desc else asc

    if sort_by == "priority":
        # Order custom priority: high > medium > low
        # Using case statement or simple alphabetical
        if is_desc:
            query = query.order_by(Task.priority.desc(), Task.due_date.asc())
        else:
            query = query.order_by(Task.priority.asc(), Task.due_date.asc())
    elif sort_by == "title":
        query = query.order_by(order_func(func.lower(Task.title)))
    elif sort_by == "created_at":
        query = query.order_by(order_func(Task.created_at))
    else:
        # Default due_date (nulls last)
        query = query.order_by(Task.due_date.is_(None), order_func(Task.due_date), order_func(Task.due_time))

    tasks = query.all()
    return tasks

@router.get("/stats/dashboard", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve summarized statistics for the mobile dashboard."""
    now_utc = datetime.now(timezone.utc)
    today = now_utc.date()

    # Time of day greeting
    hour = now_utc.hour
    if 5 <= hour < 12:
        greeting_time = "Good morning"
    elif 12 <= hour < 17:
        greeting_time = "Good afternoon"
    elif 17 <= hour < 22:
        greeting_time = "Good evening"
    else:
        greeting_time = "Good night"

    user_name = current_user.full_name or current_user.email.split("@")[0]
    greeting = f"{greeting_time}, {user_name}!"

    # Counts
    today_tasks = db.query(Task).filter(Task.user_id == current_user.id, Task.due_date == today).all()
    today_total = len(today_tasks)
    today_completed = sum(1 for t in today_tasks if t.is_completed)
    today_percentage = int((today_completed / today_total * 100)) if today_total > 0 else 0

    upcoming_total = db.query(func.count(Task.id)).filter(
        Task.user_id == current_user.id,
        Task.due_date > today,
        Task.is_completed == False
    ).scalar() or 0

    overdue_total = db.query(func.count(Task.id)).filter(
        Task.user_id == current_user.id,
        Task.due_date < today,
        Task.is_completed == False
    ).scalar() or 0

    completed_total = db.query(func.count(Task.id)).filter(
        Task.user_id == current_user.id,
        Task.is_completed == True
    ).scalar() or 0

    return DashboardStats(
        today_total=today_total,
        today_completed=today_completed,
        today_percentage=today_percentage,
        upcoming_total=upcoming_total,
        overdue_total=overdue_total,
        completed_total=completed_total,
        greeting=greeting,
        today_date=today.strftime("%A, %B %d"),
        user_timezone=current_user.timezone
    )

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task with optional subtasks."""
    # Verify category if supplied
    if task_in.category_id:
        cat = db.query(Category).filter(
            Category.id == task_in.category_id,
            Category.user_id == current_user.id
        ).first()
        if not cat:
            task_in.category_id = None

    task = Task(
        user_id=current_user.id,
        category_id=task_in.category_id,
        title=task_in.title.strip(),
        notes=task_in.notes.strip() if task_in.notes else None,
        due_date=task_in.due_date,
        due_time=task_in.due_time,
        priority=task_in.priority.value if hasattr(task_in.priority, 'value') else task_in.priority,
        repeat_schedule=task_in.repeat_schedule.value if hasattr(task_in.repeat_schedule, 'value') else task_in.repeat_schedule,
        is_completed=False
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Add any subtasks
    if task_in.subtasks:
        for index, sub_title in enumerate(task_in.subtasks):
            if sub_title and sub_title.strip():
                subtask = Subtask(
                    task_id=task.id,
                    title=sub_title.strip(),
                    is_completed=False,
                    position=index
                )
                db.add(subtask)
        db.commit()
        db.refresh(task)

    return task

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve a single task by ID."""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    return task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_in: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update task attributes."""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    if task_in.title is not None:
        task.title = task_in.title.strip()
    if task_in.notes is not None:
        task.notes = task_in.notes.strip() if task_in.notes else None
    if task_in.due_date is not None:
        task.due_date = task_in.due_date
    if task_in.due_time is not None:
        task.due_time = task_in.due_time
    if task_in.priority is not None:
        task.priority = task_in.priority.value if hasattr(task_in.priority, 'value') else task_in.priority
    if task_in.repeat_schedule is not None:
        task.repeat_schedule = task_in.repeat_schedule.value if hasattr(task_in.repeat_schedule, 'value') else task_in.repeat_schedule
    if task_in.category_id is not None:
        if task_in.category_id > 0:
            cat = db.query(Category).filter(
                Category.id == task_in.category_id,
                Category.user_id == current_user.id
            ).first()
            task.category_id = cat.id if cat else None
        else:
            task.category_id = None
    if task_in.is_completed is not None:
        task.is_completed = task_in.is_completed
        task.completed_at = datetime.now(timezone.utc) if task_in.is_completed else None

    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    return task

@router.patch("/{task_id}/toggle-complete", response_model=TaskResponse)
def toggle_task_completion(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle a task between complete and incomplete. If recurring, spawn next occurrence on completion."""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    task.is_completed = not task.is_completed
    task.completed_at = datetime.now(timezone.utc) if task.is_completed else None

    # Handle recurring schedules
    if task.is_completed and task.repeat_schedule and task.repeat_schedule != "none" and task.due_date:
        next_date = calculate_next_occurrence(task.due_date, task.repeat_schedule)
        if next_date:
            next_task = Task(
                user_id=current_user.id,
                category_id=task.category_id,
                title=task.title,
                notes=task.notes,
                due_date=next_date,
                due_time=task.due_time,
                priority=task.priority,
                repeat_schedule=task.repeat_schedule,
                is_completed=False,
                reminder_sent=False
            )
            db.add(next_task)

    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}", response_model=MessageResponse)
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete a task."""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    title = task.title
    db.delete(task)
    db.commit()
    return MessageResponse(message=f"Task '{title}' was permanently deleted.")

# --- Subtasks endpoints ---

@router.post("/{task_id}/subtasks", response_model=SubtaskResponse, status_code=status.HTTP_201_CREATED)
def add_subtask(
    task_id: int,
    subtask_in: SubtaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a subtask to an existing task."""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    pos = len(task.subtasks)
    subtask = Subtask(
        task_id=task.id,
        title=subtask_in.title.strip(),
        is_completed=False,
        position=pos
    )
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask

@router.patch("/{task_id}/subtasks/{subtask_id}/toggle", response_model=SubtaskResponse)
def toggle_subtask(
    task_id: int,
    subtask_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle a subtask's completion status."""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    subtask = db.query(Subtask).filter(Subtask.id == subtask_id, Subtask.task_id == task_id).first()
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found.")

    subtask.is_completed = not subtask.is_completed
    db.commit()
    db.refresh(subtask)
    return subtask

@router.delete("/{task_id}/subtasks/{subtask_id}", response_model=MessageResponse)
def delete_subtask(
    task_id: int,
    subtask_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a subtask."""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    subtask = db.query(Subtask).filter(Subtask.id == subtask_id, Subtask.task_id == task_id).first()
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found.")

    db.delete(subtask)
    db.commit()
    return MessageResponse(message="Subtask removed.")
