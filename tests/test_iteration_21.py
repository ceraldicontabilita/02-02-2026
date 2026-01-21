"""
Iteration 21 - Testing Verbali Riconciliazione, Riconciliazione Smart, and related APIs
"""
import pytest
import requests
import time
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://docfix-italia.preview.emergentagent.com').rstrip('/')

class TestVerbaliRiconciliazioneAPI:
    """Test Verbali Riconciliazione endpoints"""
    
    def test_verbali_dashboard(self):
        """Test /api/verbali-riconciliazione/dashboard returns stats"""
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/dashboard", timeout=30)
        elapsed = time.time() - start
        
        print(f"Dashboard response time: {elapsed:.2f}s")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, "Dashboard should return success=True"
        assert "riepilogo" in data, "Response should have 'riepilogo' field"
        
        riepilogo = data["riepilogo"]
        assert "totale_verbali" in riepilogo, "Riepilogo should have totale_verbali"
        assert "da_riconciliare" in riepilogo, "Riepilogo should have da_riconciliare"
        assert "per_stato" in riepilogo, "Riepilogo should have per_stato"
        
        print(f"✅ Dashboard: {riepilogo['totale_verbali']} verbali totali, {riepilogo['da_riconciliare']} da riconciliare")
        
    def test_verbali_lista(self):
        """Test /api/verbali-riconciliazione/lista returns list of verbali"""
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/lista", timeout=30)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert "verbali" in data, "Response should have 'verbali' field"
        assert "totale" in data, "Response should have 'totale' field"
        
        print(f"✅ Lista verbali: {data['totale']} verbali trovati")
        
    def test_verbali_lista_filtro_stato(self):
        """Test /api/verbali-riconciliazione/lista with stato filter"""
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/lista?stato=salvato", timeout=30)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "verbali" in data, "Response should have 'verbali' field"
        
        print(f"✅ Lista verbali con filtro stato=salvato: {data['totale']} verbali")
        
    def test_verbali_lista_filtro_targa(self):
        """Test /api/verbali-riconciliazione/lista with targa filter"""
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/lista?targa=GE", timeout=30)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "verbali" in data, "Response should have 'verbali' field"
        
        print(f"✅ Lista verbali con filtro targa=GE: {data['totale']} verbali")
        
    def test_scan_fatture_verbali(self):
        """Test /api/verbali-riconciliazione/scan-fatture-verbali scans invoices"""
        response = requests.post(f"{BASE_URL}/api/verbali-riconciliazione/scan-fatture-verbali", timeout=60)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert "fatture_analizzate" in data, "Response should have 'fatture_analizzate' field"
        assert "verbali_trovati" in data, "Response should have 'verbali_trovati' field"
        assert "associazioni_create" in data, "Response should have 'associazioni_create' field"
        
        print(f"✅ Scan fatture: {data['fatture_analizzate']} analizzate, {data['verbali_trovati']} verbali trovati, {data['associazioni_create']} associazioni create")


class TestRiconciliazioneSmartAPI:
    """Test Riconciliazione Smart endpoints - PERFORMANCE CRITICAL"""
    
    def test_cerca_stipendi_performance(self):
        """Test /api/operazioni-da-confermare/smart/cerca-stipendi responds in < 2 seconds"""
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/operazioni-da-confermare/smart/cerca-stipendi", timeout=30)
        elapsed = time.time() - start
        
        print(f"cerca-stipendi response time: {elapsed:.2f}s")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert elapsed < 2.0, f"cerca-stipendi should respond in < 2s, took {elapsed:.2f}s"
        
        data = response.json()
        assert "stipendi" in data, "Response should have 'stipendi' field"
        
        print(f"✅ cerca-stipendi: {len(data['stipendi'])} stipendi trovati in {elapsed:.2f}s")
        
    def test_banca_veloce_performance(self):
        """Test /api/operazioni-da-confermare/smart/banca-veloce responds quickly"""
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/operazioni-da-confermare/smart/banca-veloce?limit=50", timeout=30)
        elapsed = time.time() - start
        
        print(f"banca-veloce response time: {elapsed:.2f}s")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert elapsed < 5.0, f"banca-veloce should respond in < 5s, took {elapsed:.2f}s"
        
        data = response.json()
        assert "movimenti" in data, "Response should have 'movimenti' field"
        assert "stats" in data, "Response should have 'stats' field"
        
        print(f"✅ banca-veloce: {len(data['movimenti'])} movimenti in {elapsed:.2f}s")


class TestPrimaNotaAPI:
    """Test Prima Nota endpoints"""
    
    def test_analisi_movimenti_bancari_errati(self):
        """Test /api/prima-nota/cassa/analisi-movimenti-bancari-errati returns 0 erroneous movements"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa/analisi-movimenti-bancari-errati", timeout=30)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "movimenti_bancari_errati" in data, "Response should have 'movimenti_bancari_errati' field"
        
        errati = data["movimenti_bancari_errati"]
        print(f"Movimenti bancari errati in cassa: {errati}")
        
        # According to the context, 1503 records were deleted, so should be 0 now
        assert errati == 0, f"Expected 0 erroneous movements, got {errati}"
        
        print(f"✅ Analisi movimenti bancari errati: {errati} (corretto - tutti eliminati)")


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✅ API health check passed")
        
    def test_aruba_pendenti(self):
        """Test /api/operazioni-da-confermare/aruba-pendenti"""
        response = requests.get(f"{BASE_URL}/api/operazioni-da-confermare/aruba-pendenti", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "operazioni" in data, "Response should have 'operazioni' field"
        print(f"✅ Aruba pendenti: {len(data['operazioni'])} operazioni")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
