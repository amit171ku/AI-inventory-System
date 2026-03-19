from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routes import product, forecast, history, orders, suppliers, ai, analytics, notifications, auth
from dotenv import load_dotenv
import os
load_dotenv()  # Load environment variables from .env file
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./inventory.db")  # Default to SQLite if not set

app = FastAPI(
    title="AI Inventory System",
    version="2.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB init ────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    init_db()

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(product.router)
app.include_router(forecast.router)
app.include_router(history.router)
app.include_router(orders.router)
app.include_router(suppliers.router)
app.include_router(ai.router)
app.include_router(analytics.router)
app.include_router(notifications.router)

# ── Health check ───────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {"status": "ok", "message": "AI Inventory Backend Running"}