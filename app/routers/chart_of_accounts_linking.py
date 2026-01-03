"""
Account Linking Router
API endpoints per collegare fatture a conti contabili
"""
from fastapi import APIRouter, Depends, Query, Path, status
from typing import List, Dict, Any
import logging

from app.database import Database, Collections
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.chart_repository import ChartOfAccountsRepository
from app.models.accounting_advanced import InvoiceAccountLink
from app.utils.dependencies import get_current_user
from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== ENDPOINT 24: Collega Fattura a Conto ====================
@router.post(
    "/link-invoice",
    summary="Collega fattura a conto",
    description="Collega una fattura a un conto del piano dei conti"
)
async def link_invoice_to_account(
    link: InvoiceAccountLink,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Collega fattura a conto contabile.
    
    **Utilità:**
    - Associa fatture a conti specifici
    - Facilita reportistica
    - Migliora tracciabilità
    
    **Esempio:**
    ```json
    {
        "invoice_id": "...",
        "account_id": "...",
        "amount": 1000.00,
        "notes": "Acquisto materiali"
    }
    ```
    """
    db = Database.get_db()
    invoice_repo = InvoiceRepository(db[Collections.INVOICES])
    chart_repo = ChartOfAccountsRepository(db[Collections.CHART_OF_ACCOUNTS])
    
    # Verifica che fattura esista
    invoice = await invoice_repo.get_by_id(link.invoice_id)
    if not invoice:
        raise NotFoundError(f"Invoice {link.invoice_id} not found")
    
    # Verifica che conto esista
    account = await chart_repo.get_by_id(link.account_id)
    if not account:
        raise NotFoundError(f"Account {link.account_id} not found")
    
    # Salva collegamento nella fattura
    await invoice_repo.update(link.invoice_id, {
        'linked_account_id': link.account_id,
        'linked_account_code': account.get('code'),
        'linked_account_name': account.get('name'),
        'linked_amount': link.amount,
        'linked_notes': link.notes
    })
    
    logger.info(f"Linked invoice {link.invoice_id} to account {link.account_id}")
    
    return {
        'invoice_id': link.invoice_id,
        'invoice_number': invoice.get('invoice_number'),
        'account_id': link.account_id,
        'account_code': account.get('code'),
        'account_name': account.get('name'),
        'amount': link.amount,
        'notes': link.notes,
        'linked_at': invoice.get('updated_at')
    }


# ==================== ENDPOINT 25: Lista Fatture Collegate ====================
@router.get(
    "/{account_id}/linked-invoices",
    summary="Fatture collegate al conto",
    description="Recupera tutte le fatture collegate a un conto specifico"
)
async def get_linked_invoices(
    account_id: str = Path(..., description="ID conto"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Lista fatture collegate a un conto.
    
    Utile per vedere quali fatture sono state assegnate
    a un determinato conto contabile.
    """
    db = Database.get_db()
    invoice_repo = InvoiceRepository(db[Collections.INVOICES])
    chart_repo = ChartOfAccountsRepository(db[Collections.CHART_OF_ACCOUNTS])
    
    # Verifica che conto esista
    account = await chart_repo.get_by_id(account_id)
    if not account:
        raise NotFoundError(f"Account {account_id} not found")
    
    # Recupera fatture collegate
    invoices = await invoice_repo.find_many({
        'linked_account_id': account_id
    })
    
    result = []
    for invoice in invoices:
        result.append({
            'invoice_id': invoice.get('_id'),
            'invoice_number': invoice.get('invoice_number'),
            'invoice_date': invoice.get('invoice_date'),
            'supplier_name': invoice.get('supplier_name'),
            'total_amount': invoice.get('total_amount'),
            'linked_amount': invoice.get('linked_amount'),
            'linked_notes': invoice.get('linked_notes')
        })
    
    return result


# ==================== ENDPOINT 26: Scollega Fattura ====================
@router.delete(
    "/unlink/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Scollega fattura da conto",
    description="Rimuove collegamento tra fattura e conto contabile"
)
async def unlink_invoice(
    invoice_id: str = Path(..., description="ID fattura"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Scollega fattura da conto.
    
    Rimuove l'associazione tra fattura e conto contabile.
    """
    db = Database.get_db()
    invoice_repo = InvoiceRepository(db[Collections.INVOICES])
    
    # Verifica che fattura esista
    invoice = await invoice_repo.get_by_id(invoice_id)
    if not invoice:
        raise NotFoundError(f"Invoice {invoice_id} not found")
    
    # Rimuovi collegamento
    await invoice_repo.update(invoice_id, {
        'linked_account_id': None,
        'linked_account_code': None,
        'linked_account_name': None,
        'linked_amount': None,
        'linked_notes': None
    })
    
    logger.info(f"Unlinked invoice {invoice_id}")
    
    return None
