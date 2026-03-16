"""
Barzel Analytics V3 — AI Analyst Router
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()


class AskRequest(BaseModel):
    question: str
    language: str = "fr"
    districts: Optional[List[str]] = None


@router.post("")
async def ask(request: AskRequest):
    try:
        from services.llm_service import get_llm_service
        service = get_llm_service()
        answer = await service.ask(
            question=request.question,
            districts=request.districts or [],
            language=request.language,
        )
        return {"answer": answer, "sources": ["Barzel Analytics V3 — Market Data"]}
    except ValueError as e:
        return {"answer": f"Configuration error: {str(e)}", "sources": []}
    except Exception as e:
        return {"answer": f"Error: {str(e)}", "sources": []}
