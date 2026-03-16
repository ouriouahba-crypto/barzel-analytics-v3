"""
Barzel Analytics V3 — Predict Router

POST /api/predict   → price + yield + DOM predictions
GET  /api/predict/metrics → model performance metrics
GET  /api/predict/retrain → force retrain (admin use)
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()


class PredictInput(BaseModel):
    district: str
    property_type: str = "apartment"
    bedrooms: int = 2
    bathrooms: int = 2
    size_sqm: float
    floor_percentile: float = Field(0.5, ge=0.0, le=1.0)
    view_quality: int = Field(3, ge=1, le=5)
    renovation_status: str = "original"
    age_years: int = 5
    parking_spaces: int = 1
    has_balcony: bool = True
    has_maids_room: bool = False
    furnishing: str = "unfurnished"
    dist_to_metro_m: int = 500
    dist_to_mall_m: int = 1000
    dist_to_beach_m: int = 2000
    service_charge_aed_per_sqm_year: float = 30.0
    month_listed: int = Field(3, ge=1, le=12)
    year_listed: int = 2025


@router.post("")
async def predict(body: PredictInput):
    """
    Predict price/sqm, gross yield, and days-on-market for a given property.
    Context features (district medians, trends) are auto-filled from the dataset.
    """
    from services.predictive_model import predict as _predict
    return _predict(body.model_dump())


@router.get("/metrics")
async def get_metrics():
    """Return R² and MAE for all three models."""
    from services.predictive_model import _metrics
    return _metrics


@router.get("/retrain")
async def retrain():
    """Force retrain all models from df_global (drops cached .pkl)."""
    from services.predictive_model import retrain as _retrain
    metrics = _retrain()
    return {"status": "retrained", "metrics": metrics}
