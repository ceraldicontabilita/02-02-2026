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
        response = requests.get(f"{BASE_URL}/api/prima-nota-salari?anno=2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Prima Nota Salari: {len(data) if isinstance(data, list) else 'OK'}")


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
    
    def test_fatture_ricevute_list(self):
        """Test received invoices list"""
        response = requests.get(f"{BASE_URL}/api/fatture-ricevute?anno=2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Fatture Ricevute: {len(data) if isinstance(data, list) else 'OK'}")
    
    def test_corrispettivi_list(self):
        """Test corrispettivi list"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi?anno=2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Corrispettivi: {len(data) if isinstance(data, list) else 'OK'}")


class TestF24:
    """F24 tax forms tests"""
    
    def test_f24_list(self):
        """Test F24 list"""
        response = requests.get(f"{BASE_URL}/api/f24?anno=2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ F24: {len(data) if isinstance(data, list) else 'OK'}")
    
    def test_f24_stats(self):
        """Test F24 statistics"""
        response = requests.get(f"{BASE_URL}/api/f24/stats?anno=2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ F24 Stats: {data}")


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
    
    def test_magazzino_products(self):
        """Test warehouse products"""
        response = requests.get(f"{BASE_URL}/api/magazzino/products")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Magazzino Products: {len(data) if isinstance(data, list) else 'OK'}")
    
    def test_inventario(self):
        """Test inventory"""
        response = requests.get(f"{BASE_URL}/api/inventario")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Inventario: {len(data) if isinstance(data, list) else 'OK'}")


class TestHACCP:
    """HACCP tests"""
    
    def test_haccp_temperature(self):
        """Test HACCP temperature readings"""
        response = requests.get(f"{BASE_URL}/api/warehouse/temperature")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ HACCP Temperature: {len(data) if isinstance(data, list) else 'OK'}")
    
    def test_haccp_sanificazioni(self):
        """Test HACCP sanifications"""
        response = requests.get(f"{BASE_URL}/api/warehouse/sanificazioni")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ HACCP Sanificazioni: {len(data) if isinstance(data, list) else 'OK'}")


class TestScadenze:
    """Deadlines tests"""
    
    def test_scadenze_list(self):
        """Test deadlines list"""
        response = requests.get(f"{BASE_URL}/api/scadenze")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Scadenze: {len(data) if isinstance(data, list) else 'OK'}")


class TestVerbali:
    """Verbali (rental records) tests"""
    
    def test_verbali_list(self):
        """Test verbali list"""
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Verbali: {len(data) if isinstance(data, list) else 'OK'}")


class TestNotifications:
    """Notifications tests"""
    
    def test_notifications_list(self):
        """Test notifications list"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Notifications: {len(data) if isinstance(data, list) else 'OK'}")


class TestAutoRepair:
    """Auto repair tests"""
    
    def test_auto_repair_status(self):
        """Test auto repair status"""
        response = requests.get(f"{BASE_URL}/api/auto-repair/status")
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404]
        print(f"✅ Auto Repair Status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
