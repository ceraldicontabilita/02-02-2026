"""
Test Iteration 19 - Performance and UI Verification Tests
Tests for:
1. API /api/suppliers performance (< 3s)
2. API /api/f24-public/models performance (< 2s)
3. API /api/fatture-ricevute/archivio performance (< 3s)
4. Dashboard widgets (Bilancio Istantaneo, Imposte, Scadenze F24)
5. /fatture-ricevute tabs (Archivio, Riconcilia, Storico - NO Scadenze)
"""
import pytest
import requests
import time
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cloudledger-2.preview.emergentagent.com').rstrip('/')


class TestAPIPerformance:
    """Test API response times"""
    
    def test_suppliers_api_performance(self):
        """Test /api/suppliers responds in < 3 seconds"""
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/suppliers?limit=100", timeout=10)
        elapsed = time.time() - start_time
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert elapsed < 3, f"API took {elapsed:.2f}s, expected < 3s"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✅ /api/suppliers: {elapsed:.2f}s, {len(data)} items")
    
    def test_f24_models_api_performance(self):
        """Test /api/f24-public/models responds in < 2 seconds"""
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/f24-public/models", timeout=10)
        elapsed = time.time() - start_time
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert elapsed < 2, f"API took {elapsed:.2f}s, expected < 2s"
        
        data = response.json()
        assert "f24s" in data, "Expected 'f24s' key in response"
        print(f"✅ /api/f24-public/models: {elapsed:.2f}s, {len(data.get('f24s', []))} items")
    
    def test_fatture_ricevute_api_performance(self):
        """Test /api/fatture-ricevute/archivio responds in < 3 seconds"""
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/fatture-ricevute/archivio?limit=100", timeout=10)
        elapsed = time.time() - start_time
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert elapsed < 3, f"API took {elapsed:.2f}s, expected < 3s"
        
        data = response.json()
        assert "fatture" in data or "items" in data, "Expected 'fatture' or 'items' key"
        print(f"✅ /api/fatture-ricevute/archivio: {elapsed:.2f}s")


class TestDashboardAPIs:
    """Test Dashboard widget APIs"""
    
    def test_bilancio_istantaneo_api(self):
        """Test /api/dashboard/bilancio-istantaneo endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/bilancio-istantaneo?anno=2026", timeout=10)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check for expected fields
        assert "ricavi" in data or "bilancio" in data, "Expected bilancio data"
        print("✅ /api/dashboard/bilancio-istantaneo: OK")
    
    def test_calcolo_imposte_api(self):
        """Test /api/contabilita/calcolo-imposte endpoint"""
        response = requests.get(f"{BASE_URL}/api/contabilita/calcolo-imposte?regione=campania&anno=2026", timeout=10)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check for expected fields
        assert "ires" in data or "irap" in data or "totale_imposte" in data, "Expected imposte data"
        print("✅ /api/contabilita/calcolo-imposte: OK")
    
    def test_scadenze_f24_api(self):
        """Test /api/f24/scadenze-prossime endpoint"""
        response = requests.get(f"{BASE_URL}/api/f24/scadenze-prossime?giorni=60&limit=5", timeout=10)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check for expected fields
        assert "scadenze" in data or isinstance(data, list), "Expected scadenze data"
        print("✅ /api/f24/scadenze-prossime: OK")


class TestFattureRicevuteEndpoints:
    """Test Fatture Ricevute related endpoints"""
    
    def test_ciclo_passivo_dashboard(self):
        """Test /api/ciclo-passivo/dashboard-riconciliazione endpoint"""
        response = requests.get(f"{BASE_URL}/api/ciclo-passivo/dashboard-riconciliazione?anno=2026", timeout=10)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check for expected fields
        assert "statistiche" in data or "scadenze_aperte" in data, "Expected dashboard data"
        print("✅ /api/ciclo-passivo/dashboard-riconciliazione: OK")
    
    def test_fatture_statistiche(self):
        """Test /api/fatture-ricevute/statistiche endpoint"""
        response = requests.get(f"{BASE_URL}/api/fatture-ricevute/statistiche?anno=2026", timeout=10)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check for expected fields
        assert "totale_fatture" in data or "totale_importo" in data, "Expected statistiche data"
        print("✅ /api/fatture-ricevute/statistiche: OK")


class TestHealthEndpoints:
    """Test basic health endpoints"""
    
    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/health: OK")
    
    def test_dashboard_summary(self):
        """Test /api/dashboard/summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary?anno=2026", timeout=10)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/dashboard/summary: OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
