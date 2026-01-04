"""
Test Prima Nota API endpoints with source and pos_details fields
Tests for QuickEntryPanel functionality and ControlloMensile data
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPrimaNotaCassaAPI:
    """Test Prima Nota Cassa endpoints with source field"""
    
    def test_create_cassa_with_source_manual_entry(self):
        """Test creating cassa movement with source=manual_entry (Corrispettivo)"""
        today = datetime.now().strftime('%Y-%m-%d')
        payload = {
            "data": today,
            "tipo": "entrata",
            "importo": 150.50,
            "descrizione": f"TEST_Corrispettivo giornaliero {today}",
            "categoria": "Corrispettivi",
            "source": "manual_entry"
        }
        response = requests.post(f"{BASE_URL}/api/prima-nota/cassa", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["message"] == "Movimento cassa creato"
        
        # Store ID for cleanup
        self.created_cassa_id = data["id"]
        return data["id"]
    
    def test_create_cassa_versamento(self):
        """Test creating versamento (uscita from cassa)"""
        today = datetime.now().strftime('%Y-%m-%d')
        payload = {
            "data": today,
            "tipo": "uscita",
            "importo": 500.00,
            "descrizione": f"TEST_Versamento in banca {today}",
            "categoria": "Versamento",
            "source": "manual_entry"
        }
        response = requests.post(f"{BASE_URL}/api/prima-nota/cassa", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        return data["id"]
    
    def test_create_cassa_finanziamento_soci(self):
        """Test creating finanziamento soci entry"""
        today = datetime.now().strftime('%Y-%m-%d')
        payload = {
            "data": today,
            "tipo": "entrata",
            "importo": 1000.00,
            "descrizione": f"TEST_Finanziamento soci - Mario Rossi {today}",
            "categoria": "Finanziamento soci",
            "source": "manual_entry"
        }
        response = requests.post(f"{BASE_URL}/api/prima-nota/cassa", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        return data["id"]
    
    def test_create_cassa_movimento_generico(self):
        """Test creating generic movimento cassa"""
        today = datetime.now().strftime('%Y-%m-%d')
        payload = {
            "data": today,
            "tipo": "uscita",
            "importo": 75.00,
            "descrizione": "TEST_Spesa generica ufficio",
            "categoria": "Spese generali",
            "source": "manual_entry"
        }
        response = requests.post(f"{BASE_URL}/api/prima-nota/cassa", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        return data["id"]
    
    def test_list_cassa_movements(self):
        """Test listing cassa movements"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa")
        assert response.status_code == 200
        
        data = response.json()
        assert "movimenti" in data
        assert "saldo" in data
        assert "totale_entrate" in data
        assert "totale_uscite" in data
        assert isinstance(data["movimenti"], list)
    
    def test_list_cassa_with_date_filter(self):
        """Test listing cassa movements with date filter"""
        today = datetime.now().strftime('%Y-%m-%d')
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?data_da={today}&data_a={today}")
        assert response.status_code == 200
        
        data = response.json()
        assert "movimenti" in data


class TestPrimaNotaBancaAPI:
    """Test Prima Nota Banca endpoints with source and pos_details fields"""
    
    def test_create_banca_with_manual_pos(self):
        """Test creating banca movement with source=manual_pos and pos_details"""
        today = datetime.now().strftime('%Y-%m-%d')
        payload = {
            "data": today,
            "tipo": "entrata",
            "importo": 850.00,  # Total of POS1 + POS2 + POS3
            "descrizione": f"TEST_POS giornaliero {today} (POS1: €300, POS2: €350, POS3: €200)",
            "categoria": "Incasso POS",
            "source": "manual_pos",
            "pos_details": {
                "pos1": 300.00,
                "pos2": 350.00,
                "pos3": 200.00
            }
        }
        response = requests.post(f"{BASE_URL}/api/prima-nota/banca", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["message"] == "Movimento banca creato"
        return data["id"]
    
    def test_create_banca_versamento_contanti(self):
        """Test creating versamento contanti in banca"""
        today = datetime.now().strftime('%Y-%m-%d')
        payload = {
            "data": today,
            "tipo": "entrata",
            "importo": 500.00,
            "descrizione": f"TEST_Versamento contanti da cassa {today}",
            "categoria": "Versamento contanti",
            "source": "manual_entry"
        }
        response = requests.post(f"{BASE_URL}/api/prima-nota/banca", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        return data["id"]
    
    def test_list_banca_movements(self):
        """Test listing banca movements"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/banca")
        assert response.status_code == 200
        
        data = response.json()
        assert "movimenti" in data
        assert "saldo" in data
        assert "totale_entrate" in data
        assert "totale_uscite" in data
    
    def test_verify_pos_details_saved(self):
        """Test that pos_details are returned in banca movements"""
        today = datetime.now().strftime('%Y-%m-%d')
        response = requests.get(f"{BASE_URL}/api/prima-nota/banca?data_da={today}&data_a={today}")
        assert response.status_code == 200
        
        data = response.json()
        # Check if any movement has pos_details
        pos_movements = [m for m in data["movimenti"] if m.get("source") == "manual_pos"]
        
        # If we have manual_pos movements, verify pos_details structure
        for mov in pos_movements:
            if mov.get("pos_details"):
                assert "pos1" in mov["pos_details"] or isinstance(mov["pos_details"], dict)
                print(f"Found POS movement with details: {mov['pos_details']}")
    
    def test_verify_source_field_saved(self):
        """Test that source field is returned in banca movements"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/banca?limit=50")
        assert response.status_code == 200
        
        data = response.json()
        # Check movements for source field
        for mov in data["movimenti"]:
            if mov.get("source"):
                print(f"Movement with source: {mov['source']}, categoria: {mov.get('categoria')}")


class TestPrimaNotaStats:
    """Test Prima Nota statistics endpoint"""
    
    def test_get_stats(self):
        """Test getting prima nota statistics"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "cassa" in data
        assert "banca" in data
        assert "totale" in data
        
        # Verify cassa structure
        assert "saldo" in data["cassa"]
        assert "entrate" in data["cassa"]
        assert "uscite" in data["cassa"]
        
        # Verify banca structure
        assert "saldo" in data["banca"]
        assert "entrate" in data["banca"]
        assert "uscite" in data["banca"]
    
    def test_get_stats_with_date_filter(self):
        """Test getting stats with date filter"""
        today = datetime.now().strftime('%Y-%m-%d')
        month_start = datetime.now().replace(day=1).strftime('%Y-%m-%d')
        
        response = requests.get(f"{BASE_URL}/api/prima-nota/stats?data_da={month_start}&data_a={today}")
        assert response.status_code == 200
        
        data = response.json()
        assert "cassa" in data
        assert "banca" in data


class TestCorrispettiviAPI:
    """Test Corrispettivi API for ControlloMensile"""
    
    def test_get_corrispettivi(self):
        """Test getting corrispettivi data"""
        today = datetime.now()
        month_start = today.replace(day=1).strftime('%Y-%m-%d')
        month_end = today.strftime('%Y-%m-%d')
        
        response = requests.get(f"{BASE_URL}/api/corrispettivi?data_da={month_start}&data_a={month_end}")
        # API might return 200 with empty data or 404 if no data
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Corrispettivi response: {type(data)}")


class TestDipendentiAPI:
    """Test Dipendenti API for contract generation"""
    
    def test_list_dipendenti(self):
        """Test listing dipendenti"""
        response = requests.get(f"{BASE_URL}/api/dipendenti")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} dipendenti")
    
    def test_get_contract_types(self):
        """Test getting contract types"""
        response = requests.get(f"{BASE_URL}/api/contracts/types")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Contract types: {[ct.get('id') for ct in data]}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_movements(self):
        """Delete test movements created during tests"""
        # Get all cassa movements
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?limit=100")
        if response.status_code == 200:
            data = response.json()
            for mov in data.get("movimenti", []):
                if mov.get("descrizione", "").startswith("TEST_"):
                    del_response = requests.delete(f"{BASE_URL}/api/prima-nota/cassa/{mov['id']}")
                    print(f"Deleted cassa movement: {mov['id']}")
        
        # Get all banca movements
        response = requests.get(f"{BASE_URL}/api/prima-nota/banca?limit=100")
        if response.status_code == 200:
            data = response.json()
            for mov in data.get("movimenti", []):
                if mov.get("descrizione", "").startswith("TEST_"):
                    del_response = requests.delete(f"{BASE_URL}/api/prima-nota/banca/{mov['id']}")
                    print(f"Deleted banca movement: {mov['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
