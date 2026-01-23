"""
Test Prima Nota Module endpoints.
Tests for the refactored prima_nota_module.
"""
import pytest
import httpx


class TestPrimaNotaModule:
    """Test suite for Prima Nota Module."""
    
    def test_anni_disponibili(self, client):
        """Test GET /api/prima-nota/anni-disponibili"""
        response = client.get("/api/prima-nota/anni-disponibili")
        assert response.status_code == 200
        data = response.json()
        assert "anni" in data
        assert isinstance(data["anni"], list)
        assert len(data["anni"]) > 0
        # Anni devono essere numeri
        assert all(isinstance(a, int) for a in data["anni"])
    
    def test_stats(self, client):
        """Test GET /api/prima-nota/stats"""
        response = client.get("/api/prima-nota/stats")
        assert response.status_code == 200
        data = response.json()
        assert "cassa" in data
        assert "banca" in data
        assert "totale" in data
        # Verifica struttura cassa
        assert "saldo" in data["cassa"]
        assert "entrate" in data["cassa"]
        assert "uscite" in data["cassa"]
    
    def test_cassa_list(self, client):
        """Test GET /api/prima-nota/cassa"""
        response = client.get("/api/prima-nota/cassa", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert "movimenti" in data
        assert "saldo" in data
        assert "count" in data
        assert isinstance(data["movimenti"], list)
    
    def test_cassa_list_with_filters(self, client):
        """Test GET /api/prima-nota/cassa with year filter"""
        response = client.get("/api/prima-nota/cassa", params={"anno": 2024, "limit": 3})
        assert response.status_code == 200
        data = response.json()
        assert "movimenti" in data
        assert "anno" in data
        assert data["anno"] == 2024
    
    def test_banca_list(self, client):
        """Test GET /api/prima-nota/banca"""
        response = client.get("/api/prima-nota/banca", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert "movimenti" in data
        assert "saldo" in data
        assert isinstance(data["movimenti"], list)
    
    def test_banca_list_with_filters(self, client):
        """Test GET /api/prima-nota/banca with year filter"""
        response = client.get("/api/prima-nota/banca", params={"anno": 2024, "limit": 3})
        assert response.status_code == 200
        data = response.json()
        assert "movimenti" in data
    
    def test_salari_list(self, client):
        """Test GET /api/prima-nota/salari"""
        response = client.get("/api/prima-nota/salari", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert "movimenti" in data
        assert "totale" in data
        assert "count" in data
    
    def test_salari_stats(self, client):
        """Test GET /api/prima-nota/salari/stats"""
        response = client.get("/api/prima-nota/salari/stats")
        assert response.status_code == 200
        data = response.json()
        assert "totale" in data
        assert "count" in data
    
    def test_corrispettivi_status(self, client):
        """Test GET /api/prima-nota/corrispettivi-status"""
        response = client.get("/api/prima-nota/corrispettivi-status")
        assert response.status_code == 200
        data = response.json()
        assert "corrispettivi_totali" in data
        assert "corrispettivi_sincronizzati" in data


class TestPrimaNotaCRUD:
    """Test CRUD operations for Prima Nota."""
    
    def test_create_movimento_cassa(self, client):
        """Test POST /api/prima-nota/cassa - create movement"""
        payload = {
            "data": "2024-01-15",
            "tipo": "entrata",
            "importo": 100.50,
            "descrizione": "Test movimento cassa",
            "categoria": "Test"
        }
        response = client.post("/api/prima-nota/cassa", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data.get("message") == "Movimento cassa creato"
    
    def test_create_movimento_banca(self, client):
        """Test POST /api/prima-nota/banca - create movement"""
        payload = {
            "data": "2024-01-15",
            "tipo": "uscita",
            "importo": 250.00,
            "descrizione": "Test movimento banca",
            "categoria": "Test"
        }
        response = client.post("/api/prima-nota/banca", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data.get("message") == "Movimento banca creato"
    
    def test_create_movimento_invalid_tipo(self, client):
        """Test POST /api/prima-nota/cassa with invalid tipo"""
        payload = {
            "data": "2024-01-15",
            "tipo": "invalid",
            "importo": 100,
            "descrizione": "Test"
        }
        response = client.post("/api/prima-nota/cassa", json=payload)
        assert response.status_code == 400
    
    def test_create_movimento_missing_field(self, client):
        """Test POST /api/prima-nota/cassa with missing required field"""
        payload = {
            "data": "2024-01-15",
            "tipo": "entrata"
            # Missing importo and descrizione
        }
        response = client.post("/api/prima-nota/cassa", json=payload)
        assert response.status_code == 400
