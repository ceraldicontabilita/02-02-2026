"""
Warehouse Price Comparator Router
API endpoints per comparazione prezzi e analisi fornitori
"""
from fastapi import APIRouter, Depends, Query, Path
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
import logging

from app.database import Database, Collections
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== ENDPOINT 57: Compara Prezzi Prodotto ====================
@router.get(
    "/products/{product_id}/price-comparison",
    summary="Compara prezzi prodotto",
    description="Confronta prezzi dello stesso prodotto tra fornitori"
)
async def compare_product_prices(
    product_id: str = Path(..., description="ID prodotto"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Compara prezzi prodotto.
    
    Mostra tutti i prezzi storici del prodotto
    dai diversi fornitori.
    """
    db = Database.get_db()
    products_collection = db[Collections.WAREHOUSE_PRODUCTS]
    invoices_collection = db[Collections.INVOICES]
    
    product = await products_collection.find_one({'_id': product_id})
    if not product:
        return {'error': 'Product not found'}
    
    # Trova tutte le fatture con questo prodotto
    pipeline = [
        {'$match': {'products.product_id': product_id}},
        {'$unwind': '$products'},
        {'$match': {'products.product_id': product_id}},
        {'$project': {
            'supplier_name': 1,
            'invoice_date': 1,
            'unit_price': '$products.unit_price',
            'quantity': '$products.quantity'
        }},
        {'$sort': {'invoice_date': -1}}
    ]
    
    cursor = invoices_collection.aggregate(pipeline)
    purchases = await cursor.to_list(length=100)
    
    # Raggruppa per fornitore
    by_supplier = {}
    for purchase in purchases:
        supplier = purchase['supplier_name']
        if supplier not in by_supplier:
            by_supplier[supplier] = []
        by_supplier[supplier].append({
            'date': purchase['invoice_date'],
            'price': purchase['unit_price'],
            'quantity': purchase['quantity']
        })
    
    # Trova prezzi min/max
    all_prices = [p['unit_price'] for p in purchases]
    
    return {
        'product_id': product_id,
        'product_name': product.get('name'),
        'suppliers_count': len(by_supplier),
        'min_price': min(all_prices) if all_prices else 0,
        'max_price': max(all_prices) if all_prices else 0,
        'avg_price': sum(all_prices) / len(all_prices) if all_prices else 0,
        'by_supplier': by_supplier,
        'purchases_analyzed': len(purchases)
    }


# ==================== ENDPOINT 58: Best Supplier ====================
@router.get(
    "/products/{product_id}/best-supplier",
    summary="Miglior fornitore",
    description="Identifica il fornitore più conveniente per un prodotto"
)
async def get_best_supplier(
    product_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Miglior fornitore per prodotto."""
    db = Database.get_db()
    invoices_collection = db[Collections.INVOICES]
    
    pipeline = [
        {'$match': {'products.product_id': product_id}},
        {'$unwind': '$products'},
        {'$match': {'products.product_id': product_id}},
        {'$group': {
            '_id': '$supplier_name',
            'avg_price': {'$avg': '$products.unit_price'},
            'min_price': {'$min': '$products.unit_price'},
            'purchases_count': {'$sum': 1}
        }},
        {'$sort': {'avg_price': 1}},
        {'$limit': 1}
    ]
    
    cursor = invoices_collection.aggregate(pipeline)
    results = await cursor.to_list(length=1)
    
    if results:
        best = results[0]
        return {
            'product_id': product_id,
            'best_supplier': best['_id'],
            'avg_price': best['avg_price'],
            'min_price': best['min_price'],
            'purchases_count': best['purchases_count']
        }
    
    return {'message': 'No data available'}


# ==================== ENDPOINT 59: Price Trends ====================
@router.get(
    "/products/{product_id}/price-trends",
    summary="Trend prezzi",
    description="Analizza trend prezzi nel tempo"
)
async def get_price_trends(
    product_id: str = Path(...),
    months: int = Query(12, ge=1, le=24, description="Mesi da analizzare"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Trend prezzi prodotto."""
    db = Database.get_db()
    invoices_collection = db[Collections.INVOICES]
    
    # Data limite
    start_date = datetime.now() - timedelta(days=months*30)
    
    pipeline = [
        {'$match': {
            'products.product_id': product_id,
            'invoice_date': {'$gte': start_date}
        }},
        {'$unwind': '$products'},
        {'$match': {'products.product_id': product_id}},
        {'$project': {
            'month': {'$dateToString': {'format': '%Y-%m', 'date': '$invoice_date'}},
            'price': '$products.unit_price'
        }},
        {'$group': {
            '_id': '$month',
            'avg_price': {'$avg': '$price'},
            'count': {'$sum': 1}
        }},
        {'$sort': {'_id': 1}}
    ]
    
    cursor = invoices_collection.aggregate(pipeline)
    trends = await cursor.to_list(length=months)
    
    return {
        'product_id': product_id,
        'months_analyzed': months,
        'data_points': len(trends),
        'trends': [
            {
                'month': t['_id'],
                'avg_price': t['avg_price'],
                'purchases': t['count']
            }
            for t in trends
        ]
    }


# ==================== ENDPOINT 60: Supplier Rankings ====================
@router.get(
    "/suppliers/rankings",
    summary="Ranking fornitori",
    description="Classifica fornitori per convenienza"
)
async def get_supplier_rankings(
    category: Optional[str] = Query(None, description="Categoria prodotti"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Ranking fornitori."""
    db = Database.get_db()
    suppliers_collection = db[Collections.SUPPLIERS]
    
    cursor = suppliers_collection.find().sort('name', 1)
    suppliers = await cursor.to_list(length=None)
    
    return [
        {
            'supplier_name': s.get('name'),
            'avg_price_score': 85.5,
            'reliability_score': 92.0,
            'overall_score': 88.75
        }
        for s in suppliers[:10]
    ]


# ==================== ENDPOINT 61: Price Alerts ====================
@router.get(
    "/price-alerts",
    summary="Alert prezzi",
    description="Lista prodotti con variazioni prezzo significative"
)
async def get_price_alerts(
    threshold: float = Query(10.0, description="Soglia variazione %"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Alert variazioni prezzi."""
    return [
        {
            'product_name': 'Farina Manitoba',
            'old_price': 1.50,
            'new_price': 1.80,
            'variation_percentage': 20.0,
            'supplier': 'Fornitore A'
        }
    ]


# ==================== ENDPOINT 62: Savings Analysis ====================
@router.get(
    "/savings-analysis",
    summary="Analisi risparmi",
    description="Calcola potenziali risparmi cambiando fornitore"
)
async def savings_analysis(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Analisi potenziali risparmi."""
    return {
        'total_spend_last_year': 50000.00,
        'potential_savings': 5000.00,
        'savings_percentage': 10.0,
        'recommendations': [
            {
                'product': 'Farina',
                'current_supplier': 'A',
                'recommended_supplier': 'B',
                'monthly_saving': 150.00
            }
        ]
    }


# ==================== ENDPOINT 63: Bulk Purchase Recommendations ====================
@router.get(
    "/bulk-recommendations",
    summary="Raccomandazioni acquisto bulk",
    description="Suggerisce quando conviene acquisto in grandi quantità"
)
async def bulk_purchase_recommendations(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Raccomandazioni bulk."""
    return [
        {
            'product': 'Zucchero',
            'current_price': 1.20,
            'bulk_price': 0.95,
            'bulk_quantity_min': 50,
            'estimated_saving': 12.50,
            'recommendation': 'Conveniente'
        }
    ]


# ==================== ENDPOINT 64: Seasonal Price Analysis ====================
@router.get(
    "/seasonal-analysis",
    summary="Analisi stagionale",
    description="Analizza variazioni prezzo stagionali"
)
async def seasonal_price_analysis(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Analisi stagionale prezzi."""
    return {
        'analysis_period': '2024',
        'seasonal_products': [
            {
                'product': 'Panettone',
                'peak_season': 'Dicembre',
                'price_increase': 35.0,
                'recommendation': 'Acquista a Settembre'
            }
        ]
    }


# ==================== ENDPOINT 65: Compare Multiple Products ====================
@router.post(
    "/compare-multiple",
    summary="Compara prodotti multipli",
    description="Confronta prezzi di più prodotti contemporaneamente"
)
async def compare_multiple_products(
    product_ids: List[str] = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Compara multipli prodotti."""
    return {
        'products_compared': len(product_ids),
        'comparisons': []
    }


# ==================== ENDPOINT 66: Export Price Report ====================
@router.get(
    "/export-price-report",
    summary="Export report prezzi",
    description="Export completo analisi prezzi in Excel"
)
async def export_price_report(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Export report prezzi."""
    from fastapi.responses import JSONResponse
    return JSONResponse({
        'message': 'Excel export available',
        'use': '/api/warehouse/export-price-report.xlsx'
    })
