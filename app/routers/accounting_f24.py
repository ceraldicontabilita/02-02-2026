"""
F24 Router - Modelli F24
API endpoints per gestione modelli F24
"""
from fastapi import APIRouter, Depends, Query, Path, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
from datetime import date
import logging

from app.database import Database, Collections
from app.repositories.vat_f24_repository import F24Repository
from app.services.vat_f24_service import F24Service
from app.models.accounting_advanced import F24Create, F24Update, F24Response
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


async def get_f24_service() -> F24Service:
    """Get F24 service with dependencies."""
    db = Database.get_db()
    f24_repo = F24Repository(db[Collections.F24_MODELS])
    return F24Service(f24_repo)


# ==================== ENDPOINT 9: Lista F24 ====================
@router.get(
    "/f24/list",
    response_model=List[F24Response],
    summary="Lista F24",
    description="Lista modelli F24 con filtri opzionali"
)
async def list_f24_models(
    month: Optional[int] = Query(None, ge=1, le=12, description="Mese"),
    year: Optional[int] = Query(None, description="Anno"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: F24Service = Depends(get_f24_service)
) -> List[Dict[str, Any]]:
    """
    Lista modelli F24.
    
    **Filtri:**
    - month: Filtra per mese riferimento
    - year: Filtra per anno riferimento
    
    Se non specificato, ritorna F24 dell'anno corrente.
    """
    f24s = await service.list_f24s(month, year)
    return f24s


# ==================== ENDPOINT 10: Crea F24 ====================
@router.post(
    "/f24",
    response_model=F24Response,
    status_code=status.HTTP_201_CREATED,
    summary="Crea F24",
    description="Crea nuovo modello F24 per pagamento tributi"
)
async def create_f24_model(
    f24: F24Create,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: F24Service = Depends(get_f24_service)
) -> Dict[str, Any]:
    """
    Crea modello F24.
    
    **Tributi supportati:**
    - 6001: IVA mensile
    - 6002: IVA trimestrale
    - inps: Contributi INPS
    - irpef: Imposta sui redditi
    - irap: Imposta attività produttive
    - imu: Imposta municipale
    
    **Esempio:**
    ```json
    {
        "reference_month": 12,
        "reference_year": 2024,
        "payment_date": "2025-01-16",
        "tributes": [
            {
                "code": "6001",
                "description": "IVA Dicembre 2024",
                "amount": 5000.00
            }
        ],
        "total_amount": 5000.00,
        "paid": false
    }
    ```
    """
    f24_data = f24.model_dump()
    result = await service.create_f24(f24_data, current_user['user_id'])
    return result


# ==================== ENDPOINT 11: Dettaglio F24 ====================
@router.get(
    "/f24/{f24_id}",
    response_model=F24Response,
    summary="Dettaglio F24",
    description="Recupera dettaglio completo di un modello F24"
)
async def get_f24_detail(
    f24_id: str = Path(..., description="ID F24"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: F24Service = Depends(get_f24_service)
) -> Dict[str, Any]:
    """
    Dettaglio modello F24.
    
    Ritorna tutte le informazioni del modello F24 inclusi:
    - Periodo di riferimento
    - Tributi dettagliati
    - Importi
    - Stato pagamento
    """
    f24 = await service.get_f24(f24_id)
    return f24


# ==================== ENDPOINT 12: Aggiorna F24 ====================
@router.put(
    "/f24/{f24_id}",
    response_model=F24Response,
    summary="Aggiorna F24",
    description="Aggiorna modello F24 esistente"
)
async def update_f24_model(
    f24_id: str = Path(..., description="ID F24"),
    f24_update: F24Update = ...,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: F24Service = Depends(get_f24_service)
) -> Dict[str, Any]:
    """
    Aggiorna modello F24.
    
    **Campi modificabili:**
    - payment_date: Data pagamento
    - paid: Stato pagamento
    - payment_reference: Riferimento pagamento
    - notes: Note
    """
    update_data = f24_update.model_dump(exclude_unset=True)
    result = await service.update_f24(f24_id, update_data)
    return result


# ==================== ENDPOINT 13: Export PDF F24 ====================
@router.get(
    "/f24/export/pdf",
    summary="Genera PDF F24",
    description="Genera modello F24 in formato PDF per pagamento"
)
async def export_f24_pdf(
    f24_id: str = Query(..., description="ID F24"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: F24Service = Depends(get_f24_service)
):
    """
    Genera PDF F24.
    
    Crea modello F24 stampabile in formato PDF
    conforme agli standard dell'Agenzia delle Entrate.
    
    **Nota:** Implementazione completa PDF disponibile prossimamente.
    Per ora ritorna informazioni per generazione manuale.
    """
    f24 = await service.get_f24(f24_id)
    
    return {
        "message": "PDF generation available soon",
        "f24_data": f24,
        "manual_filling_guide": {
            "step1": "Scarica modello F24 vuoto da agenziaentrate.gov.it",
            "step2": "Compila con i dati forniti in f24_data",
            "step3": "Usa payment_date come scadenza"
        },
        "alternative": "Use third-party F24 generation service with provided data"
    }
