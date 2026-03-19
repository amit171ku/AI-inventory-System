from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Product, Order
from datetime import datetime, timedelta

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ── Get notifications ──────────────────────────────────────────────────────
@router.get("/")
def get_notifications(
    db:       Session = Depends(get_db),
    priority: str = Query(None, description="Filter: high | medium | low"),
):
    products = db.query(Product).filter(Product.is_active == True).all()
    orders   = db.query(Order).all()
    now      = datetime.utcnow()

    notifications = []

    # ── Stock alerts ───────────────────────────────────────────────────────
    for p in products:
        threshold = p.reorder_point or 10

        if p.stock == 0:
            notifications.append({
                "id":       f"out_{p.id}",
                "type":     "stock",
                "priority": "high",
                "title":    "Out of Stock",
                "message":  f"{p.name} is completely out of stock.",
                "action":   "Reorder immediately",
                "product":  p.name,
                "created_at": now.isoformat(),
            })

        elif p.stock < threshold:
            notifications.append({
                "id":       f"low_{p.id}",
                "type":     "stock",
                "priority": "medium",
                "title":    "Low Stock",
                "message":  f"{p.name} has only {p.stock} units left (threshold: {threshold}).",
                "action":   "Consider reordering",
                "product":  p.name,
                "created_at": now.isoformat(),
            })

    # ── Pending orders alert ───────────────────────────────────────────────
    pending = [o for o in orders if getattr(o, "status", None) == "pending"]
    if pending:
        notifications.append({
            "id":       "pending_orders",
            "type":     "order",
            "priority": "medium",
            "title":    "Pending Orders",
            "message":  f"{len(pending)} order(s) are still pending.",
            "action":   "Review and confirm orders",
            "product":  None,
            "created_at": now.isoformat(),
        })

    # ── Dead stock alert (no sales in 30 days) ─────────────────────────────
    cutoff          = now - timedelta(days=30)
    recent_product_ids = set(
        o.product_id for o in orders
        if o.created_at >= cutoff
    )

    for p in products:
        if p.stock > 50 and p.id not in recent_product_ids:
            notifications.append({
                "id":       f"dead_{p.id}",
                "type":     "insight",
                "priority": "low",
                "title":    "Slow Moving Stock",
                "message":  f"{p.name} has {p.stock} units with no sales in 30 days.",
                "action":   "Consider a promotion or price adjustment",
                "product":  p.name,
                "created_at": now.isoformat(),
            })

    # ── Filter by priority ─────────────────────────────────────────────────
    if priority:
        notifications = [n for n in notifications if n["priority"] == priority]

    # ── Sort: high → medium → low ──────────────────────────────────────────
    order_map = {"high": 0, "medium": 1, "low": 2}
    notifications.sort(key=lambda x: order_map.get(x["priority"], 3))

    return {
        "count":         len(notifications),
        "high":          sum(1 for n in notifications if n["priority"] == "high"),
        "medium":        sum(1 for n in notifications if n["priority"] == "medium"),
        "low":           sum(1 for n in notifications if n["priority"] == "low"),
        "notifications": notifications,
    }


# ── Unread count only (for navbar badge) ──────────────────────────────────
@router.get("/count")
def get_notification_count(db: Session = Depends(get_db)):

    products = db.query(Product).filter(Product.is_active == True).all()

    high   = sum(1 for p in products if p.stock == 0)
    medium = sum(1 for p in products if 0 < p.stock < (p.reorder_point or 10))

    return {
        "total":  high + medium,
        "high":   high,
        "medium": medium,
    }