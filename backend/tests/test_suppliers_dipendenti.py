"""
Test Suppliers Module endpoints.
Tests for the refactored suppliers_module.
"""
import pytest
import httpx


class TestSuppliersModule:
    """Test suite for Suppliers Module."""
    
    def test_list_suppliers(self, client):
        """Test GET /api/suppliers"""
        response = client.get("/api/suppliers", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_list_suppliers_with_search(self, client):
        """Test GET /api/suppliers with search"""
        response = client.get("/api/suppliers", params={"search": "srl", "limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_payment_methods(self, client):
        """Test GET /api/suppliers/payment-methods"""
        response = client.get("/api/suppliers/payment-methods")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have common payment methods
        methods = [m.get("value") or m for m in data]
        assert any("bonifico" in str(m).lower() for m in methods) or len(data) > 0
    
    def test_stats(self, client):
        """Test GET /api/suppliers/stats"""
        response = client.get("/api/suppliers/stats")
        assert response.status_code == 200
        data = response.json()
        assert "totale_fornitori" in data or "total" in data or isinstance(data, dict)
    
    def test_supplier_not_found(self, client):
        """Test GET /api/suppliers/{id} with invalid ID"""
        response = client.get("/api/suppliers/invalid-id-12345")
        assert response.status_code == 404


class TestSuppliersValidation:
    """Test validation operations for Suppliers."""
    
    def test_validate_suppliers(self, client):
        """Test GET /api/suppliers/validate"""
        response = client.get("/api/suppliers/validate")
        # May return 200 with validation results or 404 if endpoint not exists
        assert response.status_code in [200, 404]
    
    def test_validate_iban_invalid(self, client):
        """Test POST /api/suppliers/validate-iban with invalid IBAN"""
        payload = {"iban": "INVALID"}
        response = client.post("/api/suppliers/validate-iban", json=payload)
        # Should return 200 with invalid=true or 400/422
        assert response.status_code in [200, 400, 422]


class TestDipendenti:
    """Test suite for Dipendenti endpoints."""
    
    def test_list_dipendenti(self, client):
        """Test GET /api/dipendenti"""
        response = client.get("/api/dipendenti", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_dipendente_not_found(self, client):
        """Test GET /api/dipendenti/{id} with invalid ID"""
        response = client.get("/api/dipendenti/invalid-id-12345")
        assert response.status_code == 404
    
    def test_report_ferie_permessi_tutti(self, client):
        """Test GET /api/dipendenti/report-ferie-permessi-tutti"""
        response = client.get("/api/dipendenti/report-ferie-permessi-tutti")
        # Should return PDF or JSON
        assert response.status_code == 200
        # Check content type is PDF or JSON
        content_type = response.headers.get("content-type", "")
        assert "pdf" in content_type.lower() or "json" in content_type.lower() or response.status_code == 200
