"""Settings router - Application settings management."""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from datetime import datetime
import logging

from app.database import Database
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "",
    summary="Get settings",
    description="Get application settings"
)
async def get_settings(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get application settings."""
    db = Database.get_db()
    
    try:
        settings = await db["settings"].find_one(
            {"type": "app_settings"},
            {"_id": 0}
        )
        return settings or {
            "company_name": "Azienda",
            "vat_number": "",
            "fiscal_code": "",
            "address": "",
            "email": "",
            "phone": "",
            "default_vat_rate": 22,
            "currency": "EUR"
        }
    except Exception:
        return {}


@router.put(
    "",
    summary="Update settings"
)
async def update_settings(
    settings_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """Update application settings."""
    db = Database.get_db()
    
    settings_data["type"] = "app_settings"
    settings_data["updated_at"] = datetime.utcnow()
    settings_data["updated_by"] = current_user["user_id"]
    
    await db["settings"].update_one(
        {"type": "app_settings"},
        {"$set": settings_data},
        upsert=True
    )
    
    return {"message": "Settings updated"}
