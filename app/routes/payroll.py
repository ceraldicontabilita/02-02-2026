"""
Payroll Routes Module
Gestione Stipendi, Libro Unico, Prima Nota Salari
"""

from fastapi import APIRouter

payroll_router = APIRouter(prefix="/payroll", tags=["Payroll"])

"""
ENDPOINTS PAYROLL:
- GET  /payments                  - Lista pagamenti
- POST /payments/mark-paid        - Segna come pagato
- POST /payments/mark-unpaid      - Segna come non pagato
- DELETE /payments/{payment_id}   - Elimina pagamento
- DELETE /payments/clear-all      - Elimina tutti
- DELETE /test-batches/{batch_id} - Elimina batch test
- GET  /test-batches              - Lista batch test

ENDPOINTS PRIMA NOTA SALARI:
- POST /prima-nota/import-excel        - Import storico Excel
- POST /prima-nota/import-bonifici-excel - Import bonifici Excel
- GET  /prima-nota                      - Lista movimenti con saldo progressivo
- GET  /prima-nota/dipendenti           - Lista dipendenti
- DELETE /prima-nota/cleanup-old-records - Pulizia record vecchi
- PUT  /prima-nota/{record_id}/note     - Aggiorna note
- DELETE /prima-nota/delete-all         - Elimina tutto
- GET  /prima-nota/export-excel         - Esporta Excel

COLLECTIONS MONGODB:
- payroll_salaries
- payroll_payments
- payroll_attendance
- prima_nota_salari
- salary_payments
"""
