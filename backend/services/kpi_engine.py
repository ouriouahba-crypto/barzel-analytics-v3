"""
Barzel Analytics V3 — KPI Engine
CSV is loaded once at import time into df_global.
All functions operate on the in-memory DataFrame.
"""

from __future__ import annotations

import os
import math
import pandas as pd
import numpy as np

# ─────────────────────────────────────────────
# 1. GLOBAL DATA LOAD  (once at startup)
# ─────────────────────────────────────────────

_CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "listings_v3.csv")

_BOOL_COLS = ["has_balcony", "has_study", "has_maids_room", "verified_flag"]
_DATE_COLS = ["first_seen", "last_seen"]


def _load() -> pd.DataFrame:
    df = pd.read_csv(_CSV_PATH)
    for c in _BOOL_COLS:
        if c in df.columns:
            df[c] = df[c].astype(str).str.lower().isin(["true", "1", "yes"])
    for c in _DATE_COLS:
        if c in df.columns:
            df[c] = pd.to_datetime(df[c], errors="coerce")
    return df


df_global: pd.DataFrame = _load()
ALL_DISTRICTS: list[str] = sorted(df_global["district"].unique().tolist())

print(f"[KPIEngine] Loaded {len(df_global):,} listings | districts: {ALL_DISTRICTS}")


# ─────────────────────────────────────────────
# 2. HELPERS
# ─────────────────────────────────────────────

def _filter(districts: list[str]) -> pd.DataFrame:
    if not districts:
        return df_global.copy()
    return df_global[df_global["district"].isin(districts)].copy()


def _safe(val):
    """Convert numpy scalars / NaN / inf → Python native, or None."""
    if val is None:
        return None
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    if hasattr(val, "item"):
        return val.item()
    return val


def _pct(val, decimals: int = 1):
    v = _safe(val)
    return round(v, decimals) if v is not None else None


def _agg_kpis(sub: pd.DataFrame) -> dict:
    """Compute all snapshot KPIs for any sub-DataFrame."""
    n = len(sub)
    if n == 0:
        return {}

    med_ppsqm  = _safe(sub["price_per_sqm_aed"].median())
    p25_ppsqm  = _safe(sub["price_per_sqm_aed"].quantile(0.25))
    p75_ppsqm  = _safe(sub["price_per_sqm_aed"].quantile(0.75))
    med_dom    = _safe(sub["days_on_market"].median())
    fast30     = _pct((sub["days_on_market"] <= 30).mean() * 100)
    fast60     = _pct((sub["days_on_market"] <= 60).mean() * 100)
    med_yield  = _pct(sub["gross_yield_pct"].median())
    med_net    = _pct(sub["net_yield_est_pct"].median())
    med_vac    = _safe(sub["vacancy_days_est"].median())
    med_svc    = _safe(sub["service_charge_aed_per_sqm_year"].median())
    mean_pp    = sub["price_per_sqm_aed"].mean()
    std_pp     = sub["price_per_sqm_aed"].std()
    cv         = _pct((std_pp / mean_pp * 100) if mean_pp else None)
    liq_depth  = _pct((sub["days_on_market"] <= 60).mean() * 100)
    t3m        = _pct(sub["price_trend_3m"].mean())
    t6m        = _pct(sub["price_trend_6m"].mean())
    t12m       = _pct(sub["price_trend_12m"].mean())

    return {
        "n_listings":            n,
        "median_price_sqm":      _safe(med_ppsqm),
        "p25_price_sqm":         _safe(p25_ppsqm),
        "p75_price_sqm":         _safe(p75_ppsqm),
        "median_dom":            _safe(med_dom),
        "fast_sale_30d_pct":     fast30,
        "fast_sale_60d_pct":     fast60,
        "median_gross_yield":    med_yield,
        "median_net_yield":      med_net,
        "median_vacancy_days":   _safe(med_vac),
        "median_service_charge": _safe(med_svc),
        "price_consistency_cv":  cv,
        "liquidity_depth_ratio": liq_depth,
        "price_trend_3m":        t3m,
        "price_trend_6m":        t6m,
        "price_trend_12m":       t12m,
    }


# ─────────────────────────────────────────────
# 3. PUBLIC FUNCTIONS
# ─────────────────────────────────────────────

def get_snapshot(districts: list[str]) -> dict:
    """Aggregate KPIs across all selected districts combined."""
    sub  = _filter(districts)
    kpis = _agg_kpis(sub)
    kpis["districts"] = districts if districts else ALL_DISTRICTS
    return kpis


def get_snapshots_by_district(districts: list[str]) -> list[dict]:
    """One KPI dict per district."""
    targets = districts if districts else ALL_DISTRICTS
    results = []
    for d in targets:
        sub  = df_global[df_global["district"] == d]
        kpis = _agg_kpis(sub)
        kpis["district"] = d
        results.append(kpis)
    return results


def get_typology_breakdown(districts: list[str]) -> list[dict]:
    """Distribution by bedroom count."""
    sub   = _filter(districts)
    total = len(sub)
    rows  = []
    for beds, grp in sub.groupby("bedrooms"):
        rows.append({
            "bedrooms":         int(beds),
            "count":            len(grp),
            "share":            _pct(len(grp) / total * 100) if total else 0,
            "median_price_sqm": _safe(grp["price_per_sqm_aed"].median()),
            "median_price":     _safe(grp["sale_price_aed"].median()),
            "median_yield":     _pct(grp["gross_yield_pct"].median()),
            "median_dom":       _safe(grp["days_on_market"].median()),
        })
    rows.sort(key=lambda x: x["bedrooms"])
    return rows


def get_price_timeseries(districts: list[str]) -> list[dict]:
    """Monthly median price per sqm per district, sorted by period."""
    sub = _filter(districts)
    sub = sub.copy()
    sub["period"] = (
        sub["year_listed"].astype(str)
        + "-"
        + sub["month_listed"].astype(str).str.zfill(2)
    )
    targets = districts if districts else ALL_DISTRICTS
    results = []
    for d in targets:
        d_sub = sub[sub["district"] == d]
        grp = (
            d_sub.groupby("period")
            .agg(
                median_price_sqm=("price_per_sqm_aed", "median"),
                n_listings=("id", "count"),
            )
            .reset_index()
            .sort_values("period")
        )
        for _, row in grp.iterrows():
            results.append({
                "period":           row["period"],
                "district":         d,
                "median_price_sqm": _safe(row["median_price_sqm"]),
                "n_listings":       int(row["n_listings"]),
            })
    return results


def get_yield_distribution(districts: list[str]) -> list[dict]:
    """Histogram of gross_yield_pct in 0.5% buckets."""
    sub    = _filter(districts)
    yields = sub["gross_yield_pct"].dropna()
    total  = len(yields)
    buckets: dict[float, int] = {}
    for y in yields:
        lo = math.floor(y * 2) / 2
        buckets[lo] = buckets.get(lo, 0) + 1

    results = []
    for lo in sorted(buckets.keys()):
        count = buckets[lo]
        results.append({
            "bucket": f"{lo:.1f}-{lo+0.5:.1f}%",
            "count":  count,
            "share":  _pct(count / total * 100) if total else 0,
        })
    return results


def get_map_listings(districts: list[str], sample_max: int = 2000) -> list[dict]:
    """Return a sample of listings with lat/lng + key fields for the map view."""
    sub = _filter(districts)
    if len(sub) > sample_max:
        sub = sub.sample(n=sample_max, random_state=42)
    cols = [
        "id", "district", "property_type", "bedrooms", "size_sqm",
        "sale_price_aed", "price_per_sqm_aed", "gross_yield_pct",
        "days_on_market", "latitude", "longitude",
    ]
    sub = sub[cols].dropna(subset=["latitude", "longitude"])
    results = []
    for _, row in sub.iterrows():
        results.append({
            "id":               str(row["id"]),
            "district":         row["district"],
            "property_type":    row["property_type"],
            "bedrooms":         int(row["bedrooms"]),
            "size_sqm":         _safe(row["size_sqm"]),
            "sale_price_aed":   _safe(row["sale_price_aed"]),
            "price_per_sqm":    _safe(row["price_per_sqm_aed"]),
            "gross_yield_pct":  _pct(row["gross_yield_pct"]),
            "days_on_market":   _safe(row["days_on_market"]),
            "lat":              _safe(row["latitude"]),
            "lng":              _safe(row["longitude"]),
        })
    return results


def get_dom_distribution(districts: list[str]) -> list[dict]:
    """Histogram of days_on_market in 15-day buckets with cumulative %."""
    sub   = _filter(districts)
    doms  = sub["days_on_market"].dropna()
    total = len(doms)
    buckets: dict[int, int] = {}
    for d in doms:
        lo = int(d // 15) * 15
        buckets[lo] = buckets.get(lo, 0) + 1

    cumulative = 0
    results    = []
    for lo in sorted(buckets.keys()):
        count      = buckets[lo]
        cumulative += count
        results.append({
            "bucket":         f"{lo}-{lo+14}d",
            "count":          count,
            "share":          _pct(count / total * 100) if total else 0,
            "cumulative_pct": _pct(cumulative / total * 100) if total else 0,
        })
    return results
