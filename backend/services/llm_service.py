"""
Barzel Analytics V3 — LLM Service (Anthropic Claude)
Provides AI-powered analysis of real estate market data.
"""

import os
import json
from dotenv import load_dotenv
from anthropic import Anthropic

from services.kpi_engine import get_snapshot, get_snapshots_by_district, ALL_DISTRICTS
from services.barzel_score import compute_barzel_score, compute_barzel_scores_by_district

load_dotenv()


class LLMService:
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-20250514"

    def _build_context(self, districts: list[str]) -> str:
        """Build a data context string from current market data."""
        targets = districts if districts else ALL_DISTRICTS
        snapshot = get_snapshot(targets)
        by_district = get_snapshots_by_district(targets)
        agg_score = compute_barzel_score(targets)
        dist_scores = compute_barzel_scores_by_district(targets)

        ctx = {
            "market_snapshot": snapshot,
            "districts_detail": by_district,
            "barzel_score_aggregate": agg_score,
            "barzel_scores_by_district": dist_scores,
        }
        return json.dumps(ctx, indent=2, default=str)

    async def ask(self, question: str, districts: list[str], language: str = "fr") -> str:
        """Send a question to Claude with market data context."""
        data_context = self._build_context(districts)

        system_prompt = f"""Tu es un analyste immobilier senior spécialisé dans le marché de Dubai. Tu travailles pour Barzel Analytics, un outil d'analyse pour fonds d'investissement professionnels.

Tu as accès aux données suivantes du marché Dubai en temps réel :

{data_context}

RÈGLES :
- Réponds en {"français" if language == "fr" else "anglais"}
- Sois précis et cite les chiffres exacts des données
- Donne des insights actionnables pour un investisseur institutionnel
- Structure ta réponse clairement
- Si on te demande quelque chose hors du périmètre des données, dis-le
- Ne donne jamais de conseil d'investissement formel, mais tu peux donner ton analyse
- Utilise le Barzel Score pour contextualiser tes réponses
- Sois concis mais complet (200-400 mots max)

CONTEXTE BARZEL SCORE :
- Score /100 basé sur 4 piliers : Liquidité (DOM + vacancy), Rendement (yield net), Stabilité (CV des prix), Tendance (prix 6 mois)
- Chaque pilier /25, normalisé par percentile vs le marché Dubai
- Labels : Strong Buy (≥80), Buy (≥65), Neutral (≥45), Sell (≥30), Strong Sell (<30)"""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {"role": "user", "content": question}
            ],
        )

        return message.content[0].text


# Singleton
_service = None

def get_llm_service() -> LLMService:
    global _service
    if _service is None:
        _service = LLMService()
    return _service
