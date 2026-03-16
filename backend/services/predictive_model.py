"""
Barzel Analytics V3 — Predictive Model Service

Three Random Forest models trained at startup on df_global:
  1. price_per_sqm_aed     (pricing)
  2. gross_yield_pct       (yield)
  3. days_on_market        (liquidity / speed of sale)

Categorical encoding via LabelEncoder.
Models persisted to backend/models/ with joblib.
"""

from __future__ import annotations

import os
import math
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import r2_score, mean_absolute_error
from sklearn.model_selection import train_test_split

from services.kpi_engine import df_global

# ─────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────

_MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(_MODELS_DIR, exist_ok=True)

_PKL = {
    "price":    os.path.join(_MODELS_DIR, "model_price.pkl"),
    "yield":    os.path.join(_MODELS_DIR, "model_yield.pkl"),
    "dom":      os.path.join(_MODELS_DIR, "model_dom.pkl"),
    "encoders": os.path.join(_MODELS_DIR, "label_encoders.pkl"),
    "metrics":  os.path.join(_MODELS_DIR, "metrics.pkl"),
    "district_context": os.path.join(_MODELS_DIR, "district_context.pkl"),
}

# ─────────────────────────────────────────────
# FEATURE DEFINITIONS
# ─────────────────────────────────────────────

CATEGORICAL = ["district", "property_type", "renovation_status", "furnishing"]

FEATURES_PRICE = [
    "district", "property_type", "bedrooms", "bathrooms",
    "size_sqm", "floor_percentile", "view_quality",
    "renovation_status", "age_years", "parking_spaces",
    "has_balcony", "has_maids_room",
    "dist_to_metro_m", "dist_to_mall_m", "dist_to_beach_m",
    "service_charge_aed_per_sqm_year",
    "district_median_price_sqm_at_listing",
    "month_listed", "year_listed",
    "price_trend_6m", "price_trend_12m",
]

FEATURES_YIELD = [
    "district", "property_type", "bedrooms", "size_sqm",
    "floor_percentile", "view_quality", "renovation_status",
    "age_years", "furnishing", "vacancy_days_est",
    "service_charge_aed_per_sqm_year",
    "dist_to_metro_m", "dist_to_mall_m",
    "district_avg_dom_at_listing",
    "month_listed", "year_listed",
]

FEATURES_DOM = [
    "district", "property_type", "bedrooms", "size_sqm",
    "floor_percentile", "view_quality", "price_per_sqm_aed",
    "price_vs_district_median_pct",
    "gross_yield_pct", "furnishing",
    "dist_to_metro_m", "dist_to_beach_m",
    "district_supply_count_at_listing",
    "month_listed", "quarter_listed", "year_listed",
    "price_trend_3m", "price_trend_6m",
]

RF_PARAMS = dict(
    n_estimators=200,
    max_depth=12,
    min_samples_leaf=5,
    n_jobs=-1,
    random_state=42,
)

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _bool_to_int(df: pd.DataFrame) -> pd.DataFrame:
    """Convert boolean columns to int so RF can handle them."""
    for col in df.select_dtypes(include="bool").columns:
        df[col] = df[col].astype(int)
    return df


def _encode(df: pd.DataFrame, encoders: dict[str, LabelEncoder],
            fit: bool = False) -> pd.DataFrame:
    df = df.copy()
    for col in CATEGORICAL:
        if col not in df.columns:
            continue
        if fit:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            encoders[col] = le
        else:
            le = encoders[col]
            # Handle unseen labels gracefully
            known = set(le.classes_)
            df[col] = df[col].astype(str).apply(
                lambda v: v if v in known else le.classes_[0]
            )
            df[col] = le.transform(df[col])
    return df


def _prepare(df: pd.DataFrame, features: list[str],
             target: str, encoders: dict, fit: bool) -> tuple:
    sub = df[features + [target]].dropna().copy()
    sub = _bool_to_int(sub)
    sub = _encode(sub, encoders, fit=fit)
    X = sub[features].values
    y = sub[target].values
    return X, y


# ─────────────────────────────────────────────
# DISTRICT CONTEXT (auto-fill for inference)
# Computed from the last 6 months of data
# ─────────────────────────────────────────────

def _build_district_context(df: pd.DataFrame) -> dict[str, dict]:
    """
    For each district, compute the median of context features
    from the most recent 6 months in the dataset.
    Used to auto-fill missing inference fields.
    """
    df = df.copy()
    df["period"] = (
        df["year_listed"].astype(str) + "-" + df["month_listed"].astype(str).str.zfill(2)
    )
    recent_cutoff = sorted(df["period"].unique())[-6]
    recent = df[df["period"] >= recent_cutoff]

    ctx: dict[str, dict] = {}
    for d in df["district"].unique():
        sub = recent[recent["district"] == d]
        if len(sub) == 0:
            sub = df[df["district"] == d]
        ctx[d] = {
            "district_median_price_sqm_at_listing": float(sub["price_per_sqm_aed"].median()),
            "district_avg_dom_at_listing":          float(sub["days_on_market"].median()),
            "district_supply_count_at_listing":     int(len(sub) / 6),
            "price_vs_district_median_pct":         0.0,
            "vacancy_days_est":                     float(sub["vacancy_days_est"].median()),
            "price_trend_3m":                       float(sub["price_trend_3m"].mean()),
            "price_trend_6m":                       float(sub["price_trend_6m"].mean()),
            "price_trend_12m":                      float(sub["price_trend_12m"].mean()),
            "quarter_listed":                       int(sub["quarter_listed"].mode().iloc[0]) if len(sub) else 4,
        }
    return ctx


# ─────────────────────────────────────────────
# TRAIN
# ─────────────────────────────────────────────

def _train_all() -> tuple:
    """Train the three models, return (models, encoders, metrics, district_ctx)."""
    print("[PredictiveModel] Training models on df_global …")
    df = df_global.copy()

    # Fit ALL categorical encoders upfront across union of all feature sets
    encoders: dict[str, LabelEncoder] = {}
    df_enc = df.copy()
    df_enc = _bool_to_int(df_enc)
    for col in CATEGORICAL:
        if col in df_enc.columns:
            le = LabelEncoder()
            le.fit(df_enc[col].astype(str))
            encoders[col] = le

    # ── Model 1: Price ──────────────────────
    X_p, y_p = _prepare(df, FEATURES_PRICE, "price_per_sqm_aed", encoders, fit=False)
    X_tr, X_te, y_tr, y_te = train_test_split(X_p, y_p, test_size=0.15, random_state=42)
    rf_price = RandomForestRegressor(**RF_PARAMS)
    rf_price.fit(X_tr, y_tr)
    y_hat = rf_price.predict(X_te)
    m_price = {
        "r2":  round(r2_score(y_te, y_hat), 4),
        "mae": round(mean_absolute_error(y_te, y_hat), 0),
    }
    print(f"  [Price]  R²={m_price['r2']:.4f}  MAE={m_price['mae']:.0f} AED/sqm")

    # ── Model 2: Yield ──────────────────────
    X_y, y_y = _prepare(df, FEATURES_YIELD, "gross_yield_pct", encoders, fit=False)
    X_tr, X_te, y_tr, y_te = train_test_split(X_y, y_y, test_size=0.15, random_state=42)
    rf_yield = RandomForestRegressor(**RF_PARAMS)
    rf_yield.fit(X_tr, y_tr)
    y_hat = rf_yield.predict(X_te)
    m_yield = {
        "r2":  round(r2_score(y_te, y_hat), 4),
        "mae": round(mean_absolute_error(y_te, y_hat), 2),
    }
    print(f"  [Yield]  R²={m_yield['r2']:.4f}  MAE={m_yield['mae']:.2f}%")

    # ── Model 3: DOM ─────────────────────────
    X_d, y_d = _prepare(df, FEATURES_DOM, "days_on_market", encoders, fit=False)
    X_tr, X_te, y_tr, y_te = train_test_split(X_d, y_d, test_size=0.15, random_state=42)
    rf_dom = RandomForestRegressor(**RF_PARAMS)
    rf_dom.fit(X_tr, y_tr)
    y_hat = rf_dom.predict(X_te)
    m_dom = {
        "r2":  round(r2_score(y_te, y_hat), 4),
        "mae": round(mean_absolute_error(y_te, y_hat), 1),
    }
    print(f"  [DOM]    R²={m_dom['r2']:.4f}  MAE={m_dom['mae']:.1f} days")

    metrics = {"price": m_price, "yield": m_yield, "dom": m_dom}
    models  = {"price": rf_price, "yield": rf_yield, "dom": rf_dom}
    dist_ctx = _build_district_context(df)

    # Persist
    joblib.dump(rf_price,  _PKL["price"])
    joblib.dump(rf_yield,  _PKL["yield"])
    joblib.dump(rf_dom,    _PKL["dom"])
    joblib.dump(encoders,  _PKL["encoders"])
    joblib.dump(metrics,   _PKL["metrics"])
    joblib.dump(dist_ctx,  _PKL["district_context"])
    print("[PredictiveModel] Models saved to backend/models/")

    return models, encoders, metrics, dist_ctx


def _load_all() -> tuple:
    models = {
        "price": joblib.load(_PKL["price"]),
        "yield": joblib.load(_PKL["yield"]),
        "dom":   joblib.load(_PKL["dom"]),
    }
    encoders = joblib.load(_PKL["encoders"])
    metrics  = joblib.load(_PKL["metrics"])
    dist_ctx = joblib.load(_PKL["district_context"])
    print("[PredictiveModel] Models loaded from disk.")
    return models, encoders, metrics, dist_ctx


# ─────────────────────────────────────────────
# STARTUP: train or load
# ─────────────────────────────────────────────

_all_pkl_exist = all(os.path.exists(p) for p in [
    _PKL["price"], _PKL["yield"], _PKL["dom"], _PKL["encoders"]
])

if _all_pkl_exist:
    _models, _encoders, _metrics, _district_ctx = _load_all()
else:
    _models, _encoders, _metrics, _district_ctx = _train_all()


# ─────────────────────────────────────────────
# FEATURE IMPORTANCE HELPER
# ─────────────────────────────────────────────

def _top_importances(rf: RandomForestRegressor, features: list[str],
                     top_n: int = 8) -> list[dict]:
    imp = rf.feature_importances_
    pairs = sorted(zip(features, imp), key=lambda x: -x[1])[:top_n]
    return [{"feature": f, "importance": round(float(v), 4)} for f, v in pairs]


# ─────────────────────────────────────────────
# PUBLIC PREDICT FUNCTION
# ─────────────────────────────────────────────

def predict(input_dict: dict) -> dict:
    """
    Given an input dict (from POST /api/predict), return predictions for
    price_per_sqm, gross_yield, days_on_market, confidence, and feature importances.

    Context features (district_median_price_sqm_at_listing, etc.) are auto-filled
    from _district_ctx if not provided in input_dict.
    """
    district = input_dict.get("district", "Dubai Marina")
    ctx = _district_ctx.get(district, {})

    # ── Build full feature row ────────────────
    def v(key: str, fallback=0):
        return input_dict.get(key, ctx.get(key, fallback))

    row_price = {
        "district":       district,
        "property_type":  v("property_type", "apartment"),
        "bedrooms":       v("bedrooms", 2),
        "bathrooms":      v("bathrooms", 2),
        "size_sqm":       v("size_sqm", 100),
        "floor_percentile": v("floor_percentile", 0.5),
        "view_quality":   v("view_quality", 3),
        "renovation_status": v("renovation_status", "original"),
        "age_years":      v("age_years", 5),
        "parking_spaces": v("parking_spaces", 1),
        "has_balcony":    int(bool(v("has_balcony", True))),
        "has_maids_room": int(bool(v("has_maids_room", False))),
        "dist_to_metro_m": v("dist_to_metro_m", 500),
        "dist_to_mall_m":  v("dist_to_mall_m", 1000),
        "dist_to_beach_m": v("dist_to_beach_m", 2000),
        "service_charge_aed_per_sqm_year": v("service_charge_aed_per_sqm_year", 30),
        "district_median_price_sqm_at_listing": ctx.get("district_median_price_sqm_at_listing", 20000),
        "month_listed":   v("month_listed", 3),
        "year_listed":    v("year_listed", 2025),
        "price_trend_6m":  ctx.get("price_trend_6m", 2.0),
        "price_trend_12m": ctx.get("price_trend_12m", 4.0),
    }

    row_yield = {
        "district":       district,
        "property_type":  v("property_type", "apartment"),
        "bedrooms":       v("bedrooms", 2),
        "size_sqm":       v("size_sqm", 100),
        "floor_percentile": v("floor_percentile", 0.5),
        "view_quality":   v("view_quality", 3),
        "renovation_status": v("renovation_status", "original"),
        "age_years":      v("age_years", 5),
        "furnishing":     v("furnishing", "unfurnished"),
        "vacancy_days_est": ctx.get("vacancy_days_est", 10),
        "service_charge_aed_per_sqm_year": v("service_charge_aed_per_sqm_year", 30),
        "dist_to_metro_m": v("dist_to_metro_m", 500),
        "dist_to_mall_m":  v("dist_to_mall_m", 1000),
        "district_avg_dom_at_listing": ctx.get("district_avg_dom_at_listing", 50),
        "month_listed":    v("month_listed", 3),
        "year_listed":     v("year_listed", 2025),
    }

    # DOM model also needs price_per_sqm and yield — we use the predicted values
    # (will be filled after price/yield predictions below)

    def _row_to_X(row: dict, features: list[str]) -> np.ndarray:
        df_row = pd.DataFrame([row])
        df_row = _encode(df_row, _encoders, fit=False)
        return df_row[features].values

    # ── Price prediction ─────────────────────
    X_p = _row_to_X(row_price, FEATURES_PRICE)
    pred_ppsqm = float(_models["price"].predict(X_p)[0])
    size_sqm   = float(v("size_sqm", 100))
    pred_total = round(pred_ppsqm * size_sqm, 0)

    # ── Yield prediction ─────────────────────
    X_y = _row_to_X(row_yield, FEATURES_YIELD)
    pred_yield = float(_models["yield"].predict(X_y)[0])
    pred_yield = round(max(2.0, min(14.0, pred_yield)), 2)

    # ── DOM prediction ───────────────────────
    price_vs_median = 0.0
    median_ppsqm = ctx.get("district_median_price_sqm_at_listing", pred_ppsqm)
    if median_ppsqm:
        price_vs_median = round((pred_ppsqm / median_ppsqm - 1) * 100, 2)

    row_dom = {
        "district":       district,
        "property_type":  v("property_type", "apartment"),
        "bedrooms":       v("bedrooms", 2),
        "size_sqm":       size_sqm,
        "floor_percentile": v("floor_percentile", 0.5),
        "view_quality":   v("view_quality", 3),
        "price_per_sqm_aed": pred_ppsqm,
        "price_vs_district_median_pct": price_vs_median,
        "gross_yield_pct": pred_yield,
        "furnishing":     v("furnishing", "unfurnished"),
        "dist_to_metro_m": v("dist_to_metro_m", 500),
        "dist_to_beach_m": v("dist_to_beach_m", 2000),
        "district_supply_count_at_listing": ctx.get("district_supply_count_at_listing", 30),
        "month_listed":   v("month_listed", 3),
        "quarter_listed": ctx.get("quarter_listed", (int(v("month_listed", 3)) - 1) // 3 + 1),
        "year_listed":    v("year_listed", 2025),
        "price_trend_3m": ctx.get("price_trend_3m", 1.0),
        "price_trend_6m": ctx.get("price_trend_6m", 2.0),
    }
    X_d = _row_to_X(row_dom, FEATURES_DOM)
    pred_dom = int(round(max(5, float(_models["dom"].predict(X_d)[0]))))

    return {
        "predicted_price_per_sqm": round(pred_ppsqm, 0),
        "predicted_total_price":   int(pred_total),
        "predicted_gross_yield_pct": pred_yield,
        "predicted_days_on_market":  pred_dom,
        "confidence": {
            "price_r2": _metrics["price"]["r2"],
            "price_mae_aed_sqm": _metrics["price"]["mae"],
            "yield_r2": _metrics["yield"]["r2"],
            "yield_mae_pct": _metrics["yield"]["mae"],
            "dom_r2": _metrics["dom"]["r2"],
            "dom_mae_days": _metrics["dom"]["mae"],
        },
        "feature_importance": {
            "price": _top_importances(_models["price"], FEATURES_PRICE),
            "yield": _top_importances(_models["yield"], FEATURES_YIELD),
            "dom":   _top_importances(_models["dom"],   FEATURES_DOM),
        },
    }


# ─────────────────────────────────────────────
# FORCE RETRAIN UTILITY
# ─────────────────────────────────────────────

def retrain() -> dict:
    """Force retrain all models (drops existing .pkl). Returns metrics."""
    global _models, _encoders, _metrics, _district_ctx
    _models, _encoders, _metrics, _district_ctx = _train_all()
    return _metrics
