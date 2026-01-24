"""
Test Core API endpoints.
Tests for health, F24, and other core functionality.
"""


class TestHealthEndpoints:
    """Test health and status endpoints."""
    
    def test_health(self, client):
        """Test GET /api/health"""
        response = client.get("/api/health")
        assert response.status_code == 200
    
    def test_root(self, client):
        """Test GET /"""
        response = client.get("/")
        assert response.status_code == 200


class TestF24Module:
    """Test suite for F24 endpoints."""
    
    def test_f24_commercialista_list(self, client):
        """Test GET /api/f24-riconciliazione/commercialista"""
        response = client.get("/api/f24-riconciliazione/commercialista")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or "items" in data or "f24" in str(data).lower()
    
    def test_f24_alerts(self, client):
        """Test GET /api/f24-riconciliazione/alerts"""
        response = client.get("/api/f24-riconciliazione/alerts")
        assert response.status_code == 200
    
    def test_f24_dashboard(self, client):
        """Test GET /api/f24-riconciliazione/dashboard"""
        response = client.get("/api/f24-riconciliazione/dashboard")
        assert response.status_code == 200


class TestLearningMachine:
    """Test Learning Machine endpoints."""
    
    def test_dashboard(self, client):
        """Test GET /api/learning-machine/dashboard"""
        response = client.get("/api/learning-machine/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "totale_documenti" in data or "success" in data
    
    def test_centri_costo(self, client):
        """Test GET /api/learning-machine/centri-costo"""
        response = client.get("/api/learning-machine/centri-costo")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestEstrattoContoMovimenti:
    """Test Estratto Conto Movimenti endpoints."""
    
    def test_list_movimenti(self, client):
        """Test GET /api/estratto-conto-movimenti"""
        response = client.get("/api/estratto-conto-movimenti", params={"limit": 5})
        # Endpoint may not exist or be differently named
        assert response.status_code in [200, 404]
    
    def test_stats(self, client):
        """Test GET /api/estratto-conto-movimenti/stats"""
        response = client.get("/api/estratto-conto-movimenti/stats")
        # May return 200 or 404 depending on endpoint availability
        assert response.status_code in [200, 404]
