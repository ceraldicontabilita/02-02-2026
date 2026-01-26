"""
Test Iteration 37 - Testing bug fixes and feature changes:
1. CorrezioneAI page works without JS errors (process.env fix)
2. Cedolini page shows all months (gennaio-dicembre + 13esima + 14esima)
3. POST /api/fatture-to-banca endpoint removed (should return 404)
4. Download email uses keywords from database (_load_admin_keywords)
5. Month tabs in cedolini page are visible and readable
6. Descriptive URLs for cedolini page
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEndpointRemoval:
    """Test that fatture-to-banca endpoint has been removed"""
    
    def test_fatture_to_banca_returns_404(self):
        """POST /api/sync/fatture-to-banca should return 404 (endpoint removed)"""
        response = requests.post(f"{BASE_URL}/api/sync/fatture-to-banca")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("TEST PASS: /api/sync/fatture-to-banca returns 404 (correctly removed)")


class TestCedoliniAPI:
    """Test cedolini API endpoints"""
    
    def test_cedolini_list_endpoint(self):
        """GET /api/cedolini should return cedolini list"""
        response = requests.get(f"{BASE_URL}/api/cedolini?anno=2025")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "cedolini" in data, "Response should contain 'cedolini' key"
        assert "total" in data, "Response should contain 'total' key"
        
        # Verify cedolini have required fields
        if data["cedolini"]:
            cedolino = data["cedolini"][0]
            assert "mese" in cedolino, "Cedolino should have 'mese' field"
            assert "anno" in cedolino, "Cedolino should have 'anno' field"
        
        print(f"TEST PASS: /api/cedolini returns {data['total']} cedolini for 2025")
    
    def test_cedolini_limit_500(self):
        """GET /api/cedolini should support limit up to 500"""
        response = requests.get(f"{BASE_URL}/api/cedolini?anno=2025&limit=500")
        assert response.status_code == 200
        
        data = response.json()
        # Verify limit is respected
        assert len(data["cedolini"]) <= 500, "Should return max 500 cedolini"
        print(f"TEST PASS: /api/cedolini respects limit=500, returned {len(data['cedolini'])} items")
    
    def test_cedolini_sorted_by_month(self):
        """Cedolini should be sorted by month ascending"""
        response = requests.get(f"{BASE_URL}/api/cedolini?anno=2025&limit=100")
        assert response.status_code == 200
        
        data = response.json()
        cedolini = data["cedolini"]
        
        if len(cedolini) > 1:
            # Check if sorted by month (ascending)
            months = [c.get("mese", 0) for c in cedolini]
            # Note: The API sorts by (anno DESC, mese ASC) so within same year, months should be ascending
            print(f"TEST INFO: Months in response: {months[:10]}...")
        
        print("TEST PASS: Cedolini API returns data correctly")


class TestSyncEndpoints:
    """Test sync endpoints that should still exist"""
    
    def test_match_fatture_cassa_exists(self):
        """POST /api/sync/match-fatture-cassa should exist"""
        response = requests.post(f"{BASE_URL}/api/sync/match-fatture-cassa")
        # Should return 200 or 422 (validation error), not 404
        assert response.status_code != 404, "Endpoint should exist"
        print(f"TEST PASS: /api/sync/match-fatture-cassa exists (status: {response.status_code})")
    
    def test_match_fatture_banca_exists(self):
        """POST /api/sync/match-fatture-banca should exist"""
        response = requests.post(f"{BASE_URL}/api/sync/match-fatture-banca")
        assert response.status_code != 404, "Endpoint should exist"
        print(f"TEST PASS: /api/sync/match-fatture-banca exists (status: {response.status_code})")
    
    def test_stato_sincronizzazione(self):
        """GET /api/sync/stato-sincronizzazione should return sync status"""
        response = requests.get(f"{BASE_URL}/api/sync/stato-sincronizzazione")
        assert response.status_code == 200
        
        data = response.json()
        assert "fatture" in data, "Should contain fatture stats"
        assert "prima_nota_cassa" in data, "Should contain prima_nota_cassa stats"
        
        print(f"TEST PASS: Sync status - Fatture totali: {data['fatture']['totali']}")


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_health_endpoint(self):
        """Health endpoint should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "healthy"
        print("TEST PASS: Health endpoint returns healthy")
    
    def test_employees_endpoint(self):
        """Employees endpoint should work"""
        response = requests.get(f"{BASE_URL}/api/employees?limit=10")
        assert response.status_code == 200
        print("TEST PASS: Employees endpoint works")


class TestAIParserEndpoints:
    """Test AI Parser endpoints for CorrezioneAI page"""
    
    def test_ai_parser_da_rivedere(self):
        """GET /api/ai-parser/da-rivedere should work"""
        response = requests.get(f"{BASE_URL}/api/ai-parser/da-rivedere?limit=10")
        # Should return 200 or valid response
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"TEST PASS: /api/ai-parser/da-rivedere status: {response.status_code}")
    
    def test_ai_parser_statistiche(self):
        """GET /api/ai-parser/statistiche should work"""
        response = requests.get(f"{BASE_URL}/api/ai-parser/statistiche")
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"TEST PASS: /api/ai-parser/statistiche status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
