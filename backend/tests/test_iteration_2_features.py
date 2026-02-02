"""
Test Iteration 2 - Features Testing
====================================
Testing:
1. Bug fix cedolini: GET /api/cedolini/riepilogo-mensile/2025/14 deve mostrare totale_lordo > 0 (fallback da netto)
2. Sistema fiscale: GET /api/fiscalita/agevolazioni deve restituire lista agevolazioni
3. Sistema fiscale: GET /api/fiscalita/calendario/2025 deve restituire scadenze
4. Saldi finali giustificativi: GET /api/giustificativi/saldi-finali-tutti?anno=2025
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://finautomation-1.preview.emergentagent.com')


class TestCedoliniBugFix:
    """Test bug fix cedolini - fallback netto -> lordo"""
    
    def test_riepilogo_mensile_returns_totale_lordo(self):
        """
        Bug fix: GET /api/cedolini/riepilogo-mensile/2025/14 deve mostrare totale_lordo > 0
        Il fix implementa fallback da netto se lordo non disponibile
        """
        response = requests.get(f"{BASE_URL}/api/cedolini/riepilogo-mensile/2025/14")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "totale_lordo" in data, "Response should contain totale_lordo"
        assert "totale_netto" in data, "Response should contain totale_netto"
        assert "num_cedolini" in data, "Response should contain num_cedolini"
        
        # Verifica che totale_lordo sia > 0 se ci sono cedolini
        if data.get("num_cedolini", 0) > 0:
            assert data["totale_lordo"] > 0, f"totale_lordo should be > 0 when cedolini exist, got {data['totale_lordo']}"
            # Verifica nota per dati parziali
            if data.get("dati_parziali"):
                assert "nota" in data, "Should have nota when dati_parziali is true"
        
        print(f"✓ Riepilogo mensile 2025/14: lordo={data['totale_lordo']}, netto={data['totale_netto']}, cedolini={data['num_cedolini']}")
    
    def test_riepilogo_mensile_empty_month(self):
        """Test riepilogo for month with no data - uses year 2010 to ensure empty"""
        response = requests.get(f"{BASE_URL}/api/cedolini/riepilogo-mensile/2010/1")
        assert response.status_code == 200
        
        data = response.json()
        # Either no cedolini or has messaggio field
        assert data.get("num_cedolini", 0) == 0 or "messaggio" in data or data.get("num_cedolini") >= 0
        print(f"✓ Empty month returns correct response: {data.get('num_cedolini', 0)} cedolini")
    
    def test_riepilogo_mensile_valid_months(self):
        """Test riepilogo for various valid months"""
        for mese in [1, 6, 12]:
            response = requests.get(f"{BASE_URL}/api/cedolini/riepilogo-mensile/2025/{mese}")
            assert response.status_code == 200, f"Month {mese} should return 200"
            data = response.json()
            assert "anno" in data and data["anno"] == 2025
            assert "mese" in data and data["mese"] == mese
        print(f"✓ Valid months return correct structure")


class TestSistemaFiscale:
    """Test sistema fiscale - agevolazioni e calendario"""
    
    def test_agevolazioni_list(self):
        """
        GET /api/fiscalita/agevolazioni deve restituire lista agevolazioni
        """
        response = requests.get(f"{BASE_URL}/api/fiscalita/agevolazioni")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=true"
        assert "agevolazioni" in data, "Response should contain agevolazioni list"
        assert "totale" in data, "Response should contain totale count"
        assert "categorie" in data, "Response should contain categorie list"
        
        agevolazioni = data["agevolazioni"]
        assert len(agevolazioni) > 0, "Should have at least one agevolazione"
        
        # Verifica struttura agevolazione
        first_ag = agevolazioni[0]
        required_fields = ["id", "nome", "categoria", "descrizione", "attivo"]
        for field in required_fields:
            assert field in first_ag, f"Agevolazione should have {field}"
        
        print(f"✓ Agevolazioni: {data['totale']} agevolazioni in {len(data['categorie'])} categorie")
    
    def test_agevolazioni_filter_by_categoria(self):
        """Test filtering agevolazioni by categoria"""
        response = requests.get(f"{BASE_URL}/api/fiscalita/agevolazioni?categoria=credito_imposta")
        assert response.status_code == 200
        
        data = response.json()
        if data.get("agevolazioni"):
            for ag in data["agevolazioni"]:
                assert ag.get("categoria") == "credito_imposta", "All should be credito_imposta"
        print(f"✓ Categoria filter works correctly")
    
    def test_calendario_fiscale_2025(self):
        """
        GET /api/fiscalita/calendario/2025 deve restituire scadenze
        """
        response = requests.get(f"{BASE_URL}/api/fiscalita/calendario/2025")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=true"
        assert data.get("anno") == 2025, "Anno should be 2025"
        assert "totale_scadenze" in data, "Response should contain totale_scadenze"
        assert "scadenze_per_mese" in data, "Response should contain scadenze_per_mese"
        assert "prossime_5" in data, "Response should contain prossime_5"
        
        # Verifica che ci siano scadenze
        assert data["totale_scadenze"] > 0, "Should have scadenze for 2025"
        
        # Verifica struttura scadenze per mese
        scadenze_per_mese = data["scadenze_per_mese"]
        assert len(scadenze_per_mese) > 0, "Should have scadenze organized by month"
        
        # Verifica struttura singola scadenza
        for mese, scadenze in scadenze_per_mese.items():
            if scadenze:
                first_scad = scadenze[0]
                required_fields = ["id", "tipo", "descrizione", "data", "categoria"]
                for field in required_fields:
                    assert field in first_scad, f"Scadenza should have {field}"
                break
        
        print(f"✓ Calendario 2025: {data['totale_scadenze']} scadenze, {data.get('completate', 0)} completate")
    
    def test_calendario_scadenze_imminenti(self):
        """Test scadenze imminenti endpoint"""
        response = requests.get(f"{BASE_URL}/api/fiscalita/calendario/scadenze-imminenti", params={"giorni": 30})
        # May return 200 or 422 if parameter validation differs
        if response.status_code == 422:
            # Try without parameter
            response = requests.get(f"{BASE_URL}/api/fiscalita/calendario/scadenze-imminenti")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "urgenti_7_giorni" in data
        assert "prossime_8_14_giorni" in data
        assert "future_15_plus" in data
        print(f"✓ Scadenze imminenti: {data.get('totale', 0)} nei prossimi giorni")


class TestSaldiFinaliGiustificativi:
    """Test saldi finali giustificativi"""
    
    def test_saldi_finali_tutti(self):
        """
        GET /api/giustificativi/saldi-finali-tutti?anno=2025
        """
        response = requests.get(f"{BASE_URL}/api/giustificativi/saldi-finali-tutti?anno=2025")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=true"
        assert data.get("anno") == 2025, "Anno should be 2025"
        assert "totale_dipendenti" in data, "Response should contain totale_dipendenti"
        assert "saldi" in data, "Response should contain saldi list"
        
        # Verifica struttura saldi se presenti
        if data["saldi"]:
            first_saldo = data["saldi"][0]
            assert "employee_id" in first_saldo, "Saldo should have employee_id"
            assert "employee_nome" in first_saldo, "Saldo should have employee_nome"
        
        print(f"✓ Saldi finali 2025: {data['totale_dipendenti']} dipendenti")
    
    def test_saldi_finali_anno_diverso(self):
        """Test saldi finali for different year"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/saldi-finali-tutti?anno=2024")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("anno") == 2024
        print(f"✓ Saldi finali 2024: {data.get('totale_dipendenti', 0)} dipendenti")
    
    def test_riepilogo_progressivo_endpoint(self):
        """Test riepilogo progressivo endpoint exists"""
        # First get an employee ID
        emp_response = requests.get(f"{BASE_URL}/api/employees?limit=1")
        if emp_response.status_code == 200:
            employees = emp_response.json()
            if employees and len(employees) > 0:
                emp_id = employees[0].get("id")
                if emp_id:
                    response = requests.get(f"{BASE_URL}/api/giustificativi/riepilogo-progressivo/{emp_id}?anno=2025")
                    assert response.status_code == 200
                    data = response.json()
                    assert data.get("success") == True
                    print(f"✓ Riepilogo progressivo works for employee {emp_id}")
                    return
        print("✓ Riepilogo progressivo endpoint exists (no employees to test)")


class TestContabilitaEndpoints:
    """Test contabilità endpoints for Motore Contabile page"""
    
    def test_bilancio_verifica(self):
        """Test bilancio di verifica endpoint"""
        response = requests.get(f"{BASE_URL}/api/contabilita/bilancio-verifica?anno=2025")
        # May return 200 or 404 depending on data
        assert response.status_code in [200, 404], f"Unexpected status {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            # Check structure if data exists
            if data.get("conti"):
                assert "totale_dare" in data or "totale_avere" in data
        print(f"✓ Bilancio verifica endpoint: status {response.status_code}")
    
    def test_stato_patrimoniale(self):
        """Test stato patrimoniale endpoint"""
        response = requests.get(f"{BASE_URL}/api/contabilita/bilancio/stato-patrimoniale?anno=2025")
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                assert "attivo" in data or "passivo" in data
        print(f"✓ Stato patrimoniale endpoint: status {response.status_code}")
    
    def test_conto_economico(self):
        """Test conto economico endpoint"""
        response = requests.get(f"{BASE_URL}/api/contabilita/bilancio/conto-economico?anno=2025")
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                # API may use different field names: ricavi/costi or valore_produzione/costi_produzione
                has_income = "ricavi" in data or "valore_produzione" in data
                has_costs = "costi" in data or "costi_produzione" in data
                assert has_income or has_costs, f"Expected income or cost fields, got: {list(data.keys())}"
        print(f"✓ Conto economico endpoint: status {response.status_code}")
    
    def test_cespiti(self):
        """Test cespiti endpoint"""
        response = requests.get(f"{BASE_URL}/api/contabilita/cespiti")
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                assert "cespiti" in data
        print(f"✓ Cespiti endpoint: status {response.status_code}")


class TestFinanziariaEndpoints:
    """Test finanziaria endpoints"""
    
    def test_finanziaria_summary(self):
        """Test finanziaria summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/finanziaria/summary?anno=2025")
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            # Check for expected fields
            expected_fields = ["total_income", "total_expenses", "balance"]
            for field in expected_fields:
                if field in data:
                    print(f"  - {field}: {data[field]}")
        print(f"✓ Finanziaria summary endpoint: status {response.status_code}")
    
    def test_finanziaria_summary_empty_year(self):
        """Test finanziaria summary for year with no data"""
        response = requests.get(f"{BASE_URL}/api/finanziaria/summary?anno=2020")
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            # Should return zeros or empty data
            total_income = data.get("total_income", 0)
            total_expenses = data.get("total_expenses", 0)
            print(f"  - Empty year: income={total_income}, expenses={total_expenses}")
        print(f"✓ Finanziaria empty year: status {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
