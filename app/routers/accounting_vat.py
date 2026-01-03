"""
VAT Router - Liquidazioni IVA
API endpoints per gestione liquidazioni e registro IVA
"""
from fastapi import APIRouter, Depends, Query, Path, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
from datetime import date
import logging

from app.database import Database, Collections
from app.repositories.vat_f24_repository import VATRepository, VATRegistryRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.services.vat_f24_service import VATService
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


async def get_vat_service() -> VATService:
    """Get VAT service with dependencies."""
    db = Database.get_db()
    vat_repo = VATRepository(db[Collections.VAT_LIQUIDATIONS])
    registry_repo = VATRegistryRepository(db[Collections.VAT_REGISTRY])
    invoice_repo = InvoiceRepository(db[Collections.INVOICES])
    return VATService(vat_repo, registry_repo, invoice_repo)


# ==================== ENDPOINT 1: Calcola Liquidazione IVA ====================
@router.post(
    "/vat/liquidation/calculate",
    summary="Calcola liquidazione IVA",
    description="Calcola liquidazione IVA per trimestre analizzando fatture"
)
async def calculate_vat_liquidation(
    quarter: int = Query(..., ge=1, le=4, description="Trimestre (1-4)"),
    year: int = Query(..., description="Anno"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: VATService = Depends(get_vat_service)
) -> Dict[str, Any]:
    """
    Calcola liquidazione IVA trimestrale.
    
    **Processo:**
    1. Analizza fatture del trimestre
    2. Calcola IVA detraibile
    3. Calcola IVA a debito
    4. Considera credito precedente
    5. Calcola importo da versare
    
    **Response:**
    ```json
    {
        "quarter": 4,
        "year": 2024,
        "vat_deductible": 5000.00,
        "vat_payable": 2000.00,
        "vat_balance": -3000.00,
        "previous_credit": 0,
        "to_pay": 0
    }
    ```
    """
    result = await service.calculate_liquidation(quarter, year)
    return result


# ==================== ENDPOINT 2: Liquidazione Trimestre ====================
@router.get(
    "/vat/liquidation/{quarter}/{year}",
    summary="Liquidazione IVA trimestre",
    description="Recupera liquidazione IVA salvata per trimestre"
)
async def get_vat_liquidation(
    quarter: int = Path(..., ge=1, le=4, description="Trimestre"),
    year: int = Path(..., description="Anno"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: VATService = Depends(get_vat_service)
) -> Dict[str, Any]:
    """Recupera liquidazione IVA esistente."""
    liquidation = await service.get_liquidation(quarter, year)
    return liquidation


# ==================== ENDPOINT 3: Registro IVA ====================
@router.get(
    "/vat/registry",
    summary="Registro IVA completo",
    description="Recupera registro IVA per periodo con filtri"
)
async def get_vat_registry(
    start_date: date = Query(..., description="Data inizio"),
    end_date: date = Query(..., description="Data fine"),
    vat_type: Optional[str] = Query(None, description="Tipo IVA: deductible, payable"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: VATService = Depends(get_vat_service)
) -> List[Dict[str, Any]]:
    """
    Registro IVA completo.
    
    **Filtri:**
    - start_date: Data inizio
    - end_date: Data fine
    - vat_type: deductible (acquisti) o payable (vendite)
    
    Ritorna tutte le registrazioni IVA del periodo.
    """
    entries = await service.get_vat_registry(start_date, end_date, vat_type)
    return entries


# ==================== ENDPOINT 4: IVA Detraibile ====================
@router.get(
    "/vat/deductible",
    summary="IVA detraibile",
    description="Recupera solo IVA detraibile (acquisti) per periodo"
)
async def get_vat_deductible(
    start_date: date = Query(..., description="Data inizio"),
    end_date: date = Query(..., description="Data fine"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: VATService = Depends(get_vat_service)
) -> Dict[str, Any]:
    """IVA detraibile del periodo."""
    entries = await service.get_vat_registry(start_date, end_date, vat_type='deductible')
    
    total = sum(entry.get('vat_amount', 0) for entry in entries)
    
    return {
        'period': f"{start_date} - {end_date}",
        'entries_count': len(entries),
        'total_deductible': total,
        'entries': entries
    }


# ==================== ENDPOINT 5: IVA a Debito ====================
@router.get(
    "/vat/payable",
    summary="IVA a debito",
    description="Recupera solo IVA a debito (vendite) per periodo"
)
async def get_vat_payable(
    start_date: date = Query(..., description="Data inizio"),
    end_date: date = Query(..., description="Data fine"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: VATService = Depends(get_vat_service)
) -> Dict[str, Any]:
    """IVA a debito del periodo."""
    entries = await service.get_vat_registry(start_date, end_date, vat_type='payable')
    
    total = sum(entry.get('vat_amount', 0) for entry in entries)
    
    return {
        'period': f"{start_date} - {end_date}",
        'entries_count': len(entries),
        'total_payable': total,
        'entries': entries
    }


# ==================== ENDPOINT 6: Registra Pagamento IVA ====================
@router.post(
    "/vat/payment",
    summary="Registra pagamento IVA",
    description="Registra pagamento di una liquidazione IVA"
)
async def register_vat_payment(
    liquidation_id: str = Query(..., description="ID liquidazione"),
    payment_date: date = Query(..., description="Data pagamento"),
    payment_reference: Optional[str] = Query(None, description="Riferimento pagamento"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: VATService = Depends(get_vat_service)
) -> Dict[str, Any]:
    """
    Registra pagamento IVA.
    
    Marca la liquidazione come pagata con data e riferimento.
    """
    result = await service.register_payment(
        liquidation_id,
        payment_date,
        payment_reference
    )
    return result


# ==================== ENDPOINT 7: Report Annuale IVA ====================
@router.get(
    "/vat/report/{year}",
    summary="Report annuale IVA",
    description="Genera report IVA completo per anno con tutte le liquidazioni"
)
async def get_annual_vat_report(
    year: int = Path(..., description="Anno"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: VATService = Depends(get_vat_service)
) -> Dict[str, Any]:
    """
    Report annuale IVA.
    
    **Include:**
    - Tutte le liquidazioni trimestrali
    - Totale IVA detraibile
    - Totale IVA a debito
    - Saldo annuale
    - Importi pagati/non pagati
    """
    report = await service.get_annual_report(year)
    return report


# ==================== ENDPOINT 8: Export Liquidazioni ====================
@router.get(
    "/vat/export/excel",
    summary="Export liquidazioni Excel",
    description="Export liquidazione IVA in formato Excel"
)
async def export_vat_excel(
    quarter: int = Query(..., ge=1, le=4, description="Trimestre"),
    year: int = Query(..., description="Anno"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: VATService = Depends(get_vat_service)
):
    """Export liquidazione IVA in Excel."""
    excel_file = await service.export_vat_excel(quarter, year)
    
    filename = f"liquidazione_iva_Q{quarter}_{year}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
