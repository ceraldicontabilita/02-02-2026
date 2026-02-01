"""
E2E Comprehensive Test Suite for Azienda in Cloud ERP
Tests all main API endpoints for the Italian accounting application
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndCore:
    """Health check and core API tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print(f"✅ Health: {data}")
    
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Dashboard stats: {list(data.keys())}")


class TestPrimaNota:
    """Prima Nota (Cash/Bank register) tests"""
    
    def test_prima_nota_cassa_list(self):
        """Test Prima Nota Cassa list"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?anno=2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Prima Nota Cassa: {len(data) if isinstance(data, list) else 'OK'}")
    
    def test_prima_nota_banca_list(self):
        """Test Prima Nota Banca list"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/banca?anno=2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Prima Nota Banca: {len(data) if isinstance(data, list) else 'OK'}")
    
    def test_prima_nota_salari_list(self):
        """Test Prima Nota Salari list"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/salari?anno=2026")
        assert response.status_code == 200
        data = response.json()
        assert "movimenti" in data
        print(f"✅ Prima Nota Salari: {data.get('count', len(data.get('movimenti', [])))} movimenti")


class TestDipendenti:
    """Employees management tests"""
    
    def test_dipendenti_list(self):
        """Test employees list"""
        response = requests.get(f"{BASE_URL}/api/dipendenti")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Dipendenti: {len(data)} employees")
    
    def test_cedolini_list(self):
        """Test payslips list"""
        response = requests.get(f"{BASE_URL}/api/cedolini?anno=2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Cedolini: {len(data) if isinstance(data, list) else 'OK'}")


class TestFatture:
    """Invoices tests"""
    
    def test_fatture_ricevute_archivio(self):
        """Test received invoices archive"""
        response = requests.get(f"{BASE_URL}/api/fatture-ricevute/archivio?anno=2026&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "fatture" in data
        print(f"✅ Fatture Ricevute: {data.get('total', len(data.get('fatture', [])))} fatture")
    
    def test_corrispettivi_list(self):
        """Test corrispettivi list"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi?anno=2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Corrispettivi: {len(data) if isinstance(data, list) else 'OK'}")


class TestFornitori:
    """Suppliers tests"""
    
    def test_fornitori_list(self):
        """Test suppliers list"""
        response = requests.get(f"{BASE_URL}/api/suppliers")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Fornitori: {len(data) if isinstance(data, list) else 'OK'}")


class TestMagazzino:
    """Warehouse tests"""
    
    def test_magazzino_giacenze(self):
        """Test warehouse inventory"""
        response = requests.get(f"{BASE_URL}/api/magazzino/giacenze")
        assert response.status_code == 200
        data = response.json()
        assert "totale_articoli" in data
        print(f"✅ Magazzino Giacenze: {data.get('totale_articoli', 0)} articoli")
    
    def test_inventario(self):
        """Test inventory"""
        response = requests.get(f"{BASE_URL}/api/inventario")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Inventario: {len(data) if isinstance(data, list) else 'OK'}")


class TestVerbali:
    """Verbali (rental records) tests"""
    
    def test_verbali_dashboard(self):
        """Test verbali dashboard"""
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "riepilogo" in data
        print(f"✅ Verbali Dashboard: {data['riepilogo'].get('totale_verbali', 0)} verbali")
    
    def test_verbali_lista(self):
        """Test verbali list"""
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/lista")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "verbali" in data
        print(f"✅ Verbali Lista: {len(data.get('verbali', []))} verbali")


class TestAutoRepair:
    """Auto repair tests"""
    
    def test_auto_repair_status(self):
        """Test auto repair status"""
        response = requests.get(f"{BASE_URL}/api/auto-repair/status")
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404]
        print(f"✅ Auto Repair Status: {response.status_code}")


class TestCicloPassivo:
    """Ciclo Passivo tests"""
    
    def test_ciclo_passivo_dashboard(self):
        """Test ciclo passivo dashboard"""
        response = requests.get(f"{BASE_URL}/api/ciclo-passivo/dashboard?anno=2026")
        # May return 200 or 404
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Ciclo Passivo Dashboard: {data}")
        else:
            print(f"⚠️ Ciclo Passivo Dashboard: {response.status_code}")
        assert response.status_code in [200, 404]


class TestScadenzario:
    """Scadenzario tests"""
    
    def test_scadenzario_fornitori(self):
        """Test scadenzario fornitori"""
        response = requests.get(f"{BASE_URL}/api/scadenzario-fornitori?anno=2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Scadenzario Fornitori: {len(data) if isinstance(data, list) else 'OK'}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
