"""IVA router - VAT/IVA related endpoints."""
from fastapi import APIRouter, Depends, Path, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, date
import logging

from app.database import Database, Collections
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/daily/{target_date}",
    summary="Get daily IVA",
    description="Get VAT summary for a specific date"
)
async def get_daily_iva(
    target_date: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get daily VAT/IVA summary."""
    db = Database.get_db()
    
    # Get invoices for the date
    invoices = await db[Collections.INVOICES].find(
        {"invoice_date": target_date},
        {"_id": 0}
    ).to_list(500)
    
    # Calculate totals
    total_iva = sum(inv.get("vat_amount", 0) for inv in invoices)
    total_imponibile = sum(inv.get("taxable_amount", 0) for inv in invoices)
    
    return {
        "date": target_date,
        "total_iva": total_iva,
        "total_imponibile": total_imponibile,
        "invoices_count": len(invoices),
        "by_rate": {}
    }


@router.get(
    "/monthly/{year}/{month}",
    summary="Get monthly IVA"
)
async def get_monthly_iva(
    year: int = Path(...),
    month: int = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get monthly VAT/IVA summary."""
    db = Database.get_db()
    
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year+1}-01-01"
    else:
        end_date = f"{year}-{month+1:02d}-01"
    
    pipeline = [
        {"$match": {
            "invoice_date": {"$gte": start_date, "$lt": end_date}
        }},
        {"$group": {
            "_id": None,
            "total_iva": {"$sum": "$vat_amount"},
            "total_imponibile": {"$sum": "$taxable_amount"},
            "count": {"$sum": 1}
        }}
    ]
    
    result = await db[Collections.INVOICES].aggregate(pipeline).to_list(1)
    
    if result:
        return {
            "year": year,
            "month": month,
            "total_iva": result[0]["total_iva"],
            "total_imponibile": result[0]["total_imponibile"],
            "invoices_count": result[0]["count"]
        }
    
    return {
        "year": year,
        "month": month,
        "total_iva": 0,
        "total_imponibile": 0,
        "invoices_count": 0
    }
