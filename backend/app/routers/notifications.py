from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import InAppNotification, NotificationPreference, User
from backend.app.schemas import (
    InAppNotificationResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    MessageResponse
)
from backend.app.auth import get_current_user
from backend.app.config import settings
from backend.app.email_service import check_smtp_status, send_email
from backend.app.scheduler import check_and_send_due_reminders

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[InAppNotificationResponse])
def get_in_app_notifications(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve in-app notifications for the current user."""
    notifications = db.query(InAppNotification).filter(
        InAppNotification.user_id == current_user.id
    ).order_by(InAppNotification.created_at.desc()).limit(limit).all()
    return notifications

@router.patch("/{notification_id}/read", response_model=MessageResponse)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a specific notification as read."""
    notif = db.query(InAppNotification).filter(
        InAppNotification.id == notification_id,
        InAppNotification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    return MessageResponse(message="Notification marked as read.")

@router.post("/mark-all-read", response_model=MessageResponse)
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for the user."""
    db.query(InAppNotification).filter(
        InAppNotification.user_id == current_user.id,
        InAppNotification.is_read == False
    ).update({InAppNotification.is_read: True})
    db.commit()
    return MessageResponse(message="All notifications marked as read.")

@router.get("/preferences", response_model=NotificationPreferenceResponse)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current user's notification preferences."""
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    if not prefs:
        prefs = NotificationPreference(
            user_id=current_user.id,
            in_app_enabled=True,
            email_reminders_enabled=False,
            daily_summary_enabled=False,
            push_enabled=False,
            reminder_timing="at_due_time",
            daily_summary_time="08:00"
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    return NotificationPreferenceResponse(
        id=prefs.id,
        user_id=prefs.user_id,
        in_app_enabled=prefs.in_app_enabled,
        email_reminders_enabled=prefs.email_reminders_enabled,
        daily_summary_enabled=prefs.daily_summary_enabled,
        push_enabled=prefs.push_enabled,
        reminder_timing=prefs.reminder_timing,
        daily_summary_time=prefs.daily_summary_time,
        smtp_configured=settings.is_smtp_configured,
        updated_at=prefs.updated_at
    )

@router.put("/preferences", response_model=NotificationPreferenceResponse)
def update_preferences(
    prefs_in: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update notification preferences."""
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    if not prefs:
        prefs = NotificationPreference(user_id=current_user.id)
        db.add(prefs)

    if prefs_in.in_app_enabled is not None:
        prefs.in_app_enabled = prefs_in.in_app_enabled
    if prefs_in.email_reminders_enabled is not None:
        prefs.email_reminders_enabled = prefs_in.email_reminders_enabled
    if prefs_in.daily_summary_enabled is not None:
        prefs.daily_summary_enabled = prefs_in.daily_summary_enabled
    if prefs_in.push_enabled is not None:
        prefs.push_enabled = prefs_in.push_enabled
    if prefs_in.reminder_timing is not None:
        prefs.reminder_timing = prefs_in.reminder_timing.value if hasattr(prefs_in.reminder_timing, 'value') else prefs_in.reminder_timing
    if prefs_in.daily_summary_time is not None:
        prefs.daily_summary_time = prefs_in.daily_summary_time

    db.commit()
    db.refresh(prefs)

    return NotificationPreferenceResponse(
        id=prefs.id,
        user_id=prefs.user_id,
        in_app_enabled=prefs.in_app_enabled,
        email_reminders_enabled=prefs.email_reminders_enabled,
        daily_summary_enabled=prefs.daily_summary_enabled,
        push_enabled=prefs.push_enabled,
        reminder_timing=prefs.reminder_timing,
        daily_summary_time=prefs.daily_summary_time,
        smtp_configured=settings.is_smtp_configured,
        updated_at=prefs.updated_at
    )

@router.get("/smtp-status")
def get_smtp_status(current_user: User = Depends(get_current_user)):
    """Check SMTP configuration status."""
    is_ok, message = check_smtp_status()
    return {
        "is_configured": settings.is_smtp_configured,
        "is_connected": is_ok,
        "status_message": message,
        "host": settings.SMTP_HOST or None,
        "port": settings.SMTP_PORT if settings.is_smtp_configured else None,
        "sender": settings.SMTP_FROM_EMAIL if settings.is_smtp_configured else None
    }

@router.post("/test-email", response_model=MessageResponse)
def send_test_email(current_user: User = Depends(get_current_user)):
    """Send a test email to the current user's email address."""
    if not settings.is_smtp_configured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SMTP is not configured in environment variables. Configure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in your .env file to enable live email delivery."
        )

    html_body = f"""
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4F46E5;">Daywise SMTP Test</h2>
        <p>Hi {current_user.full_name or 'there'},</p>
        <p>This is a test notification confirming that your Daywise SMTP email delivery is configured correctly!</p>
    </div>
    """
    success, msg = send_email(
        to_email=current_user.email,
        subject="Daywise - Test Email Notification",
        html_body=html_body,
        plain_body="Daywise SMTP Test Notification: Your email settings are working correctly!"
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=msg)

    return MessageResponse(message=f"Test email successfully sent to {current_user.email}.", detail=msg)

@router.post("/trigger-reminders", response_model=MessageResponse)
def trigger_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger reminder check for due tasks immediately."""
    count = check_and_send_due_reminders(db)
    return MessageResponse(message=f"Reminder check complete. {count} reminder(s) dispatched.")
