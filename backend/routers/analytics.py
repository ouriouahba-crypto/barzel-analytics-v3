from fastapi import APIRouter, Query
from typing import List

router = APIRouter()

@router.get("/snapshot")
async def get_snapshot(district: str = Query(...)):
    return {"district": district, "message": "snapshot endpoint - not yet implemented"}

@router.get("/compare")
async def get_compare(districts: List[str] = Query(...)):
    return {"districts": districts, "message": "compare endpoint - not yet implemented"}

@router.get("/score")
async def get_score(district: str = Query(...)):
    return {"district": district, "message": "score endpoint - not yet implemented"}
