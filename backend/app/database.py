import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import Generator

# ── Database URL ───────────────────────────────────────────────────────────
# Reads from environment variable — falls back to SQLite for local dev.
# For production set: DATABASE_URL=postgresql://user:pass@host:5432/dbname

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./inventory.db")

IS_SQLITE = DATABASE_URL.startswith("sqlite")

# ── Engine ─────────────────────────────────────────────────────────────────
if IS_SQLITE:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,                   # set True to log all SQL queries
    )

    # Enable WAL mode for SQLite — better concurrent read performance
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")   # enforce FK constraints
        cursor.close()

else:
    # PostgreSQL / MySQL — use connection pooling
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,          # max persistent connections
        max_overflow=20,       # extra connections under burst load
        pool_pre_ping=True,    # auto-reconnect if connection dropped
        pool_recycle=1800,     # recycle connections every 30 min
        echo=False,
    )

# ── Session ────────────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ── Base ───────────────────────────────────────────────────────────────────
Base = declarative_base()

# ── DB Dependency (use this in every router) ───────────────────────────────
def get_db() -> Generator:
    """
    FastAPI dependency — yields a DB session and always closes it.

    Usage:
        @router.get("/")
        def my_route(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()          # rollback on any unhandled exception
        raise
    finally:
        db.close()

# ── Table Init (only for dev/SQLite) ──────────────────────────────────────
def init_db():
    """
    Creates all tables if they don't exist.
    Call once at app startup — safe to call repeatedly.
    In production use Alembic migrations instead.
    """
    from . import models          # noqa: F401 — ensures models are registered
    Base.metadata.create_all(bind=engine)