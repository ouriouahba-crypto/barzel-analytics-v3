"""
Barzel Analytics V3 — PDF Narrative Generator
Transforms raw KPIs into human-readable investment insights.
"""

from __future__ import annotations


def _f(val, decimals=1, suffix=""):
    """Format a number safely."""
    if val is None:
        return "N/A"
    if isinstance(val, float):
        return f"{val:,.{decimals}f}{suffix}"
    return f"{val:,}{suffix}"


def _trend_word(val):
    if val is None: return "stable"
    if val > 3: return "en forte hausse"
    if val > 0: return "en légère hausse"
    if val > -3: return "en légère baisse"
    return "en forte baisse"


def _trend_word_en(val):
    if val is None: return "stable"
    if val > 3: return "surging"
    if val > 0: return "rising slightly"
    if val > -3: return "declining slightly"
    return "falling sharply"


def _liquidity_word(fast60):
    if fast60 is None: return ("modérée", "moderate")
    if fast60 >= 80: return ("très élevée", "very high")
    if fast60 >= 50: return ("bonne", "good")
    if fast60 >= 30: return ("modérée", "moderate")
    return ("faible", "low")


def _yield_word(net_yield):
    if net_yield is None: return ("moyen", "average")
    if net_yield >= 7: return ("excellent", "excellent")
    if net_yield >= 5.5: return ("attractif", "attractive")
    if net_yield >= 4: return ("moyen", "average")
    return ("faible", "low")


def _score_interpretation(score, lang="fr"):
    if score >= 80:
        return {
            "fr": "Ce district présente un profil d'investissement exceptionnel. Tous les indicateurs convergent vers une opportunité rare sur le marché de Dubai.",
            "en": "This district presents an exceptional investment profile. All indicators point to a rare opportunity in the Dubai market.",
        }[lang]
    if score >= 65:
        return {
            "fr": "Profil solide avec des fondamentaux positifs. Ce district offre un bon équilibre entre rendement et sécurité pour un investisseur institutionnel.",
            "en": "Solid profile with positive fundamentals. This district offers a good balance between yield and safety for institutional investors.",
        }[lang]
    if score >= 45:
        return {
            "fr": "Profil mixte nécessitant une analyse approfondie. Certains indicateurs sont favorables mais d'autres appellent à la prudence.",
            "en": "Mixed profile requiring deeper analysis. Some indicators are favorable but others call for caution.",
        }[lang]
    if score >= 30:
        return {
            "fr": "Profil sous pression. Les fondamentaux actuels ne justifient pas un positionnement agressif. À surveiller pour un point d'entrée futur.",
            "en": "Profile under pressure. Current fundamentals don't justify aggressive positioning. Monitor for a future entry point.",
        }[lang]
    return {
        "fr": "Signaux d'alerte multiples. Ce district cumule des facteurs de risque importants : liquidité faible, rendement compressé, ou tendance baissière marquée.",
        "en": "Multiple warning signals. This district accumulates significant risk factors: low liquidity, compressed yield, or marked downward trend.",
    }[lang]


def generate_executive_summary(snapshot: dict, scores_by_district: list, agg_score: dict, lang="fr") -> list[str]:
    """Generate executive summary paragraphs."""
    n = snapshot.get("n_listings", 0)
    med_price = snapshot.get("median_price_sqm")
    med_dom = snapshot.get("median_dom")
    med_net = snapshot.get("median_net_yield")
    t6m = snapshot.get("price_trend_6m")
    fast60 = snapshot.get("fast_sale_60d_pct")
    total_score = agg_score.get("total", 0)
    label = agg_score.get("label", "")

    best = scores_by_district[0] if scores_by_district else {}
    worst = scores_by_district[-1] if scores_by_district else {}

    liq_fr, liq_en = _liquidity_word(fast60)
    yld_fr, yld_en = _yield_word(med_net)

    if lang == "fr":
        paras = [
            f"Ce mémo analyse {n:,} annonces immobilières actives sur le marché de Dubai, couvrant {len(scores_by_district)} district{'s' if len(scores_by_district) > 1 else ''}. L'analyse s'appuie sur le Barzel Score, un indicateur propriétaire combinant liquidité, rendement, stabilité et tendance de marché.",

            f"Le prix médian s'établit à {_f(med_price, 0)} AED/sqm, avec un rendement net médian de {_f(med_net)}%. La liquidité du marché est {liq_fr} : {_f(fast60)}% des biens se vendent en moins de 60 jours, avec un DOM médian de {_f(med_dom, 0)} jours. Les prix sont {_trend_word(t6m)} sur 6 mois ({_f(t6m)}%).",

            f"Le Barzel Score agrégé ressort à {_f(total_score, 1)}/100 ({label}). Le district le mieux noté est {best.get('district', 'N/A')} avec un score de {_f(best.get('total'), 1)}/100 ({best.get('label', '')}), porté par {'un rendement supérieur' if best.get('yield', 0) > 15 else 'une bonne liquidité' if best.get('liquidity', 0) > 15 else 'des fondamentaux équilibrés'}. À l'opposé, {worst.get('district', 'N/A')} affiche le score le plus bas à {_f(worst.get('total'), 1)}/100 ({worst.get('label', '')}).",
        ]
    else:
        paras = [
            f"This memo analyzes {n:,} active property listings in the Dubai market across {len(scores_by_district)} district{'s' if len(scores_by_district) > 1 else ''}. The analysis is built on the Barzel Score, a proprietary indicator combining liquidity, yield, stability, and market trends.",

            f"Median price sits at {_f(med_price, 0)} AED/sqm with a median net yield of {_f(med_net)}%. Market liquidity is {liq_en}: {_f(fast60)}% of properties sell within 60 days, with a median DOM of {_f(med_dom, 0)} days. Prices are {_trend_word_en(t6m)} over 6 months ({_f(t6m)}%).",

            f"The aggregate Barzel Score stands at {_f(total_score, 1)}/100 ({label}). Top-rated district is {best.get('district', 'N/A')} at {_f(best.get('total'), 1)}/100 ({best.get('label', '')}), driven by {'superior yield' if best.get('yield', 0) > 15 else 'strong liquidity' if best.get('liquidity', 0) > 15 else 'balanced fundamentals'}. Conversely, {worst.get('district', 'N/A')} scores lowest at {_f(worst.get('total'), 1)}/100 ({worst.get('label', '')}).",
        ]

    return paras


def generate_key_takeaways(snapshot: dict, scores_by_district: list, lang="fr") -> list[str]:
    """Generate 4-5 key insight bullets."""
    best = scores_by_district[0] if scores_by_district else {}
    worst = scores_by_district[-1] if scores_by_district else {}

    # Find best yield district
    best_yield = max(scores_by_district, key=lambda x: x.get("median_net_yield") or 0) if scores_by_district else {}
    # Find most liquid district
    best_liq = max(scores_by_district, key=lambda x: x.get("liquidity", 0)) if scores_by_district else {}

    if lang == "fr":
        bullets = [
            f"Meilleur score global : {best.get('district', 'N/A')} ({_f(best.get('total'), 1)}/100) — {best.get('label', '')}",
            f"Meilleur rendement : {best_yield.get('district', 'N/A')} avec un yield net de {_f(best_yield.get('median_net_yield'))}%",
            f"Meilleure liquidité : {best_liq.get('district', 'N/A')} — les biens se vendent le plus rapidement",
            f"Attention : {worst.get('district', 'N/A')} affiche des signaux de prudence (score {_f(worst.get('total'), 1)}/100)",
            f"Le marché global compte {snapshot.get('n_listings', 0):,} annonces actives avec un prix médian de {_f(snapshot.get('median_price_sqm'), 0)} AED/sqm",
        ]
    else:
        bullets = [
            f"Top overall score: {best.get('district', 'N/A')} ({_f(best.get('total'), 1)}/100) — {best.get('label', '')}",
            f"Highest yield: {best_yield.get('district', 'N/A')} with net yield of {_f(best_yield.get('median_net_yield'))}%",
            f"Most liquid: {best_liq.get('district', 'N/A')} — fastest selling properties",
            f"Caution: {worst.get('district', 'N/A')} shows warning signs (score {_f(worst.get('total'), 1)}/100)",
            f"Total market: {snapshot.get('n_listings', 0):,} active listings at median {_f(snapshot.get('median_price_sqm'), 0)} AED/sqm",
        ]

    return bullets


def generate_district_overview(kpis: dict, score: dict, market_snapshot: dict, lang="fr") -> list[str]:
    """Generate 2-3 overview paragraphs for a district."""
    d = kpis.get("district") or score.get("district", "")
    total = score.get("total", 0)
    label = score.get("label", "")

    med_price = kpis.get("median_price_sqm")
    mkt_price = market_snapshot.get("median_price_sqm")
    price_vs = ((med_price / mkt_price - 1) * 100) if med_price and mkt_price and mkt_price > 0 else None

    med_dom = kpis.get("median_dom")
    fast60 = kpis.get("fast_sale_60d_pct")
    med_net = kpis.get("median_net_yield")
    med_gross = kpis.get("median_gross_yield")
    spread = (med_gross - med_net) if med_gross and med_net else None
    t6m = kpis.get("price_trend_6m")
    t12m = kpis.get("price_trend_12m")
    cv = kpis.get("price_consistency_cv")
    svc = kpis.get("median_service_charge")
    n = kpis.get("n_listings", 0)

    liq_fr, liq_en = _liquidity_word(fast60)
    yld_fr, yld_en = _yield_word(med_net)

    if lang == "fr":
        paras = [
            f"{d} est positionné {'au-dessus' if price_vs and price_vs > 0 else 'en-dessous'} de la médiane du marché "
            f"({'+'if price_vs and price_vs > 0 else ''}{_f(price_vs)}%) avec un prix médian de {_f(med_price, 0)} AED/sqm "
            f"(fourchette P25-P75 : {_f(kpis.get('p25_price_sqm'), 0)} – {_f(kpis.get('p75_price_sqm'), 0)} AED/sqm). "
            f"Le district représente {n:,} annonces sur le marché analysé.",

            f"Côté liquidité ({liq_fr}), {_f(fast60)}% des biens trouvent acquéreur en moins de 60 jours, "
            f"avec un DOM médian de {_f(med_dom, 0)} jours. Le rendement net médian est de {_f(med_net)}% "
            f"({yld_fr}), avec un yield brut de {_f(med_gross)}% et un spread charges de {_f(spread)} points. "
            f"Les services charges s'élèvent à {_f(svc, 0)} AED/sqm/an.",

            f"La tendance des prix est {_trend_word(t6m)} sur 6 mois ({_f(t6m)}%) et {_trend_word(t12m)} sur 12 mois ({_f(t12m)}%). "
            f"La dispersion des prix (CV) est de {_f(cv)}%, ce qui indique une {'forte' if cv and cv > 30 else 'bonne' if cv and cv < 15 else 'moyenne'} homogénéité du parc immobilier.",
        ]
    else:
        paras = [
            f"{d} is positioned {'above' if price_vs and price_vs > 0 else 'below'} the market median "
            f"({'+'if price_vs and price_vs > 0 else ''}{_f(price_vs)}%) with a median price of {_f(med_price, 0)} AED/sqm "
            f"(P25-P75 range: {_f(kpis.get('p25_price_sqm'), 0)} – {_f(kpis.get('p75_price_sqm'), 0)} AED/sqm). "
            f"The district accounts for {n:,} listings in the analyzed market.",

            f"Liquidity is {liq_en}: {_f(fast60)}% of properties sell within 60 days, "
            f"with a median DOM of {_f(med_dom, 0)} days. Median net yield stands at {_f(med_net)}% "
            f"({yld_en}), with gross yield of {_f(med_gross)}% and a charge spread of {_f(spread)} points. "
            f"Service charges average {_f(svc, 0)} AED/sqm/year.",

            f"Price trend is {_trend_word_en(t6m)} over 6 months ({_f(t6m)}%) and {_trend_word_en(t12m)} over 12 months ({_f(t12m)}%). "
            f"Price dispersion (CV) is {_f(cv)}%, indicating {'high' if cv and cv > 30 else 'good' if cv and cv < 15 else 'moderate'} property stock homogeneity.",
        ]

    return paras


def generate_district_scoring_analysis(score: dict, lang="fr") -> list[str]:
    """Explain each pillar of the Barzel Score for a district."""
    d = score.get("district", "")
    liq = score.get("liquidity", 0)
    yld = score.get("yield", 0)
    risk = score.get("risk", 0)
    trend = score.get("trend", 0)
    total = score.get("total", 0)

    def pillar_level(val):
        if val >= 20: return ("excellent", "excellent")
        if val >= 15: return ("bon", "good")
        if val >= 10: return ("moyen", "moderate")
        return ("faible", "weak")

    liq_fr, liq_en = pillar_level(liq)
    yld_fr, yld_en = pillar_level(yld)
    risk_fr, risk_en = pillar_level(risk)
    trend_fr, trend_en = pillar_level(trend)

    # Find strongest and weakest pillars
    pillars = {"Liquidité": liq, "Rendement": yld, "Stabilité": risk, "Tendance": trend}
    pillars_en = {"Liquidity": liq, "Yield": yld, "Stability": risk, "Trend": trend}
    best_p = max(pillars, key=pillars.get)
    worst_p = min(pillars, key=pillars.get)
    best_p_en = max(pillars_en, key=pillars_en.get)
    worst_p_en = min(pillars_en, key=pillars_en.get)

    if lang == "fr":
        paras = [
            f"Le Barzel Score de {d} s'établit à {total:.1f}/100. Le pilier le plus fort est {best_p} ({pillars[best_p]:.1f}/25), tandis que {worst_p} constitue le point faible ({pillars[worst_p]:.1f}/25).",

            f"• Liquidité : {liq:.1f}/25 ({liq_fr}) — Mesure la vitesse à laquelle les biens se vendent. Un score élevé signifie que le marché est actif et que les investisseurs peuvent sortir rapidement.",
            f"• Rendement : {yld:.1f}/25 ({yld_fr}) — Évalue le yield net locatif. Un score élevé indique un potentiel de cash-flow supérieur à la moyenne du marché Dubai.",
            f"• Stabilité : {risk:.1f}/25 ({risk_fr}) — Mesure l'homogénéité des prix (coefficient de variation). Un score élevé signifie des prix prévisibles et un risque de dépréciation limité.",
            f"• Tendance : {trend:.1f}/25 ({trend_fr}) — Capture la dynamique des prix sur 6 mois. Un score élevé signale une appréciation du capital en cours.",

            _score_interpretation(total, "fr"),
        ]
    else:
        paras = [
            f"{d}'s Barzel Score stands at {total:.1f}/100. Strongest pillar is {best_p_en} ({pillars_en[best_p_en]:.1f}/25), while {worst_p_en} is the weakest ({pillars_en[worst_p_en]:.1f}/25).",

            f"• Liquidity: {liq:.1f}/25 ({liq_en}) — Measures how quickly properties sell. High score means an active market where investors can exit rapidly.",
            f"• Yield: {yld:.1f}/25 ({yld_en}) — Evaluates net rental yield. High score indicates cash-flow potential above the Dubai market average.",
            f"• Stability: {risk:.1f}/25 ({risk_en}) — Measures price homogeneity (coefficient of variation). High score means predictable pricing and limited depreciation risk.",
            f"• Trend: {trend:.1f}/25 ({trend_en}) — Captures 6-month price momentum. High score signals ongoing capital appreciation.",

            _score_interpretation(total, "en"),
        ]

    return paras


def generate_district_typology_analysis(typology: list, district_name: str, lang="fr") -> list[str]:
    """Analyze bedroom typology distribution."""
    if not typology:
        return []

    dominant = max(typology, key=lambda x: x.get("count", 0))
    best_yield_typo = max(typology, key=lambda x: x.get("median_yield") or 0)
    cheapest = min(typology, key=lambda x: x.get("median_price_sqm") or float("inf"))

    if lang == "fr":
        paras = [
            f"La typologie dominante à {district_name} est le {dominant['bedrooms']} chambre{'s' if dominant['bedrooms'] > 1 else ''} "
            f"({_f(dominant.get('share'))}% du parc, {dominant.get('count', 0)} annonces), "
            f"avec un prix médian de {_f(dominant.get('median_price'), 0)} AED et un yield de {_f(dominant.get('median_yield'))}%.",

            f"Le meilleur rendement par typologie revient au {best_yield_typo['bedrooms']} chambre{'s' if best_yield_typo['bedrooms'] > 1 else ''} "
            f"avec {_f(best_yield_typo.get('median_yield'))}% de yield brut. "
            f"Le point d'entrée le plus accessible est le {cheapest['bedrooms']} chambre{'s' if cheapest['bedrooms'] > 1 else ''} "
            f"à {_f(cheapest.get('median_price_sqm'), 0)} AED/sqm.",
        ]
    else:
        paras = [
            f"The dominant typology in {district_name} is {dominant['bedrooms']} bedroom{'s' if dominant['bedrooms'] > 1 else ''} "
            f"({_f(dominant.get('share'))}% of stock, {dominant.get('count', 0)} listings), "
            f"with a median price of {_f(dominant.get('median_price'), 0)} AED and yield of {_f(dominant.get('median_yield'))}%.",

            f"Best yield by typology goes to {best_yield_typo['bedrooms']} bedroom{'s' if best_yield_typo['bedrooms'] > 1 else ''} "
            f"at {_f(best_yield_typo.get('median_yield'))}% gross yield. "
            f"Most accessible entry point is {cheapest['bedrooms']} bedroom{'s' if cheapest['bedrooms'] > 1 else ''} "
            f"at {_f(cheapest.get('median_price_sqm'), 0)} AED/sqm.",
        ]

    return paras


def generate_district_verdict(kpis: dict, score: dict, lang="fr") -> list[str]:
    """Final verdict and investor profile fit."""
    d = kpis.get("district") or score.get("district", "")
    total = score.get("total", 0)
    liq = score.get("liquidity", 0)
    yld = score.get("yield", 0)
    risk = score.get("risk", 0)
    trend = score.get("trend", 0)

    # Determine investor profile
    if yld >= 20 and liq >= 15:
        profile_fr = "investisseur orienté cash-flow recherchant des revenus locatifs réguliers avec une bonne liquidité de sortie"
        profile_en = "cash-flow oriented investor seeking regular rental income with good exit liquidity"
    elif trend >= 20 and risk >= 15:
        profile_fr = "investisseur value-add misant sur l'appréciation du capital dans un environnement de prix stable"
        profile_en = "value-add investor targeting capital appreciation in a stable pricing environment"
    elif liq >= 20:
        profile_fr = "investisseur opportuniste recherchant une rotation rapide du capital"
        profile_en = "opportunistic investor seeking rapid capital rotation"
    elif risk >= 20:
        profile_fr = "investisseur conservateur privilégiant la préservation du capital"
        profile_en = "conservative investor prioritizing capital preservation"
    else:
        profile_fr = "investisseur diversifié intégrant ce district dans un portefeuille multi-marchés"
        profile_en = "diversified investor integrating this district into a multi-market portfolio"

    # Strengths and risks
    strengths_fr, strengths_en = [], []
    risks_fr, risks_en = [], []

    if liq >= 15:
        strengths_fr.append("bonne liquidité du marché")
        strengths_en.append("good market liquidity")
    else:
        risks_fr.append("liquidité limitée — sortie potentiellement lente")
        risks_en.append("limited liquidity — potentially slow exit")

    if yld >= 15:
        strengths_fr.append("rendement locatif attractif")
        strengths_en.append("attractive rental yield")
    else:
        risks_fr.append("rendement sous la moyenne du marché")
        risks_en.append("yield below market average")

    if risk >= 15:
        strengths_fr.append("prix homogènes et prévisibles")
        strengths_en.append("homogeneous and predictable pricing")
    else:
        risks_fr.append("forte dispersion des prix — valorisation incertaine")
        risks_en.append("high price dispersion — uncertain valuation")

    if trend >= 15:
        strengths_fr.append("tendance haussière des prix")
        strengths_en.append("upward price trend")
    else:
        risks_fr.append("dynamique de prix défavorable")
        risks_en.append("unfavorable price dynamics")

    if lang == "fr":
        paras = [
            f"VERDICT : {d} obtient un Barzel Score de {total:.1f}/100 — {score.get('label', '')}.",
            f"Ce district convient particulièrement à un {profile_fr}.",
            f"Forces : {', '.join(strengths_fr) if strengths_fr else 'aucune force majeure identifiée'}.",
            f"Risques : {', '.join(risks_fr) if risks_fr else 'aucun risque majeur identifié'}.",
        ]
    else:
        paras = [
            f"VERDICT: {d} achieves a Barzel Score of {total:.1f}/100 — {score.get('label', '')}.",
            f"This district is particularly suited for a {profile_en}.",
            f"Strengths: {', '.join(strengths_en) if strengths_en else 'no major strengths identified'}.",
            f"Risks: {', '.join(risks_en) if risks_en else 'no major risks identified'}.",
        ]

    return paras


def generate_final_ranking_narrative(scores_by_district: list, lang="fr") -> list[str]:
    """Generate final ranking commentary."""
    if not scores_by_district:
        return []

    top3 = scores_by_district[:3]
    bottom = scores_by_district[-1] if len(scores_by_district) > 1 else None

    if lang == "fr":
        paras = [
            f"Sur les {len(scores_by_district)} districts analysés, le classement Barzel Score fait ressortir des profils d'investissement très différenciés.",
        ]
        if len(top3) >= 1:
            t = top3[0]
            paras.append(f"En tête, {t['district']} domine avec {t['total']:.1f}/100 ({t['label']}), confirmant sa position de marché le plus attractif de la sélection.")
        if len(top3) >= 2:
            t = top3[1]
            paras.append(f"En seconde position, {t['district']} ({t['total']:.1f}/100) offre une alternative crédible avec des caractéristiques complémentaires.")
        if bottom and bottom != top3[0]:
            paras.append(f"En queue de classement, {bottom['district']} ({bottom['total']:.1f}/100 — {bottom['label']}) nécessite une vigilance accrue avant tout engagement.")
        paras.append("Ce classement est relatif au périmètre analysé et doit être interprété dans le contexte de la stratégie d'investissement propre à chaque fonds.")
    else:
        paras = [
            f"Across the {len(scores_by_district)} districts analyzed, the Barzel Score ranking reveals highly differentiated investment profiles.",
        ]
        if len(top3) >= 1:
            t = top3[0]
            paras.append(f"Leading the pack, {t['district']} dominates at {t['total']:.1f}/100 ({t['label']}), confirming its position as the most attractive market in the selection.")
        if len(top3) >= 2:
            t = top3[1]
            paras.append(f"In second place, {t['district']} ({t['total']:.1f}/100) offers a credible alternative with complementary characteristics.")
        if bottom and bottom != top3[0]:
            paras.append(f"At the bottom, {bottom['district']} ({bottom['total']:.1f}/100 — {bottom['label']}) requires heightened scrutiny before any commitment.")
        paras.append("This ranking is relative to the analyzed scope and should be interpreted in the context of each fund's specific investment strategy.")

    return paras
