"""
HACCP Routes Module
Questo modulo organizza tutti gli endpoint HACCP

Per ora importa da server.py, in futuro conterrà la logica direttamente.
"""

from fastapi import APIRouter

# Router dedicato per HACCP
haccp_router = APIRouter(prefix="/haccp", tags=["HACCP"])

# Le route sono attualmente in server.py
# Questo file serve come documentazione e punto di partenza
# per la futura migrazione

"""
ENDPOINTS HACCP TEMPERATURES:
- GET  /temperatures
- POST /temperatures
- PUT  /temperatures/{reading_id}
- DELETE /temperatures/{reading_id}
- DELETE /temperatures/delete-day/{date}
- DELETE /temperatures/delete-month/{month_year}
- GET  /temperatures/export-xlsx
- POST /temperatures/import-xlsx
- GET  /temperatures/{month_year}/pdf
- POST /temperatures/autofill-today
- GET  /equipment
- PUT  /equipment

ENDPOINTS HACCP SANIFICAZIONI:
- GET  /sanifications
- POST /sanifications
- DELETE /sanifications/{record_id}
- DELETE /sanifications/delete-all
- DELETE /sanifications/delete-month/{month_year}
- GET  /sanifications/{month_year}/pdf

ENDPOINTS HACCP DISINFESTAZIONI:
- GET  /disinfestations
- POST /disinfestations
- PUT  /disinfestations/{record_id}
- DELETE /disinfestations/{record_id}

ENDPOINTS HACCP TRACCIABILITA:
- GET  /traceability
- POST /traceability
- DELETE /traceability/{record_id}
- GET  /traceability/export/pdf
- GET  /traceability/{record_id}/pdf
- GET  /traceability/{record_id}/label

ENDPOINTS HACCP EMPLOYEES:
- GET  /employees
- POST /employees
- PUT  /employees/{employee_id}
- DELETE /employees/{employee_id}
- GET  /libretti-sanitari

ENDPOINTS HACCP LIBRO UNICO:
- POST /libro-unico/upload
- POST /libro-unico/fetch-from-gmail
- GET  /libro-unico/presenze
- GET  /libro-unico/salaries
- DELETE /libro-unico/presenze/{presenza_id}
- DELETE /libro-unico/salaries/{salary_id}
- PUT  /libro-unico/salaries/{salary_id}
- GET  /libro-unico/export-excel
- GET  /libro-unico/pdf/{dipendente_nome}/{month_year}

ENDPOINTS HACCP PRODUCT MAPPINGS:
- GET  /product-mappings
- POST /product-mappings
- DELETE /product-mappings/{mapping_id}
- POST /product-mappings/generate-auto
"""
