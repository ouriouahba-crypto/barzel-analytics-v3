from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
import io

router = APIRouter()

class PdfRequest(BaseModel):
    districts: List[str]
    language: str = "fr"

@router.post("/generate")
async def generate_pdf(request: PdfRequest):
    # Placeholder: return empty PDF bytes
    buffer = io.BytesIO(b"%PDF-1.4 placeholder")
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=barzel-memo.pdf"}
    )
