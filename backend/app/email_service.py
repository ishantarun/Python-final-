import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from typing import Tuple, Optional, List
from backend.app.config import settings

logger = logging.getLogger("daywise.email")
logging.basicConfig(level=logging.INFO)

def check_smtp_status() -> Tuple[bool, str]:
    """
    Check if SMTP configuration is present and can connect.
    Returns (is_available, status_message).
    """
    if not settings.is_smtp_configured:
        return False, "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in your .env file."
    
    try:
        if settings.SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5)
            if settings.SMTP_USE_TLS:
                server.starttls()
        
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.quit()
        return True, f"Successfully connected to SMTP server ({settings.SMTP_HOST}:{settings.SMTP_PORT})."
    except Exception as e:
        return False, f"SMTP connection failed: {str(e)}"

def send_email(to_email: str, subject: str, html_body: str, plain_body: Optional[str] = None) -> Tuple[bool, str]:
    """
    Send an email via SMTP if configured, or simulate it cleanly in development/test.
    Returns (success, message_or_error).
    """
    if not settings.is_smtp_configured:
        logger.info(
            f"[Daywise Email Simulation] SMTP not configured. Simulated email to: {to_email}\n"
            f"Subject: {subject}\n"
            f"Content Preview: {plain_body or html_body[:120]}..."
        )
        return True, "Simulated: Email logged to console (SMTP not configured in environment)."

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        if plain_body:
            msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        if settings.SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_USE_TLS:
                server.starttls()

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        return True, f"Email delivered successfully to {to_email}."
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False, f"SMTP Error: {str(e)}"

def send_verification_email(to_email: str, full_name: Optional[str], token: str) -> Tuple[bool, str]:
    """Send an account email verification link."""
    display_name = full_name or "there"
    verify_link = f"{settings.APP_URL}/#verify?token={token}"
    subject = "Verify your Daywise account"
    
    plain_text = f"""Hi {display_name},

Welcome to Daywise! Please verify your email address by opening the following link:
{verify_link}

Verification Token: {token}

Best,
The Daywise Team
"""
    
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="color: #4F46E5; margin-bottom: 8px;">Daywise</h2>
        <p style="color: #1e293b; font-size: 16px;">Hi {display_name},</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">Welcome to Daywise! Please verify your email address to secure your account and unlock all reminders.</p>
        <div style="margin: 24px 0;">
            <a href="{verify_link}" style="background-color: #4F46E5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">Or verify manually using token: <code>{token}</code></p>
    </div>
    """
    return send_email(to_email, subject, html, plain_text)

def send_password_reset_email(to_email: str, full_name: Optional[str], token: str) -> Tuple[bool, str]:
    """Send a password reset link."""
    display_name = full_name or "there"
    reset_link = f"{settings.APP_URL}/#reset?token={token}"
    subject = "Reset your Daywise password"

    plain_text = f"""Hi {display_name},

We received a request to reset your Daywise password.
Use this link to set a new password:
{reset_link}

Token: {token}

If you did not request this, you can safely ignore this email.
"""

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="color: #4F46E5; margin-bottom: 8px;">Daywise</h2>
        <p style="color: #1e293b; font-size: 16px;">Hi {display_name},</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">We received a request to reset your password. Click the button below to choose a new password.</p>
        <div style="margin: 24px 0;">
            <a href="{reset_link}" style="background-color: #4F46E5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">Or enter this reset token in the app: <code>{token}</code></p>
    </div>
    """
    return send_email(to_email, subject, html, plain_text)

def send_task_reminder_email(to_email: str, full_name: Optional[str], task_title: str, due_time_str: str) -> Tuple[bool, str]:
    """Send an email reminder for an upcoming task."""
    display_name = full_name or "there"
    subject = f"Reminder: {task_title}"
    plain_text = f"Hi {display_name},\n\nThis is a reminder that your task '{task_title}' is scheduled for {due_time_str}.\n\nCheck Daywise to mark it complete!"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="color: #4F46E5; margin-bottom: 8px;">Daywise Task Reminder</h2>
        <p style="color: #1e293b; font-size: 16px;">Hi {display_name},</p>
        <p style="color: #475569; font-size: 14px;">Your task is due soon:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #4F46E5; margin: 16px 0;">
            <strong style="color: #0f172a; font-size: 16px;">{task_title}</strong>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Scheduled: {due_time_str}</p>
        </div>
        <a href="{settings.APP_URL}" style="background-color: #4F46E5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">Open Daywise</a>
    </div>
    """
    return send_email(to_email, subject, html, plain_text)
