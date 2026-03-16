"""
Barzel Analytics V3 — Dubai Real Estate Dataset Generator
Generates listings_v3.csv with 8,000 realistic, ML-ready rows.
Seed: 42 | Market: Dubai | Period: Jan 2023 – Jan 2026

Price calibration:
  base_price_sqm = target median at mid-period (2024-07).
  Growth is applied RELATIVE to mid-period so the overall dataset median ≈ base.
  Quality adjustments are CENTERED (±) so they don't inflate the median.
  Combined quality factor is capped at ±15%.
"""

import pandas as pd
import numpy as np
from datetime import date, timedelta
import random

RNG = np.random.default_rng(42)
random.seed(42)

# ─────────────────────────────────────────────
# 1. DISTRICT CONFIG
# base_price_sqm = target median AED/sqm (dataset-wide median ≈ this value)
# ─────────────────────────────────────────────

DISTRICTS = {
    "Dubai Marina": {
        "n": 1700,                         # +500 vs v1
        "base_price_sqm": 23_000,
        "lat_range": (25.075, 25.095),
        "lon_range": (55.130, 55.150),
        "dist_beach_range": (200, 1500),
        "dist_metro_range": (200, 1200),
        "dist_mall_range": (300, 2000),
        "dist_airport_range": (24000, 30000),
        "yield_base": 6.2,
        "dom_base": 55,
        "typical_beds": [1, 2, 2, 3, 3, 4],
        "high_rise": True,
    },
    "Business Bay": {
        "n": 1100,
        "base_price_sqm": 22_000,
        "lat_range": (25.178, 25.195),
        "lon_range": (55.258, 55.278),
        "dist_beach_range": (4000, 8000),
        "dist_metro_range": (200, 1000),
        "dist_mall_range": (500, 2500),
        "dist_airport_range": (12000, 18000),
        "yield_base": 6.5,
        "dom_base": 50,
        "typical_beds": [0, 1, 1, 2, 2, 3],
        "high_rise": True,
    },
    "JVC": {
        "n": 1500,                         # +500 vs v1
        "base_price_sqm": 15_000,
        "lat_range": (25.040, 25.060),
        "lon_range": (55.200, 55.220),
        "dist_beach_range": (8000, 14000),
        "dist_metro_range": (800, 2000),
        "dist_mall_range": (500, 3000),
        "dist_airport_range": (18000, 26000),
        "yield_base": 7.8,
        "dom_base": 42,
        "typical_beds": [0, 1, 1, 2, 2, 3],
        "high_rise": False,
    },
    "Downtown Dubai": {
        "n": 900,
        "base_price_sqm": 27_000,
        "lat_range": (25.188, 25.202),
        "lon_range": (55.270, 55.285),
        "dist_beach_range": (5000, 9000),
        "dist_metro_range": (100, 800),
        "dist_mall_range": (100, 1000),
        "dist_airport_range": (10000, 16000),
        "yield_base": 5.5,
        "dom_base": 65,
        "typical_beds": [1, 2, 2, 3, 3, 4],
        "high_rise": True,
    },
    "Palm Jumeirah": {
        "n": 700,
        "base_price_sqm": 35_000,
        "lat_range": (25.105, 25.130),
        "lon_range": (55.115, 55.145),
        "dist_beach_range": (0, 500),
        "dist_metro_range": (1500, 4000),
        "dist_mall_range": (1000, 4000),
        "dist_airport_range": (27000, 35000),
        "yield_base": 4.8,
        "dom_base": 80,
        "typical_beds": [1, 2, 3, 3, 4, 5],
        "high_rise": False,
    },
    "Dubai Hills": {
        "n": 700,
        "base_price_sqm": 20_000,
        "lat_range": (25.108, 25.130),
        "lon_range": (55.225, 55.255),
        "dist_beach_range": (9000, 15000),
        "dist_metro_range": (600, 2000),
        "dist_mall_range": (200, 1500),
        "dist_airport_range": (16000, 22000),
        "yield_base": 6.0,
        "dom_base": 58,
        "typical_beds": [2, 3, 3, 4, 4, 5],
        "high_rise": False,
    },
    "DIFC": {
        "n": 600,
        "base_price_sqm": 28_000,
        "lat_range": (25.207, 25.220),
        "lon_range": (55.275, 55.290),
        "dist_beach_range": (4500, 7000),
        "dist_metro_range": (100, 600),
        "dist_mall_range": (300, 1500),
        "dist_airport_range": (10000, 15000),
        "yield_base": 5.2,
        "dom_base": 70,
        "typical_beds": [0, 1, 1, 2, 2, 3],
        "high_rise": True,
    },
    "Al Barsha": {
        "n": 500,
        "base_price_sqm": 14_000,
        "lat_range": (25.095, 25.115),
        "lon_range": (55.190, 55.215),
        "dist_beach_range": (5000, 10000),
        "dist_metro_range": (300, 1500),
        "dist_mall_range": (500, 2500),
        "dist_airport_range": (15000, 22000),
        "yield_base": 7.2,
        "dom_base": 40,
        "typical_beds": [1, 2, 2, 3, 3],
        "high_rise": False,
    },
    "Jumeirah": {
        "n": 300,
        "base_price_sqm": 18_000,
        "lat_range": (25.195, 25.220),
        "lon_range": (55.230, 55.260),
        "dist_beach_range": (500, 3000),
        "dist_metro_range": (800, 2500),
        "dist_mall_range": (1000, 3500),
        "dist_airport_range": (12000, 20000),
        "yield_base": 5.8,
        "dom_base": 62,
        "typical_beds": [2, 3, 3, 4, 5],
        "high_rise": False,
    },
}

# Reference date: dataset midpoint, used to anchor growth to 1.0
REFERENCE_DATE = date(2024, 7, 1)

# ─────────────────────────────────────────────
# 2. LOOKUP TABLES
# ─────────────────────────────────────────────

PROPERTY_TYPES = ["apartment", "apartment", "apartment", "villa", "townhouse", "penthouse"]
TRANSACTION_TYPES = ["sale", "sale", "sale", "sale", "resale"]
FURNISHING = ["furnished", "unfurnished", "unfurnished", "semi-furnished"]
COMPLETION = ["ready", "ready", "ready", "off-plan"]
RENOVATION = ["original", "original", "light_renovated", "fully_renovated"]
AGENCIES = [
    "Betterhomes", "Allsopp & Allsopp", "Espace Real Estate", "Driven Properties",
    "Hamptons International", "CBRE Dubai", "Knight Frank", "Savills Dubai",
    "Coldwell Banker", "Fäm Properties",
]
DEVELOPERS = [
    "Emaar", "DAMAC", "Nakheel", "Meraas", "Dubai Properties",
    "Sobha", "Azizi", "Binghatti", "Select Group", "Tiger Properties",
]
COMMUNITIES = {
    "Dubai Marina":    ["Marina Gate", "Princess Tower", "Torch Tower", "Cayan Tower", "Marina Quays"],
    "Business Bay":    ["Executive Bay", "Claren Tower", "Damac Maison", "Paramount Tower", "Aykon City"],
    "JVC":             ["Bloom Towers", "Belgravia", "Noor", "Plazzo Residence", "Season Community"],
    "Downtown Dubai":  ["Burj Khalifa", "Opera Grand", "Act One Act Two", "Vida Residence", "The Address"],
    "Palm Jumeirah":   ["Signature Villas", "Garden Homes", "Shoreline", "Frond A", "Oceana"],
    "Dubai Hills":     ["Acacia", "Maple", "Sidra", "Golf Place", "Park Ridge"],
    "DIFC":            ["Gate Village", "ICD Brookfield", "Central Park", "Ritz-Carlton Residences", "Four Seasons Private"],
    "Al Barsha":       ["Al Barsha 1", "Al Barsha 2", "Al Barsha South", "Kensington Manor", "Time 2 Tower"],
    "Jumeirah":        ["Jumeirah 1", "Jumeirah 2", "Jumeirah 3", "La Mer", "Jumeirah Bay Island"],
}

START_DATE = date(2023, 1, 1)
END_DATE   = date(2026, 1, 31)
TOTAL_DAYS = (END_DATE - START_DATE).days

# ─────────────────────────────────────────────
# 3. PRICE GROWTH & SEASONALITY
# ─────────────────────────────────────────────

# Monthly growth rates: 2023→+6%/yr, 2024→+8%/yr, 2025→+5%/yr, Jan 2026→+5%/yr
_MONTHLY_RATES: list[float] = [0.06 / 12] * 12 + [0.08 / 12] * 12 + [0.05 / 12] * 13

def _cumulative_factor(dt: date) -> float:
    """Cumulative price factor from Jan 2023 to dt."""
    months = (dt.year - 2023) * 12 + (dt.month - 1)
    factor = 1.0
    for i in range(min(months, len(_MONTHLY_RATES))):
        factor *= 1 + _MONTHLY_RATES[i]
    return factor

_REF_FACTOR = _cumulative_factor(REFERENCE_DATE)

def growth_relative(dt: date) -> float:
    """Growth factor relative to REFERENCE_DATE (Jul 2024 = 1.0).
    Listings before reference are <1.0; after are >1.0.
    """
    return _cumulative_factor(dt) / _REF_FACTOR


_SEASONAL = {
    1: 1.02, 2: 1.03, 3: 1.04, 4: 1.02, 5: 1.00,
    6: 0.97, 7: 0.92, 8: 0.93, 9: 0.98, 10: 1.05,
    11: 1.05, 12: 1.03,
}

def seasonality(month: int) -> float:
    return _SEASONAL.get(month, 1.0)


def random_date() -> date:
    delta = int(RNG.integers(0, TOTAL_DAYS))
    return START_DATE + timedelta(days=delta)

# ─────────────────────────────────────────────
# 4. MARKET TIME SERIES (district monthly medians)
# ─────────────────────────────────────────────

def build_market_series() -> dict:
    """district → {(year, month): {median_ppsqm, avg_dom, supply}}"""
    series: dict = {}
    for dist, cfg in DISTRICTS.items():
        series[dist] = {}
        base = cfg["base_price_sqm"]
        dom_base = cfg["dom_base"]
        for y in range(2023, 2027):
            for m in range(1, 13):
                if y == 2026 and m > 1:
                    break
                dt = date(y, m, 1)
                median = base * growth_relative(dt) * seasonality(m)
                dom = dom_base * (2.0 - seasonality(m)) * float(1 + RNG.normal(0, 0.05))
                dom = max(10, round(dom))
                supply_base = cfg["n"] / 36
                supply = max(5, int(supply_base * seasonality(m) * float(1 + RNG.normal(0, 0.1))))
                series[dist][(y, m)] = {
                    "median_ppsqm": round(median, 0),
                    "avg_dom":      dom,
                    "supply":       supply,
                }
    return series


def build_price_trends(series: dict) -> dict:
    """district → {(year, month): {trend_3m, trend_6m, trend_12m}}"""
    trends: dict = {}
    for dist in DISTRICTS:
        trends[dist] = {}
        months_list = sorted(series[dist].keys())
        for i, ym in enumerate(months_list):
            curr = series[dist][ym]["median_ppsqm"]

            def trend_n(n: int) -> float:
                if i < n:
                    return 0.0
                prev = series[dist][months_list[i - n]]["median_ppsqm"]
                return round((curr / prev - 1) * 100, 2) if prev else 0.0

            trends[dist][ym] = {
                "trend_3m":  trend_n(3),
                "trend_6m":  trend_n(6),
                "trend_12m": trend_n(12),
            }
    return trends

# ─────────────────────────────────────────────
# 5. ROW GENERATOR
# ─────────────────────────────────────────────

def generate_district_rows(district: str, cfg: dict, n: int,
                            market_series: dict, price_trends: dict) -> list[dict]:
    rows: list[dict] = []
    base = cfg["base_price_sqm"]
    high_rise = cfg["high_rise"]

    for _ in range(n):
        # ── Date ──────────────────────────────────
        first_seen = random_date()
        year_l    = first_seen.year
        month_l   = first_seen.month
        quarter_l = (month_l - 1) // 3 + 1

        # ── Property type & bedrooms ──────────────
        prop_type = random.choice(PROPERTY_TYPES)
        if district in ("Palm Jumeirah", "Dubai Hills", "Jumeirah"):
            prop_type = random.choice(["villa", "villa", "townhouse", "apartment", "penthouse"])

        bedrooms = random.choice(cfg["typical_beds"])
        if prop_type in ("villa", "townhouse"):
            bedrooms = max(bedrooms, 2)

        bathrooms    = int(bedrooms + int(RNG.integers(0, 2)))
        has_maids    = bool(bedrooms >= 2 and RNG.random() < (0.2 + bedrooms * 0.1))
        has_balcony  = bool(RNG.random() < 0.65)
        has_study    = bool(bedrooms >= 2 and RNG.random() < 0.35)
        parking      = int(max(0, min(bedrooms, int(RNG.integers(0, 3)))))
        furnishing   = random.choice(FURNISHING)
        renovation   = random.choices(RENOVATION, weights=[50, 30, 15, 5])[0]

        # ── Size ──────────────────────────────────
        size_base = {0: 45, 1: 75, 2: 120, 3: 180, 4: 260, 5: 380}.get(bedrooms, 75)
        size_sqm  = max(30.0, round(float(RNG.normal(size_base, size_base * 0.15)), 1))

        # ── Floor ─────────────────────────────────
        total_floors    = int(RNG.integers(4, 65) if high_rise else RNG.integers(1, 8))
        floor           = int(RNG.integers(1, total_floors + 1))
        floor_percentile = round(float((floor - 1) / max(total_floors - 1, 1)), 3)

        # ── View quality (correlated with floor & district) ────
        view_base = floor_percentile * 2.0 + 2.0   # 2.0 at ground, 4.0 at top
        if district in ("Palm Jumeirah", "Dubai Marina"):
            view_base += 0.5
        elif district in ("Downtown Dubai", "DIFC"):
            view_base += 0.3
        view_quality = int(min(5, max(1, round(float(view_base + RNG.normal(0, 0.4))))))

        # ── Distances ─────────────────────────────
        dist_metro   = int(RNG.integers(*cfg["dist_metro_range"]))
        dist_mall    = int(RNG.integers(*cfg["dist_mall_range"]))
        dist_beach   = int(RNG.integers(*cfg["dist_beach_range"]))
        dist_airport = int(RNG.integers(*cfg["dist_airport_range"]))

        # ── Year built / age ──────────────────────
        year_built = int(RNG.integers(2005, 2026))
        age_years  = max(0, first_seen.year - year_built)
        completion = ("off-plan" if year_built > first_seen.year
                      else random.choice(["ready", "ready", "ready", "off-plan"]))

        # ─────────────────────────────────────────
        # PRICE FORMULA  (calibrated to stay near base median)
        #
        # ppsqm = base * growth_relative(date) * (1 + quality_adj) * noise
        #
        # quality_adj is a SUM of CENTERED adjustments → each factor has a
        # positive AND negative side so the distribution is centered at 0.
        # Total quality_adj is capped at [-0.15, +0.15].
        # ─────────────────────────────────────────

        # Each adj is centered around 0 over the uniform draw range:
        floor_adj  = (floor_percentile - 0.5) * 0.14      # [-0.07, +0.07]
        view_adj   = (view_quality - 3) / 2.0 * 0.10      # [-0.10, +0.10]
        reno_adj   = {"original": -0.04, "light_renovated": 0.02, "fully_renovated": 0.08}[renovation]
        metro_adj  = -(dist_metro / cfg["dist_metro_range"][1]) * 0.06   # [-0.06, 0]
        beach_adj  = max(0.0, (3000 - dist_beach) / 3000) * 0.06         # [0, +0.06] (beachfront only)

        quality_adj = floor_adj + view_adj + reno_adj + metro_adj + beach_adj
        quality_adj = max(-0.15, min(0.15, quality_adj))   # hard cap ±15%

        g = growth_relative(first_seen)                    # ~0.87 (Jan 2023) … ~1.10 (Jan 2026)
        noise = float(RNG.normal(1.0, 0.06))               # ±6% noise

        ppsqm = round(base * g * (1.0 + quality_adj) * noise, 0)
        ppsqm = max(5_000, ppsqm)                          # floor

        sale_price = round(ppsqm * size_sqm, 0)

        # ── Yield ─────────────────────────────────
        # Inversely correlated with ppsqm relative to district base
        yield_adj = cfg["yield_base"] * (base / ppsqm) * float(1 + RNG.normal(0, 0.07))
        gross_yield = round(max(2.0, min(14.0, yield_adj)), 2)
        annual_rent = round(sale_price * gross_yield / 100, 0)

        svc_ppsqm = round(float(RNG.uniform(15, 45)), 2)
        svc_total = round(svc_ppsqm * size_sqm, 0)
        net_yield = round(max(0.5, gross_yield - (svc_total / sale_price * 100) - 0.3), 2)

        # ── Days on market ────────────────────────
        seas = seasonality(month_l)
        price_premium = ppsqm / base   # >1 = expensive → longer DOM
        yield_drag    = cfg["yield_base"] / max(gross_yield, 1.0)
        dom = cfg["dom_base"] * price_premium * yield_drag * (2.0 - seas)
        dom = max(5, int(float(RNG.normal(dom, dom * 0.20))))

        last_seen = first_seen + timedelta(days=dom)
        if last_seen > END_DATE:
            last_seen = END_DATE

        vacancy_days = max(0, int(float(RNG.normal(max(0, 30 - gross_yield * 3), 10))))

        # ── Market context at listing ──────────────
        key = (year_l, month_l)
        ms  = market_series[district].get(key, {})
        dist_median  = ms.get("median_ppsqm", base)
        dist_avg_dom = ms.get("avg_dom", cfg["dom_base"])
        dist_supply  = ms.get("supply", 30)
        price_vs_med = round((ppsqm / dist_median - 1) * 100, 2) if dist_median else 0.0

        pt = price_trends[district].get(key, {})

        # ── Costs ─────────────────────────────────
        dld_fee      = round(sale_price * 0.04, 0)
        agent_fee    = round(sale_price * 0.02, 0)
        total_cost   = round(sale_price + dld_fee + agent_fee + svc_total * 2, 0)
        vacancy_loss = round(annual_rent * vacancy_days / 365, 0)
        net_cashflow = round(annual_rent - svc_total - vacancy_loss, 0)

        # ── Coordinates ───────────────────────────
        lat = round(float(RNG.uniform(*cfg["lat_range"])), 6)
        lon = round(float(RNG.uniform(*cfg["lon_range"])), 6)

        # ── Metadata ──────────────────────────────
        community    = random.choice(COMMUNITIES.get(district, [district]))
        building_name = f"{community} {int(RNG.integers(1, 10))}"
        developer    = random.choice(DEVELOPERS)
        agency       = random.choice(AGENCIES)
        tx_type      = random.choice(TRANSACTION_TYPES)
        verified     = bool(RNG.random() < 0.85)
        amenity_pool = ["gym", "pool", "concierge", "parking", "spa",
                        "kids_play", "bbq", "beach_access"]
        amenities    = ",".join(random.sample(amenity_pool, k=int(RNG.integers(2, 6))))

        rows.append({
            "id":                                  None,
            "district":                            district,
            "property_type":                       prop_type,
            "transaction_type":                    tx_type,
            "bedrooms":                            bedrooms,
            "bathrooms":                           bathrooms,
            "size_sqm":                            size_sqm,
            "floor":                               floor,
            "total_floors":                        total_floors,
            "parking_spaces":                      parking,
            "furnishing":                          furnishing,
            "completion_status":                   completion,
            "year_built":                          year_built,
            "age_years":                           age_years,
            "latitude":                            lat,
            "longitude":                           lon,
            "community":                           community,
            "building_name":                       building_name,
            "developer":                           developer,
            "sale_price_aed":                      int(sale_price),
            "price_per_sqm_aed":                   int(ppsqm),
            "annual_rent_aed":                     int(annual_rent),
            "gross_yield_pct":                     gross_yield,
            "net_yield_est_pct":                   net_yield,
            "service_charge_aed_per_sqm_year":     svc_ppsqm,
            "days_on_market":                      dom,
            "vacancy_days_est":                    vacancy_days,
            "first_seen":                          first_seen.strftime("%Y-%m-%d"),
            "last_seen":                           last_seen.strftime("%Y-%m-%d"),
            "amenities":                           amenities,
            "verified_flag":                       verified,
            "agency_name":                         agency,
            # ML temporal
            "month_listed":                        month_l,
            "quarter_listed":                      quarter_l,
            "year_listed":                         year_l,
            # ML location
            "dist_to_metro_m":                     dist_metro,
            "dist_to_mall_m":                      dist_mall,
            "dist_to_beach_m":                     dist_beach,
            "dist_to_airport_m":                   dist_airport,
            # ML quality
            "view_quality":                        view_quality,
            "renovation_status":                   renovation,
            "floor_percentile":                    floor_percentile,
            "has_balcony":                         has_balcony,
            "has_study":                           has_study,
            "has_maids_room":                      has_maids,
            # ML market context
            "district_median_price_sqm_at_listing": int(dist_median),
            "district_avg_dom_at_listing":          int(dist_avg_dom),
            "district_supply_count_at_listing":     dist_supply,
            "price_vs_district_median_pct":         price_vs_med,
            # ML momentum
            "price_trend_3m":                      pt.get("trend_3m", 0.0),
            "price_trend_6m":                      pt.get("trend_6m", 0.0),
            "price_trend_12m":                     pt.get("trend_12m", 0.0),
            # ML costs
            "total_cost_of_ownership_aed":         int(total_cost),
            "net_cashflow_year1_aed":              int(net_cashflow),
        })

    return rows

# ─────────────────────────────────────────────
# 6. MAIN
# ─────────────────────────────────────────────

def main() -> None:
    total_expected = sum(cfg["n"] for cfg in DISTRICTS.values())
    print(f"Building market time series…")
    market_series = build_market_series()
    price_trends  = build_price_trends(market_series)

    print(f"Generating {total_expected:,} rows…")
    all_rows: list[dict] = []
    for district, cfg in DISTRICTS.items():
        rows = generate_district_rows(district, cfg, cfg["n"], market_series, price_trends)
        all_rows.extend(rows)
        print(f"  {district}: {len(rows)} rows")

    df = pd.DataFrame(all_rows)
    df["id"] = [f"BRZ-{i:05d}" for i in range(1, len(df) + 1)]
    cols = ["id"] + [c for c in df.columns if c != "id"]
    df = df[cols]

    # Round floats to 2 decimals
    for col in df.select_dtypes(include="float64").columns:
        df[col] = df[col].round(2)

    out = "backend/data/listings_v3.csv"
    df.to_csv(out, index=False, encoding="utf-8")
    print(f"\nSaved → {out}  ({len(df):,} rows × {len(df.columns)} columns)\n")

    # ── Stats ────────────────────────────────
    print("═" * 72)
    print("STATS BY DISTRICT  (target medians in parentheses)")
    print("═" * 72)
    targets = {
        "Palm Jumeirah": 35_000, "DIFC": 28_000, "Downtown Dubai": 27_000,
        "Dubai Marina": 23_000,  "Business Bay": 22_000, "Dubai Hills": 20_000,
        "Jumeirah": 18_000,      "JVC": 15_000,  "Al Barsha": 14_000,
    }
    summary = df.groupby("district").agg(
        n              = ("id",              "count"),
        med_ppsqm      = ("price_per_sqm_aed", "median"),
        p25_ppsqm      = ("price_per_sqm_aed", lambda x: int(x.quantile(0.25))),
        p75_ppsqm      = ("price_per_sqm_aed", lambda x: int(x.quantile(0.75))),
        med_price      = ("sale_price_aed",    "median"),
        med_yield      = ("gross_yield_pct",   "median"),
        med_net_yield  = ("net_yield_est_pct", "median"),
        med_dom        = ("days_on_market",    "median"),
    ).round(0)

    for dist in summary.index:
        row   = summary.loc[dist]
        tgt   = targets.get(dist, 0)
        delta = round((row["med_ppsqm"] - tgt) / tgt * 100, 1) if tgt else 0
        sign  = "+" if delta >= 0 else ""
        print(
            f"  {dist:<20}  n={int(row['n']):>5}  "
            f"med={int(row['med_ppsqm']):>6,} AED/sqm  (target {tgt:>6,}, {sign}{delta}%)  "
            f"yield={row['med_yield']:.1f}%  DOM={int(row['med_dom']):>3}d"
        )

    # ── Null check ───────────────────────────
    ml_cols = [
        "month_listed","quarter_listed","year_listed",
        "dist_to_metro_m","dist_to_mall_m","dist_to_beach_m","dist_to_airport_m",
        "view_quality","renovation_status","floor_percentile",
        "has_balcony","has_study","has_maids_room",
        "district_median_price_sqm_at_listing","district_avg_dom_at_listing",
        "district_supply_count_at_listing","price_vs_district_median_pct",
        "price_trend_3m","price_trend_6m","price_trend_12m",
        "total_cost_of_ownership_aed","net_cashflow_year1_aed",
    ]
    nulls = df[ml_cols].isnull().sum()
    print(f"\nNull check — ML columns: {'✓ 0 nulls' if nulls.sum()==0 else nulls[nulls>0].to_string()}")
    print(f"Total rows: {len(df):,}  |  Columns: {len(df.columns)}")
    print("Done ✓")


if __name__ == "__main__":
    import os
    os.chdir(os.path.join(os.path.dirname(__file__), "..", ".."))
    main()
