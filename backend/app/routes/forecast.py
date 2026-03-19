from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Product, Order
from ..ml.forecast_model import demand_forecast
from collections import defaultdict
from typing import Optional

router = APIRouter(prefix="/forecast", tags=["Forecast"])


# ── Helper: Cold Start Category Average ────────────────────────────────────
def _get_category_monthly_avg(db: Session, category: str) -> int:
    """
    Calculates the average monthly sales per product for a given category.
    Used as a fallback for new products with 0 data points.
    """
    cat_products = db.query(Product.id).filter(Product.category == category).all()
    cat_ids = [p.id for p in cat_products]

    if not cat_ids:
        return 10  # Default safe baseline if category is completely new

    orders = db.query(Order.quantity, Order.created_at).filter(Order.product_id.in_(cat_ids)).all()

    if not orders:
        return 10

    # Group category sales by month
    monthly = defaultdict(int)
    for o in orders:
        key = o.created_at.strftime("%Y-%m")
        monthly[key] += o.quantity

    # Total average monthly sales for the whole category
    avg_cat_monthly = sum(monthly.values()) / len(monthly)
    
    # Average monthly sales PER PRODUCT in this category
    avg_per_product = avg_cat_monthly / len(cat_ids)

    # Return at least 5 units to ensure a safe initial stock
    return max(5, int(round(avg_per_product)))


# ── Global forecast (all products combined) ────────────────────────────────
@router.get("/")
def get_forecast(
    db:      Session = Depends(get_db),
    horizon: int = Query(3, ge=1, le=12, description="Months to forecast"),
):
    orders = db.query(Order).all()

    if not orders:
        return {
            "model":             "N/A",
            "historical_points": 0,
            "forecast_horizon":  horizon,
            "forecast":          [],
            "recommended_stock": 0,
            "message":           "No order data available for forecasting",
        }

    # aggregate real monthly sales from orders
    monthly = defaultdict(int)
    for order in orders:
        key = order.created_at.strftime("%Y-%m")
        monthly[key] += order.quantity

    # sort chronologically and extract sales values
    sorted_months = sorted(monthly.keys())
    sales_series  = [monthly[m] for m in sorted_months]

    result = demand_forecast(sales_series, horizon=horizon)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    # recommended stock = avg forecast * 1.2 safety buffer
    predicted_values = [f["predicted_demand"] for f in result["forecast"]]
    recommended      = int(sum(predicted_values) / len(predicted_values) * 1.2) if predicted_values else 0

    return {
        **result,
        "recommended_stock": recommended,
        "months_used":       sorted_months,
    }


# ── Per-product forecast ───────────────────────────────────────────────────
@router.get("/{product_id}")
def get_product_forecast(
    product_id: int,
    db:         Session = Depends(get_db),
    horizon:    int = Query(3, ge=1, le=12),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    orders = db.query(Order).filter(Order.product_id == product_id).all()

    # ── PHASE 1: Zero Data (Cold Start) ──
    if not orders:
        fallback_avg = _get_category_monthly_avg(db, product.category)
        
        # Generate a mock forecast array based on category average
        mock_forecast = [
            {"month": f"Month +{i}", "predicted_demand": fallback_avg}
            for i in range(1, horizon + 1)
        ]
        
        # Calculate stock metrics based on fallback
        lead_time_days = product.supplier.lead_time_days if getattr(product, "supplier", None) else 7
        reorder_point  = int((fallback_avg / 30) * lead_time_days * 1.2)
        days_of_stock  = int(product.stock / (fallback_avg / 30)) if fallback_avg > 0 else None

        return {
            "product_id":         product_id,
            "product_name":       product.name,
            "current_stock":      product.stock,
            "reorder_point":      reorder_point,
            "days_of_stock_left": days_of_stock,
            "model":              "Category Average (Cold Start Fallback)",
            "historical_points":  0,
            "forecast_horizon":   horizon,
            "forecast":           mock_forecast,
            "message":            f"No order history. Using category '{product.category}' average.",
            "months_used":        [],
        }

    # ── PHASE 2 & 3: Existing Data (Passed to ML model) ──
    monthly = defaultdict(int)
    for order in orders:
        key = order.created_at.strftime("%Y-%m")
        monthly[key] += order.quantity

    sorted_months = sorted(monthly.keys())
    sales_series  = [monthly[m] for m in sorted_months]

    # Model handles Moving Average (1-3 months) or ARIMA (4+ months)
    result = demand_forecast(sales_series, horizon=horizon)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    predicted_values   = [f["predicted_demand"] for f in result["forecast"]]
    avg_monthly_demand = sum(predicted_values) / len(predicted_values) if predicted_values else 0
    lead_time_days     = getattr(product, "supplier", None).lead_time_days if getattr(product, "supplier", None) else 7
    reorder_point      = int((avg_monthly_demand / 30) * lead_time_days * 1.2)
    days_of_stock      = int(product.stock / (avg_monthly_demand / 30)) if avg_monthly_demand > 0 else None

    return {
        "product_id":         product_id,
        "product_name":       product.name,
        "current_stock":      product.stock,
        "reorder_point":      reorder_point,
        "days_of_stock_left": days_of_stock,
        **result,
        "months_used":        sorted_months,
    }