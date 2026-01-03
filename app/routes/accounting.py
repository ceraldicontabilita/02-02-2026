"""
Accounting Routes Module
Piano dei Conti, Categorizzazione, Report Finanziari
"""

from fastapi import APIRouter

accounting_router = APIRouter(prefix="/accounting", tags=["Contabilità"])

"""
ENDPOINTS PIANO DEI CONTI:
- POST /chart-of-accounts/initialize   - Inizializza piano conti
- GET  /chart-of-accounts              - Lista conti (albero)
- GET  /chart-of-accounts/flat         - Lista conti (piatta)
- POST /chart-of-accounts              - Crea conto
- PUT  /chart-of-accounts/{code}       - Modifica conto
- DELETE /chart-of-accounts/{code}     - Elimina conto

ENDPOINTS CATEGORIZZAZIONE:
- POST /auto-categorize/invoice/{id}   - Auto-categorizza fattura
- GET  /categorization-rules           - Lista regole
- POST /categorization-rules           - Crea regola
- DELETE /categorization-rules/{id}    - Elimina regola

ENDPOINTS REPORT:
- GET  /reports/balance-sheet          - Stato patrimoniale
- GET  /reports/income-statement       - Conto economico
- POST /reports/tax-simulation         - Simulazione fiscale

ENDPOINTS ANALISI:
- POST /analyze-bank-movement          - Analizza movimento bancario
- POST /analyze-f24                    - Analizza F24
- GET  /f24-codes                      - Codici tributo F24
- POST /analyze-omaggio                - Analizza omaggio
- POST /generate-journal-entry         - Genera scrittura contabile

ENDPOINTS F24 AVANZATI:
- POST /f24/carica-e-memorizza         - Carica e salva F24
- POST /riconcilia-movimento-con-f24   - Riconcilia con F24
- GET  /f24/in-attesa-pagamento        - F24 da pagare
- GET  /f24/da-confermare              - F24 da confermare
- POST /f24/conferma-manuale           - Conferma manuale

COLLECTIONS MONGODB:
- chart_of_accounts
- auto_categorization_rules
- journal_entries
- categorie_analitiche
"""
