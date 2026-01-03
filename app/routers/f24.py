"""F24 router - F24 tax form management."""
from fastapi import APIRouter, Depends, Path, status, UploadFile, File
from typing import Dict, Any, List
from datetime import datetime
from uuid import uuid4
import logging

from app.database import Database
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "",
    summary="Get F24 forms"
)
async def get_f24_forms(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get list of F24 forms."""
    db = Database.get_db()
    forms = await db["f24"].find({}, {"_id": 0}).sort("date", -1).to_list(500)
    return forms


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload F24 form"
)
async def upload_f24(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Upload F24 form file."""
    db = Database.get_db()
    contents = await file.read()
    
    doc = {
        "id": str(uuid4()),
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(contents),
        "created_at": datetime.utcnow(),
        "user_id": current_user["user_id"]
    }
    await db["f24"].insert_one(doc)
    
    return {
        "message": "F24 uploaded successfully",
        "id": doc["id"],
        "filename": file.filename
    }


@router.delete(
    "/{f24_id}",
    summary="Delete F24 form"
)
async def delete_f24(
    f24_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """Delete an F24 form."""
    db = Database.get_db()
    await db["f24"].delete_one({"id": f24_id})
    return {"message": "F24 deleted"}
