import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA


def demand_forecast(sales_data: list[int | float], horizon: int = 3) -> dict:
    """
    Run ARIMA forecast on real sales data.

    Args:
        sales_data: list of historical sales numbers (oldest first)
        horizon:    how many future periods to forecast (default 3)

    Returns:
        dict with forecast list or error
    """
    try:
        if not sales_data:
            return {"error": "No sales data provided", "message": "Forecast model failed"}

        series = pd.to_numeric(pd.Series(sales_data), errors="coerce").dropna()

        # ── PHASE 2: Simple Moving Average Fallback (1-3 data points) ──
        if len(series) < 4:
            avg = float(series.mean()) if len(series) > 0 else 0.0
            avg = max(0.0, avg)  # Ensure no negative baseline
            
            forecast_data = [
                {
                    "month":            f"Month {len(series) + i + 1}",
                    "predicted_demand": round(avg, 2),
                    "lower_bound":      round(max(0.0, avg * 0.8), 2), # Ensure lower bound doesn't go negative
                    "upper_bound":      round(avg * 1.2, 2),
                }
                for i in range(horizon)
            ]
            return {
                "model":             "Moving Average (fallback — need 4+ data points for ARIMA)",
                "historical_points": len(series),
                "forecast_horizon":  horizon,
                "forecast":          forecast_data,
            }

        # ── PHASE 3: ARIMA Model (4+ data points) ──
        # auto-select ARIMA order based on data length
        p, d, q = 2, 1, 2
        if len(series) < 8:
            p, d, q = 1, 1, 0   # simpler model for short series

        model     = ARIMA(series, order=(p, d, q))
        model_fit = model.fit()

        forecast_result = model_fit.get_forecast(steps=horizon)
        forecast_values = forecast_result.predicted_mean
        conf_int        = forecast_result.conf_int()

        forecast_data = [
            {
                "month":            f"Month {len(series) + i + 1}",
                "predicted_demand": round(max(0.0, float(forecast_values.iloc[i])), 2),
                "lower_bound":      round(max(0.0, float(conf_int.iloc[i, 0])), 2),
                "upper_bound":      round(max(0.0, float(conf_int.iloc[i, 1])), 2),
            }
            for i in range(horizon)
        ]

        return {
            "model":             f"ARIMA ({p},{d},{q})",
            "historical_points": len(series),
            "forecast_horizon":  horizon,
            "forecast":          forecast_data,
        }

    except Exception as e:
        return {
            "error":   str(e),
            "message": "Forecast model failed",
        }