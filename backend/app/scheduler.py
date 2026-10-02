import threading
import time
import logging
from datetime import datetime, timezone, timedelta, date, time as dtime
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.models import Task, User, NotificationPreference, InAppNotification
from backend.app.email_service import send_task_reminder_email
from backend.app.config import settings

logger = logging.getLogger("daywise.scheduler")

_scheduler_running = False
_scheduler_thread = None

def check_and_send_due_reminders(db: Session) -> int:
    """
    Checks for pending tasks that have reached their reminder window.
    Dispatches in-app notifications and email reminders if enabled.
    Returns count of reminders processed.
    """
    now_utc = datetime.now(timezone.utc)
    today = now_utc.date()
    
    # Query active, incomplete tasks where reminder has not yet been sent
    tasks = db.query(Task).filter(
        Task.is_completed == False,
        Task.reminder_sent == False,
        Task.due_date != None
    ).all()

    processed_count = 0

    for task in tasks:
        user = db.query(User).filter(User.id == task.user_id).first()
        if not user or not user.is_active:
            continue

        prefs = db.query(NotificationPreference).filter(NotificationPreference.user_id == user.id).first()
        if not prefs:
            continue

        # Determine task due datetime
        task_due_date = task.due_date
        task_due_time = task.due_time or dtime(23, 59, 59)
        task_datetime = datetime.combine(task_due_date, task_due_time).replace(tzinfo=timezone.utc)

        # Calculate lead time according to reminder_timing preference
        lead_time = timedelta(minutes=0)
        if prefs.reminder_timing == "10_mins_before":
            lead_time = timedelta(minutes=10)
        elif prefs.reminder_timing == "1_hour_before":
            lead_time = timedelta(hours=1)
        elif prefs.reminder_timing == "1_day_before":
            lead_time = timedelta(days=1)

        reminder_target_time = task_datetime - lead_time

        if now_utc >= reminder_target_time:
            # 1. In-App Notification
            if prefs.in_app_enabled:
                title = f"Reminder: {task.title}"
                time_str = task.due_time.strftime("%I:%M %p") if task.due_time else "today"
                message = f"Task '{task.title}' is due {task.due_date.isoformat()} at {time_str}."
                notification = InAppNotification(
                    user_id=user.id,
                    task_id=task.id,
                    title=title,
                    message=message,
                    notification_type="task_reminder",
                    is_read=False
                )
                db.add(notification)

            # 2. Email Reminder
            if prefs.email_reminders_enabled:
                time_str = f"{task.due_date.isoformat()} {task.due_time.strftime('%I:%M %p') if task.due_time else ''}".strip()
                send_task_reminder_email(
                    to_email=user.email,
                    full_name=user.full_name,
                    task_title=task.title,
                    due_time_str=time_str
                )

            task.reminder_sent = True
            processed_count += 1

    if processed_count > 0:
        db.commit()
        logger.info(f"Processed {processed_count} task reminders.")
    
    return processed_count

def _scheduler_loop():
    logger.info("Daywise reminder scheduler background loop started.")
    while _scheduler_running:
        try:
            db = SessionLocal()
            try:
                check_and_send_due_reminders(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in scheduler loop: {e}")
        
        # Sleep in short increments to allow clean shutdown
        for _ in range(60):
            if not _scheduler_running:
                break
            time.sleep(1)

def start_scheduler():
    global _scheduler_running, _scheduler_thread
    if not settings.ENABLE_BACKGROUND_SCHEDULER or _scheduler_running:
        return
    _scheduler_running = True
    _scheduler_thread = threading.Thread(target=_scheduler_loop, daemon=True, name="daywise-scheduler")
    _scheduler_thread.start()

def stop_scheduler():
    global _scheduler_running, _scheduler_thread
    _scheduler_running = False
    if _scheduler_thread and _scheduler_thread.is_alive():
        _scheduler_thread.join(timeout=2)
