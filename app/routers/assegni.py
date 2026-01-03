"""Assegni router - Check management."""
from fastapi import APIRouter, Depends, Path, Query, status
from typing import Dict, Any, List, Optional
from datetime import datetime
from uuid import uuid4
import logging

from app.database import Database
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "",
    summary="Get checks"
)
async def get_assegni(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get list of checks."""
    db = Database.get_db()
    query = {}
    if status_filter:
        query["status"] = status_filter
    assegni = await db["assegni"].find(query, {"_id": 0}).sort("date", -1).to_list(500)
    return assegni


@router.get(
    "/list",
    summary="Get checks list (alias)"
)
async def get_assegni_list(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get list of checks (Alias for /)."""
    return await get_assegni(status_filter, current_user)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create check"
)
async def create_assegno(
    data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """Create a new check entry."""
    db = Database.get_db()
    data["id"] = str(uuid4())
    data["status"] = data.get("status", "emesso")
    data["created_at"] = datetime.utcnow()
    data["user_id"] = current_user["user_id"]
    await db["assegni"].insert_one(data)
    return {"message": "Check created", "id": data["id"]}


@router.put(
    "/{assegno_id}",
    summary="Update check"
)
async def update_assegno(
    assegno_id: str = Path(...),
    data: Dict[str, Any] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """Update a check."""
    db = Database.get_db()
    if data:
        data["updated_at"] = datetime.utcnow()
        await db["assegni"].update_one({"id": assegno_id}, {"$set": data})
    return {"message": "Check updated"}


@router.put(
    "/{assegno_id}/annulla",
    summary="Cancel check"
)
async def annulla_assegno(
    assegno_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """Cancel a check."""
    db = Database.get_db()
    await db["assegni"].update_one(
        {"id": assegno_id},
        {"$set": {"status": "annullato", "cancelled_at": datetime.utcnow()}}
    )
    return {"message": "Check cancelled"}


@router.put(
    "/{assegno_id}/ripristina",
    summary="Restore cancelled check"
)
async def ripristina_assegno(
    assegno_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """Restore a cancelled check."""
    db = Database.get_db()
    await db["assegni"].update_one(
        {"id": assegno_id},
        {"$set": {"status": "emesso"}, "$unset": {"cancelled_at": ""}}
    )
    return {"message": "Check restored"}


@router.delete(
    "/{assegno_id}",
    summary="Delete check"
)
async def delete_assegno(
    assegno_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """Delete a check."""
    db = Database.get_db()
    await db["assegni"].delete_one({"id": assegno_id})
    return {"message": "Check deleted"}
