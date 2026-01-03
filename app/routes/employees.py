"""
Employees Routes Module
Gestione Dipendenti e Contratti
"""

from fastapi import APIRouter

employees_router = APIRouter(prefix="/employees", tags=["Dipendenti"])

"""
ENDPOINTS DIPENDENTI:
- GET  /                           - Lista dipendenti
- GET  /{employee_id}              - Dettaglio dipendente
- POST /                           - Crea dipendente
- PUT  /{employee_id}              - Modifica dipendente
- DELETE /{employee_id}            - Elimina dipendente
- POST /import-from-excel          - Import da Excel

ENDPOINTS CONTRATTI:
- POST /{employee_id}/contracts/generate    - Genera contratto
- GET  /{employee_id}/contracts             - Lista contratti
- GET  /contracts/{contract_id}/download    - Download contratto
- POST /contracts/{contract_id}/send-for-signature - Invia per firma
- DELETE /contracts/{contract_id}           - Elimina contratto

ENDPOINTS DIZIONARIO:
- GET  /dictionary/all             - Dizionario completo
- POST /restore-from-dictionary    - Ripristina da dizionario

⚠️ NOTA: Esistono endpoint duplicati in /api/haccp/employees
         Da consolidare in futuro

COLLECTIONS MONGODB:
- staff
- employees
- employee_dictionary
- employee_documents
- employee_history
"""
