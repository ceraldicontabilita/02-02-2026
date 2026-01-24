"""
Test Suite for Iteration 23 - Attendance, Accounting Engine, and Extended Riconciliazione
==========================================================================================

Tests for:
1. Attendance System (Sistema Presenze)
   - GET /api/attendance/dashboard-presenze
   - POST /api/attendance/timbratura
   - POST /api/attendance/richiesta-assenza
   - PUT /api/attendance/richiesta-assenza/{id}/approva
   - GET /api/attendance/richieste-pending

2. Accounting Engine (Motore Contabile)
   - GET /api/accounting-engine/statistiche-contabili
   - GET /api/accounting-engine/piano-conti
   - GET /api/accounting-engine/regole-contabili
   - GET /api/accounting-engine/bilancio-verifica

3. Extended Riconciliazione Intelligente (Casi 19-35)
   - POST /api/riconciliazione-intelligente/pagamento-parziale
   - POST /api/riconciliazione-intelligente/applica-nota-credito
   - POST /api/riconciliazione-intelligente/pagamento-con-sconto
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def test_employee_id(api_client):
    """Get a valid employee ID for testing"""
    response = api_client.get(f"{BASE_URL}/api/employees?limit=1")
    if response.status_code == 200:
        data = response.json()
        employees = data.get("employees", data) if isinstance(data, dict) else data
        if employees and len(employees) > 0:
            return employees[0].get("id")
    pytest.skip("No employees available for testing")


@pytest.fixture(scope="module")
def test_fattura_id(api_client):
    """Get a valid fattura ID for testing extended riconciliazione"""
    response = api_client.get(f"{BASE_URL}/api/riconciliazione-intelligente/fatture-da-confermare?limit=1")
    if response.status_code == 200:
        data = response.json()
        fatture = data.get("fatture", [])
        if fatture and len(fatture) > 0:
            return fatture[0].get("id")
    # Try to get any invoice
    response = api_client.get(f"{BASE_URL}/api/invoices?limit=1")
    if response.status_code == 200:
        data = response.json()
        invoices = data.get("invoices", [])
        if invoices and len(invoices) > 0:
            return invoices[0].get("id")
    return None


# =============================================================================
# ATTENDANCE SYSTEM TESTS
# =============================================================================

class TestAttendanceDashboard:
    """Tests for GET /api/attendance/dashboard-presenze"""
    
    def test_dashboard_presenze_returns_200(self, api_client):
        """Dashboard presenze should return 200"""
        response = api_client.get(f"{BASE_URL}/api/attendance/dashboard-presenze")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_dashboard_presenze_structure(self, api_client):
        """Dashboard should have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/attendance/dashboard-presenze")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "success" in data
        assert data["success"] == True
        assert "data" in data
        assert "riepilogo" in data
        
        # Check riepilogo structure
        riepilogo = data.get("riepilogo", {})
        assert "totale_dipendenti" in riepilogo
        assert "presenti" in riepilogo
        assert "assenti" in riepilogo
        assert "non_timbrato" in riepilogo
        
    def test_dashboard_presenze_with_date(self, api_client):
        """Dashboard should accept date parameter"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = api_client.get(f"{BASE_URL}/api/attendance/dashboard-presenze?data={today}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("data") == today
        
    def test_dashboard_presenze_lists(self, api_client):
        """Dashboard should return presenti, assenti, non_timbrato lists"""
        response = api_client.get(f"{BASE_URL}/api/attendance/dashboard-presenze")
        assert response.status_code == 200
        data = response.json()
        
        # Lists should exist (can be empty)
        assert "presenti" in data
        assert "assenti" in data
        assert "non_timbrato" in data
        assert isinstance(data["presenti"], list)
        assert isinstance(data["assenti"], list)
        assert isinstance(data["non_timbrato"], list)


class TestTimbratura:
    """Tests for POST /api/attendance/timbratura"""
    
    def test_timbratura_requires_employee_id(self, api_client):
        """Timbratura should require employee_id"""
        response = api_client.post(
            f"{BASE_URL}/api/attendance/timbratura",
            json={"tipo": "entrata"}
        )
        assert response.status_code == 400
        
    def test_timbratura_requires_valid_tipo(self, api_client, test_employee_id):
        """Timbratura should require valid tipo"""
        if not test_employee_id:
            pytest.skip("No employee available")
        response = api_client.post(
            f"{BASE_URL}/api/attendance/timbratura",
            json={"employee_id": test_employee_id, "tipo": "invalid_tipo"}
        )
        assert response.status_code == 400
        
    def test_timbratura_entrata_success(self, api_client, test_employee_id):
        """Timbratura entrata should succeed"""
        if not test_employee_id:
            pytest.skip("No employee available")
        response = api_client.post(
            f"{BASE_URL}/api/attendance/timbratura",
            json={
                "employee_id": test_employee_id,
                "tipo": "entrata"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "timbratura_id" in data
        assert data.get("tipo") == "entrata"
        
    def test_timbratura_uscita_success(self, api_client, test_employee_id):
        """Timbratura uscita should succeed"""
        if not test_employee_id:
            pytest.skip("No employee available")
        response = api_client.post(
            f"{BASE_URL}/api/attendance/timbratura",
            json={
                "employee_id": test_employee_id,
                "tipo": "uscita"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("tipo") == "uscita"
        
    def test_timbratura_invalid_employee(self, api_client):
        """Timbratura with invalid employee should fail"""
        response = api_client.post(
            f"{BASE_URL}/api/attendance/timbratura",
            json={
                "employee_id": "non-existent-id",
                "tipo": "entrata"
            }
        )
        assert response.status_code == 404


class TestRichiestaAssenza:
    """Tests for POST /api/attendance/richiesta-assenza"""
    
    def test_richiesta_assenza_requires_fields(self, api_client):
        """Richiesta assenza should require mandatory fields"""
        response = api_client.post(
            f"{BASE_URL}/api/attendance/richiesta-assenza",
            json={"tipo": "ferie"}
        )
        assert response.status_code == 400
        
    def test_richiesta_assenza_success(self, api_client, test_employee_id):
        """Richiesta assenza should succeed with valid data"""
        if not test_employee_id:
            pytest.skip("No employee available")
            
        # Use future dates to avoid conflicts
        start_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=32)).strftime("%Y-%m-%d")
        
        response = api_client.post(
            f"{BASE_URL}/api/attendance/richiesta-assenza",
            json={
                "employee_id": test_employee_id,
                "tipo": "ferie",
                "data_inizio": start_date,
                "data_fine": end_date,
                "motivo": "TEST - Vacanza estiva"
            }
        )
        # May fail if overlapping request exists
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "richiesta_id" in data
            assert data.get("tipo") == "ferie"
            assert "giorni_totali" in data
        else:
            # 400 is acceptable if overlapping
            assert response.status_code == 400
            
    def test_richiesta_assenza_invalid_dates(self, api_client, test_employee_id):
        """Richiesta with end date before start should fail"""
        if not test_employee_id:
            pytest.skip("No employee available")
        response = api_client.post(
            f"{BASE_URL}/api/attendance/richiesta-assenza",
            json={
                "employee_id": test_employee_id,
                "tipo": "ferie",
                "data_inizio": "2026-01-30",
                "data_fine": "2026-01-25"
            }
        )
        assert response.status_code == 400


class TestRichiestePending:
    """Tests for GET /api/attendance/richieste-pending"""
    
    def test_richieste_pending_returns_200(self, api_client):
        """Richieste pending should return 200"""
        response = api_client.get(f"{BASE_URL}/api/attendance/richieste-pending")
        assert response.status_code == 200
        
    def test_richieste_pending_structure(self, api_client):
        """Richieste pending should have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/attendance/richieste-pending")
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert "count" in data
        assert "richieste" in data
        assert isinstance(data["richieste"], list)


class TestApprovaRichiesta:
    """Tests for PUT /api/attendance/richiesta-assenza/{id}/approva"""
    
    def test_approva_invalid_id(self, api_client):
        """Approva with invalid ID should return 404"""
        response = api_client.put(
            f"{BASE_URL}/api/attendance/richiesta-assenza/non-existent-id/approva",
            json={}
        )
        assert response.status_code == 404


# =============================================================================
# ACCOUNTING ENGINE TESTS
# =============================================================================

class TestAccountingEngineStatistiche:
    """Tests for GET /api/accounting-engine/statistiche-contabili"""
    
    def test_statistiche_contabili_returns_200(self, api_client):
        """Statistiche contabili should return 200"""
        response = api_client.get(f"{BASE_URL}/api/accounting-engine/statistiche-contabili")
        assert response.status_code == 200
        
    def test_statistiche_contabili_structure(self, api_client):
        """Statistiche should have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/accounting-engine/statistiche-contabili")
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        assert "totale_scritture" in data
        assert "scritture_valide" in data
        assert "scritture_stornate" in data
        assert "per_tipo_operazione" in data
        assert "per_prima_nota" in data


class TestPianoConti:
    """Tests for GET /api/accounting-engine/piano-conti"""
    
    def test_piano_conti_returns_200(self, api_client):
        """Piano conti should return 200"""
        response = api_client.get(f"{BASE_URL}/api/accounting-engine/piano-conti")
        assert response.status_code == 200
        
    def test_piano_conti_structure(self, api_client):
        """Piano conti should have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/accounting-engine/piano-conti")
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert "piano_conti" in data
        assert "totale" in data
        assert isinstance(data["piano_conti"], list)
        
        # Check conto structure
        if data["piano_conti"]:
            conto = data["piano_conti"][0]
            assert "codice" in conto
            assert "nome" in conto
            assert "tipo" in conto


class TestRegoleContabili:
    """Tests for GET /api/accounting-engine/regole-contabili"""
    
    def test_regole_contabili_returns_200(self, api_client):
        """Regole contabili should return 200"""
        response = api_client.get(f"{BASE_URL}/api/accounting-engine/regole-contabili")
        assert response.status_code == 200
        
    def test_regole_contabili_structure(self, api_client):
        """Regole should have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/accounting-engine/regole-contabili")
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert "regole" in data
        assert "totale" in data
        
        # Check regola structure
        if data["regole"]:
            regola = data["regole"][0]
            assert "tipo" in regola
            assert "descrizione" in regola
            assert "conto_dare" in regola
            assert "conto_avere" in regola


class TestBilancioVerifica:
    """Tests for GET /api/accounting-engine/bilancio-verifica"""
    
    def test_bilancio_verifica_returns_200(self, api_client):
        """Bilancio verifica should return 200"""
        response = api_client.get(f"{BASE_URL}/api/accounting-engine/bilancio-verifica")
        assert response.status_code == 200
        
    def test_bilancio_verifica_structure(self, api_client):
        """Bilancio should have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/accounting-engine/bilancio-verifica")
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert "bilancio" in data
        assert "totale_dare" in data
        assert "totale_avere" in data
        assert "quadratura" in data


# =============================================================================
# EXTENDED RICONCILIAZIONE TESTS (Casi 19-35)
# =============================================================================

class TestPagamentoParziale:
    """Tests for POST /api/riconciliazione-intelligente/pagamento-parziale"""
    
    def test_pagamento_parziale_requires_fields(self, api_client):
        """Pagamento parziale should require mandatory fields"""
        response = api_client.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/pagamento-parziale",
            json={"fattura_id": "test"}
        )
        assert response.status_code == 400
        
    def test_pagamento_parziale_invalid_fattura(self, api_client):
        """Pagamento parziale with invalid fattura should fail"""
        response = api_client.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/pagamento-parziale",
            json={
                "fattura_id": "non-existent-id",
                "importo_pagato": 500.00,
                "metodo": "cassa"
            }
        )
        assert response.status_code == 400
        
    def test_pagamento_parziale_invalid_metodo(self, api_client, test_fattura_id):
        """Pagamento parziale with invalid metodo should fail"""
        if not test_fattura_id:
            pytest.skip("No fattura available")
        response = api_client.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/pagamento-parziale",
            json={
                "fattura_id": test_fattura_id,
                "importo_pagato": 500.00,
                "metodo": "invalid"
            }
        )
        assert response.status_code == 400


class TestApplicaNotaCredito:
    """Tests for POST /api/riconciliazione-intelligente/applica-nota-credito"""
    
    def test_applica_nc_requires_fattura_id(self, api_client):
        """Applica NC should require fattura_id"""
        response = api_client.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/applica-nota-credito",
            json={"importo_nc": 100.00}
        )
        assert response.status_code == 400
        
    def test_applica_nc_invalid_fattura(self, api_client):
        """Applica NC with invalid fattura should fail"""
        response = api_client.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/applica-nota-credito",
            json={
                "fattura_id": "non-existent-id",
                "importo_nc": 100.00,
                "numero_nc": "NC/TEST/001"
            }
        )
        assert response.status_code == 400


class TestPagamentoConSconto:
    """Tests for POST /api/riconciliazione-intelligente/pagamento-con-sconto"""
    
    def test_pagamento_sconto_requires_fields(self, api_client):
        """Pagamento con sconto should require mandatory fields"""
        response = api_client.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/pagamento-con-sconto",
            json={"fattura_id": "test"}
        )
        assert response.status_code == 400
        
    def test_pagamento_sconto_invalid_fattura(self, api_client):
        """Pagamento con sconto with invalid fattura should fail"""
        response = api_client.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/pagamento-con-sconto",
            json={
                "fattura_id": "non-existent-id",
                "importo_pagato": 980.00,
                "metodo": "banca"
            }
        )
        assert response.status_code == 400
        
    def test_pagamento_sconto_invalid_metodo(self, api_client, test_fattura_id):
        """Pagamento con sconto with invalid metodo should fail"""
        if not test_fattura_id:
            pytest.skip("No fattura available")
        response = api_client.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/pagamento-con-sconto",
            json={
                "fattura_id": test_fattura_id,
                "importo_pagato": 980.00,
                "metodo": "invalid"
            }
        )
        assert response.status_code == 400


# =============================================================================
# INTEGRATION TESTS
# =============================================================================

class TestEmployeesEndpoint:
    """Tests for GET /api/employees (used by Attendance UI)"""
    
    def test_employees_returns_200(self, api_client):
        """Employees endpoint should return 200"""
        response = api_client.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200
        
    def test_employees_returns_list(self, api_client):
        """Employees should return a list"""
        response = api_client.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200
        data = response.json()
        
        # Can be either {"employees": [...]} or direct list
        employees = data.get("employees", data) if isinstance(data, dict) else data
        assert isinstance(employees, list)
        
    def test_employees_count(self, api_client):
        """Should have employees (34 expected per context)"""
        response = api_client.get(f"{BASE_URL}/api/employees?limit=200")
        assert response.status_code == 200
        data = response.json()
        employees = data.get("employees", data) if isinstance(data, dict) else data
        # At least some employees should exist
        assert len(employees) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
