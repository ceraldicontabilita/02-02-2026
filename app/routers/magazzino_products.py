"""Magazzino Products router."""
from fastapi import APIRouter, Depends
from typing import Dict, Any, List
import logging

from app.database import Database, Collections
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/products",
    summary="Get magazzino products"
)
async def get_magazzino_products(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get magazzino products."""
    db = Database.get_db()
    products = await db[Collections.WAREHOUSE_PRODUCTS].find({}, {"_id": 0}).to_list(1000)
    return products
