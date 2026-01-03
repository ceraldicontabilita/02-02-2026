"""
Balance Sheet Router - Bilanci
API endpoints per bilanci e report contabili
"""
from fastapi import APIRouter, Depends, Query, Path, status
from fastapi.responses import StreamingResponse
from typing import Dict, Any
from datetime import date
import logging

from app.database import Database, Collections
from app.repositories.balance_sheet_repository import (
    BalanceSheetRepository,
    YearEndRepository,
    AccountBalanceRepository
)
from app.repositories.chart_repository import ChartOfAccountsRepository
from app.services.balance_sheet_service import BalanceSheetService
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


async def get_balance_sheet_service() -> BalanceSheetService:
    """Get balance sheet service with dependencies."""
    db = Database.get_db()
    balance_repo = BalanceSheetRepository(db[Collections.BALANCE_SHEETS])
    year_end_repo = YearEndRepository(db[Collections.YEAR_END_CLOSURES])
    account_balance_repo = AccountBalanceRepository(db[Collections.ACCOUNTING_ENTRIES])
    chart_repo = ChartOfAccountsRepository(db[Collections.CHART_OF_ACCOUNTS])
    
    return BalanceSheetService(
        balance_repo,
        year_end_repo,
        account_balance_repo,
        chart_repo
    )


# ==================== ENDPOINT 14: Bilancio Annuale ====================
@router.get(
    "/balance-sheet/{year}",
    summary="Bilancio annuale",
    description="Genera stato patrimoniale (bilancio) per anno"
)
async def get_balance_sheet(
    year: int = Path(..., description="Anno"),
    save: bool = Query(False, description="Salva bilancio generato"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: BalanceSheetService = Depends(get_balance_sheet_service)
) -> Dict[str, Any]:
    """
    Bilancio annuale (Stato Patrimoniale).
    
    **Include:**
    - Attivo: Totale e dettaglio conti
    - Passivo: Totale e dettaglio conti
    - Patrimonio Netto: Totale e dettaglio
    - Verifica bilanciamento
    
    **Data riferimento:** 31 dicembre dell'anno
    """
    balance_sheet = await service.generate_balance_sheet(year, save)
    return balance_sheet


# ==================== ENDPOINT 15: Bilancio di Verifica ====================
@router.get(
    "/trial-balance/{date}",
    summary="Bilancio di verifica",
    description="Genera bilancio di verifica (trial balance) alla data"
)
async def get_trial_balance(
    balance_date: date = Path(..., alias="date", description="Data bilancio"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: BalanceSheetService = Depends(get_balance_sheet_service)
) -> Dict[str, Any]:
    """
    Bilancio di verifica.
    
    **Include:**
    - Tutti i conti con saldi
    - Totale dare
    - Totale avere
    - Verifica quadratura
    
    Utile per verificare la correttezza delle registrazioni.
    """
    trial_balance = await service.generate_trial_balance(balance_date)
    return trial_balance


# ==================== ENDPOINT 16: Conto Economico ====================
@router.get(
    "/profit-loss/{year}",
    summary="Conto economico",
    description="Genera conto economico (P&L) per anno"
)
async def get_profit_loss(
    year: int = Path(..., description="Anno"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: BalanceSheetService = Depends(get_balance_sheet_service)
) -> Dict[str, Any]:
    """
    Conto Economico (Profit & Loss).
    
    **Include:**
    - Ricavi: Totale e dettaglio
    - Costi: Totale e dettaglio
    - Utile lordo
    - Utile netto
    
    Mostra la redditività dell'azienda nell'anno.
    """
    profit_loss = await service.generate_profit_loss(year)
    return profit_loss


# ==================== ENDPOINT 17: Rendiconto Finanziario ====================
@router.get(
    "/cash-flow/{year}",
    summary="Rendiconto finanziario",
    description="Genera rendiconto finanziario (cash flow) per anno"
)
async def get_cash_flow(
    year: int = Path(..., description="Anno"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: BalanceSheetService = Depends(get_balance_sheet_service)
) -> Dict[str, Any]:
    """
    Rendiconto Finanziario (Cash Flow Statement).
    
    **Include:**
    - Liquidità iniziale
    - Liquidità finale
    - Flusso netto di cassa
    
    Mostra la variazione di liquidità nell'anno.
    """
    cash_flow = await service.generate_cash_flow(year)
    return cash_flow


# ==================== ENDPOINT 18: Stato Patrimoniale Attivo ====================
@router.get(
    "/assets",
    summary="Stato patrimoniale attivo",
    description="Recupera solo la parte attiva dello stato patrimoniale"
)
async def get_assets(
    year: int = Query(..., description="Anno"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: BalanceSheetService = Depends(get_balance_sheet_service)
) -> Dict[str, Any]:
    """
    Stato Patrimoniale - ATTIVO.
    
    Include tutti i conti di tipo 'assets':
    - Immobilizzazioni
    - Rimanenze
    - Crediti
    - Liquidità
    """
    assets = await service.get_assets(year)
    return assets


# ==================== ENDPOINT 19: Stato Patrimoniale Passivo ====================
@router.get(
    "/liabilities",
    summary="Stato patrimoniale passivo",
    description="Recupera solo la parte passiva dello stato patrimoniale"
)
async def get_liabilities(
    year: int = Query(..., description="Anno"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: BalanceSheetService = Depends(get_balance_sheet_service)
) -> Dict[str, Any]:
    """
    Stato Patrimoniale - PASSIVO.
    
    Include tutti i conti di tipo 'liabilities':
    - Debiti
    - Mutui
    - Obbligazioni
    """
    liabilities = await service.get_liabilities(year)
    return liabilities


# ==================== ENDPOINT 20: Patrimonio Netto ====================
@router.get(
    "/equity",
    summary="Patrimonio netto",
    description="Recupera patrimonio netto"
)
async def get_equity(
    year: int = Query(..., description="Anno"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: BalanceSheetService = Depends(get_balance_sheet_service)
) -> Dict[str, Any]:
    """
    Patrimonio Netto.
    
    Include tutti i conti di tipo 'equity':
    - Capitale sociale
    - Riserve
    - Utili/Perdite
    """
    equity = await service.get_equity(year)
    return equity


# ==================== ENDPOINT 21: Chiusura Anno ====================
@router.post(
    "/year-end-close",
    summary="Chiusura anno",
    description="Esegue chiusura contabile dell'anno"
)
async def close_year(
    year: int = Query(..., description="Anno da chiudere"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: BalanceSheetService = Depends(get_balance_sheet_service)
) -> Dict[str, Any]:
    """
    Chiusura anno contabile.
    
    **Processo:**
    1. Genera bilancio finale
    2. Genera conto economico
    3. Genera rendiconto finanziario
    4. Salva chiusura definitiva
    5. Blocca modifiche all'anno
    
    **Attenzione:** Operazione irreversibile!
    """
    closure = await service.close_year(year, current_user['user_id'])
    return closure


# ==================== ENDPOINT 22: Export Bilanci Excel ====================
@router.get(
    "/reports/export/excel",
    summary="Export bilanci Excel",
    description="Export completo di tutti i bilanci in Excel"
)
async def export_reports_excel(
    year: int = Query(..., description="Anno"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: BalanceSheetService = Depends(get_balance_sheet_service)
):
    """
    Export report contabili in Excel.
    
    Include:
    - Stato patrimoniale
    - Conto economico
    - Rendiconto finanziario
    - Bilancio di verifica
    """
    excel_file = await service.export_balance_excel(year)
    
    filename = f"bilanci_{year}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== ENDPOINT 23: Export Bilanci PDF ====================
@router.get(
    "/reports/export/pdf",
    summary="Export bilanci PDF",
    description="Export completo di tutti i bilanci in PDF"
)
async def export_reports_pdf(
    year: int = Query(..., description="Anno"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: BalanceSheetService = Depends(get_balance_sheet_service)
):
    """
    Export report contabili in PDF.
    
    Genera PDF professionale con tutti i bilanci dell'anno.
    
    **Nota:** Implementazione completa PDF disponibile prossimamente.
    """
    return {
        "message": "PDF export available soon",
        "alternative": f"Use Excel export: /api/accounting/reports/export/excel?year={year}",
        "year": year
    }
