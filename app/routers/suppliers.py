"""
Suppliers router.
Handles supplier CRUD operations and management.
"""
from fastapi import APIRouter, Depends, Query, status
from typing import List, Dict, Any, Optional
import logging

from app.database import Database, Collections
from app.repositories import SupplierRepository, InvoiceRepository
from app.services import SupplierService
from app.models import SupplierCreate, SupplierUpdate, SupplierResponse
from app.utils.dependencies import get_current_user, pagination_params

logger = logging.getLogger(__name__)

router = APIRouter()


# Dependency to get supplier service
async def get_supplier_service() -> SupplierService:
    """Get supplier service with injected dependencies."""
    db = Database.get_db()
    supplier_repo = SupplierRepository(db[Collections.SUPPLIERS])
    invoice_repo = InvoiceRepository(db[Collections.INVOICES])
    return SupplierService(supplier_repo, invoice_repo)


@router.post(
    "",
    response_model=Dict[str, str],
    status_code=status.HTTP_201_CREATED,
    summary="Create supplier",
    description="Create a new supplier"
)
async def create_supplier(
    supplier_data: SupplierCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supplier_service: SupplierService = Depends(get_supplier_service)
) -> Dict[str, str]:
    """
    Create a new supplier.
    
    - **vat_number**: Partita IVA (11 digits)
    - **name**: Supplier name
    - **payment_method**: Payment method (cassa, banca, assegno, etc.)
    
    VAT number will be validated (must be 11 digits).
    """
    user_id = current_user["user_id"]
    
    supplier_id = await supplier_service.create_supplier(
        supplier_data=supplier_data,
        user_id=user_id
    )
    
    return {
        "message": "Supplier created successfully",
        "supplier_id": supplier_id
    }


@router.get(
    "",
    response_model=List[Dict[str, Any]],
    summary="List suppliers",
    description="Get list of suppliers with optional filters"
)
async def list_suppliers(
    current_user: Dict[str, Any] = Depends(get_current_user),
    pagination: Dict[str, Any] = Depends(pagination_params),
    active_only: bool = Query(True, description="Only return active suppliers"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method"),
    supplier_service: SupplierService = Depends(get_supplier_service)
) -> List[Dict[str, Any]]:
    """
    List suppliers with optional filters.
    
    **Query Parameters:**
    - **skip**: Number of suppliers to skip (pagination)
    - **limit**: Maximum number of suppliers to return
    - **active_only**: Only return active suppliers (default: true)
    - **payment_method**: Filter by payment method
    """
    user_id = current_user["user_id"]
    
    return await supplier_service.list_suppliers(
        user_id=user_id,
        skip=pagination["skip"],
        limit=pagination["limit"],
        active_only=active_only,
        payment_method=payment_method
    )


@router.get(
    "/search",
    response_model=List[Dict[str, Any]],
    summary="Search suppliers",
    description="Search suppliers by name or VAT number"
)
async def search_suppliers(
    q: str = Query(..., description="Search query"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    pagination: Dict[str, Any] = Depends(pagination_params),
    supplier_service: SupplierService = Depends(get_supplier_service)
) -> List[Dict[str, Any]]:
    """
    Search suppliers by name or VAT number.
    
    **Query Parameters:**
    - **q**: Search query (searches in name and vat_number)
    """
    user_id = current_user["user_id"]
    
    return await supplier_service.search_suppliers(
        user_id=user_id,
        query=q,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )


@router.get(
    "/stats",
    response_model=Dict[str, Any],
    summary="Get supplier statistics",
    description="Get comprehensive supplier statistics"
)
async def get_supplier_stats(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supplier_service: SupplierService = Depends(get_supplier_service)
) -> Dict[str, Any]:
    """
    Get supplier statistics.
    
    Returns:
    - Total and active supplier counts
    - Total invoices and amounts
    - Distribution by payment method
    - Top 10 suppliers by amount
    """
    user_id = current_user["user_id"]
    
    return await supplier_service.get_supplier_stats(user_id)


@router.get(
    "/top",
    response_model=List[Dict[str, Any]],
    summary="Get top suppliers",
    description="Get top suppliers by total amount"
)
async def get_top_suppliers(
    limit: int = Query(10, ge=1, le=50, description="Number of suppliers to return"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supplier_service: SupplierService = Depends(get_supplier_service)
) -> List[Dict[str, Any]]:
    """
    Get top suppliers ranked by total amount spent.
    
    **Query Parameters:**
    - **limit**: Number of suppliers to return (1-50, default: 10)
    """
    user_id = current_user["user_id"]
    
    return await supplier_service.get_top_suppliers(
        user_id=user_id,
        limit=limit
    )


@router.get(
    "/{supplier_id}",
    response_model=Dict[str, Any],
    summary="Get supplier by ID",
    description="Get detailed supplier information"
)
async def get_supplier(
    supplier_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supplier_service: SupplierService = Depends(get_supplier_service)
) -> Dict[str, Any]:
    """
    Get supplier details by ID.
    
    Returns complete supplier data including statistics.
    """
    return await supplier_service.get_supplier(supplier_id)


@router.get(
    "/{supplier_id}/summary",
    response_model=Dict[str, Any],
    summary="Get supplier summary",
    description="Get comprehensive supplier summary with invoices"
)
async def get_supplier_summary(
    supplier_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supplier_service: SupplierService = Depends(get_supplier_service)
) -> Dict[str, Any]:
    """
    Get comprehensive supplier summary.
    
    Returns:
    - Supplier details
    - Recent invoices (last 10)
    - Invoice count and total amount
    - Unpaid amount
    """
    return await supplier_service.get_supplier_summary(supplier_id)


@router.get(
    "/{supplier_id}/invoices",
    response_model=List[Dict[str, Any]],
    summary="Get supplier invoices",
    description="Get all invoices for a supplier"
)
async def get_supplier_invoices(
    supplier_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    pagination: Dict[str, Any] = Depends(pagination_params),
    supplier_service: SupplierService = Depends(get_supplier_service)
) -> List[Dict[str, Any]]:
    """
    Get all invoices for a specific supplier.
    
    Returns invoices sorted by date (newest first).
    """
    # Get supplier to get VAT number
    supplier = await supplier_service.get_supplier(supplier_id)
    
    return await supplier_service.get_supplier_invoices(
        supplier_vat=supplier["vat_number"],
        skip=pagination["skip"],
        limit=pagination["limit"]
    )


@router.put(
    "/{supplier_id}",
    response_model=Dict[str, str],
    summary="Update supplier",
    description="Update supplier information"
)
async def update_supplier(
    supplier_id: str,
    update_data: SupplierUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supplier_service: SupplierService = Depends(get_supplier_service)
) -> Dict[str, str]:
    """
    Update supplier information.
    
    Only provided fields will be updated.
    """
    await supplier_service.update_supplier(
        supplier_id=supplier_id,
        update_data=update_data
    )
    
    return {"message": "Supplier updated successfully"}


@router.post(
    "/{supplier_id}/deactivate",
    status_code=status.HTTP_200_OK,
    summary="Deactivate supplier",
    description="Deactivate a supplier"
)
async def deactivate_supplier(
    supplier_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supplier_service: SupplierService = Depends(get_supplier_service)
) -> Dict[str, str]:
    """
    Deactivate a supplier.
    
    Deactivated suppliers are not deleted but marked as inactive.
    """
    await supplier_service.deactivate_supplier(supplier_id)
    
    return {"message": "Supplier deactivated successfully"}


@router.post(
    "/{supplier_id}/activate",
    status_code=status.HTTP_200_OK,
    summary="Activate supplier",
    description="Activate a supplier"
)
async def activate_supplier(
    supplier_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supplier_service: SupplierService = Depends(get_supplier_service)
) -> Dict[str, str]:
    """
    Activate a supplier.
    """
    await supplier_service.activate_supplier(supplier_id)
    
    return {"message": "Supplier activated successfully"}
