from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class PredictInput(BaseModel):
    district: str
    surface: float
    rooms: int
    floor: int
    hasParking: bool
    hasBalcony: bool
    yearBuilt: int
    propertyType: str
    energyClass: Optional[str] = None

@router.post("")
async def predict(input: PredictInput):
    return {"message": "predict endpoint - not yet implemented", "input": input.model_dump()}
