"""Dashboard router - KPI and statistics endpoints."""
from fastapi import APIRouter, Depends
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from app.database import Database, Collections
from app.utils.dependencies import get_optional_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/summary",
    summary="Get dashboard summary",
    description="Get summary data for dashboard - no auth required"
)
async def get_summary() -> Dict[str, Any]:
    """Get summary data for dashboard - public endpoint."""
    db = Database.get_db()
    
    try:
        # Get counts from various collections
        invoices_count = await db[Collections.INVOICES].count_documents({})
        suppliers_count = await db[Collections.SUPPLIERS].count_documents({})
        products_count = await db[Collections.WAREHOUSE_PRODUCTS].count_documents({})
        haccp_count = await db[Collections.HACCP_TEMPERATURES].count_documents({})
        employees_count = await db[Collections.EMPLOYEES].count_documents({})
        
        return {
            "invoices_total": invoices_count,
            "reconciled": 0,  # TODO: calculate actual reconciled movements
            "products": products_count,
            "haccp_items": haccp_count,
            "suppliers": suppliers_count,
            "employees": employees_count
        }
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {e}")
        return {
            "invoices_total": 0,
            "reconciled": 0,
            "products": 0,
            "haccp_items": 0,
            "suppliers": 0,
            "employees": 0
        }


@router.get(
    "/kpi",
    summary="Get dashboard KPIs",
    description="Get key performance indicators for dashboard"
)
async def get_kpi(
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
) -> Dict[str, Any]:
    """Get KPI data for dashboard."""
    db = Database.get_db()
    
    try:
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
    except Exception as e:
        logger.error(f"Error getting KPIs: {e}")
        return {
            "invoices_count": 0,
            "suppliers_count": 0,
            "total_invoices_amount": 0,
            "pending_payments": 0,
            "monthly_revenue": 0,
            "monthly_expenses": 0
        }


@router.get(
    "/stats",
    summary="Get dashboard statistics",
    description="Get detailed statistics for dashboard"
)
async def get_stats(
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
) -> Dict[str, Any]:
    """Get statistics for dashboard."""
    db = Database.get_db()
    
    try:
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
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return {
            "monthly_invoices": 0,
            "monthly_suppliers": 0,
            "overdue_invoices": 0,
            "pending_reconciliations": 0,
            "chart_data": {
                "labels": [],
                "values": []
            }
        }
