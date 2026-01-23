"""
Test Suite: MongoDB-Only Architecture Refactoring - Iteration 33
================================================================
Complete backend testing for all main endpoints after MongoDB-only refactoring.
Tests all GET endpoints and verifies no regressions after removing 20 duplicate files.

Endpoints tested:
- GET /api/documenti/statistiche
- GET /api/documenti/lista
- GET /api/documenti/categorie
- GET /api/f24
- GET /api/quietanze-f24
- GET /api/quietanze-f24/statistiche
- GET /api/ricerca-globale?q=srl
- GET /api/dipendenti
- GET /api/invoices
- GET /api/suppliers
- GET /api/warehouse/products
- GET /api/prima-nota
- GET /api/cedolini/riepilogo
- POST /api/f24-riconciliazione/upload (structure test)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDocumentiEndpoints:
    """Test /api/documenti/* endpoints"""
    
    def test_statistiche_returns_totale_nuovi_processati(self):
        """GET /api/documenti/statistiche - deve restituire totale, nuovi, processati"""
        response = requests.get(f"{BASE_URL}/api/documenti/statistiche")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify required fields
        assert "totale" in data, "Missing 'totale' field"
        assert "nuovi" in data, "Missing 'nuovi' field"
        assert "processati" in data, "Missing 'processati' field"
        
        # Verify types
        assert isinstance(data["totale"], int), f"totale should be int, got {type(data['totale'])}"
        assert isinstance(data["nuovi"], int), f"nuovi should be int, got {type(data['nuovi'])}"
        assert isinstance(data["processati"], int), f"processati should be int, got {type(data['processati'])}"
        
        print(f"✅ Statistiche: totale={data['totale']}, nuovi={data['nuovi']}, processati={data['processati']}")
    
    def test_lista_returns_documents_with_pagination(self):
        """GET /api/documenti/lista - deve restituire lista documenti con paginazione"""
        response = requests.get(f"{BASE_URL}/api/documenti/lista?limit=10&skip=0")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify structure
        assert "documents" in data, "Missing 'documents' field"
        assert "total" in data, "Missing 'total' field"
        assert "by_category" in data, "Missing 'by_category' field"
        assert "by_status" in data, "Missing 'by_status' field"
        
        # Verify pagination works
        assert isinstance(data["documents"], list), "documents should be list"
        assert len(data["documents"]) <= 10, "Pagination limit not respected"
        
        print(f"✅ Lista: {len(data['documents'])} documents returned, total={data['total']}")
    
    def test_categorie_returns_available_categories(self):
        """GET /api/documenti/categorie - deve restituire categorie disponibili"""
        response = requests.get(f"{BASE_URL}/api/documenti/categorie")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify structure
        assert "categories" in data, "Missing 'categories' field"
        assert "descriptions" in data, "Missing 'descriptions' field"
        
        # Verify expected categories
        categories = data["categories"]
        expected = ["f24", "fattura", "busta_paga", "estratto_conto", "quietanza", "altro"]
        for cat in expected:
            assert cat in categories, f"Missing expected category: {cat}"
        
        print(f"✅ Categorie: {len(categories)} categories available")


class TestF24Endpoints:
    """Test /api/f24 and related endpoints"""
    
    def test_f24_lista_returns_200(self):
        """GET /api/f24 - deve restituire lista F24"""
        response = requests.get(f"{BASE_URL}/api/f24")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Can be list or dict with items
        if isinstance(data, list):
            print(f"✅ F24 Lista: {len(data)} F24 records")
        elif isinstance(data, dict):
            items = data.get("items", data.get("f24", data.get("data", [])))
            print(f"✅ F24 Lista: {len(items) if isinstance(items, list) else 'N/A'} F24 records")
        else:
            print(f"✅ F24 Lista: Response received")


class TestQuietanzeF24Endpoints:
    """Test /api/quietanze-f24 endpoints"""
    
    def test_quietanze_lista_returns_200(self):
        """GET /api/quietanze-f24 - deve restituire lista quietanze"""
        response = requests.get(f"{BASE_URL}/api/quietanze-f24")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        if isinstance(data, list):
            print(f"✅ Quietanze Lista: {len(data)} quietanze")
        elif isinstance(data, dict):
            items = data.get("items", data.get("quietanze", data.get("data", [])))
            print(f"✅ Quietanze Lista: {len(items) if isinstance(items, list) else 'N/A'} quietanze")
    
    def test_quietanze_statistiche_returns_200(self):
        """GET /api/quietanze-f24/statistiche - deve restituire statistiche"""
        response = requests.get(f"{BASE_URL}/api/quietanze-f24/statistiche")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"✅ Quietanze Statistiche: {data}")


class TestRicercaGlobale:
    """Test /api/ricerca-globale endpoint"""
    
    def test_ricerca_globale_with_query(self):
        """GET /api/ricerca-globale?q=srl - ricerca globale deve funzionare"""
        response = requests.get(f"{BASE_URL}/api/ricerca-globale?q=srl")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify structure
        assert "query" in data, "Missing 'query' field"
        assert "total" in data, "Missing 'total' field"
        assert "results" in data, "Missing 'results' field"
        
        # Verify query is echoed back
        assert data["query"] == "srl", f"Query not echoed: {data['query']}"
        
        # Verify results structure
        assert isinstance(data["results"], list), "results should be list"
        
        if data["results"]:
            result = data["results"][0]
            assert "tipo" in result, "Result missing 'tipo'"
            assert "titolo" in result, "Result missing 'titolo'"
        
        print(f"✅ Ricerca Globale: {data['total']} results for 'srl'")
    
    def test_ricerca_globale_min_length(self):
        """Ricerca globale should require minimum 2 characters"""
        response = requests.get(f"{BASE_URL}/api/ricerca-globale?q=a")
        # Should return 422 (validation error) for query too short
        assert response.status_code == 422, f"Expected 422 for short query, got {response.status_code}"


class TestDipendentiEndpoint:
    """Test /api/dipendenti endpoint"""
    
    def test_dipendenti_lista_returns_200(self):
        """GET /api/dipendenti - deve restituire lista dipendenti"""
        response = requests.get(f"{BASE_URL}/api/dipendenti")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        if isinstance(data, list):
            print(f"✅ Dipendenti: {len(data)} dipendenti")
            if data:
                # Verify structure of first item
                emp = data[0]
                assert "id" in emp or "nome" in emp, "Employee missing id or nome"
        elif isinstance(data, dict):
            items = data.get("items", data.get("dipendenti", data.get("employees", [])))
            print(f"✅ Dipendenti: {len(items) if isinstance(items, list) else 'N/A'} dipendenti")


class TestInvoicesEndpoint:
    """Test /api/invoices endpoint"""
    
    def test_invoices_lista_returns_200(self):
        """GET /api/invoices - deve restituire lista fatture"""
        response = requests.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        if isinstance(data, list):
            print(f"✅ Invoices: {len(data)} fatture")
            if data:
                inv = data[0]
                # Verify common invoice fields
                has_id = "id" in inv or "invoice_key" in inv
                assert has_id, "Invoice missing id"
        elif isinstance(data, dict):
            items = data.get("items", data.get("invoices", data.get("fatture", [])))
            print(f"✅ Invoices: {len(items) if isinstance(items, list) else 'N/A'} fatture")
    
    def test_invoices_filter_by_anno(self):
        """GET /api/invoices?anno=2024 - should filter by year"""
        response = requests.get(f"{BASE_URL}/api/invoices?anno=2024")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Invoices filter by anno: OK")


class TestSuppliersEndpoint:
    """Test /api/suppliers endpoint"""
    
    def test_suppliers_lista_returns_200(self):
        """GET /api/suppliers - deve restituire lista fornitori"""
        response = requests.get(f"{BASE_URL}/api/suppliers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        if isinstance(data, list):
            print(f"✅ Suppliers: {len(data)} fornitori")
            if data:
                sup = data[0]
                has_id = "id" in sup
                has_name = "name" in sup or "denominazione" in sup
                assert has_id, "Supplier missing id"
        elif isinstance(data, dict):
            items = data.get("items", data.get("suppliers", data.get("fornitori", [])))
            print(f"✅ Suppliers: {len(items) if isinstance(items, list) else 'N/A'} fornitori")


class TestWarehouseEndpoint:
    """Test /api/warehouse/products endpoint"""
    
    def test_warehouse_products_returns_200(self):
        """GET /api/warehouse/products - deve restituire prodotti magazzino"""
        response = requests.get(f"{BASE_URL}/api/warehouse/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        if isinstance(data, list):
            print(f"✅ Warehouse Products: {len(data)} prodotti")
        elif isinstance(data, dict):
            items = data.get("items", data.get("products", data.get("prodotti", [])))
            print(f"✅ Warehouse Products: {len(items) if isinstance(items, list) else 'N/A'} prodotti")


class TestF24RiconciliazioneUpload:
    """Test /api/f24-riconciliazione/upload endpoint structure"""
    
    def test_upload_endpoint_exists(self):
        """POST /api/f24-riconciliazione/upload - endpoint should exist"""
        # Test without file to verify endpoint exists
        response = requests.post(f"{BASE_URL}/api/f24-riconciliazione/upload")
        
        # Should return 422 (missing file) or 400, not 404
        assert response.status_code != 404, "Upload endpoint not found (404)"
        
        # 422 = validation error (missing file), which is expected
        # 400 = bad request, also acceptable
        assert response.status_code in [400, 422], f"Unexpected status: {response.status_code}"
        
        print(f"✅ F24 Riconciliazione Upload: Endpoint exists (status {response.status_code} without file)")


class TestPrimaNotaEndpoint:
    """Test /api/prima-nota endpoint"""
    
    def test_prima_nota_returns_200(self):
        """GET /api/prima-nota - deve restituire movimenti prima nota"""
        response = requests.get(f"{BASE_URL}/api/prima-nota")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        if isinstance(data, list):
            print(f"✅ Prima Nota: {len(data)} movimenti")
        elif isinstance(data, dict):
            items = data.get("items", data.get("movimenti", data.get("data", [])))
            print(f"✅ Prima Nota: {len(items) if isinstance(items, list) else 'N/A'} movimenti")


class TestCedoliniEndpoint:
    """Test /api/cedolini/riepilogo endpoint"""
    
    def test_cedolini_riepilogo_returns_200(self):
        """GET /api/cedolini/riepilogo - deve restituire riepilogo cedolini"""
        response = requests.get(f"{BASE_URL}/api/cedolini/riepilogo")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"✅ Cedolini Riepilogo: Response received")
        
        # Log some details if available
        if isinstance(data, dict):
            for key in ["totale", "total", "count", "dipendenti"]:
                if key in data:
                    print(f"   - {key}: {data[key]}")


class TestHealthAndConnectivity:
    """Test basic health and connectivity"""
    
    def test_health_endpoint(self):
        """Backend health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "healthy", f"Backend not healthy: {data}"
        assert data.get("database") == "connected", f"Database not connected: {data}"
        
        print(f"✅ Health: {data.get('status')}, DB: {data.get('database')}")


class TestNoMongoDBObjectIdInResponses:
    """Verify MongoDB _id is excluded from all responses"""
    
    def test_documenti_lista_no_objectid(self):
        """Documents should not contain MongoDB _id"""
        response = requests.get(f"{BASE_URL}/api/documenti/lista?limit=5")
        data = response.json()
        
        for doc in data.get("documents", []):
            assert "_id" not in doc, f"Document contains _id: {doc.get('id')}"
        
        print("✅ Documenti Lista: No _id in responses")
    
    def test_invoices_no_objectid(self):
        """Invoices should not contain MongoDB _id"""
        response = requests.get(f"{BASE_URL}/api/invoices?limit=5")
        data = response.json()
        
        items = data if isinstance(data, list) else data.get("items", [])
        for item in items[:5]:
            assert "_id" not in item, f"Invoice contains _id"
        
        print("✅ Invoices: No _id in responses")
    
    def test_suppliers_no_objectid(self):
        """Suppliers should not contain MongoDB _id"""
        response = requests.get(f"{BASE_URL}/api/suppliers?limit=5")
        data = response.json()
        
        items = data if isinstance(data, list) else data.get("items", [])
        for item in items[:5]:
            assert "_id" not in item, f"Supplier contains _id"
        
        print("✅ Suppliers: No _id in responses")


# Fixtures
@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
