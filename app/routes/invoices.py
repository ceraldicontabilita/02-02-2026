"""
Invoices Routes Module
Gestione Fatture Passive (XML SDI)
"""

from fastapi import APIRouter

invoices_router = APIRouter(prefix="/invoices", tags=["Fatture Passive"])

"""
ENDPOINTS FATTURE PASSIVE:
- POST /upload                    - Upload fattura XML
- GET  /                          - Lista fatture con paginazione
- GET  /months                    - Mesi disponibili
- GET  /archived-months           - Mesi archiviati
- GET  /by-state/{state}          - Fatture per stato
- GET  /file/{invoice_id}         - Download file XML
- GET  /{invoice_id}/view-xml     - Visualizza XML
- GET  /metadata/{vat}/{num}/{date} - Metadati fattura
- POST /metadata/update           - Aggiorna metadati
- PUT  /{invoice_id}/payment-method - Metodo pagamento
- PATCH /{invoice_id}/mark-paid   - Segna come pagata
- GET  /{invoice_id}/check-in-bank-statement - Verifica in estratto conto
- PUT  /{invoice_id}/archive      - Archivia fattura
- PUT  /{invoice_id}/restore      - Ripristina fattura
- DELETE /{invoice_id}            - Elimina fattura
- DELETE /all                     - Elimina tutte
- DELETE /month/{month_year}      - Elimina per mese
- POST /delete-by-month           - Elimina per mese (POST)
- POST /delete-by-year            - Elimina per anno
- GET  /export-excel              - Esporta Excel
- POST /import-excel              - Importa Excel
- POST /upload-bulk               - Upload multiplo
- POST /migrate-cash-and-bank-registrations - Migrazione
- POST /migrate-total-iva         - Migrazione IVA
- POST /{invoice_id}/register-bank-payment - Registra pagamento banca

COLLECTIONS MONGODB:
- invoices
- invoice_metadata
- failed_invoices
- pending_invoice_photos
"""
