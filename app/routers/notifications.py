"""Notifications router - User notifications endpoints."""
from fastapi import APIRouter, Depends, Path
from typing import Dict, Any, List
from datetime import datetime
import logging

from app.database import Database
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/all",
    summary="Get all notifications",
    description="Get all notifications for current user"
)
async def get_all_notifications(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get all notifications."""
    db = Database.get_db()
    user_id = current_user["user_id"]
    
    try:
        notifications = await db["notifications"].find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return notifications
    except Exception:
        return []


@router.get(
    "/review",
    summary="Get notifications to review",
    description="Get pending notifications that need review"
)
async def get_review_notifications(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get notifications pending review."""
    db = Database.get_db()
    user_id = current_user["user_id"]
    
    try:
        notifications = await db["notifications"].find(
            {"user_id": user_id, "reviewed": False},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        return notifications
    except Exception:
        return []


@router.post(
    "/review/{notification_id}/mark-reviewed",
    summary="Mark notification as reviewed"
)
async def mark_reviewed(
    notification_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """Mark a notification as reviewed."""
    db = Database.get_db()
    
    await db["notifications"].update_one(
        {"id": notification_id},
        {"$set": {"reviewed": True, "reviewed_at": datetime.utcnow()}}
    )
    
    return {"message": "Notification marked as reviewed"}
