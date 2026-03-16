"""
Barzel Analytics V3 — Dashboard Insights Engine
Generates contextual insight texts for each dashboard page (FR/EN).
"""

from __future__ import annotations
from services.kpi_engine import get_snapshot, get_snapshots_by_district, ALL_DISTRICTS, _filter, _agg_kpis
from services.barzel_score import compute_barzel_scores_by_district


def _f(val, decimals=1, suffix=""):
    if val is None: return "N/A"
    if isinstance(val, float): return f"{val:,.{decimals}f}{suffix}"
    return f"{val:,}{suffix}"


def _trend_word(val, lang="fr"):
    if val is None: return "stable"
    if lang == "fr":
        if val > 3: return "en forte hausse"
        if val > 0: return "en légère hausse"
        if val > -3: return "en légère baisse"
        return "en forte baisse"
    else:
        if val > 3: return "surging"
        if val > 0: return "rising slightly"
        if val > -3: return "declining slightly"
        return "falling sharply"


def _liq_word(fast60, lang="fr"):
    if fast60 is None:
        return ("modérée", "moderate")
    if fast60 >= 80:
        return ("très élevée", "very high") if lang == "fr" else ("très élevée", "very high")
    if fast60 >= 60:
        return ("forte", "strong")
    if fast60 >= 40:
        return ("correcte", "fair")
    return ("faible", "low")


def get_executive_insights(districts: list[str], lang: str = "fr") -> dict:
    snapshot = get_snapshot(districts)
    scores = compute_barzel_scores_by_district(districts)
    best = scores[0] if scores else {}
    worst = scores[-1] if scores else {}
    n = snapshot.get("n_listings", 0)
    med_price = snapshot.get("median_price_sqm")
    med_net = snapshot.get("median_net_yield")
    fast60 = snapshot.get("fast_sale_60d_pct")
    t6m = snapshot.get("price_trend_6m")

    liq_fr, liq_en = _liq_word(fast60, lang)
    liq_word = liq_fr if lang == "fr" else liq_en

    best_driver_fr = "un rendement supérieur" if best.get("yield", 0) > 15 else "une bonne liquidité" if best.get("liquidity", 0) > 15 else "des fondamentaux équilibrés"
    best_driver_en = "superior yield" if best.get("yield", 0) > 15 else "strong liquidity" if best.get("liquidity", 0) > 15 else "balanced fundamentals"

    if lang == "fr":
        return {
            "synthesis": f"Le marché analysé couvre {n:,} annonces sur {len(districts)} district{'s' if len(districts) > 1 else ''}. Le prix médian est de {_f(med_price, 0)} AED/sqm avec un yield net de {_f(med_net)}%. La liquidité est {liq_word} ({_f(fast60)}% de fast-sale ≤60j). Les prix sont {_trend_word(t6m, lang)} sur 6 mois.",
            "highlight": f"{best.get('district', 'N/A')} se distingue avec le meilleur Barzel Score ({_f(best.get('total'), 1)}/100 — {best.get('label', '')}), porté par {best_driver_fr}.",
            "warning": f"Point de vigilance : {worst.get('district', 'N/A')} affiche le score le plus bas ({_f(worst.get('total'), 1)}/100 — {worst.get('label', '')})." if len(scores) > 1 else None,
        }
    else:
        return {
            "synthesis": f"The analyzed market covers {n:,} listings across {len(districts)} district{'s' if len(districts) > 1 else ''}. Median price is {_f(med_price, 0)} AED/sqm with a net yield of {_f(med_net)}%. Liquidity is {liq_word} ({_f(fast60)}% fast-sale ≤60d). Prices are {_trend_word(t6m, lang)} over 6 months.",
            "highlight": f"{best.get('district', 'N/A')} stands out with the highest Barzel Score ({_f(best.get('total'), 1)}/100 — {best.get('label', '')}), driven by {best_driver_en}.",
            "warning": f"Watch point: {worst.get('district', 'N/A')} shows the lowest score ({_f(worst.get('total'), 1)}/100 — {worst.get('label', '')})." if len(scores) > 1 else None,
        }


def get_pricing_insights(districts: list[str], lang: str = "fr") -> dict:
    by_district = get_snapshots_by_district(districts)
    snapshot = get_snapshot(districts)

    cheapest = min(by_district, key=lambda d: d.get("median_price_sqm") or float("inf")) if by_district else {}
    priciest = max(by_district, key=lambda d: d.get("median_price_sqm") or 0) if by_district else {}
    spread = ((priciest.get("median_price_sqm", 0) / cheapest.get("median_price_sqm", 1)) - 1) * 100 if cheapest.get("median_price_sqm") else 0
    t6m = snapshot.get("price_trend_6m")
    t12m = snapshot.get("price_trend_12m")
    p25 = snapshot.get("p25_price_sqm")
    p75 = snapshot.get("p75_price_sqm")

    stab_fr = "Le marché montre des signes de stabilisation." if t6m is not None and t12m is not None and abs(t6m) < abs(t12m) else "La dynamique récente accélère." if t6m is not None and t12m is not None and abs(t6m) > abs(t12m) else ""
    stab_en = "The market shows signs of stabilization." if t6m is not None and t12m is not None and abs(t6m) < abs(t12m) else "Recent momentum is accelerating." if t6m is not None and t12m is not None and abs(t6m) > abs(t12m) else ""

    if lang == "fr":
        return {
            "synthesis": f"Les prix varient de {_f(cheapest.get('median_price_sqm'), 0)} AED/sqm ({cheapest.get('district', '')}) à {_f(priciest.get('median_price_sqm'), 0)} AED/sqm ({priciest.get('district', '')}), soit un écart de {_f(spread, 0)}%. La fourchette interquartile (P25-P75) est de {_f(p25, 0)} – {_f(p75, 0)} AED/sqm.",
            "chart_insight": f"La tendance est {_trend_word(t6m, lang)} sur 6 mois ({_f(t6m)}%) et {_trend_word(t12m, lang)} sur 12 mois ({_f(t12m)}%). {stab_fr}",
            "verdict": f"Le point d'entrée le plus accessible est {cheapest.get('district', 'N/A')} à {_f(cheapest.get('median_price_sqm'), 0)} AED/sqm. {priciest.get('district', 'N/A')} se positionne sur le segment premium — un choix pour les investisseurs misant sur la valeur patrimoniale.",
        }
    else:
        return {
            "synthesis": f"Prices range from {_f(cheapest.get('median_price_sqm'), 0)} AED/sqm ({cheapest.get('district', '')}) to {_f(priciest.get('median_price_sqm'), 0)} AED/sqm ({priciest.get('district', '')}), a spread of {_f(spread, 0)}%. The interquartile range (P25-P75) is {_f(p25, 0)} – {_f(p75, 0)} AED/sqm.",
            "chart_insight": f"Trend is {_trend_word(t6m, lang)} over 6 months ({_f(t6m)}%) and {_trend_word(t12m, lang)} over 12 months ({_f(t12m)}%). {stab_en}",
            "verdict": f"Most accessible entry point is {cheapest.get('district', 'N/A')} at {_f(cheapest.get('median_price_sqm'), 0)} AED/sqm. {priciest.get('district', 'N/A')} targets the premium segment — a choice for investors focused on capital value.",
        }


def get_liquidity_insights(districts: list[str], lang: str = "fr") -> dict:
    by_district = get_snapshots_by_district(districts)
    snapshot = get_snapshot(districts)

    most_liquid = max(by_district, key=lambda d: d.get("fast_sale_60d_pct") or 0) if by_district else {}
    least_liquid = min(by_district, key=lambda d: d.get("fast_sale_60d_pct") or float("inf")) if by_district else {}
    fast60 = snapshot.get("fast_sale_60d_pct")
    med_dom = snapshot.get("median_dom")

    liq_level_fr = "très liquide" if fast60 and fast60 > 80 else "liquide" if fast60 and fast60 > 60 else "modérément liquide" if fast60 and fast60 > 40 else "peu liquide"
    liq_level_en = "very liquid" if fast60 and fast60 > 80 else "liquid" if fast60 and fast60 > 60 else "moderately liquid" if fast60 and fast60 > 40 else "illiquid"

    tail_fr = "La queue fine au-delà de 90 jours confirme l\u2019absence de stock dormant." if fast60 and fast60 > 60 else "Une proportion notable de biens met plus de 90 jours à se vendre — signe de surévaluation sur certains segments."
    tail_en = "The thin tail beyond 90 days confirms the absence of stagnant stock." if fast60 and fast60 > 60 else "A notable share of properties take over 90 days to sell — a sign of overvaluation in some segments."

    health_fr = "La liquidité globale est saine — pas de signal d\u2019alerte." if fast60 and fast60 > 50 else "Attention : la liquidité globale est sous pression."
    health_en = "Overall liquidity is healthy — no warning signals." if fast60 and fast60 > 50 else "Caution: overall liquidity is under pressure."

    if lang == "fr":
        trailing = f", loin devant {least_liquid.get('district', '')} ({_f(least_liquid.get('fast_sale_60d_pct'))}%)" if len(by_district) > 1 else ""
        return {
            "synthesis": f"Le marché est {liq_level_fr} : {_f(fast60)}% des biens se vendent en moins de 60 jours avec un DOM médian de {_f(med_dom, 0)} jours. {most_liquid.get('district', '')} domine avec {_f(most_liquid.get('fast_sale_60d_pct'))}% de fast-sale{trailing}.",
            "chart_insight": f"La concentration des ventes entre 30-59 jours indique un marché actif et prévisible. {tail_fr}",
            "verdict": f"Pour un investisseur cherchant de la liquidité, {most_liquid.get('district', 'N/A')} est le choix évident : DOM le plus bas et fast-sale le plus élevé. {health_fr}",
        }
    else:
        trailing = f", well ahead of {least_liquid.get('district', '')} ({_f(least_liquid.get('fast_sale_60d_pct'))}%)" if len(by_district) > 1 else ""
        return {
            "synthesis": f"The market is {liq_level_en}: {_f(fast60)}% of properties sell within 60 days with a median DOM of {_f(med_dom, 0)} days. {most_liquid.get('district', '')} leads with {_f(most_liquid.get('fast_sale_60d_pct'))}% fast-sale{trailing}.",
            "chart_insight": f"Concentration of sales in the 30-59 day range signals an active and predictable market. {tail_en}",
            "verdict": f"For a liquidity-focused investor, {most_liquid.get('district', 'N/A')} is the obvious choice: lowest DOM and highest fast-sale rate. {health_en}",
        }


def get_yield_insights(districts: list[str], lang: str = "fr") -> dict:
    by_district = get_snapshots_by_district(districts)
    snapshot = get_snapshot(districts)

    best_yield = max(by_district, key=lambda d: d.get("median_net_yield") or 0) if by_district else {}
    worst_yield = min(by_district, key=lambda d: d.get("median_net_yield") or float("inf")) if by_district else {}
    med_gross = snapshot.get("median_gross_yield")
    med_net = snapshot.get("median_net_yield")
    spread = (med_gross - med_net) if med_gross and med_net else None

    homog_fr = "La distribution du yield est concentrée — signe d\u2019un marché homogène." if med_gross and med_net and abs(med_gross - med_net) < 1.5 else "L\u2019écart brut-net varie significativement entre districts, reflétant des niveaux de charges très différents."
    homog_en = "Yield distribution is concentrated — a sign of a homogeneous market." if med_gross and med_net and abs(med_gross - med_net) < 1.5 else "The gross-net gap varies significantly across districts, reflecting very different charge levels."

    spread_comment_fr = "contenu" if spread and spread < 1.5 else "élevé — les service charges pèsent significativement"
    spread_comment_en = "contained" if spread and spread < 1.5 else "high — service charges weigh significantly"

    if lang == "fr":
        trailing = f", tandis que {worst_yield.get('district', '')} est en retrait ({_f(worst_yield.get('median_net_yield'))}%)" if len(by_district) > 1 else ""
        return {
            "synthesis": f"Le rendement net médian est de {_f(med_net)}% (brut : {_f(med_gross)}%), avec un spread charges de {_f(spread)} points. {best_yield.get('district', '')} offre le meilleur yield net ({_f(best_yield.get('median_net_yield'))}%){trailing}.",
            "chart_insight": homog_fr,
            "verdict": f"Pour un investisseur orienté cash-flow, {best_yield.get('district', 'N/A')} à {_f(best_yield.get('median_net_yield'))}% net offre le meilleur potentiel de revenu locatif. Le spread charges de {_f(spread)} points reste {spread_comment_fr}.",
        }
    else:
        trailing = f", while {worst_yield.get('district', '')} lags ({_f(worst_yield.get('median_net_yield'))}%)" if len(by_district) > 1 else ""
        return {
            "synthesis": f"Median net yield stands at {_f(med_net)}% (gross: {_f(med_gross)}%), with a charge spread of {_f(spread)} points. {best_yield.get('district', '')} offers the best net yield ({_f(best_yield.get('median_net_yield'))}%){trailing}.",
            "chart_insight": homog_en,
            "verdict": f"For a cash-flow investor, {best_yield.get('district', 'N/A')} at {_f(best_yield.get('median_net_yield'))}% net offers the best rental income potential. The charge spread of {_f(spread)} points remains {spread_comment_en}.",
        }


def get_costs_insights(districts: list[str], lang: str = "fr") -> dict:
    by_district = get_snapshots_by_district(districts)

    cheapest_sc = min(by_district, key=lambda d: d.get("median_service_charge") or float("inf")) if by_district else {}
    priciest_sc = max(by_district, key=lambda d: d.get("median_service_charge") or 0) if by_district else {}

    avg_gross = sum(d.get("median_gross_yield", 0) or 0 for d in by_district) / len(by_district) if by_district else 0
    avg_net = sum(d.get("median_net_yield", 0) or 0 for d in by_district) / len(by_district) if by_district else 0
    avg_spread = avg_gross - avg_net

    ratio = (priciest_sc.get("median_service_charge", 0) / max(cheapest_sc.get("median_service_charge", 1), 1)) if cheapest_sc.get("median_service_charge") else 0
    homog_fr = "Les charges sont relativement homogènes entre districts — le choix d\u2019investissement se joue ailleurs." if ratio < 1.3 else "L\u2019écart de charges entre districts est significatif et impacte directement la rentabilité nette."
    homog_en = "Charges are relatively homogeneous across districts — the investment decision lies elsewhere." if ratio < 1.3 else "The charge gap between districts is significant and directly impacts net profitability."

    factor_fr = "secondaire" if avg_spread < 1 else "important"
    factor_en = "secondary" if avg_spread < 1 else "important"

    if lang == "fr":
        return {
            "synthesis": f"Les service charges varient de {_f(cheapest_sc.get('median_service_charge'), 0)} AED/sqm/an ({cheapest_sc.get('district', '')}) à {_f(priciest_sc.get('median_service_charge'), 0)} AED/sqm/an ({priciest_sc.get('district', '')}). L'impact moyen sur le yield est de {_f(avg_spread)} points (brut {_f(avg_gross)}% → net {_f(avg_net)}%).",
            "chart_insight": homog_fr,
            "verdict": f"{cheapest_sc.get('district', 'N/A')} offre les charges les plus basses, optimisant le rendement net. Les charges restent un facteur {factor_fr} dans l'équation d'investissement sur ce marché.",
        }
    else:
        return {
            "synthesis": f"Service charges range from {_f(cheapest_sc.get('median_service_charge'), 0)} AED/sqm/yr ({cheapest_sc.get('district', '')}) to {_f(priciest_sc.get('median_service_charge'), 0)} AED/sqm/yr ({priciest_sc.get('district', '')}). Average yield impact is {_f(avg_spread)} points (gross {_f(avg_gross)}% → net {_f(avg_net)}%).",
            "chart_insight": homog_en,
            "verdict": f"{cheapest_sc.get('district', 'N/A')} offers the lowest charges, optimizing net yield. Charges remain a {factor_en} factor in the investment equation for this market.",
        }


def get_all_insights(districts: list[str], lang: str = "fr") -> dict:
    """Return insights for all pages in one call."""
    return {
        "executive": get_executive_insights(districts, lang),
        "pricing": get_pricing_insights(districts, lang),
        "liquidity": get_liquidity_insights(districts, lang),
        "yield": get_yield_insights(districts, lang),
        "costs": get_costs_insights(districts, lang),
    }
