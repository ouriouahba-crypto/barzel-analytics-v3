"""
Barzel Analytics V3 — Analytics Router

Endpoints:
  GET /api/analytics/snapshot
  GET /api/analytics/compare
  GET /api/analytics/score
  GET /api/analytics/typology
  GET /api/analytics/timeseries
  GET /api/analytics/yield-distribution
  GET /api/analytics/dom-distribution

All accept ?districts=A,B,C  (comma-separated or repeated params)
"""

from fastapi import APIRouter, Query
from typing import Optional

from services.kpi_engine import (
    get_snapshot,
    get_snapshots_by_district,
    get_typology_breakdown,
    get_price_timeseries,
    get_yield_distribution,
    get_dom_distribution,
    ALL_DISTRICTS,
)
from services.barzel_score import (
    compute_barzel_score,
    compute_barzel_scores_by_district,
)

router = APIRouter()


def _parse_districts(raw: Optional[str]) -> list[str]:
    """
    Accept districts as a single comma-separated string OR repeated params.
    ?districts=Dubai Marina,JVC  →  ["Dubai Marina", "JVC"]
    """
    if not raw:
        return []
    # Handle both "A,B" and ["A", "B"] (FastAPI passes repeated as list via Query)
    if isinstance(raw, list):
        parts = []
        for r in raw:
            parts.extend([p.strip() for p in r.split(",") if p.strip()])
        return parts
    return [p.strip() for p in raw.split(",") if p.strip()]


# ─────────────────────────────────────────────
# GET /api/analytics/snapshot
# ─────────────────────────────────────────────
@router.get("/districts")
async def districts():
    """Return all available district names (used to populate UI chips)."""
    return {"available_districts": ALL_DISTRICTS}


@router.get("/snapshot")
async def snapshot(
    districts: Optional[str] = Query(None, description="Comma-separated district names"),
):
    """
    Aggregate KPIs for the selected districts (combined).
    If no districts supplied, returns market-wide aggregate.
    Always includes available_districts for client bootstrapping.
    """
    d = _parse_districts(districts)
    result = get_snapshot(d)
    result["available_districts"] = ALL_DISTRICTS
    return result


# ─────────────────────────────────────────────
# GET /api/analytics/compare
# ─────────────────────────────────────────────
@router.get("/compare")
async def compare(
    districts: Optional[str] = Query(None, description="Comma-separated district names"),
):
    """
    Per-district KPI breakdown for side-by-side comparison.
    Returns a list with one entry per district.
    """
    d = _parse_districts(districts)
    return {"data": get_snapshots_by_district(d)}


# ─────────────────────────────────────────────
# GET /api/analytics/score
# ─────────────────────────────────────────────
@router.get("/score")
async def score(
    districts: Optional[str] = Query(None, description="Comma-separated district names"),
):
    """
    Barzel scores per district (liquidity / yield / risk / trend) +
    aggregate score for the full selection.
    """
    d = _parse_districts(districts)
    return {
        "aggregate":   compute_barzel_score(d),
        "by_district": compute_barzel_scores_by_district(d),
    }


# ─────────────────────────────────────────────
# GET /api/analytics/typology
# ─────────────────────────────────────────────
@router.get("/typology")
async def typology(
    districts: Optional[str] = Query(None, description="Comma-separated district names"),
):
    """
    Bedroom typology breakdown: count, share, median price/sqm, median yield.
    """
    d = _parse_districts(districts)
    return {"data": get_typology_breakdown(d)}


# ─────────────────────────────────────────────
# GET /api/analytics/timeseries
# ─────────────────────────────────────────────
@router.get("/timeseries")
async def timeseries(
    districts: Optional[str] = Query(None, description="Comma-separated district names"),
):
    """
    Monthly median price per sqm per district.
    Formatted for Recharts multi-line chart.
    """
    d = _parse_districts(districts)
    return {"data": get_price_timeseries(d)}


# ─────────────────────────────────────────────
# GET /api/analytics/yield-distribution
# ─────────────────────────────────────────────
@router.get("/yield-distribution")
async def yield_distribution(
    districts: Optional[str] = Query(None, description="Comma-separated district names"),
):
    """
    Gross yield histogram (0.5% buckets).
    Formatted for Recharts bar chart.
    """
    d = _parse_districts(districts)
    return {"data": get_yield_distribution(d)}


# ─────────────────────────────────────────────
# GET /api/analytics/dom-distribution
# ─────────────────────────────────────────────
@router.get("/dom-distribution")
async def dom_distribution(
    districts: Optional[str] = Query(None, description="Comma-separated district names"),
):
    """
    Days-on-market histogram (15-day buckets) with cumulative %.
    Formatted for Recharts bar + line combo chart.
    """
    d = _parse_districts(districts)
    return {"data": get_dom_distribution(d)}
