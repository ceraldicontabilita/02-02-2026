"""Dashboard router - KPI and statistics endpoints."""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from datetime import datetime, timedelta
import logging

from app.database import Database, Collections
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/kpi",
    summary="Get dashboard KPIs",
    description="Get key performance indicators for dashboard"
)
async def get_kpi(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get KPI data for dashboard."""
    db = Database.get_db()
    
    # Get counts
    invoices_count = await db[Collections.INVOICES].count_documents({})
    suppliers_count = await db[Collections.SUPPLIERS].count_documents({})
    
    # Calculate totals
    pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    result = await db[Collections.INVOICES].aggregate(pipeline).to_list(1)
    total_invoices = result[0]["total"] if result else 0
    
    return {
        "invoices_count": invoices_count,
        "suppliers_count": suppliers_count,
        "total_invoices_amount": total_invoices,
        "pending_payments": 0,
        "monthly_revenue": 0,
        "monthly_expenses": total_invoices
    }


@router.get(
    "/stats",
    summary="Get dashboard statistics",
    description="Get detailed statistics for dashboard"
)
async def get_stats(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get statistics for dashboard."""
    db = Database.get_db()
    
    # Monthly stats
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    monthly_invoices = await db[Collections.INVOICES].count_documents({
        "created_at": {"$gte": start_of_month}
    })
    
    return {
        "monthly_invoices": monthly_invoices,
        "monthly_suppliers": 0,
        "overdue_invoices": 0,
        "pending_reconciliations": 0,
        "chart_data": {
            "labels": [],
            "values": []
        }
    }
