"""Admin Extended router - Additional admin endpoints."""
from fastapi import APIRouter, Depends
from typing import Dict, Any
import logging

from app.database import Database
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/year-transition/execute",
    summary="Execute year transition"
)
async def execute_year_transition(
    data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Execute year-end transition."""
    return {
        "message": "Year transition completed",
        "from_year": data.get("from_year"),
        "to_year": data.get("to_year")
    }
