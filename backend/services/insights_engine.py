"""
Barzel Analytics V3 — Dashboard Insights Engine
Generates contextual insight texts for each dashboard page.
"""

from __future__ import annotations
from services.kpi_engine import get_snapshot, get_snapshots_by_district, ALL_DISTRICTS, _filter, _agg_kpis
from services.barzel_score import compute_barzel_scores_by_district


def _f(val, decimals=1, suffix=""):
    if val is None: return "N/A"
    if isinstance(val, float): return f"{val:,.{decimals}f}{suffix}"
    return f"{val:,}{suffix}"


def _trend_word(val):
    if val is None: return "stable"
    if val > 3: return "en forte hausse"
    if val > 0: return "en légère hausse"
    if val > -3: return "en légère baisse"
    return "en forte baisse"


def get_executive_insights(districts: list[str]) -> dict:
    snapshot = get_snapshot(districts)
    scores = compute_barzel_scores_by_district(districts)
    best = scores[0] if scores else {}
    worst = scores[-1] if scores else {}
    n = snapshot.get("n_listings", 0)
    med_price = snapshot.get("median_price_sqm")
    med_dom = snapshot.get("median_dom")
    med_net = snapshot.get("median_net_yield")
    fast60 = snapshot.get("fast_sale_60d_pct")
    t6m = snapshot.get("price_trend_6m")

    return {
        "synthesis": f"Le marché analysé couvre {n:,} annonces sur {len(districts)} district{'s' if len(districts) > 1 else ''}. Le prix médian est de {_f(med_price, 0)} AED/sqm avec un yield net de {_f(med_net)}%. La liquidité est {'forte' if fast60 and fast60 > 70 else 'correcte' if fast60 and fast60 > 40 else 'faible'} ({_f(fast60)}% de fast-sale ≤60j). Les prix sont {_trend_word(t6m)} sur 6 mois.",
        "highlight": f"{best.get('district', 'N/A')} se distingue avec le meilleur Barzel Score ({_f(best.get('total'), 1)}/100 — {best.get('label', '')}), porté par {'un rendement supérieur' if best.get('yield', 0) > 15 else 'une bonne liquidité' if best.get('liquidity', 0) > 15 else 'des fondamentaux équilibrés'}.",
        "warning": f"Point de vigilance : {worst.get('district', 'N/A')} affiche le score le plus bas ({_f(worst.get('total'), 1)}/100 — {worst.get('label', '')})." if len(scores) > 1 else None,
    }


def get_pricing_insights(districts: list[str]) -> dict:
    by_district = get_snapshots_by_district(districts)
    snapshot = get_snapshot(districts)

    cheapest = min(by_district, key=lambda d: d.get("median_price_sqm") or float("inf")) if by_district else {}
    priciest = max(by_district, key=lambda d: d.get("median_price_sqm") or 0) if by_district else {}
    spread = ((priciest.get("median_price_sqm", 0) / cheapest.get("median_price_sqm", 1)) - 1) * 100 if cheapest.get("median_price_sqm") else 0
    t6m = snapshot.get("price_trend_6m")
    t12m = snapshot.get("price_trend_12m")
    p25 = snapshot.get("p25_price_sqm")
    p75 = snapshot.get("p75_price_sqm")

    return {
        "synthesis": f"Les prix varient de {_f(cheapest.get('median_price_sqm'), 0)} AED/sqm ({cheapest.get('district', '')}) à {_f(priciest.get('median_price_sqm'), 0)} AED/sqm ({priciest.get('district', '')}), soit un écart de {_f(spread, 0)}%. La fourchette interquartile (P25-P75) est de {_f(p25, 0)} – {_f(p75, 0)} AED/sqm.",
        "chart_insight": f"La tendance est {_trend_word(t6m)} sur 6 mois ({_f(t6m)}%) et {_trend_word(t12m)} sur 12 mois ({_f(t12m)}%). {'Le marché montre des signes de stabilisation.' if t6m is not None and t12m is not None and abs(t6m) < abs(t12m) else 'La dynamique récente accélère.' if t6m is not None and t12m is not None and abs(t6m) > abs(t12m) else ''}",
        "verdict": f"Le point d'entrée le plus accessible est {cheapest.get('district', 'N/A')} à {_f(cheapest.get('median_price_sqm'), 0)} AED/sqm. {priciest.get('district', 'N/A')} se positionne sur le segment premium — un choix pour les investisseurs misant sur la valeur patrimoniale.",
    }


def get_liquidity_insights(districts: list[str]) -> dict:
    by_district = get_snapshots_by_district(districts)
    snapshot = get_snapshot(districts)

    most_liquid = max(by_district, key=lambda d: d.get("fast_sale_60d_pct") or 0) if by_district else {}
    least_liquid = min(by_district, key=lambda d: d.get("fast_sale_60d_pct") or float("inf")) if by_district else {}
    fast60 = snapshot.get("fast_sale_60d_pct")
    med_dom = snapshot.get("median_dom")

    return {
        "synthesis": f"Le marché est {'très liquide' if fast60 and fast60 > 80 else 'liquide' if fast60 and fast60 > 60 else 'modérément liquide' if fast60 and fast60 > 40 else 'peu liquide'} : {_f(fast60)}% des biens se vendent en moins de 60 jours avec un DOM médian de {_f(med_dom, 0)} jours. {most_liquid.get('district', '')} domine avec {_f(most_liquid.get('fast_sale_60d_pct'))}% de fast-sale{', loin devant ' + least_liquid.get('district', '') + ' (' + _f(least_liquid.get('fast_sale_60d_pct')) + '%)' if len(by_district) > 1 else ''}.",
        "chart_insight": f"La concentration des ventes entre 30-59 jours indique un marché actif et prévisible. {'La queue fine au-delà de 90 jours confirme l' + chr(39) + 'absence de stock dormant.' if fast60 and fast60 > 60 else 'Une proportion notable de biens met plus de 90 jours à se vendre — signe de surévaluation sur certains segments.'}",
        "verdict": f"Pour un investisseur cherchant de la liquidité, {most_liquid.get('district', 'N/A')} est le choix évident : DOM le plus bas et fast-sale le plus élevé. {'La liquidité globale est saine — pas de signal d' + chr(39) + 'alerte.' if fast60 and fast60 > 50 else 'Attention : la liquidité globale est sous pression.'}",
    }


def get_yield_insights(districts: list[str]) -> dict:
    by_district = get_snapshots_by_district(districts)
    snapshot = get_snapshot(districts)

    best_yield = max(by_district, key=lambda d: d.get("median_net_yield") or 0) if by_district else {}
    worst_yield = min(by_district, key=lambda d: d.get("median_net_yield") or float("inf")) if by_district else {}
    med_gross = snapshot.get("median_gross_yield")
    med_net = snapshot.get("median_net_yield")
    spread = (med_gross - med_net) if med_gross and med_net else None

    return {
        "synthesis": f"Le rendement net médian est de {_f(med_net)}% (brut : {_f(med_gross)}%), avec un spread charges de {_f(spread)} points. {best_yield.get('district', '')} offre le meilleur yield net ({_f(best_yield.get('median_net_yield'))}%){', tandis que ' + worst_yield.get('district', '') + ' est en retrait (' + _f(worst_yield.get('median_net_yield')) + '%)' if len(by_district) > 1 else ''}.",
        "chart_insight": f"{'La distribution du yield est concentrée — signe d' + chr(39) + 'un marché homogène.' if med_gross and med_net and abs(med_gross - med_net) < 1.5 else 'L' + chr(39) + 'écart brut-net varie significativement entre districts, reflétant des niveaux de charges très différents.'}",
        "verdict": f"Pour un investisseur orienté cash-flow, {best_yield.get('district', 'N/A')} à {_f(best_yield.get('median_net_yield'))}% net offre le meilleur potentiel de revenu locatif. Le spread charges de {_f(spread)} points reste {'contenu' if spread and spread < 1.5 else 'élevé — les service charges pèsent significativement'}.",
    }


def get_costs_insights(districts: list[str]) -> dict:
    by_district = get_snapshots_by_district(districts)

    cheapest_sc = min(by_district, key=lambda d: d.get("median_service_charge") or float("inf")) if by_district else {}
    priciest_sc = max(by_district, key=lambda d: d.get("median_service_charge") or 0) if by_district else {}

    avg_gross = sum(d.get("median_gross_yield", 0) or 0 for d in by_district) / len(by_district) if by_district else 0
    avg_net = sum(d.get("median_net_yield", 0) or 0 for d in by_district) / len(by_district) if by_district else 0
    avg_spread = avg_gross - avg_net

    return {
        "synthesis": f"Les service charges varient de {_f(cheapest_sc.get('median_service_charge'), 0)} AED/sqm/an ({cheapest_sc.get('district', '')}) à {_f(priciest_sc.get('median_service_charge'), 0)} AED/sqm/an ({priciest_sc.get('district', '')}). L'impact moyen sur le yield est de {_f(avg_spread)} points (brut {_f(avg_gross)}% → net {_f(avg_net)}%).",
        "chart_insight": f"{'Les charges sont relativement homogènes entre districts — le choix d' + chr(39) + 'investissement se joue ailleurs.' if priciest_sc.get('median_service_charge', 0) and cheapest_sc.get('median_service_charge', 1) and (priciest_sc.get('median_service_charge', 0) / max(cheapest_sc.get('median_service_charge', 1), 1)) < 1.3 else 'L' + chr(39) + 'écart de charges entre districts est significatif et impacte directement la rentabilité nette.'}",
        "verdict": f"{cheapest_sc.get('district', 'N/A')} offre les charges les plus basses, optimisant le rendement net. Les charges restent un facteur {'secondaire' if avg_spread < 1 else 'important'} dans l'équation d'investissement sur ce marché.",
    }


def get_all_insights(districts: list[str]) -> dict:
    """Return insights for all pages in one call."""
    return {
        "executive": get_executive_insights(districts),
        "pricing": get_pricing_insights(districts),
        "liquidity": get_liquidity_insights(districts),
        "yield": get_yield_insights(districts),
        "costs": get_costs_insights(districts),
    }
