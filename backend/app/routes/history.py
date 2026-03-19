from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import StockHistory, Product
from ..schemas import StockHistoryResponse
from typing import Optional

router = APIRouter(
    prefix="/history",
    tags=["Stock History"]
)


# ── Get history by product ─────────────────────────────────────────────────
@router.get("/{product_id}", response_model=list[StockHistoryResponse])
def get_history(
    product_id: int,
    db:     Session = Depends(get_db),
    action: Optional[str] = Query(None, description="Filter: sale | restock | adjustment | return | damage"),
    skip:   int = Query(0, ge=0),
    limit:  int = Query(100, ge=1, le=500),
):
    # check product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    query = db.query(StockHistory).filter(StockHistory.product_id == product_id)

    if action:
        query = query.filter(StockHistory.action == action)

    return query.order_by(StockHistory.created_at.desc()).offset(skip).limit(limit).all()


# ── Get all history ────────────────────────────────────────────────────────
@router.get("/", response_model=list[StockHistoryResponse])
def get_all_history(
    db:     Session = Depends(get_db),
    action: Optional[str] = Query(None),
    skip:   int = Query(0, ge=0),
    limit:  int = Query(100, ge=1, le=500),
):
    query = db.query(StockHistory)

    if action:
        query = query.filter(StockHistory.action == action)

    return query.order_by(StockHistory.created_at.desc()).offset(skip).limit(limit).all()


# ── Summary per product ────────────────────────────────────────────────────
@router.get("/{product_id}/summary")
def get_history_summary(product_id: int, db: Session = Depends(get_db)):

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    history = db.query(StockHistory).filter(StockHistory.product_id == product_id).all()

    total_added   = sum(h.change for h in history if h.change > 0)
    total_removed = sum(abs(h.change) for h in history if h.change < 0)
    by_action     = {}

    for h in history:
        by_action[h.action] = by_action.get(h.action, 0) + 1

    return {
        "product_id":    product_id,
        "product_name":  product.name,
        "current_stock": product.stock,
        "total_added":   total_added,
        "total_removed": total_removed,
        "total_entries": len(history),
        "by_action":     by_action,
    }