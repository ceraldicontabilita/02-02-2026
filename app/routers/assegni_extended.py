"""Assegni Extended router."""
from fastapi import APIRouter, Depends
from typing import Dict, Any
import logging

from app.database import Database
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.delete(
    "/generated/cleanup-empty",
    summary="Cleanup empty generated checks"
)
async def cleanup_empty_assegni(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Clean up empty generated checks."""
    db = Database.get_db()
    result = await db["assegni"].delete_many({"amount": {"$in": [0, None]}})
    return {"message": f"Cleaned up {result.deleted_count} empty checks"}
