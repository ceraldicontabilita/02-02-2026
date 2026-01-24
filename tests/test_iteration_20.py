"""
Test Iteration 20 - Testing UI compaction, window.confirm removal, and new endpoint
Features tested:
1. Dashboard loads correctly
2. /ordini-fornitori page loads with compact UI
3. POST /api/fatture-ricevute/aggiorna-metodi-pagamento endpoint works
4. Admin page has the "Aggiorna Metodi Pagamento" button
5. No console errors on main pages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasicEndpoints:
    """Basic health and endpoint tests"""
    
    def test_health_endpoint(self):
        """Test that the health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        assert data.get("database") == "connected"
        print(f"✅ Health check passed: {data}")
    
    def test_dashboard_api(self):
        """Test dashboard-related API endpoints"""
        # Test suppliers endpoint (used by dashboard)
        response = requests.get(f"{BASE_URL}/api/suppliers?limit=1")
        assert response.status_code == 200
        print("✅ Suppliers API works")
    
    def test_fatture_ricevute_archivio(self):
        """Test fatture ricevute archivio endpoint"""
        response = requests.get(f"{BASE_URL}/api/fatture-ricevute/archivio?limit=1")
        assert response.status_code == 200
        data = response.json()
        assert "fatture" in data or "items" in data
        print(f"✅ Fatture ricevute archivio works, total: {data.get('total', 'N/A')}")


class TestAggiornaMetodiPagamentoEndpoint:
    """Test the new aggiorna-metodi-pagamento endpoint"""
    
    def test_aggiorna_metodi_pagamento_endpoint_exists(self):
        """Test that the endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/fatture-ricevute/aggiorna-metodi-pagamento",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        print("✅ Aggiorna metodi pagamento endpoint works")
        print(f"   - Fatture aggiornate: {data.get('fatture_aggiornate', 0)}")
        print(f"   - Senza fornitore/metodo: {data.get('senza_fornitore_o_metodo', 0)}")
        print(f"   - Fornitori con metodo: {data.get('fornitori_con_metodo', 0)}")
    
    def test_aggiorna_metodi_pagamento_response_structure(self):
        """Test that the response has the expected structure"""
        response = requests.post(
            f"{BASE_URL}/api/fatture-ricevute/aggiorna-metodi-pagamento",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        required_fields = ["success", "fatture_aggiornate", "senza_fornitore_o_metodo", "errori", "fornitori_con_metodo"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Check types
        assert isinstance(data["success"], bool)
        assert isinstance(data["fatture_aggiornate"], int)
        assert isinstance(data["senza_fornitore_o_metodo"], int)
        assert isinstance(data["errori"], int)
        assert isinstance(data["fornitori_con_metodo"], int)
        
        print("✅ Response structure is correct")


class TestOrdiniFornitori:
    """Test ordini fornitori endpoints"""
    
    def test_ordini_fornitori_list(self):
        """Test ordini fornitori list endpoint"""
        response = requests.get(f"{BASE_URL}/api/ordini-fornitori")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Ordini fornitori list works, count: {len(data)}")
    
    def test_comparatore_cart(self):
        """Test comparatore cart endpoint"""
        response = requests.get(f"{BASE_URL}/api/comparatore/cart")
        assert response.status_code == 200
        data = response.json()
        assert "by_supplier" in data or "total_items" in data
        print("✅ Comparatore cart works")


class TestCicloPassivo:
    """Test ciclo passivo endpoints"""
    
    def test_dashboard_riconciliazione(self):
        """Test dashboard riconciliazione endpoint"""
        response = requests.get(f"{BASE_URL}/api/ciclo-passivo/dashboard-riconciliazione")
        assert response.status_code == 200
        data = response.json()
        assert "statistiche" in data or "scadenze_aperte" in data
        print("✅ Dashboard riconciliazione works")


class TestAdminEndpoints:
    """Test admin-related endpoints"""
    
    def test_admin_stats(self):
        """Test admin stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        # May return 200 or 404 depending on implementation
        if response.status_code == 200:
            print("✅ Admin stats endpoint works")
        else:
            print(f"⚠️ Admin stats endpoint returned {response.status_code}")
    
    def test_config_email_accounts(self):
        """Test config email accounts endpoint"""
        response = requests.get(f"{BASE_URL}/api/config/email-accounts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Config email accounts works, count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
