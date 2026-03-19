from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Order, Product, StockHistory
from ..schemas import OrderCreate, OrderResponse
from datetime import datetime
from typing import Optional

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)


# ── Get all orders ─────────────────────────────────────────────────────────
@router.get("/", response_model=list[OrderResponse])
def get_orders(
    db:         Session = Depends(get_db),
    product_id: Optional[int] = Query(None),
    status:     Optional[str] = Query(None),
    skip:       int = Query(0, ge=0),
    limit:      int = Query(100, ge=1, le=500),
):
    query = db.query(Order)

    if product_id:
        query = query.filter(Order.product_id == product_id)

    if status:
        query = query.filter(Order.status == status)

    return query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()


# ── Get single order ───────────────────────────────────────────────────────
@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return order


# ── Create order ───────────────────────────────────────────────────────────
@router.post("/", response_model=OrderResponse)
def create_order(data: OrderCreate, db: Session = Depends(get_db)):

    product = db.query(Product).filter(
        Product.id == data.product_id,
        Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.stock < data.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough stock. Available: {product.stock}, Requested: {data.quantity}"
        )

    # calculate price at time of order
    unit_price  = data.unit_price or product.price
    total_price = unit_price * data.quantity

    # deduct stock
    old_stock     = product.stock
    product.stock -= data.quantity
    product.updated_at = datetime.utcnow()

    # create order
    order = Order(
        product_id  = data.product_id,
        quantity    = data.quantity,
        unit_price  = unit_price,
        total_price = total_price,
        status      = "confirmed",
        note        = data.note,
        created_at  = datetime.utcnow(),
        updated_at  = datetime.utcnow(),
    )
    db.add(order)

    # log stock change
    db.add(StockHistory(
        product_id   = data.product_id,
        change       = -data.quantity,
        stock_before = old_stock,
        stock_after  = product.stock,
        action       = "sale",
        note         = f"Order created",
        created_at   = datetime.utcnow(),
    ))

    db.commit()
    db.refresh(order)

    return order


# ── Update order status ────────────────────────────────────────────────────
@router.put("/{order_id}", response_model=OrderResponse)
def update_order(order_id: int, data: dict, db: Session = Depends(get_db)):

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    allowed_statuses = {"pending", "confirmed", "shipped", "delivered", "cancelled"}

    if "status" in data:
        if data["status"] not in allowed_statuses:
            raise HTTPException(status_code=400, detail=f"Status must be one of {allowed_statuses}")

        # if cancelling — restore stock
        if data["status"] == "cancelled" and order.status != "cancelled":
            product = db.query(Product).filter(Product.id == order.product_id).first()
            if product:
                old_stock      = product.stock
                product.stock += order.quantity
                product.updated_at = datetime.utcnow()

                db.add(StockHistory(
                    product_id   = order.product_id,
                    change       = order.quantity,
                    stock_before = old_stock,
                    stock_after  = product.stock,
                    action       = "return",
                    note         = f"Order #{order_id} cancelled",
                    created_at   = datetime.utcnow(),
                ))

        order.status = data["status"]

    if "note" in data:
        order.note = data["note"]

    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)

    return order


# ── Delete order ───────────────────────────────────────────────────────────
@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # restore stock if not already cancelled
    if order.status != "cancelled":
        product = db.query(Product).filter(Product.id == order.product_id).first()
        if product:
            old_stock      = product.stock
            product.stock += order.quantity
            product.updated_at = datetime.utcnow()

            db.add(StockHistory(
                product_id   = order.product_id,
                change       = order.quantity,
                stock_before = old_stock,
                stock_after  = product.stock,
                action       = "return",
                note         = f"Order #{order_id} deleted",
                created_at   = datetime.utcnow(),
            ))

    db.delete(order)
    db.commit()

    return {"message": f"Order #{order_id} deleted"}