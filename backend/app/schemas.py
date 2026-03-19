from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ── Product ────────────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name:          str
    sku:           str
    category:      str
    stock:         int
    price:         float
    cost_price:    Optional[float] = None
    description:   Optional[str]   = None
    reorder_point: Optional[int]   = 10
    reorder_qty:   Optional[int]   = 50
    supplier_id:   Optional[int]   = None


class ProductResponse(ProductCreate):
    id:         int
    is_active:  bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True   # pydantic v2
        orm_mode        = True   # pydantic v1 fallback


# ── Order ──────────────────────────────────────────────────────────────────
class OrderCreate(BaseModel):
    product_id:  int
    quantity:    int
    unit_price:  Optional[float] = None
    total_price: Optional[float] = None
    status:      Optional[str]   = "pending"
    note:        Optional[str]   = None


class OrderResponse(OrderCreate):
    id:         int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        orm_mode        = True


# ── Supplier ───────────────────────────────────────────────────────────────
class SupplierCreate(BaseModel):
    name:            str
    phone:           Optional[str] = None
    email:           Optional[str] = None
    address:         Optional[str] = None
    lead_time_days:  Optional[int] = 7


class SupplierResponse(SupplierCreate):
    id:         int
    is_active:  bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        orm_mode        = True


# ── StockHistory ───────────────────────────────────────────────────────────
class StockHistoryResponse(BaseModel):
    id:           int
    product_id:   int
    change:       int
    stock_before: Optional[int] = None
    stock_after:  Optional[int] = None
    action:       str
    note:         Optional[str] = None
    created_at:   Optional[datetime] = None

    class Config:
        from_attributes = True
        orm_mode        = True


# ── User ───────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email:    EmailStr
    password: str
    role:     Optional[str] = "viewer"


class UserResponse(BaseModel):
    id:         int
    email:      str
    role:       str
    is_active:  bool
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True
        orm_mode        = True