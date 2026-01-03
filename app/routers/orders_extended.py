"""Orders Extended router."""
from fastapi import APIRouter, Depends
from typing import Dict, Any, List
import logging

from app.database import Database
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/sent",
    summary="Get sent orders"
)
async def get_sent_orders(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get sent orders."""
    db = Database.get_db()
    orders = await db["orders"].find({"status": "sent"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders
