"""
Test Iteration 24 - In Carico Flag for Attendance Module
=========================================================

Tests for:
1. GET /api/attendance/dipendenti-in-carico - List employees with in_carico field
2. PUT /api/attendance/set-in-carico/{employee_id} - Modify in_carico flag
3. Attendance page filtering by in_carico
4. In Carico toggle in Gestione Dipendenti (Anagrafica tab)
5. Storico Ore tab in Attendance
6. Cedolini page functionality
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://code-cleanup-105.preview.emergentagent.com')


class TestDipendentiInCarico:
    """Tests for dipendenti-in-carico endpoint"""
    
    def test_get_dipendenti_in_carico(self):
        """Test GET /api/attendance/dipendenti-in-carico returns list with in_carico field"""
        response = requests.get(f"{BASE_URL}/api/attendance/dipendenti-in-carico")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "totale" in data
        assert "in_carico" in data
        assert "non_in_carico" in data
        assert "dipendenti" in data
        
        # Verify dipendenti have in_carico field
        if data["dipendenti"]:
            first_dip = data["dipendenti"][0]
            assert "in_carico" in first_dip
            assert "nome_completo" in first_dip or "nome" in first_dip
            assert "id" in first_dip
        
        print(f"✅ dipendenti-in-carico: totale={data['totale']}, in_carico={data['in_carico']}, non_in_carico={data['non_in_carico']}")


class TestSetInCarico:
    """Tests for set-in-carico endpoint"""
    
    @pytest.fixture
    def employee_id(self):
        """Get a valid employee ID for testing"""
        response = requests.get(f"{BASE_URL}/api/employees?limit=1")
        assert response.status_code == 200
        data = response.json()
        employees = data if isinstance(data, list) else data.get('employees', data)
        assert len(employees) > 0
        return employees[0].get('id')
    
    def test_set_in_carico_false(self, employee_id):
        """Test PUT /api/attendance/set-in-carico/{employee_id} - set to false"""
        response = requests.put(
            f"{BASE_URL}/api/attendance/set-in-carico/{employee_id}",
            json={"in_carico": False}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("employee_id") == employee_id
        assert data.get("in_carico") == False
        
        print(f"✅ set-in-carico to false: employee_id={employee_id}")
    
    def test_set_in_carico_true(self, employee_id):
        """Test PUT /api/attendance/set-in-carico/{employee_id} - set to true"""
        response = requests.put(
            f"{BASE_URL}/api/attendance/set-in-carico/{employee_id}",
            json={"in_carico": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("employee_id") == employee_id
        assert data.get("in_carico") == True
        
        print(f"✅ set-in-carico to true: employee_id={employee_id}")
    
    def test_set_in_carico_invalid_employee(self):
        """Test PUT /api/attendance/set-in-carico with invalid employee_id"""
        response = requests.put(
            f"{BASE_URL}/api/attendance/set-in-carico/invalid-id-12345",
            json={"in_carico": True}
        )
        
        assert response.status_code == 404
        print("✅ set-in-carico returns 404 for invalid employee")


class TestDashboardPresenzeFiltering:
    """Tests for dashboard-presenze filtering by in_carico"""
    
    def test_dashboard_presenze_filters_by_in_carico(self):
        """Test GET /api/attendance/dashboard-presenze filters by in_carico"""
        response = requests.get(f"{BASE_URL}/api/attendance/dashboard-presenze")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "riepilogo" in data
        assert "totale_dipendenti" in data["riepilogo"]
        
        # The count should match dipendenti-in-carico count
        in_carico_response = requests.get(f"{BASE_URL}/api/attendance/dipendenti-in-carico")
        in_carico_data = in_carico_response.json()
        
        # Dashboard should show only in_carico employees
        assert data["riepilogo"]["totale_dipendenti"] == in_carico_data["in_carico"]
        
        print(f"✅ dashboard-presenze filters correctly: {data['riepilogo']['totale_dipendenti']} dipendenti")


class TestStoricoOre:
    """Tests for Storico Ore functionality"""
    
    @pytest.fixture
    def employee_id(self):
        """Get a valid employee ID for testing"""
        response = requests.get(f"{BASE_URL}/api/employees?limit=1")
        assert response.status_code == 200
        data = response.json()
        employees = data if isinstance(data, list) else data.get('employees', data)
        assert len(employees) > 0
        return employees[0].get('id')
    
    def test_ore_lavorate_endpoint(self, employee_id):
        """Test GET /api/attendance/ore-lavorate/{employee_id}"""
        response = requests.get(
            f"{BASE_URL}/api/attendance/ore-lavorate/{employee_id}",
            params={"mese": 1, "anno": 2026}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "riepilogo" in data
        assert "giorni_lavorati" in data["riepilogo"]
        assert "ore_totali" in data["riepilogo"]
        assert "ore_ordinarie" in data["riepilogo"]
        assert "ore_straordinario" in data["riepilogo"]
        
        print(f"✅ ore-lavorate: giorni={data['riepilogo']['giorni_lavorati']}, ore={data['riepilogo']['ore_totali']}")


class TestCedolini:
    """Tests for Cedolini page functionality"""
    
    def test_get_cedolini(self):
        """Test GET /api/cedolini returns cedolini list"""
        response = requests.get(f"{BASE_URL}/api/cedolini", params={"anno": 2026})
        
        assert response.status_code == 200
        data = response.json()
        
        cedolini = data.get("cedolini", data) if isinstance(data, dict) else data
        assert isinstance(cedolini, list)
        
        if cedolini:
            first_cedolino = cedolini[0]
            assert "dipendente_id" in first_cedolino or "employee_id" in first_cedolino
            assert "mese" in first_cedolino
            assert "anno" in first_cedolino
            assert "netto" in first_cedolino or "netto_mese" in first_cedolino
        
        print(f"✅ cedolini: {len(cedolini)} cedolini found for 2026")
    
    def test_get_cedolini_2025(self):
        """Test GET /api/cedolini for 2025"""
        response = requests.get(f"{BASE_URL}/api/cedolini", params={"anno": 2025})
        
        assert response.status_code == 200
        data = response.json()
        
        cedolini = data.get("cedolini", data) if isinstance(data, dict) else data
        assert isinstance(cedolini, list)
        
        print(f"✅ cedolini 2025: {len(cedolini)} cedolini found")


class TestEmployeesInCaricoField:
    """Tests for in_carico field in employees"""
    
    def test_create_employee_with_in_carico(self):
        """Test POST /api/dipendenti creates employee with in_carico=true by default"""
        import uuid
        
        test_cf = f"TEST{uuid.uuid4().hex[:12].upper()}"
        
        response = requests.post(
            f"{BASE_URL}/api/dipendenti",
            json={
                "nome_completo": f"Test InCarico {test_cf[:6]}",
                "codice_fiscale": test_cf
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # New employees should have in_carico=true by default
        assert data.get("in_carico") == True
        
        # Cleanup - delete test employee
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/dipendenti/{data['id']}")
        
        print("✅ New employee created with in_carico=true by default")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
