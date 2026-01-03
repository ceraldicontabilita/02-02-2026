"""Search router - Global search functionality."""
from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List
import logging

from app.database import Database, Collections
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/global",
    summary="Global search",
    description="Search across all collections"
)
async def global_search(
    q: str = Query(..., min_length=2),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Search across invoices, suppliers, products."""
    db = Database.get_db()
    results = {
        "invoices": [],
        "suppliers": [],
        "products": [],
        "employees": []
    }
    
    # Search invoices
    invoice_results = await db[Collections.INVOICES].find(
        {"$or": [
            {"supplier_name": {"$regex": q, "$options": "i"}},
            {"invoice_number": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0}
    ).limit(10).to_list(10)
    results["invoices"] = invoice_results
    
    # Search suppliers
    supplier_results = await db[Collections.SUPPLIERS].find(
        {"$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"vat_number": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0}
    ).limit(10).to_list(10)
    results["suppliers"] = supplier_results
    
    # Search products
    product_results = await db[Collections.WAREHOUSE_PRODUCTS].find(
        {"$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"code": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0}
    ).limit(10).to_list(10)
    results["products"] = product_results
    
    return results
