"""
Enhanced suppliers router with Referential Integrity.
Additional endpoints for cascade operations and reference checking.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Dict, Any
import logging

from app.database import Database, Collections
from app.repositories import SupplierRepository, InvoiceRepository
from app.services.supplier_service_v2 import SupplierServiceV2
from app.models import SupplierUpdate
from app.utils.dependencies import get_current_user
from app.utils.referential_integrity import referential_integrity

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_supplier_service_v2() -> SupplierServiceV2:
    """Get enhanced supplier service with RI."""
    db = Database.get_db()
    supplier_repo = SupplierRepository(db[Collections.SUPPLIERS])
    invoice_repo = InvoiceRepository(db[Collections.INVOICES])
    return SupplierServiceV2(supplier_repo, invoice_repo)


@router.get(
    "/{supplier_id}/references",
    response_model=Dict[str, Any],
    summary="Get supplier references",
    description="Check what references this supplier before deletion"
)
async def get_supplier_references(
    supplier_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: SupplierServiceV2 = Depends(get_supplier_service_v2)
) -> Dict[str, Any]:
    """
    Get all references to this supplier.
    
    **Use this before deleting** to understand impact.
    
    Returns:
    - **can_delete**: Whether supplier can be safely deleted
    - **total_references**: Total count of related records
    - **references_by_collection**: Breakdown by collection
    - **sample_records**: Examples of records that reference this supplier
    
    Example response:
    ```json
    {
      "can_delete": false,
      "total_references": 23,
      "references_by_collection": [
        {"collection": "invoices", "count": 15},
        {"collection": "warehouse_products", "count": 8}
      ],
      "sample_records": {
        "invoices": [
          {"number": "FAT-001", "date": "2024-12-01", "total": 1500.00}
        ]
      }
    }
    ```
    """
    user_id = current_user["user_id"]
    
    return await service.get_supplier_references(supplier_id, user_id)


@router.put(
    "/{supplier_id}/cascade",
    response_model=Dict[str, Any],
    summary="Update supplier with cascade",
    description="Update supplier and cascade changes to related records"
)
async def update_supplier_cascade(
    supplier_id: str,
    update_data: SupplierUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: SupplierServiceV2 = Depends(get_supplier_service_v2)
) -> Dict[str, Any]:
    """
    Update supplier with automatic cascade to related records.
    
    **When supplier name changes:**
    - Automatically updates all invoices with new name
    - Automatically updates all warehouse products with new name
    - Returns count of cascaded updates
    
    Example:
    ```json
    {
      "name": "New Supplier Name SRL"
    }
    ```
    
    Response:
    ```json
    {
      "message": "Supplier updated successfully",
      "cascade_updates": {
        "invoices": 15,
        "warehouse_products": 8
      }
    }
    ```
    """
    user_id = current_user["user_id"]
    
    return await service.update_supplier(supplier_id, update_data, user_id)


@router.delete(
    "/{supplier_id}/safe",
    response_model=Dict[str, Any],
    summary="Safe delete supplier",
    description="Delete supplier with referential integrity check"
)
async def delete_supplier_safe(
    supplier_id: str,
    force: bool = Query(False, description="Force delete with cascade"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: SupplierServiceV2 = Depends(get_supplier_service_v2)
) -> Dict[str, Any]:
    """
    Delete supplier with referential integrity protection.
    
    **Default behavior (force=false):**
    - Checks if supplier has related records
    - Blocks deletion if references exist
    - Returns detailed error with what's blocking
    
    **Force delete (force=true):**
    - Cascade deletes all related records (soft delete)
    - Marks supplier and all related records as inactive
    - Returns count of cascade deletes
    
    **Query Parameters:**
    - **force**: Set to `true` to force cascade delete
    
    Example safe delete (blocked):
    ```
    DELETE /suppliers/sup_123/safe
    
    Response: 400 Bad Request
    {
      "error": "Cannot delete: 23 related records found",
      "references": [
        {"collection": "invoices", "count": 15}
      ]
    }
    ```
    
    Example force delete:
    ```
    DELETE /suppliers/sup_123/safe?force=true
    
    Response: 200 OK
    {
      "message": "Supplier deleted with cascade",
      "cascade_deletes": {
        "invoices": 15,
        "warehouse_products": 8
      }
    }
    ```
    """
    user_id = current_user["user_id"]
    
    try:
        return await service.delete_supplier(supplier_id, user_id, force=force)
    except Exception as e:
        logger.error(f"Error deleting supplier: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/integrity/summary",
    response_model=Dict[str, Any],
    summary="Get referential integrity summary",
    description="Get overview of all relationships in database"
)
async def get_integrity_summary(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get summary of all referential integrity relationships.
    
    Useful for monitoring and debugging.
    
    Returns count of parent and child records for each relationship.
    
    Example response:
    ```json
    {
      "suppliers": {
        "count": 50,
        "children": [
          {"collection": "invoices", "count": 234},
          {"collection": "warehouse_products", "count": 89}
        ]
      },
      "warehouse_products": {
        "count": 89,
        "children": [
          {"collection": "warehouse_movements", "count": 567}
        ]
      }
    }
    ```
    """
    user_id = current_user["user_id"]
    
    return await referential_integrity.get_relationship_summary(user_id)
