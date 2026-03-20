from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserResponse
from .email_sender import send_otp_email
from datetime import datetime, timedelta
import bcrypt
import jwt
import os

router = APIRouter(prefix="/auth", tags=["Auth"])

# ── Config ─────────────────────────────────────────────────────────────────
JWT_SECRET         = os.getenv("JWT_SECRET", "change-this-in-production")
JWT_ALGO           = "HS256"
OTP_EXPIRE_MINUTES = 10

# in-memory OTP store {email: {otp, expires, user_id}}
_otp_store: dict = {}


# ── Pydantic models ────────────────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp:   str

class ResetPasswordRequest(BaseModel):
    reset_token:  str
    password:     str


# ── Password helpers ───────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT helpers ────────────────────────────────────────────────────────────
def create_token(user: User, remember_me: bool = False) -> str:
    expire = datetime.utcnow() + (timedelta(days=7) if remember_me else timedelta(hours=24))
    return jwt.encode(
        {"sub": str(user.id), "email": user.email, "role": user.role, "exp": expire},
        JWT_SECRET, algorithm=JWT_ALGO
    )

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")


# ── Login ──────────────────────────────────────────────────────────────────
@router.post("/login")
def login(data: dict, db: Session = Depends(get_db)):

    email       = data.get("email", "").strip().lower()
    password    = data.get("password", "")
    remember_me = bool(data.get("remember_me", False))

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_token(user, remember_me)

    return {
        "message":    "Login successful",
        "token":      token,
        "expires_in": "7 days" if remember_me else "24 hours",
        "id":         user.id,
        "email":      user.email,
        "role":       user.role,
    }


# ── Verify token ───────────────────────────────────────────────────────────
@router.post("/verify-token")
def verify_token(data: dict):
    payload = decode_token(data.get("token", ""))
    return {"valid": True, "email": payload["email"], "role": payload["role"]}


# ── Forgot password — step 1: send OTP ────────────────────────────────────
@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):

    email = data.email.strip().lower()
    user  = db.query(User).filter(User.email == email, User.is_active == True).first()

    # always same response — don't leak whether email exists
    if not user:
        return {"message": "If that email is registered, an OTP has been sent."}

    # generate OTP and store with expiry
    otp     = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    _otp_store[email] = {"otp": otp, "expires": expires, "user_id": user.id}

    # send OTP to user
    sent = send_otp_email(email, otp)
    if not sent:
        # still continue — OTP is in server logs as fallback
        print(f"[OTP FALLBACK] {email}: {otp}")

    # notify all admins
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    admins    = db.query(User).filter(User.role == "admin", User.is_active == True).all()
    for admin in admins:
        send_admin_alert(admin.email, email, timestamp)

    return {"message": "If that email is registered, an OTP has been sent."}


# ── Forgot password — step 2: verify OTP ──────────────────────────────────
@router.post("/verify-otp")
def verify_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):

    email = data.email.strip().lower()
    otp   = data.otp.strip()

    record = _otp_store.get(email)
    if not record:
        raise HTTPException(status_code=400, detail="No OTP found. Request a new one.")

    if datetime.utcnow() > record["expires"]:
        del _otp_store[email]
        raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

    if record["otp"] != otp:
        raise HTTPException(status_code=400, detail="Incorrect OTP. Try again.")

    # issue a short-lived reset token
    reset_token = jwt.encode(
        {"user_id": record["user_id"], "email": email,
         "exp": datetime.utcnow() + timedelta(minutes=15)},
        JWT_SECRET, algorithm=JWT_ALGO
    )

    return {"message": "OTP verified.", "reset_token": reset_token}


# ── Forgot password — step 3: reset password ──────────────────────────────
@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):

    if not data.reset_token or not data.password:
        raise HTTPException(status_code=400, detail="Reset token and new password required")

    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    try:
        payload = jwt.decode(data.reset_token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset session expired. Start over.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid reset token.")

    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = hash_password(data.password)
    db.commit()

    # clean up OTP
    _otp_store.pop(payload.get("email", ""), None)

    # confirm to user
    send_password_changed_email(user.email)

    return {"message": "Password reset successful. You can now log in."}


# ── Create user ────────────────────────────────────────────────────────────
@router.post("/create-user", response_model=UserResponse)
def create_user(data: UserCreate, db: Session = Depends(get_db)):

    existing = db.query(User).filter(User.email == data.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email      = data.email.strip().lower(),
        password   = hash_password(data.password),
        role       = data.role or "viewer",
        is_active  = True,
        created_at = datetime.utcnow(),
    )
    db.add(user); db.commit(); db.refresh(user)
    return user


# ── Get all users ──────────────────────────────────────────────────────────
@router.get("/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).filter(User.is_active == True).all()


# ── Update user ────────────────────────────────────────────────────────────
@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, data: dict, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "email"     in data: user.email     = data["email"].strip().lower()
    if "role"      in data:
        allowed = {"admin", "manager", "staff", "viewer"}
        if data["role"] not in allowed:
            raise HTTPException(status_code=400, detail=f"Role must be one of {allowed}")
        user.role = data["role"]
    if "password"  in data and data["password"]:
        user.password  = hash_password(data["password"])
    if "is_active" in data:
        user.is_active = bool(data["is_active"])

    db.commit(); db.refresh(user)
    return user


# ── Delete user ────────────────────────────────────────────────────────────
@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    db.commit()
    return {"message": f"User {user.email} deactivated"}