import smtplib
import random
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ── Config from .env ───────────────────────────────────────────────────────
SMTP_SERVER     = os.getenv("SMTP_SERVER",     "smtp.gmail.com")
SMTP_PORT       = int(os.getenv("SMTP_PORT",   "587"))
SENDER_EMAIL    = os.getenv("SENDER_EMAIL",    "your-email@gmail.com")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD", "your-app-password")
APP_NAME        = os.getenv("APP_NAME",        "AI Inventory System")


def generate_otp(length: int = 6) -> str:
    """Generate a secure 6-digit OTP."""
    return str(random.randint(100000, 999999))


def _send(to: str, subject: str, html: str) -> bool:
    """Internal SMTP send helper."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{APP_NAME} <{SENDER_EMAIL}>"
        msg["To"]      = to
        msg.attach(MIMEText(html, "html"))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, to, msg.as_string())
        server.quit()
        print(f"[EMAIL] Sent '{subject}' to {to}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


def send_otp_email(receiver_email: str, otp_code: str) -> bool:
    """Send OTP password reset email to user."""
    html = f"""
    <html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:40px 20px;">
      <div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:36px;border:1px solid #e2e8f0;">
        <h2 style="color:#0ea5e9;margin:0 0 4px;">🔐 {APP_NAME}</h2>
        <p style="color:#64748b;font-size:13px;margin:0 0 24px;">Password Reset Request</p>
        <p style="color:#334155;">Your 6-digit verification code:</p>
        <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
          <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#0f172a;font-family:monospace;">{otp_code}</div>
          <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">Expires in <strong>10 minutes</strong></p>
        </div>
        <p style="color:#64748b;font-size:13px;">If you did not request this, ignore this email. Your password will not change.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
        <p style="color:#94a3b8;font-size:11px;margin:0;">Automated message from {APP_NAME}. Do not reply.</p>
      </div>
    </body></html>
    """
    return _send(receiver_email, f"Your Password Reset Code — {APP_NAME}", html)


def send_admin_alert(admin_email: str, user_email: str, timestamp: str) -> bool:
    """Notify admin when a password reset is requested."""
    html = f"""
    <html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:40px 20px;">
      <div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:36px;border:1px solid #e2e8f0;">
        <h2 style="color:#f59e0b;margin:0 0 4px;">⚠️ Password Reset Alert</h2>
        <p style="color:#64748b;font-size:13px;margin:0 0 20px;">{APP_NAME} — Admin Notification</p>
        <p style="color:#334155;">A password reset was requested for:</p>
        <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:14px 18px;margin:14px 0;">
          <p style="margin:0;font-size:15px;font-weight:600;color:#713f12;">{user_email}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#92400e;">{timestamp} UTC</p>
        </div>
        <p style="color:#64748b;font-size:13px;">If suspicious, disable the account from <strong>User Management</strong>.</p>
      </div>
    </body></html>
    """
    return _send(admin_email, f"[Alert] Password Reset — {user_email}", html)


def send_password_changed_email(receiver_email: str) -> bool:
    """Notify user their password was successfully changed."""
    html = f"""
    <html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:40px 20px;">
      <div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:36px;border:1px solid #e2e8f0;">
        <h2 style="color:#22c55e;margin:0 0 16px;">✅ Password Changed Successfully</h2>
        <p style="color:#334155;">Your password for <strong>{receiver_email}</strong> was changed.</p>
        <p style="color:#64748b;font-size:13px;">If you did not do this, contact your admin immediately.</p>
      </div>
    </body></html>
    """
    return _send(receiver_email, f"Password Changed — {APP_NAME}", html)