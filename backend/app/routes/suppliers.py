from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Supplier, Product
from ..schemas import SupplierCreate, SupplierResponse
from datetime import datetime
from typing import Optional

router = APIRouter(
    prefix="/suppliers",
    tags=["Suppliers"]
)


# ── Get all suppliers ──────────────────────────────────────────────────────
@router.get("/", response_model=list[SupplierResponse])
def get_suppliers(
    db:     Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search by name or email"),
    skip:   int = Query(0, ge=0),
    limit:  int = Query(100, ge=1, le=500),
):
    query = db.query(Supplier).filter(Supplier.is_active == True)

    if search:
        query = query.filter(
            Supplier.name.ilike(f"%{search}%") |
            Supplier.email.ilike(f"%{search}%")
        )

    return query.offset(skip).limit(limit).all()


# ── Get single supplier ────────────────────────────────────────────────────
@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):

    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.is_active == True
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    return supplier


# ── Create supplier ────────────────────────────────────────────────────────
@router.post("/", response_model=SupplierResponse)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):

    # duplicate email check
    if data.email:
        existing = db.query(Supplier).filter(Supplier.email == data.email).first()
        if existing:
            raise HTTPException(status_code=409, detail="Supplier with this email already exists")

    supplier = Supplier(
        name           = data.name.strip(),
        phone          = data.phone,
        email          = data.email,
        address        = data.address,
        lead_time_days = data.lead_time_days or 7,
        is_active      = True,
        created_at     = datetime.utcnow(),
    )

    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    return supplier


# ── Update supplier ────────────────────────────────────────────────────────
@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: int, data: SupplierCreate, db: Session = Depends(get_db)):

    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.is_active == True
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    supplier.name           = data.name.strip()
    supplier.phone          = data.phone
    supplier.email          = data.email
    supplier.address        = data.address
    supplier.lead_time_days = data.lead_time_days or supplier.lead_time_days

    db.commit()
    db.refresh(supplier)

    return supplier


# ── Soft delete ────────────────────────────────────────────────────────────
@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):

    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.is_active == True
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # check if any active products linked
    linked = db.query(Product).filter(
        Product.supplier_id == supplier_id,
        Product.is_active == True
    ).count()

    if linked > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete — {linked} active product(s) linked to this supplier"
        )

    supplier.is_active = False
    db.commit()

    return {"message": f"Supplier '{supplier.name}' deleted"}


# ── Get supplier's products ────────────────────────────────────────────────
@router.get("/{supplier_id}/products")
def get_supplier_products(supplier_id: int, db: Session = Depends(get_db)):

    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.is_active == True
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    products = db.query(Product).filter(
        Product.supplier_id == supplier_id,
        Product.is_active == True
    ).all()

    return {
        "supplier": supplier.name,
        "total":    len(products),
        "products": products,
    }