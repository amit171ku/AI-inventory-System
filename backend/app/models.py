from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    ForeignKey, Boolean, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime


# ── Product ────────────────────────────────────────────────────────────────
class Product(Base):

    __tablename__ = "products"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False, index=True)
    sku           = Column(String, unique=True, nullable=False, index=True)
    category      = Column(String, nullable=False, index=True)
    description   = Column(Text, nullable=True)

    stock         = Column(Integer, default=0, nullable=False)
    price         = Column(Float, nullable=False)
    cost_price    = Column(Float, nullable=True)       # for profit margin calc
    reorder_point = Column(Integer, default=10)        # low stock threshold
    reorder_qty   = Column(Integer, default=50)        # how much to reorder

    supplier_id   = Column(Integer, ForeignKey("suppliers.id"), nullable=True)

    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationships
    supplier      = relationship("Supplier", back_populates="products")
    orders        = relationship("Order", back_populates="product")
    stock_history = relationship("StockHistory", back_populates="product")


# ── StockHistory ───────────────────────────────────────────────────────────
class StockHistory(Base):

    __tablename__ = "stock_history"

    id            = Column(Integer, primary_key=True, index=True)
    product_id    = Column(Integer, ForeignKey("products.id"), nullable=False)

    change        = Column(Integer, nullable=False)   # +ve = added, -ve = removed
    stock_before  = Column(Integer, nullable=True)    # snapshot before change
    stock_after   = Column(Integer, nullable=True)    # snapshot after change

    # action: "sale" | "restock" | "adjustment" | "return" | "damage"
    action        = Column(String, nullable=False)
    note          = Column(Text, nullable=True)

    created_at    = Column(DateTime, default=datetime.utcnow, index=True)

    # relationships
    product       = relationship("Product", back_populates="stock_history")


# ── Order ──────────────────────────────────────────────────────────────────
class Order(Base):

    __tablename__ = "orders"

    id            = Column(Integer, primary_key=True, index=True)
    product_id    = Column(Integer, ForeignKey("products.id"), nullable=False)

    quantity      = Column(Integer, nullable=False)
    unit_price    = Column(Float, nullable=True)      # price at time of order
    total_price   = Column(Float, nullable=True)      # quantity × unit_price

    # status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
    status        = Column(String, default="pending")
    note          = Column(Text, nullable=True)

    created_at    = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationships
    product       = relationship("Product", back_populates="orders")


# ── Supplier ───────────────────────────────────────────────────────────────
class Supplier(Base):

    __tablename__ = "suppliers"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    phone         = Column(String, nullable=True)
    email         = Column(String, nullable=True)
    address       = Column(Text, nullable=True)

    lead_time_days= Column(Integer, default=7)        # avg delivery days
    is_active     = Column(Boolean, default=True)

    created_at    = Column(DateTime, default=datetime.utcnow)

    # relationships
    products      = relationship("Product", back_populates="supplier")


# ── User ───────────────────────────────────────────────────────────────────
class User(Base):

    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, nullable=False, index=True)
    password      = Column(String, nullable=False)    # store hashed, never plain

    # role: "admin" | "manager" | "viewer"
    role          = Column(String, default="viewer")
    is_active     = Column(Boolean, default=True)

    created_at    = Column(DateTime, default=datetime.utcnow)
    last_login    = Column(DateTime, nullable=True)