"""
Test Fatture Ricevute Module endpoints.
Tests for the refactored fatture_module.
"""


class TestFattureRicevuteModule:
    """Test suite for Fatture Ricevute Module."""
    
    def test_archivio(self, client):
        """Test GET /api/fatture-ricevute/archivio"""
        response = client.get("/api/fatture-ricevute/archivio", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert "fatture" in data
        assert "total" in data
        assert isinstance(data["fatture"], list)
    
    def test_archivio_with_anno_filter(self, client):
        """Test GET /api/fatture-ricevute/archivio with anno filter"""
        response = client.get("/api/fatture-ricevute/archivio", params={"anno": 2024, "limit": 3})
        assert response.status_code == 200
        data = response.json()
        assert "fatture" in data
    
    def test_archivio_with_stato_filter(self, client):
        """Test GET /api/fatture-ricevute/archivio with stato filter"""
        response = client.get("/api/fatture-ricevute/archivio", params={"stato": "importata", "limit": 3})
        assert response.status_code == 200
        data = response.json()
        assert "fatture" in data
    
    def test_archivio_with_search(self, client):
        """Test GET /api/fatture-ricevute/archivio with search"""
        response = client.get("/api/fatture-ricevute/archivio", params={"search": "test", "limit": 3})
        assert response.status_code == 200
        data = response.json()
        assert "fatture" in data
    
    def test_fornitori(self, client):
        """Test GET /api/fatture-ricevute/fornitori"""
        response = client.get("/api/fatture-ricevute/fornitori", params={"limit": 10})
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
    
    def test_fornitori_with_search(self, client):
        """Test GET /api/fatture-ricevute/fornitori with search"""
        response = client.get("/api/fatture-ricevute/fornitori", params={"search": "srl", "limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
    
    def test_statistiche(self, client):
        """Test GET /api/fatture-ricevute/statistiche"""
        response = client.get("/api/fatture-ricevute/statistiche")
        assert response.status_code == 200
        data = response.json()
        assert "totale_fatture" in data
        assert "importo_totale" in data
        assert "pagate" in data
        assert "da_pagare" in data
    
    def test_statistiche_with_anno(self, client):
        """Test GET /api/fatture-ricevute/statistiche with anno"""
        response = client.get("/api/fatture-ricevute/statistiche", params={"anno": 2024})
        assert response.status_code == 200
        data = response.json()
        assert "totale_fatture" in data
        assert data.get("anno") == 2024
    
    def test_verifica_incoerenze(self, client):
        """Test GET /api/fatture-ricevute/verifica-incoerenze-estratto-conto"""
        response = client.get("/api/fatture-ricevute/verifica-incoerenze-estratto-conto")
        assert response.status_code == 200
        data = response.json()
        assert "totale_fatture_banca_pagate" in data
        assert "incoerenze" in data


class TestFattureRicevuteCRUD:
    """Test CRUD operations for Fatture Ricevute."""
    
    def test_fattura_not_found(self, client):
        """Test GET /api/fatture-ricevute/fattura/{id} with invalid ID"""
        response = client.get("/api/fatture-ricevute/fattura/invalid-id-12345")
        assert response.status_code == 404
    
    def test_view_assoinvoice_not_found(self, client):
        """Test GET /api/fatture-ricevute/fattura/{id}/view-assoinvoice with invalid ID"""
        response = client.get("/api/fatture-ricevute/fattura/invalid-id/view-assoinvoice")
        assert response.status_code == 404


class TestFatturePagamento:
    """Test payment operations for Fatture."""
    
    def test_paga_manuale_missing_fields(self, client):
        """Test POST /api/fatture-ricevute/paga-manuale with missing fields"""
        payload = {}
        response = client.post("/api/fatture-ricevute/paga-manuale", json=payload)
        assert response.status_code == 400
    
    def test_paga_manuale_invalid_metodo(self, client):
        """Test POST /api/fatture-ricevute/paga-manuale with invalid metodo"""
        payload = {
            "fattura_id": "test-id",
            "importo": 100,
            "metodo": "invalid"
        }
        response = client.post("/api/fatture-ricevute/paga-manuale", json=payload)
        assert response.status_code == 400
    
    def test_cambia_metodo_missing_fields(self, client):
        """Test POST /api/fatture-ricevute/cambia-metodo-pagamento with missing fields"""
        payload = {}
        response = client.post("/api/fatture-ricevute/cambia-metodo-pagamento", json=payload)
        assert response.status_code == 400
    
    def test_riconcilia_missing_fields(self, client):
        """Test POST /api/fatture-ricevute/riconcilia-con-estratto-conto with missing fields"""
        payload = {}
        response = client.post("/api/fatture-ricevute/riconcilia-con-estratto-conto", json=payload)
        assert response.status_code == 400
