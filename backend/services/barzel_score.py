"""
Barzel Analytics V3 — Barzel Score Engine

Scoring methodology (0-100):
  Liquidity  (0-25) : DOM + vacancy days → low DOM = high score
  Yield      (0-25) : net_yield          → high yield = high score
  Risk       (0-25) : price_consistency_cv (coefficient of variation) → low CV = high score
  Trend      (0-25) : price_trend_6m     → positive trend = high score

Normalisation: each pillar is percentile-ranked across ALL districts
(market-wide), so scores are relative within the Dubai market.
"""

from __future__ import annotations

import math
import numpy as np
import pandas as pd

from services.kpi_engine import df_global, ALL_DISTRICTS, _agg_kpis, _safe, _pct


# ─────────────────────────────────────────────
# 1. MARKET-WIDE REFERENCE STATS
# Computed once at import for fast percentile ranking
# ─────────────────────────────────────────────

def _market_stats() -> dict[str, dict]:
    """KPIs for every district — used as the normalisation universe."""
    stats: dict[str, dict] = {}
    for d in ALL_DISTRICTS:
        sub = df_global[df_global["district"] == d]
        stats[d] = _agg_kpis(sub)
    return stats


_MARKET: dict[str, dict] = _market_stats()


def _percentile_rank(value: float | None, all_values: list[float],
                     ascending: bool = True) -> float:
    """
    Returns 0-100 percentile rank of `value` in `all_values`.
    ascending=True  → higher value = higher rank  (yield, trend)
    ascending=False → lower  value = higher rank  (dom, cv)
    """
    if value is None:
        return 50.0
    valid = [v for v in all_values if v is not None and not math.isnan(v)]
    if not valid:
        return 50.0
    if ascending:
        rank = sum(v <= value for v in valid) / len(valid) * 100
    else:
        rank = sum(v >= value for v in valid) / len(valid) * 100
    return round(rank, 1)


def _score_label(total: float) -> str:
    if total >= 80:   return "Strong Buy"
    if total >= 65:   return "Buy"
    if total >= 45:   return "Neutral"
    if total >= 30:   return "Sell"
    return "Strong Sell"


# Pre-compute market vectors for each pillar
_dom_values:   list[float] = [_MARKET[d].get("median_dom") or 0  for d in ALL_DISTRICTS]
_vac_values:   list[float] = [_MARKET[d].get("median_vacancy_days") or 0 for d in ALL_DISTRICTS]
_yield_values: list[float] = [_MARKET[d].get("median_net_yield") or 0 for d in ALL_DISTRICTS]
_cv_values:    list[float] = [_MARKET[d].get("price_consistency_cv") or 0 for d in ALL_DISTRICTS]
_trend_values: list[float] = [_MARKET[d].get("price_trend_6m") or 0 for d in ALL_DISTRICTS]

# Combined liquidity = (dom + vacancy) as a single "slowness" metric
_liq_combined: list[float] = [
    (_MARKET[d].get("median_dom") or 0) + (_MARKET[d].get("median_vacancy_days") or 0)
    for d in ALL_DISTRICTS
]


def _score_one(kpis: dict) -> dict:
    """Compute Barzel score pillars for a single kpis dict."""
    dom     = kpis.get("median_dom")
    vac     = kpis.get("median_vacancy_days") or 0
    liq_raw = (dom or 0) + vac

    net_yld = kpis.get("median_net_yield")
    cv      = kpis.get("price_consistency_cv")
    trend6  = kpis.get("price_trend_6m")

    # Pillar percentiles (0-100)
    liq_pct   = _percentile_rank(liq_raw, _liq_combined,   ascending=False)  # low DOM = good
    yield_pct = _percentile_rank(net_yld,  _yield_values,  ascending=True)
    risk_pct  = _percentile_rank(cv,       _cv_values,     ascending=False)   # low CV = stable
    trend_pct = _percentile_rank(trend6,   _trend_values,  ascending=True)

    # Scale to 0-25 per pillar
    liquidity = round(liq_pct / 100 * 25, 1)
    yield_s   = round(yield_pct / 100 * 25, 1)
    risk      = round(risk_pct  / 100 * 25, 1)
    trend     = round(trend_pct / 100 * 25, 1)
    total     = round(liquidity + yield_s + risk + trend, 1)

    return {
        "liquidity":  liquidity,
        "yield":      yield_s,
        "risk":       risk,
        "trend":      trend,
        "total":      total,
        "label":      _score_label(total),
    }


# ─────────────────────────────────────────────
# 2. PUBLIC FUNCTIONS
# ─────────────────────────────────────────────

def compute_barzel_score(districts: list[str]) -> dict:
    """
    Aggregate score for the selection (treats selected districts as one pool).
    Returns pillars + total + label.
    """
    from services.kpi_engine import _filter
    sub  = _filter(districts)
    kpis = _agg_kpis(sub)
    score = _score_one(kpis)
    return {
        "districts": districts if districts else ALL_DISTRICTS,
        **score,
    }


def compute_barzel_scores_by_district(districts: list[str]) -> list[dict]:
    """One Barzel score per district, with pillar detail."""
    targets = districts if districts else ALL_DISTRICTS
    results = []
    for d in targets:
        sub   = df_global[df_global["district"] == d]
        kpis  = _agg_kpis(sub)
        score = _score_one(kpis)
        results.append({
            "district":          d,
            "n_listings":        kpis.get("n_listings"),
            "median_price_sqm":  kpis.get("median_price_sqm"),
            "median_net_yield":  kpis.get("median_net_yield"),
            "median_dom":        kpis.get("median_dom"),
            "price_trend_6m":    kpis.get("price_trend_6m"),
            "price_consistency_cv": kpis.get("price_consistency_cv"),
            **score,
        })
    # Sort by total score descending
    results.sort(key=lambda x: x["total"], reverse=True)
    return results
