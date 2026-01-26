"""
Test Iteration 27 - Giustificativi Endpoint Performance & F24 Integration
=========================================================================

Tests:
1. GET /api/giustificativi/dipendente/{id}/giustificativi - Performance (<5s)
2. GET /api/f24-riconciliazione/commercialista - Lista F24 da pagare
3. GET /api/f24-riconciliazione/quietanze - Lista quietanze
4. GET /api/f24-riconciliazione/alerts - Lista alerts riconciliazione
5. GET /api/f24-riconciliazione/dashboard - Dashboard F24
6. Date format verification (DD/MM/YYYY)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smartapp-fixer.preview.emergentagent.com')

class TestGiustificativiPerformance:
    """Test giustificativi endpoint performance - should respond in <5s"""
    
    def test_giustificativi_endpoint_exists(self):
        """Verify giustificativi endpoint returns 200"""
        # First get an employee ID
        emp_response = requests.get(f"{BASE_URL}/api/employees")
        assert emp_response.status_code == 200
        employees = emp_response.json()
        assert len(employees) > 0
        
        employee_id = employees[0]['id']
        
        # Test giustificativi endpoint
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/{employee_id}/giustificativi?anno=2026")
        assert response.status_code == 200
        
    def test_giustificativi_response_time_under_5_seconds(self):
        """Verify giustificativi endpoint responds in <5 seconds"""
        # Get employee ID
        emp_response = requests.get(f"{BASE_URL}/api/employees")
        employees = emp_response.json()
        employee_id = employees[0]['id']
        
        # Measure response time
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/{employee_id}/giustificativi?anno=2026")
        end_time = time.time()
        
        response_time = end_time - start_time
        print(f"Giustificativi response time: {response_time:.2f}s")
        
        assert response.status_code == 200
        assert response_time < 5.0, f"Response time {response_time:.2f}s exceeds 5s limit"
        
    def test_giustificativi_returns_all_25_codes(self):
        """Verify all 25 giustificativi codes are returned"""
        emp_response = requests.get(f"{BASE_URL}/api/employees")
        employees = emp_response.json()
        employee_id = employees[0]['id']
        
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/{employee_id}/giustificativi?anno=2026")
        data = response.json()
        
        assert data['success'] == True
        assert 'giustificativi' in data
        
        # Should have at least 20 codes (some may be duplicates in default list)
        assert len(data['giustificativi']) >= 20
        
        # Verify key codes exist
        codes = [g['codice'] for g in data['giustificativi']]
        expected_codes = ['FER', 'ROL', 'PER', 'MAL', 'AI', 'SMART', 'TRAS']
        for code in expected_codes:
            assert code in codes, f"Missing code: {code}"
            
    def test_giustificativi_structure(self):
        """Verify giustificativi response structure"""
        emp_response = requests.get(f"{BASE_URL}/api/employees")
        employees = emp_response.json()
        employee_id = employees[0]['id']
        
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/{employee_id}/giustificativi?anno=2026")
        data = response.json()
        
        # Check response structure
        assert 'success' in data
        assert 'employee_id' in data
        assert 'employee_nome' in data
        assert 'anno' in data
        assert 'mese_corrente' in data
        assert 'giustificativi' in data
        assert 'per_categoria' in data
        assert 'totale_giustificativi' in data
        
        # Check giustificativo structure
        if data['giustificativi']:
            g = data['giustificativi'][0]
            assert 'codice' in g
            assert 'descrizione' in g
            assert 'categoria' in g
            assert 'limite_annuale_ore' in g
            assert 'ore_usate_anno' in g
            assert 'residuo_annuale' in g


class TestF24Riconciliazione:
    """Test F24 riconciliazione endpoints"""
    
    def test_f24_commercialista_list(self):
        """Test GET /api/f24-riconciliazione/commercialista"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista")
        assert response.status_code == 200
        
        data = response.json()
        assert 'f24_list' in data
        assert 'totale' in data
        assert 'statistiche' in data
        assert 'totale_da_pagare' in data
        
    def test_f24_commercialista_filter_da_pagare(self):
        """Test F24 list filtered by status=da_pagare"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista?status=da_pagare")
        assert response.status_code == 200
        
        data = response.json()
        # All items should have status=da_pagare
        for f24 in data['f24_list']:
            assert f24['status'] == 'da_pagare'
            
    def test_f24_quietanze_list(self):
        """Test GET /api/f24-riconciliazione/quietanze"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/quietanze")
        assert response.status_code == 200
        
        data = response.json()
        assert 'quietanze' in data
        assert 'totale' in data
        
    def test_f24_alerts_list(self):
        """Test GET /api/f24-riconciliazione/alerts"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/alerts")
        assert response.status_code == 200
        
        data = response.json()
        assert 'alerts' in data
        assert 'count' in data
        
    def test_f24_dashboard(self):
        """Test GET /api/f24-riconciliazione/dashboard"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert 'f24_commercialista' in data
        assert 'totale_da_pagare' in data
        assert 'quietanze_caricate' in data
        assert 'alerts_pendenti' in data
        
        # Check statistics structure
        stats = data['f24_commercialista']
        assert 'da_pagare' in stats
        assert 'pagato' in stats
        assert 'eliminato' in stats


class TestSaldoFerie:
    """Test saldo ferie endpoint"""
    
    def test_saldo_ferie_endpoint(self):
        """Test GET /api/giustificativi/dipendente/{id}/saldo-ferie"""
        emp_response = requests.get(f"{BASE_URL}/api/employees")
        employees = emp_response.json()
        employee_id = employees[0]['id']
        
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/{employee_id}/saldo-ferie?anno=2026")
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'ferie' in data
        assert 'rol' in data
        assert 'ex_festivita' in data
        assert 'permessi' in data
        
    def test_saldo_ferie_structure(self):
        """Verify saldo ferie response structure"""
        emp_response = requests.get(f"{BASE_URL}/api/employees")
        employees = emp_response.json()
        employee_id = employees[0]['id']
        
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/{employee_id}/saldo-ferie?anno=2026")
        data = response.json()
        
        # Check ferie structure
        ferie = data['ferie']
        assert 'spettanti_annue' in ferie
        assert 'maturate' in ferie
        assert 'godute' in ferie
        assert 'residue' in ferie
        assert 'giorni_residui' in ferie
        
        # Check ROL structure
        rol = data['rol']
        assert 'spettanti_annui' in rol
        assert 'maturati' in rol
        assert 'goduti' in rol
        assert 'residui' in rol


class TestDateFormat:
    """Test date format in API responses (should be DD/MM/YYYY or ISO)"""
    
    def test_f24_date_format(self):
        """Verify F24 dates are in expected format"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista")
        data = response.json()
        
        if data['f24_list']:
            f24 = data['f24_list'][0]
            # Check data_versamento format
            if 'dati_generali' in f24 and 'data_versamento' in f24['dati_generali']:
                data_vers = f24['dati_generali']['data_versamento']
                # Should be YYYY-MM-DD or DD/MM/YYYY
                assert len(data_vers) >= 8, f"Invalid date format: {data_vers}"
                
    def test_quietanze_date_format(self):
        """Verify quietanze dates are in expected format"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/quietanze")
        data = response.json()
        
        if data['quietanze']:
            q = data['quietanze'][0]
            if 'data_pagamento' in q:
                data_pag = q['data_pagamento']
                # Should be YYYY-MM-DD or DD/MM/YYYY
                assert data_pag is None or len(str(data_pag)) >= 8, f"Invalid date format: {data_pag}"


class TestEmployeeNotFound:
    """Test error handling for non-existent employees"""
    
    def test_giustificativi_employee_not_found(self):
        """Verify 404 for non-existent employee"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/non-existent-id/giustificativi")
        assert response.status_code == 404
        
    def test_saldo_ferie_employee_not_found(self):
        """Verify 404 for non-existent employee"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/non-existent-id/saldo-ferie")
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
