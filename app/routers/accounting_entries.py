"""
Accounting Entries Router - Prima Nota
API endpoints per gestione registrazioni contabili
"""
from fastapi import APIRouter, Depends, Query, Path, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
from datetime import date
import logging

from app.database import Database, Collections
from app.repositories.accounting_entries_repository import AccountingEntriesRepository
from app.repositories.chart_repository import ChartOfAccountsRepository
from app.services.accounting_entries_service import AccountingEntriesService
from app.models.accounting_advanced import (
    AccountingEntryCreate,
    AccountingEntryUpdate,
    AccountingEntryResponse
)
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


async def get_accounting_entries_service() -> AccountingEntriesService:
    """Get accounting entries service with dependencies."""
    db = Database.get_db()
    entries_repo = AccountingEntriesRepository(db[Collections.ACCOUNTING_ENTRIES])
    chart_repo = ChartOfAccountsRepository(db[Collections.CHART_OF_ACCOUNTS])
    return AccountingEntriesService(entries_repo, chart_repo)


# ==================== ENDPOINT 1: Crea Registrazione ====================
@router.post(
    "/entries",
    response_model=AccountingEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crea registrazione prima nota",
    description="Crea nuova registrazione in prima nota. Valida che Dare = Avere."
)
async def create_accounting_entry(
    entry: AccountingEntryCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: AccountingEntriesService = Depends(get_accounting_entries_service)
) -> Dict[str, Any]:
    """
    Crea nuova registrazione in prima nota.
    
    **Validazioni:**
    - Tutti i conti devono esistere
    - Totale Dare = Totale Avere
    - Minimo 2 righe richieste
    """
    entry_data = entry.model_dump()
    result = await service.create_entry(entry_data, current_user['user_id'])
    return result


# ==================== ENDPOINT 2: Lista Registrazioni ====================
@router.get(
    "/entries",
    response_model=List[AccountingEntryResponse],
    summary="Lista registrazioni prima nota",
    description="Recupera registrazioni con filtri opzionali per data e tipo"
)
async def list_accounting_entries(
    current_user: Dict[str, Any] = Depends(get_current_user),
    start_date: Optional[date] = Query(None, description="Data inizio (default: 1 anno fa)"),
    end_date: Optional[date] = Query(None, description="Data fine (default: oggi)"),
    entry_type: Optional[str] = Query(None, description="Tipo registrazione"),
    skip: int = Query(0, ge=0, description="Records da saltare"),
    limit: int = Query(100, ge=1, le=1000, description="Max records"),
    service: AccountingEntriesService = Depends(get_accounting_entries_service)
) -> List[Dict[str, Any]]:
    """
    Lista registrazioni con paginazione e filtri.
    
    **Filtri disponibili:**
    - start_date: Data inizio periodo
    - end_date: Data fine periodo
    - entry_type: opening, ordinary, adjustment, closing
    """
    entries = await service.list_entries(
        start_date=start_date,
        end_date=end_date,
        entry_type=entry_type,
        skip=skip,
        limit=limit
    )
    return entries


# ==================== ENDPOINT 3: Dettaglio Registrazione ====================
@router.get(
    "/entries/{entry_id}",
    response_model=AccountingEntryResponse,
    summary="Dettaglio registrazione",
    description="Recupera dettaglio completo di una registrazione"
)
async def get_accounting_entry(
    entry_id: str = Path(..., description="ID registrazione"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: AccountingEntriesService = Depends(get_accounting_entries_service)
) -> Dict[str, Any]:
    """Recupera dettaglio registrazione per ID."""
    entry = await service.get_entry(entry_id)
    return entry


# ==================== ENDPOINT 4: Aggiorna Registrazione ====================
@router.put(
    "/entries/{entry_id}",
    response_model=AccountingEntryResponse,
    summary="Aggiorna registrazione",
    description="Modifica registrazione esistente. Valida bilanciamento se si modificano le righe."
)
async def update_accounting_entry(
    entry_id: str = Path(..., description="ID registrazione"),
    entry_update: AccountingEntryUpdate = ...,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: AccountingEntriesService = Depends(get_accounting_entries_service)
) -> Dict[str, Any]:
    """
    Aggiorna registrazione esistente.
    
    **Validazioni:**
    - Se si modificano le righe, valida Dare = Avere
    - Tutti i conti devono esistere
    """
    update_data = entry_update.model_dump(exclude_unset=True)
    result = await service.update_entry(entry_id, update_data)
    return result


# ==================== ENDPOINT 5: Elimina Registrazione ====================
@router.delete(
    "/entries/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Elimina registrazione",
    description="Elimina registrazione in prima nota"
)
async def delete_accounting_entry(
    entry_id: str = Path(..., description="ID registrazione"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: AccountingEntriesService = Depends(get_accounting_entries_service)
):
    """Elimina registrazione."""
    await service.delete_entry(entry_id)
    return None


# ==================== ENDPOINT 6: Registrazioni per Conto ====================
@router.get(
    "/entries/by-account/{account_id}",
    response_model=List[AccountingEntryResponse],
    summary="Registrazioni per conto",
    description="Recupera tutte le registrazioni di un conto specifico"
)
async def get_entries_by_account(
    account_id: str = Path(..., description="ID conto"),
    start_date: Optional[date] = Query(None, description="Data inizio"),
    end_date: Optional[date] = Query(None, description="Data fine"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: AccountingEntriesService = Depends(get_accounting_entries_service)
) -> List[Dict[str, Any]]:
    """
    Recupera tutte le registrazioni che coinvolgono un conto.
    
    Utile per vedere il dettaglio movimenti di un conto.
    """
    entries = await service.get_entries_by_account(
        account_id=account_id,
        start_date=start_date,
        end_date=end_date
    )
    return entries


# ==================== ENDPOINT 7: Registrazioni per Data ====================
@router.get(
    "/entries/by-date",
    response_model=List[AccountingEntryResponse],
    summary="Registrazioni per periodo",
    description="Alias di /entries con filtri data (per compatibilità)"
)
async def get_entries_by_date(
    start_date: date = Query(..., description="Data inizio"),
    end_date: date = Query(..., description="Data fine"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: AccountingEntriesService = Depends(get_accounting_entries_service)
) -> List[Dict[str, Any]]:
    """Recupera registrazioni per periodo specifico."""
    entries = await service.list_entries(
        start_date=start_date,
        end_date=end_date
    )
    return entries


# ==================== ENDPOINT 8: Import Bulk ====================
@router.post(
    "/entries/bulk",
    summary="Import bulk registrazioni",
    description="Import multiplo di registrazioni. Valida tutte prima di importare."
)
async def bulk_import_entries(
    entries: List[AccountingEntryCreate],
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: AccountingEntriesService = Depends(get_accounting_entries_service)
) -> Dict[str, Any]:
    """
    Import bulk di registrazioni.
    
    **Processo:**
    1. Valida tutte le registrazioni
    2. Importa solo quelle valide
    3. Ritorna report con successi ed errori
    
    **Response:**
    ```json
    {
        "total": 100,
        "imported": 95,
        "errors": 5,
        "entries": [...],
        "error_details": [...]
    }
    ```
    """
    entries_data = [entry.model_dump() for entry in entries]
    result = await service.bulk_import_entries(entries_data, current_user['user_id'])
    return result


# ==================== ENDPOINT 9: Export Excel ====================
@router.get(
    "/entries/export/excel",
    summary="Export registrazioni Excel",
    description="Export registrazioni in formato Excel"
)
async def export_entries_excel(
    start_date: date = Query(..., description="Data inizio"),
    end_date: date = Query(..., description="Data fine"),
    entry_type: Optional[str] = Query(None, description="Tipo registrazione"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: AccountingEntriesService = Depends(get_accounting_entries_service)
):
    """
    Export registrazioni in Excel.
    
    **Formato:**
    - Una riga per ogni riga di registrazione
    - Colonne: Data, Tipo, Descrizione, N.Doc, Conto, Nome, Dare, Avere, Note
    """
    excel_file = await service.export_entries_excel(
        start_date=start_date,
        end_date=end_date,
        entry_type=entry_type
    )
    
    filename = f"prima_nota_{start_date}_{end_date}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== ENDPOINT 10: Export PDF ====================
@router.get(
    "/entries/export/pdf",
    summary="Export registrazioni PDF",
    description="Export registrazioni in formato PDF"
)
async def export_entries_pdf(
    start_date: date = Query(..., description="Data inizio"),
    end_date: date = Query(..., description="Data fine"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: AccountingEntriesService = Depends(get_accounting_entries_service)
):
    """
    Export registrazioni in PDF.
    
    Genera PDF formattato con tutte le registrazioni del periodo.
    """
    # TODO: Implementare quando sarà necessario
    return {
        "message": "PDF export disponibile prossimamente",
        "use_excel": f"/api/accounting/entries/export/excel?start_date={start_date}&end_date={end_date}"
    }
