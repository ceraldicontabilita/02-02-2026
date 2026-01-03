"""Finanziaria router - Financial costs management."""
from fastapi import APIRouter, Depends, status
from typing import Dict, Any, List
from datetime import datetime
from uuid import uuid4
import logging

from app.database import Database
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/costi",
    summary="Get financial costs"
)
async def get_costi(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, List[Dict[str, Any]]]:
    """Get list of financial costs."""
    db = Database.get_db()
    # Assuming 'spese_finanziarie' or 'costi_finanziari' collection
    costi = await db["costi_finanziari"].find({}, {"_id": 0}).sort("data", -1).to_list(500)
    return {"costi": costi}


@router.get(
    "/cost-categories",
    summary="Get cost categories"
)
async def get_cost_categories(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, List[Dict[str, str]]]:
    """Get cost categories."""
    categories = [
        {"key": "personale", "label": "Personale"},
        {"key": "utenze", "label": "Utenze"},
        {"key": "affitto", "label": "Affitto"},
        {"key": "manutenzione", "label": "Manutenzione"},
        {"key": "materie_prime", "label": "Materie Prime"},
        {"key": "marketing", "label": "Marketing"},
        {"key": "consulenze", "label": "Consulenze"},
        {"key": "imposte", "label": "Imposte & Tasse"},
        {"key": "altro", "label": "Altro"},
        {"key": "da_classificare", "label": "Da Classificare"}
    ]
    return {"categories": categories}


@router.post(
    "/costo",
    status_code=status.HTTP_201_CREATED,
    summary="Create financial cost"
)
async def create_costo(
    data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """Create a financial cost entry."""
    db = Database.get_db()
    data["id"] = str(uuid4())
    data["created_at"] = datetime.utcnow()
    data["user_id"] = current_user["user_id"]
    
    await db["costi_finanziari"].insert_one(data)
    
    return {"message": "Cost created", "id": data["id"]}
