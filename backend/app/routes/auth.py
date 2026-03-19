from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserResponse
from .email_sender import send_otp_email 
from datetime import datetime
import bcrypt
import random

router = APIRouter(prefix="/auth", tags=["Auth"])

# ── Password hashing ───────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── Temporary in-memory store for OTPs ─────────────────────────────────────
PASSWORD_RESET_TOKENS = {}

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    reset_token: str
    new_password: str

# ... (login endpoint remains exactly the same) ...
@router.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    user.last_login = datetime.utcnow()
    db.commit()
    return {"message": "Login successful", "id": user.id, "email": user.email, "role": user.role}


# ── Forgot Password (UPDATED FOR REAL EMAIL) ───────────────────────────────
@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        return {"message": "If that email is in our database, we have sent a reset code."}

    # Generate a 6-digit OTP
    reset_otp = str(random.randint(100000, 999999))
    PASSWORD_RESET_TOKENS[email] = reset_otp

    # 🚀 SEND THE REAL EMAIL
    email_sent = send_otp_email(receiver_email=email, otp_code=reset_otp)
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send email. Try again later.")

    return {
        "message": "If that email is in our database, we have sent a reset code."
        # Removed debug_otp so hackers can't see it in the API response!
    }


# ... (reset_password, create_user, get_users, update_user, delete_user remain exactly the same as your code) ...
@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    saved_token = PASSWORD_RESET_TOKENS.get(email)
    if not saved_token or saved_token != data.reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.password = hash_password(data.new_password)
    db.commit()
    del PASSWORD_RESET_TOKENS[email]
    return {"message": "Password has been reset successfully."}

@router.post("/create-user", response_model=UserResponse)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=data.email.strip().lower(), password=hash_password(data.password), role=data.role or "viewer", is_active=True, created_at=datetime.utcnow())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).filter(User.is_active == True).all()

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, data: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if "email" in data: user.email = data["email"].strip().lower()
    if "role" in data:
        allowed_roles = {"admin", "manager", "staff", "viewer"}
        if data["role"] not in allowed_roles: raise HTTPException(status_code=400, detail=f"Role must be one of {allowed_roles}")
        user.role = data["role"]
    if "password" in data and data["password"]: user.password = hash_password(data["password"])
    if "is_active" in data: user.is_active = bool(data["is_active"])
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": f"User {user.email} deactivated"}