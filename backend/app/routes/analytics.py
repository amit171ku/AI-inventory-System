from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Product, Order
from datetime import datetime, timedelta
from collections import defaultdict
import calendar
import pytz
router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)

def _low_stock_threshold(product: Product) -> int:
    return max(5, round(product.reorder_point * 0.1)) if product.reorder_point else 10

def _stock_status(stock: int, threshold: int) -> str:
    if stock == 0:            return "out_of_stock"
    if stock < threshold:     return "low"
    if stock < threshold * 3: return "moderate"
    return "healthy"

@router.get("/")
def get_analytics(db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_active == True).all()
    
    if not products:
        raise HTTPException(status_code=404, detail="No products found")

    now = datetime.now(pytz.timezone("Asia/Kolkata"))
    cutoff = now - timedelta(days=365)

    # ── Database-Level Aggregations (Saves Memory) ─────────────────────────
    # Get total sales per product without loading all order rows
    sales_data = db.query(
        Order.product_id, 
        func.sum(Order.quantity).label("total_qty")
    ).group_by(Order.product_id).all()
    product_sales = {row.product_id: row.total_qty for row in sales_data}

    # Get recent orders for the sales trend
    recent_orders = db.query(Order).filter(Order.created_at >= cutoff).all()

    # ── KPIs ───────────────────────────────────────────────────────────────
    total_value = sum(p.stock * p.price for p in products)
    total_units = sum(p.stock for p in products)
    total_skus = len(products)
    avg_unit_price = round(total_value / total_units, 2) if total_units else 0

    # ── Stock data ─────────────────────────────────────────────────────────
    stock_data = []
    status_counts = defaultdict(int)

    for p in products:
        threshold = _low_stock_threshold(p)
        status = _stock_status(p.stock, threshold)
        status_counts[status] += 1
        sold = product_sales.get(p.id, 0)

        stock_data.append({
            "product":       p.name,
            "category":      p.category,
            "stock":         p.stock,
            "price":         p.price,
            "value":         round(p.stock * p.price, 2),
            "status":        status,
            "threshold":     threshold,
            "units_sold":    sold,
            "turnover_rate": round(sold / p.stock, 2) if p.stock > 0 else None,
        })

    priority_map = {"out_of_stock": 0, "low": 1, "moderate": 2, "healthy": 3}
    stock_data.sort(key=lambda x: priority_map[x["status"]])

    # ── Category distribution ──────────────────────────────────────────────
    category_map = defaultdict(lambda: {"count": 0, "value": 0.0})
    for p in products:
        category_map[p.category]["count"] += 1
        category_map[p.category]["value"] += p.stock * p.price

    category_data = sorted([
        {
            "name":    cat,
            "value":   data["count"],
            "revenue": round(data["value"], 2),
            "pct":     round(data["count"] / total_skus * 100, 1),
        }
        for cat, data in category_map.items()
    ], key=lambda x: x["value"], reverse=True)

    # ── Sales trend (Fixed Year Wrap-around Bug) ───────────────────────────
    sales_map = defaultdict(lambda: {"sales": 0, "revenue": 0.0, "orders": 0})
    
    for o in recent_orders:
        # Use YYYY-MM to prevent mixing months from different years
        m_key = o.created_at.strftime("%Y-%m") 
        sales_map[m_key]["sales"] += o.quantity
        sales_map[m_key]["revenue"] += getattr(o, "total_price", 0) or 0
        sales_map[m_key]["orders"] += 1

    # Sort chronologically by the YYYY-MM key, then format for display
    sales_trend = []
    for m_key in sorted(sales_map.keys()):
        # Convert "2023-03" back to "Mar" for frontend display, but ordered correctly
        month_name = calendar.month_abbr[int(m_key.split('-')[1])] 
        sales_trend.append({
            "month":   f"{month_name} '{m_key[2:4]}", # e.g., "Mar '25"
            "sales":   sales_map[m_key]["sales"],
            "revenue": round(sales_map[m_key]["revenue"], 2),
            "orders":  sales_map[m_key]["orders"],
        })

    # ── Top products ───────────────────────────────────────────────────────
    product_map = {p.id: p.name for p in products}
    top_products = sorted(
        [{"product_id": pid, "name": product_map.get(pid, "Unknown"), "units_sold": qty}
         for pid, qty in product_sales.items()],
        key=lambda x: x["units_sold"], reverse=True
    )[:5]

    # ── Insights ───────────────────────────────────────────────────────────
    insights = []
    for p in products:
        threshold = _low_stock_threshold(p)
        if p.stock == 0:
            insights.append({"type": "danger",  "product": p.name, "message": f"{p.name} is out of stock.",              "action": "Reorder immediately"})
        elif p.stock < threshold:
            insights.append({"type": "warning", "product": p.name, "message": f"{p.name} is running low ({p.stock}).",   "action": f"Reorder — threshold: {threshold}"})
        if p.stock > 0 and product_sales.get(p.id, 0) == 0:
            insights.append({"type": "info",    "product": p.name, "message": f"{p.name} has {p.stock} units, no sales.", "action": "Consider a promotion"})

    if category_data and category_data[0]["pct"] > 60:
        insights.append({"type": "info", "product": None,
                         "message": f"Over 60% inventory in '{category_data[0]['name']}'.",
                         "action": "Diversify stock"})

    # ── KPI block ──────────────────────────────────────────────────────────
    total_revenue = sum(getattr(o, "total_price", 0) or 0 for o in recent_orders)

    kpis = {
        "total_inventory_value": round(total_value, 2),
        "total_units_in_stock":  total_units,
        "total_skus":            total_skus,
        "avg_unit_price":        avg_unit_price,
        "total_orders":          db.query(func.count(Order.id)).scalar(), # Fast DB count
        "total_revenue":         round(total_revenue, 2),
        "orders_last_12m":       len(recent_orders),
        "out_of_stock_count":    status_counts["out_of_stock"],
        "low_stock_count":       status_counts["low"],
        "healthy_stock_count":   status_counts["healthy"],
    }

    return {
        "generated_at":  now.isoformat(),
        "kpis":          kpis,
        "stock_data":    stock_data,
        "category_data": category_data,
        "sales_trend":   sales_trend,
        "top_products":  top_products,
        "insights":      insights,
    }


@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_active == True).all()
    total_orders = db.query(func.count(Order.id)).scalar()
    
    total_value = sum(p.stock * p.price for p in products)
    
    # Fixed: Now correctly uses the _low_stock_threshold function
    low_stock_count = sum(1 for p in products if 0 < p.stock < _low_stock_threshold(p))

    return {
        "inventory_value": round(total_value, 2),
        "total_units":     sum(p.stock for p in products),
        "total_skus":      len(products),
        "total_orders":    total_orders,
        "out_of_stock":    sum(1 for p in products if p.stock == 0),
        "low_stock":       low_stock_count,
    }


@router.get("/insights")
def get_insights(db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_active == True).all()
    
    # Fast database aggregation for product sales
    sales_data = db.query(Order.product_id, func.sum(Order.quantity).label("total_qty")).group_by(Order.product_id).all()
    product_sales = {row.product_id: row.total_qty for row in sales_data}

    insights = []
    for p in products:
        threshold = _low_stock_threshold(p)
        if p.stock == 0:
            insights.append({"type": "danger",  "product": p.name, "message": f"{p.name} is out of stock.",            "action": "Reorder immediately"})
        elif p.stock < threshold:
            insights.append({"type": "warning", "product": p.name, "message": f"{p.name} low stock ({p.stock} left).", "action": "Reorder soon"})
        if p.stock > 0 and product_sales.get(p.id, 0) == 0:
            insights.append({"type": "info",    "product": p.name, "message": f"{p.name} has no sales.",              "action": "Review pricing or run a promo"})

    return {"count": len(insights), "insights": insights}