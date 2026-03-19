import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ⚠️ SECURITY TIP: In production, put these in a .env file!
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "your-email@gmail.com"  # Replace with your Gmail
SENDER_PASSWORD = "your-app-password"  # Replace with your 16-digit App Password

def send_otp_email(receiver_email: str, otp_code: str):
    """
    Sends an OTP email for password reset using Gmail SMTP.
    """
    subject = "Password Reset Code - AI Inventory"
    
    # HTML Email Template (Looks professional)
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0ea5e9;">AI Inventory System</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. Here is your 6-digit verification code:</p>
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; display: inline-block; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">
          {otp_code}
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #64748b;">
          If you did not request this, please ignore this email. This code will expire soon.
        </p>
      </body>
    </html>
    """

    # Setup the email message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"AI Inventory <{SENDER_EMAIL}>"
    msg["To"] = receiver_email
    msg.attach(MIMEText(html_content, "html"))

    try:
        # Connect to server and send
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()  # Secure the connection
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, receiver_email, msg.as_string())
        server.quit()
        print(f"✅ Real email successfully sent to {receiver_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False