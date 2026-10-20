import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def generate_otp_email_html(otp_code: str, user_name: str = "Valued Customer") -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SQMS Password Reset Verification Code</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #0b0f19;
                color: #e2e8f0;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 560px;
                margin: 40px auto;
                background: #111827;
                border: 1px solid #1e293b;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            }}
            .header {{
                background: linear-gradient(135deg, #1d4ed8, #4f46e5);
                padding: 32px 24px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                color: #ffffff;
                font-size: 22px;
                font-weight: 800;
                letter-spacing: -0.5px;
            }}
            .header p {{
                margin: 6px 0 0;
                color: #bfdbfe;
                font-size: 13px;
            }}
            .content {{
                padding: 32px 28px;
            }}
            .greeting {{
                font-size: 16px;
                font-weight: 600;
                color: #f8fafc;
                margin-bottom: 12px;
            }}
            .desc {{
                font-size: 14px;
                line-height: 1.6;
                color: #94a3b8;
                margin-bottom: 24px;
            }}
            .otp-box {{
                background: #0f172a;
                border: 2px dashed #3b82f6;
                border-radius: 12px;
                padding: 24px;
                text-align: center;
                margin-bottom: 24px;
            }}
            .otp-code {{
                font-family: 'Courier New', Courier, monospace;
                font-size: 36px;
                font-weight: 800;
                letter-spacing: 8px;
                color: #60a5fa;
                margin: 8px 0;
            }}
            .otp-expiry {{
                font-size: 12px;
                color: #f59e0b;
                font-weight: 600;
            }}
            .warning {{
                background: #18181b;
                border-left: 4px solid #ef4444;
                padding: 12px 16px;
                border-radius: 6px;
                font-size: 12px;
                color: #cbd5e1;
                margin-bottom: 24px;
            }}
            .footer {{
                background: #0f172a;
                padding: 20px;
                text-align: center;
                border-top: 1px solid #1e293b;
                font-size: 11px;
                color: #64748b;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Smart Queue Management System</h1>
                <p>AI-Powered Automotive Service & Queue Portal</p>
            </div>
            <div class="content">
                <div class="greeting">Hello {user_name},</div>
                <div class="desc">
                    We received an authenticated request to reset the password for your SQMS platform account. Please use the 6-digit one-time verification code below to authorize your password change.
                </div>
                
                <div class="otp-box">
                    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8;">Your Verification OTP</div>
                    <div class="otp-code">{otp_code}</div>
                    <div class="otp-expiry">Expires in 10 minutes (Single use only)</div>
                </div>

                <div class="warning">
                    <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email or notify your system administrator immediately. Do not share this code with anyone.
                </div>
            </div>
            <div class="footer">
                &copy; 2026 Smart Queue Management System (SQMS). All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

def send_password_reset_otp(to_email: str, otp_code: str, user_name: str = "User") -> dict:
    """
    Sends an OTP verification email to the user.
    If SMTP credentials are provided, delivers via real SMTP.
    If SMTP credentials are not yet configured, operates in safe simulation mode.
    """
    clean_email = to_email.strip().lower()

    # Check if SMTP is configured
    has_smtp = bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)

    if has_smtp:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"SQMS Password Reset Verification Code: {otp_code}"
            msg["From"] = f"SQMS Security <{settings.SMTP_FROM}>"
            msg["To"] = clean_email

            text_content = (
                f"Hello {user_name},\n\n"
                f"Your SQMS Password Reset Verification Code is: {otp_code}\n"
                f"This code will expire in 10 minutes.\n\n"
                f"If you did not request this, please ignore this message."
            )
            html_content = generate_otp_email_html(otp_code, user_name)

            msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM, [clean_email], msg.as_string())

            logger.info(f"Successfully sent OTP email to {clean_email} via SMTP {settings.SMTP_HOST}")
            return {"sent": True, "simulated": False, "email": clean_email}
        except Exception as e:
            logger.error(f"SMTP delivery error to {clean_email}: {e}. Falling back to simulation.")
            print(f"[EMAIL OTP DISPATCH - FALLBACK] To: {clean_email} | OTP: {otp_code} (Error: {e})")
            return {"sent": False, "simulated": True, "email": clean_email, "dev_otp": otp_code}
    else:
        # Development / Testing simulation mode (no SMTP configured)
        print(f"\n==================================================")
        print(f" [EMAIL OTP DISPATCH] To: {clean_email}")
        print(f" OTP VERIFICATION CODE: {otp_code}")
        print(f" Validity: 10 minutes (expires automatically)")
        print(f"==================================================\n")
        return {"sent": False, "simulated": True, "email": clean_email, "dev_otp": otp_code}
