from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class AskRequest(BaseModel):
    question: str
    language: str = "fr"
    context: Optional[dict] = None

@router.post("")
async def ask(request: AskRequest):
    return {"answer": "AI analyst endpoint - not yet implemented", "sources": []}
