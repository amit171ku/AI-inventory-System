from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Product, StockHistory
from ..schemas import ProductCreate, ProductResponse
from datetime import datetime
from typing import Optional
import pandas as pd
import io

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)


# ── Create product ─────────────────────────────────────────────────────────
@router.post("/", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):

    # duplicate SKU check
    existing = db.query(Product).filter(Product.sku == product.sku).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"SKU '{product.sku}' already exists")

    db_product = Product(
        **product.dict(),
        created_at = datetime.utcnow(),
        updated_at = datetime.utcnow(),
        is_active  = True,
    )

    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    return db_product


# ── Get all products ───────────────────────────────────────────────────────
@router.get("/", response_model=list[ProductResponse])
def get_products(
    db:       Session = Depends(get_db),
    category: Optional[str] = Query(None, description="Filter by category"),
    search:   Optional[str] = Query(None, description="Search by name or SKU"),
    low_stock: bool         = Query(False, description="Only show low stock items"),
    skip:     int           = Query(0,  ge=0),
    limit:    int           = Query(100, ge=1, le=500),
):
    query = db.query(Product).filter(Product.is_active == True)

    if category:
        query = query.filter(Product.category == category)

    if search:
        query = query.filter(
            Product.name.ilike(f"%{search}%") |
            Product.sku.ilike(f"%{search}%")
        )

    if low_stock:
        query = query.filter(Product.stock <= Product.reorder_point)

    return query.offset(skip).limit(limit).all()


# ── Get single product ─────────────────────────────────────────────────────
@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


# ── Update product ─────────────────────────────────────────────────────────
@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product: ProductCreate, db: Session = Depends(get_db)):

    db_product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()

    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_stock = db_product.stock

    for key, value in product.dict(exclude_unset=True).items():
        setattr(db_product, key, value)

    db_product.updated_at = datetime.utcnow()

    # log stock change if stock was updated
    new_stock = product.dict().get("stock")
    if new_stock is not None and new_stock != old_stock:
        history = StockHistory(
            product_id   = product_id,
            change       = new_stock - old_stock,
            stock_before = old_stock,
            stock_after  = new_stock,
            action       = "adjustment",
            created_at   = datetime.utcnow(),
        )
        db.add(history)

    db.commit()
    db.refresh(db_product)

    return db_product


# ── Soft delete ────────────────────────────────────────────────────────────
@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):

    db_product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()

    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    db_product.is_active  = False
    db_product.updated_at = datetime.utcnow()
    db.commit()

    return {"message": f"Product '{db_product.name}' deleted"}


# ── Bulk upload via CSV ────────────────────────────────────────────────────
@router.post("/bulk-upload")
def bulk_upload_products(file: UploadFile = File(...), db: Session = Depends(get_db)):

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")

    try:
        contents = file.file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse CSV file")

    required_cols = {"name", "sku", "stock", "price"}
    missing = required_cols - set(df.columns.str.lower())
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {missing}")

    df.columns = df.columns.str.lower().str.strip()

    added, skipped, errors = [], [], []

    for i, row in df.iterrows():
        try:
            sku = str(row["sku"]).strip()

            # skip duplicate SKUs
            if db.query(Product).filter(Product.sku == sku).first():
                skipped.append(sku)
                continue

            product = Product(
                name          = str(row["name"]).strip(),
                sku           = sku,
                category      = str(row.get("category", "General")).strip(),
                stock         = int(row["stock"]),
                price         = float(row["price"]),
                cost_price    = float(row["cost_price"]) if "cost_price" in row else None,
                reorder_point = int(row["reorder_point"]) if "reorder_point" in row else 10,
                is_active     = True,
                created_at    = datetime.utcnow(),
                updated_at    = datetime.utcnow(),
            )
            db.add(product)
            added.append(sku)

        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})

    db.commit()

    return {
        "message":  f"{len(added)} products added",
        "added":    added,
        "skipped":  skipped,
        "errors":   errors,
    }