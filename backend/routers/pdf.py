"""
Barzel Analytics V3 — PDF Investment Memo Generator
Professional multi-page PDF with narrative analysis using ReportLab.
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether,
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

from services.kpi_engine import (
    get_snapshot, get_snapshots_by_district, get_typology_breakdown,
    ALL_DISTRICTS, _filter, _agg_kpis,
)
from services.barzel_score import compute_barzel_score, compute_barzel_scores_by_district
from services.pdf_narrative import (
    generate_executive_summary, generate_key_takeaways,
    generate_district_overview, generate_district_scoring_analysis,
    generate_district_typology_analysis, generate_district_verdict,
    generate_final_ranking_narrative, _f,
)

router = APIRouter()

# ─── Colors ──────────────────────────────────────────────────────────────────
NAVY      = HexColor("#0A1628")
NAVY_MID  = HexColor("#1B3A5C")
GOLD      = HexColor("#C9A84C")
GOLD_LT   = HexColor("#F5EDD6")
BLUE      = HexColor("#1E5FA8")
GREEN     = HexColor("#1A7A4A")
GREEN_LT  = HexColor("#E8F5EE")
RED       = HexColor("#C0392B")
RED_LT    = HexColor("#FDEDED")
GREY_BG   = HexColor("#F4F6F9")
BORDER    = HexColor("#D8E2EE")
BORDER_LT = HexColor("#EEF1F6")
WHITE     = HexColor("#FFFFFF")
TEXT_P    = HexColor("#0A1628")
TEXT_S    = HexColor("#3D5470")
TEXT_M    = HexColor("#7A90A8")

DISTRICT_COLORS = {
    "Dubai Marina": HexColor("#1E5FA8"),
    "JVC": HexColor("#1A7A4A"),
    "Business Bay": HexColor("#C9A84C"),
    "Downtown Dubai": HexColor("#6B3FA0"),
    "Palm Jumeirah": HexColor("#C0392B"),
    "DIFC": HexColor("#2E86D4"),
    "Dubai Hills": HexColor("#E67E22"),
    "Al Barsha": HexColor("#7A90A8"),
    "Jumeirah": HexColor("#0A1628"),
}


def _score_color(total):
    if total >= 65: return GREEN
    if total >= 40: return GOLD
    return RED

def _score_bg(total):
    if total >= 65: return GREEN_LT
    if total >= 40: return GOLD_LT
    return RED_LT


def _styles():
    styles = {}
    styles["cover_title"] = ParagraphStyle("cover_title", fontName="Helvetica-Bold", fontSize=28, textColor=NAVY, leading=34)
    styles["cover_sub"] = ParagraphStyle("cover_sub", fontName="Helvetica", fontSize=13, textColor=TEXT_M, leading=18)
    styles["cover_detail"] = ParagraphStyle("cover_detail", fontName="Helvetica", fontSize=10, textColor=TEXT_S, leading=14)
    styles["page_title"] = ParagraphStyle("page_title", fontName="Helvetica-Bold", fontSize=20, textColor=NAVY, spaceBefore=0, spaceAfter=4, leading=26)
    styles["section"] = ParagraphStyle("section", fontName="Helvetica-Bold", fontSize=14, textColor=NAVY, spaceBefore=14, spaceAfter=6, leading=18)
    styles["subsection"] = ParagraphStyle("subsection", fontName="Helvetica-Bold", fontSize=11, textColor=NAVY_MID, spaceBefore=10, spaceAfter=4, leading=14)
    styles["body"] = ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, textColor=TEXT_S, spaceAfter=6, leading=13.5)
    styles["body_bold"] = ParagraphStyle("body_bold", fontName="Helvetica-Bold", fontSize=9.5, textColor=TEXT_P, spaceAfter=6, leading=13.5)
    styles["bullet"] = ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.5, textColor=TEXT_S, spaceAfter=4, leading=13, leftIndent=12, bulletIndent=0)
    styles["small"] = ParagraphStyle("small", fontName="Helvetica", fontSize=8, textColor=TEXT_M, spaceAfter=3, leading=11)
    styles["disclaimer"] = ParagraphStyle("disclaimer", fontName="Helvetica-Oblique", fontSize=7.5, textColor=TEXT_M, spaceAfter=2, leading=10)
    styles["kpi_val"] = ParagraphStyle("kpi_val", fontName="Helvetica-Bold", fontSize=18, textColor=NAVY, alignment=TA_CENTER, leading=22)
    styles["kpi_label"] = ParagraphStyle("kpi_label", fontName="Helvetica", fontSize=7.5, textColor=TEXT_M, alignment=TA_CENTER, leading=10)
    styles["score_big"] = ParagraphStyle("score_big", fontName="Helvetica-Bold", fontSize=36, alignment=TA_CENTER, leading=40)
    styles["score_label_big"] = ParagraphStyle("score_label_big", fontName="Helvetica-Bold", fontSize=14, alignment=TA_CENTER, leading=18)
    styles["th"] = ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE, alignment=TA_CENTER, leading=11)
    styles["th_left"] = ParagraphStyle("th_left", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE, alignment=TA_LEFT, leading=11)
    styles["td"] = ParagraphStyle("td", fontName="Helvetica", fontSize=8.5, textColor=TEXT_S, alignment=TA_CENTER, leading=12)
    styles["td_left"] = ParagraphStyle("td_left", fontName="Helvetica", fontSize=8.5, textColor=TEXT_S, alignment=TA_LEFT, leading=12)
    styles["td_bold"] = ParagraphStyle("td_bold", fontName="Helvetica-Bold", fontSize=8.5, textColor=TEXT_P, alignment=TA_LEFT, leading=12)
    styles["verdict_title"] = ParagraphStyle("verdict_title", fontName="Helvetica-Bold", fontSize=10, textColor=NAVY, spaceAfter=4, leading=13)
    return styles


class PdfRequest(BaseModel):
    districts: List[str]
    language: str = "fr"


T = {
    "fr": {
        "memo_title": "Investment Memo",
        "confidential": "Confidentiel — Usage interne uniquement",
        "prepared_by": "Préparé par Barzel Analytics V3",
        "date": "Date",
        "scope": "Périmètre",
        "districts_label": "Districts analysés",
        "listings_label": "Annonces analysées",
        "exec_summary": "Résumé Exécutif",
        "key_takeaways": "Points Clés",
        "market_overview": "Vue d'Ensemble du Marché",
        "district_analysis": "Analyse Détaillée",
        "pricing_analysis": "Analyse des Prix",
        "liquidity_yield": "Liquidité & Rendement",
        "typology": "Analyse par Typologie",
        "barzel_score_analysis": "Analyse du Barzel Score",
        "verdict": "Verdict & Profil Investisseur",
        "final_ranking": "Classement Final",
        "recommendation": "Synthèse & Recommandation",
        "disclaimer": "Ce document est généré automatiquement par Barzel Analytics V3. Il ne constitue en aucun cas un conseil en investissement. Les données sont issues d'annonces publiques et peuvent contenir des approximations. Toute décision d'investissement doit faire l'objet d'une due diligence indépendante.",
        "page": "Page",
        "metrics": ["Médiane AED/sqm", "DOM médian", "Fast-sale ≤60j", "Yield net", "Yield brut", "Service charge", "Vacancy est.", "Nb annonces"],
        "metric_keys": ["median_price_sqm", "median_dom", "fast_sale_60d_pct", "median_net_yield", "median_gross_yield", "median_service_charge", "median_vacancy_days", "n_listings"],
    },
    "en": {
        "memo_title": "Investment Memo",
        "confidential": "Confidential — Internal use only",
        "prepared_by": "Prepared by Barzel Analytics V3",
        "date": "Date",
        "scope": "Scope",
        "districts_label": "Districts analyzed",
        "listings_label": "Listings analyzed",
        "exec_summary": "Executive Summary",
        "key_takeaways": "Key Takeaways",
        "market_overview": "Market Overview",
        "district_analysis": "Detailed Analysis",
        "pricing_analysis": "Pricing Analysis",
        "liquidity_yield": "Liquidity & Yield",
        "typology": "Typology Analysis",
        "barzel_score_analysis": "Barzel Score Analysis",
        "verdict": "Verdict & Investor Profile",
        "final_ranking": "Final Ranking",
        "recommendation": "Summary & Recommendation",
        "disclaimer": "This document is auto-generated by Barzel Analytics V3. It does not constitute investment advice. Data is sourced from public listings and may contain approximations. Any investment decision should be subject to independent due diligence.",
        "page": "Page",
        "metrics": ["Median AED/sqm", "Median DOM", "Fast-sale ≤60d", "Net yield", "Gross yield", "Service charge", "Vacancy est.", "Listings"],
        "metric_keys": ["median_price_sqm", "median_dom", "fast_sale_60d_pct", "median_net_yield", "median_gross_yield", "median_service_charge", "median_vacancy_days", "n_listings"],
    },
}


def _gold_line(width=40):
    t = Table([[""]], colWidths=[width*mm], rowHeights=[2])
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), GOLD), ("LINEBELOW", (0,0), (-1,-1), 0, WHITE)]))
    return t


def _separator():
    t = Table([[""]], colWidths=[170*mm], rowHeights=[1])
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), BORDER_LT)]))
    return t


def _kpi_row(kpi_pairs, s, doc_width):
    """Build a row of KPI boxes. kpi_pairs = [(label, value, color), ...]"""
    n = len(kpi_pairs)
    col_w = doc_width / n
    val_row = []
    label_row = []
    for label, value, color in kpi_pairs:
        vs = ParagraphStyle("v", parent=s["kpi_val"], textColor=color)
        val_row.append(Paragraph(str(value), vs))
        label_row.append(Paragraph(label, s["kpi_label"]))
    t = Table([val_row, label_row], colWidths=[col_w]*n, rowHeights=[30, 14])
    t.setStyle(TableStyle([
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("BOX", (0,0), (-1,-1), 0.5, BORDER),
        ("INNERGRID", (0,0), (-1,-1), 0.5, BORDER),
        ("BACKGROUND", (0,0), (-1,-1), WHITE),
        ("TOPPADDING", (0,0), (-1,0), 8),
        ("BOTTOMPADDING", (0,1), (-1,1), 6),
    ]))
    return t


def _pillar_bar_table(score, s, doc_width):
    """Visual horizontal bars for the 4 pillars."""
    pillars = [
        ("Liquidité" if True else "Liquidity", score.get("liquidity", 0), BLUE),
        ("Rendement", score.get("yield", 0), GREEN),
        ("Stabilité", score.get("risk", 0), GOLD),
        ("Tendance", score.get("trend", 0), HexColor("#6B3FA0")),
    ]
    rows = []
    for name, val, color in pillars:
        pct = min(val / 25 * 100, 100)
        bar_w = max(pct / 100 * 80, 2)
        rows.append([
            Paragraph(name, s["small"]),
            Paragraph(f"{val:.1f}/25", ParagraphStyle("pv", parent=s["small"], fontName="Helvetica-Bold", textColor=color)),
        ])
    t = Table(rows, colWidths=[doc_width*0.6, doc_width*0.4])
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ]))
    return t


def _data_table(headers, rows_data, s, doc_width, highlight_col=None):
    """Generic data table with navy header."""
    n_cols = len(headers)
    col_w = [doc_width * 0.18] + [doc_width * 0.82 / (n_cols - 1)] * (n_cols - 1)

    header_row = [Paragraph(h, s["th_left"] if i == 0 else s["th"]) for i, h in enumerate(headers)]
    table_data = [header_row]

    for row in rows_data:
        table_data.append([Paragraph(str(c), s["td_left"] if i == 0 else s["td"]) for i, c in enumerate(row)])

    style_cmds = [
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("ALIGN", (0,0), (0,-1), "LEFT"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("BOX", (0,0), (-1,-1), 0.5, BORDER),
        ("INNERGRID", (0,0), (-1,-1), 0.5, BORDER),
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ]
    for i in range(1, len(table_data)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0,i), (-1,i), GREY_BG))

    t = Table(table_data, colWidths=col_w)
    t.setStyle(TableStyle(style_cmds))
    return t


def _add_header_footer(canvas, doc):
    """Draw header line and footer on each page."""
    w, h = A4
    # Header: thin gold line
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1.5)
    canvas.line(20*mm, h - 18*mm, w - 20*mm, h - 18*mm)
    # Header text
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(TEXT_M)
    canvas.drawString(20*mm, h - 16*mm, "BARZEL ANALYTICS")
    canvas.drawRightString(w - 20*mm, h - 16*mm, "Investment Memo — Confidential")
    # Footer
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, 14*mm, w - 20*mm, 14*mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(TEXT_M)
    canvas.drawString(20*mm, 10*mm, f"Barzel Analytics V3 — {datetime.now().strftime('%d/%m/%Y')}")
    canvas.drawRightString(w - 20*mm, 10*mm, f"Page {doc.page}")


@router.post("/generate")
async def generate_pdf(request: PdfRequest):
    lang = request.language if request.language in T else "fr"
    t = T[lang]
    districts = request.districts if request.districts else ALL_DISTRICTS

    # ── Fetch all data ────────────────────────────────────────────────────
    snapshot = get_snapshot(districts)
    by_district = get_snapshots_by_district(districts)
    agg_score = compute_barzel_score(districts)
    dist_scores = compute_barzel_scores_by_district(districts)

    # Per-district KPIs dict for quick access
    dist_kpis = {d["district"]: d for d in by_district}
    dist_score_map = {s["district"]: s for s in dist_scores}

    # Typologies per district
    dist_typologies = {}
    for d in districts:
        dist_typologies[d] = get_typology_breakdown([d])

    # ── Build PDF ─────────────────────────────────────────────────────────
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=25*mm, bottomMargin=22*mm,
    )
    s = _styles()
    W = doc.width
    el = []  # elements

    # ══════════════════════════════════════════════════════════════════════
    # PAGE 1 — COVER
    # ══════════════════════════════════════════════════════════════════════
    el.append(Spacer(1, 60))
    el.append(_gold_line(50))
    el.append(Spacer(1, 12))
    el.append(Paragraph("BARZEL ANALYTICS", ParagraphStyle("ba", fontName="Helvetica-Bold", fontSize=11, textColor=TEXT_M, letterSpacing=4, leading=14)))
    el.append(Spacer(1, 8))
    el.append(Paragraph(t["memo_title"], s["cover_title"]))
    el.append(Spacer(1, 6))
    el.append(Paragraph(t["confidential"], ParagraphStyle("conf", fontName="Helvetica-Oblique", fontSize=10, textColor=GOLD, leading=14)))
    el.append(Spacer(1, 30))
    el.append(_gold_line(25))
    el.append(Spacer(1, 16))

    # Cover details
    details = [
        (t["date"], datetime.now().strftime("%d %B %Y")),
        (t["prepared_by"], ""),
        (t["districts_label"], ", ".join(districts)),
        (t["listings_label"], f"{snapshot.get('n_listings', 0):,}"),
    ]
    for label, val in details:
        if val:
            el.append(Paragraph(f"<b>{label}</b> : {val}", s["cover_detail"]))
        else:
            el.append(Paragraph(f"<b>{label}</b>", s["cover_detail"]))

    el.append(Spacer(1, 40))

    # Cover score summary box
    sc_color = _score_color(agg_score.get("total", 0))
    sc_bg = _score_bg(agg_score.get("total", 0))
    score_box = Table(
        [
            [Paragraph(f'{agg_score.get("total", 0):.1f}', ParagraphStyle("sb", parent=s["score_big"], textColor=sc_color))],
            [Paragraph(f'/100 — {agg_score.get("label", "")}', ParagraphStyle("sl", parent=s["score_label_big"], textColor=sc_color))],
            [Paragraph("Barzel Score Agrégé" if lang == "fr" else "Aggregate Barzel Score", s["small"])],
        ],
        colWidths=[W * 0.4],
    )
    score_box.setStyle(TableStyle([
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("BACKGROUND", (0,0), (-1,-1), sc_bg),
        ("BOX", (0,0), (-1,-1), 1, sc_color),
        ("TOPPADDING", (0,0), (-1,0), 16),
        ("BOTTOMPADDING", (0,-1), (-1,-1), 12),
    ]))
    # Center the box
    wrapper = Table([[score_box]], colWidths=[W])
    wrapper.setStyle(TableStyle([("ALIGN", (0,0), (-1,-1), "CENTER")]))
    el.append(wrapper)

    el.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════
    # PAGE 2 — EXECUTIVE SUMMARY
    # ══════════════════════════════════════════════════════════════════════
    el.append(Paragraph(t["exec_summary"], s["page_title"]))
    el.append(_gold_line(30))
    el.append(Spacer(1, 12))

    # KPI row
    el.append(_kpi_row([
        ("Médiane AED/sqm" if lang == "fr" else "Median AED/sqm", _f(snapshot.get("median_price_sqm"), 0), NAVY),
        ("DOM médian" if lang == "fr" else "Median DOM", f'{_f(snapshot.get("median_dom"), 0)}d', BLUE),
        ("Yield net" if lang == "fr" else "Net yield", f'{_f(snapshot.get("median_net_yield"))}%', GREEN),
        ("Barzel Score", f'{_f(agg_score.get("total"), 1)}/100', _score_color(agg_score.get("total", 0))),
    ], s, W))
    el.append(Spacer(1, 14))

    # Narrative paragraphs
    for para in generate_executive_summary(snapshot, dist_scores, agg_score, lang):
        el.append(Paragraph(para, s["body"]))
    el.append(Spacer(1, 10))

    # Key takeaways
    el.append(Paragraph(t["key_takeaways"], s["subsection"]))
    el.append(_separator())
    el.append(Spacer(1, 6))
    for bullet in generate_key_takeaways(snapshot, dist_scores, lang):
        el.append(Paragraph(f"▸ {bullet}", s["bullet"]))

    el.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════
    # PAGE 3 — MARKET OVERVIEW TABLE
    # ══════════════════════════════════════════════════════════════════════
    el.append(Paragraph(t["market_overview"], s["page_title"]))
    el.append(_gold_line(30))
    el.append(Spacer(1, 12))

    el.append(Paragraph(
        f"{'Tableau comparatif des' if lang == 'fr' else 'Comparative table of'} {len(districts)} district{'s' if len(districts) > 1 else ''} {'analysés' if lang == 'fr' else 'analyzed'}.",
        s["body"],
    ))
    el.append(Spacer(1, 8))

    # Build comparison table
    metric_fmts = [
        ("median_price_sqm", 0, " AED"),
        ("median_dom", 0, "d"),
        ("fast_sale_60d_pct", 1, "%"),
        ("median_net_yield", 1, "%"),
        ("median_gross_yield", 1, "%"),
        ("median_service_charge", 0, " AED"),
        ("median_vacancy_days", 0, "d"),
        ("n_listings", 0, ""),
    ]

    headers = ["District"] + t["metrics"]
    rows_data = []
    for d_kpi in by_district:
        row = [d_kpi.get("district", "")]
        for key, dec, suf in metric_fmts:
            row.append(_f(d_kpi.get(key), dec, suf))
        rows_data.append(row)

    el.append(_data_table(headers, rows_data, s, W))
    el.append(Spacer(1, 16))

    # Scores summary table
    el.append(Paragraph(t["barzel_score_analysis"], s["subsection"]))
    el.append(_separator())
    el.append(Spacer(1, 8))

    score_headers = ["District", "Liquidité", "Rendement", "Stabilité", "Tendance", "Score", "Label"]
    score_rows = []
    for sc in dist_scores:
        sc_c = _score_color(sc["total"])
        score_rows.append([
            sc["district"],
            f'{sc["liquidity"]:.1f}',
            f'{sc["yield"]:.1f}',
            f'{sc["risk"]:.1f}',
            f'{sc["trend"]:.1f}',
            f'{sc["total"]:.1f}',
            sc["label"],
        ])
    el.append(_data_table(score_headers, score_rows, s, W))

    el.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════
    # DISTRICT DEEP DIVES (3-4 pages each)
    # ══════════════════════════════════════════════════════════════════════
    for idx, district_name in enumerate(districts):
        kpis = dist_kpis.get(district_name, {})
        score = dist_score_map.get(district_name, {})
        typology = dist_typologies.get(district_name, [])
        d_color = DISTRICT_COLORS.get(district_name, NAVY)

        # ── District header ──────────────────────────────────────────────
        header_table = Table(
            [[
                Paragraph(f"<b>{district_name.upper()}</b>", ParagraphStyle("dh", fontName="Helvetica-Bold", fontSize=18, textColor=WHITE, leading=24)),
                Paragraph(f'<b>{score.get("total", 0):.1f}/100</b>  —  {score.get("label", "")}', ParagraphStyle("ds", fontName="Helvetica-Bold", fontSize=14, textColor=WHITE, alignment=TA_RIGHT, leading=24)),
            ]],
            colWidths=[W*0.55, W*0.45],
            rowHeights=[36],
        )
        header_table.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), d_color),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ("LEFTPADDING", (0,0), (0,0), 14),
            ("RIGHTPADDING", (-1,0), (-1,0), 14),
        ]))
        el.append(header_table)
        el.append(Spacer(1, 14))

        # ── KPI row for this district ────────────────────────────────────
        el.append(_kpi_row([
            ("Prix/sqm", _f(kpis.get("median_price_sqm"), 0), NAVY),
            ("DOM", f'{_f(kpis.get("median_dom"), 0)}d', BLUE),
            ("Yield net", f'{_f(kpis.get("median_net_yield"))}%', GREEN),
            ("Fast-sale", f'{_f(kpis.get("fast_sale_60d_pct"))}%', GOLD),
            ("Annonces", f'{kpis.get("n_listings", 0):,}', TEXT_S),
        ], s, W))
        el.append(Spacer(1, 12))

        # ── Overview narrative ───────────────────────────────────────────
        el.append(Paragraph(t["district_analysis"], s["section"]))
        el.append(_separator())
        el.append(Spacer(1, 6))
        for para in generate_district_overview(kpis, score, snapshot, lang):
            el.append(Paragraph(para, s["body"]))
        el.append(Spacer(1, 8))

        # ── Typology analysis ────────────────────────────────────────────
        el.append(Paragraph(t["typology"], s["subsection"]))
        el.append(_separator())
        el.append(Spacer(1, 6))

        if typology:
            typo_headers = ["Chambres" if lang == "fr" else "Bedrooms", "Nb", "Part", "Prix/sqm", "Prix médian", "Yield", "DOM"]
            typo_rows = []
            for tp in typology:
                typo_rows.append([
                    f'{tp["bedrooms"]} ch.' if lang == "fr" else f'{tp["bedrooms"]} BR',
                    str(tp.get("count", 0)),
                    f'{_f(tp.get("share"))}%',
                    f'{_f(tp.get("median_price_sqm"), 0)}',
                    f'{_f(tp.get("median_price"), 0)}',
                    f'{_f(tp.get("median_yield"))}%',
                    f'{_f(tp.get("median_dom"), 0)}d',
                ])
            el.append(_data_table(typo_headers, typo_rows, s, W))
            el.append(Spacer(1, 6))

        for para in generate_district_typology_analysis(typology, district_name, lang):
            el.append(Paragraph(para, s["body"]))
        el.append(Spacer(1, 8))

        # ── Barzel Score deep dive ───────────────────────────────────────
        el.append(Paragraph(t["barzel_score_analysis"], s["subsection"]))
        el.append(_separator())
        el.append(Spacer(1, 6))

        el.append(_pillar_bar_table(score, s, W))
        el.append(Spacer(1, 6))

        for para in generate_district_scoring_analysis(score, lang):
            el.append(Paragraph(para, s["body"]))
        el.append(Spacer(1, 8))

        # ── Verdict ──────────────────────────────────────────────────────
        el.append(Paragraph(t["verdict"], s["subsection"]))
        el.append(_separator())
        el.append(Spacer(1, 6))

        verdict_paras = generate_district_verdict(kpis, score, lang)
        if verdict_paras:
            el.append(Paragraph(verdict_paras[0], s["body_bold"]))
            for para in verdict_paras[1:]:
                el.append(Paragraph(para, s["body"]))

        # Page break between districts (not after the last one)
        if idx < len(districts) - 1:
            el.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════
    # FINAL PAGE — RANKING & RECOMMENDATION
    # ══════════════════════════════════════════════════════════════════════
    el.append(PageBreak())
    el.append(Paragraph(t["final_ranking"], s["page_title"]))
    el.append(_gold_line(30))
    el.append(Spacer(1, 12))

    # Ranking narrative
    for para in generate_final_ranking_narrative(dist_scores, lang):
        el.append(Paragraph(para, s["body"]))
    el.append(Spacer(1, 12))

    # Final ranking table with scores colored
    rank_headers = ["#", "District", "Score", "Label", "Prix/sqm", "Yield net", "DOM"]
    rank_rows = []
    for i, sc in enumerate(dist_scores):
        dk = dist_kpis.get(sc["district"], {})
        rank_rows.append([
            str(i + 1),
            sc["district"],
            f'{sc["total"]:.1f}',
            sc["label"],
            _f(dk.get("median_price_sqm"), 0, " AED"),
            f'{_f(dk.get("median_net_yield"))}%',
            f'{_f(dk.get("median_dom"), 0)}d',
        ])
    el.append(_data_table(rank_headers, rank_rows, s, W))
    el.append(Spacer(1, 20))

    # Disclaimer
    el.append(_separator())
    el.append(Spacer(1, 8))
    el.append(Paragraph(t["disclaimer"], s["disclaimer"]))

    # ── Build ─────────────────────────────────────────────────────────────
    doc.build(el, onFirstPage=_add_header_footer, onLaterPages=_add_header_footer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=barzel-memo.pdf"},
    )
