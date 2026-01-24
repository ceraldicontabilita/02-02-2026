"""
Test Suite: Documenti Endpoints - MongoDB-Only Architecture
============================================================
Tests for the refactored documenti endpoints that use pdf_data (Base64 in MongoDB)
instead of filesystem paths.

Endpoints tested:
- GET /api/documenti/statistiche
- GET /api/documenti/lista
- GET /api/documenti/categorie
- GET /api/documenti/documento/{doc_id}/download (404 if pdf_data missing)
- POST /api/documenti/documento/{doc_id}/cambia-categoria (MongoDB only)
- DELETE /api/documenti/documento/{doc_id} (MongoDB only)
"""

import pytest
import requests
import os
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDocumentiStatistiche:
    """Test /api/documenti/statistiche endpoint"""
    
    def test_statistiche_returns_200(self):
        """Statistiche endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/documenti/statistiche")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_statistiche_has_required_fields(self):
        """Statistiche should return all required fields"""
        response = requests.get(f"{BASE_URL}/api/documenti/statistiche")
        assert response.status_code == 200
        
        data = response.json()
        
        # Required fields
        assert "totale" in data, "Missing 'totale' field"
        assert "nuovi" in data, "Missing 'nuovi' field"
        assert "processati" in data, "Missing 'processati' field"
        assert "da_processare" in data, "Missing 'da_processare' field"
        assert "by_category" in data, "Missing 'by_category' field"
        assert "categories" in data, "Missing 'categories' field"
        
        # Validate types
        assert isinstance(data["totale"], int), "totale should be int"
        assert isinstance(data["nuovi"], int), "nuovi should be int"
        assert isinstance(data["processati"], int), "processati should be int"
        assert isinstance(data["by_category"], list), "by_category should be list"
        assert isinstance(data["categories"], dict), "categories should be dict"
    
    def test_statistiche_categories_structure(self):
        """Statistiche by_category should have proper structure"""
        response = requests.get(f"{BASE_URL}/api/documenti/statistiche")
        data = response.json()
        
        for cat in data.get("by_category", []):
            assert "category" in cat, "Missing category field in by_category item"
            assert "count" in cat, "Missing count field in by_category item"


class TestDocumentiLista:
    """Test /api/documenti/lista endpoint"""
    
    def test_lista_returns_200(self):
        """Lista endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/documenti/lista")
        assert response.status_code == 200
    
    def test_lista_has_required_fields(self):
        """Lista should return documents array and metadata"""
        response = requests.get(f"{BASE_URL}/api/documenti/lista")
        data = response.json()
        
        assert "documents" in data, "Missing 'documents' field"
        assert "total" in data, "Missing 'total' field"
        assert "by_category" in data, "Missing 'by_category' field"
        assert "by_status" in data, "Missing 'by_status' field"
        assert "categories" in data, "Missing 'categories' field"
        
        assert isinstance(data["documents"], list), "documents should be list"
        assert isinstance(data["total"], int), "total should be int"
    
    def test_lista_document_structure(self):
        """Each document should have required fields"""
        response = requests.get(f"{BASE_URL}/api/documenti/lista?limit=5")
        data = response.json()
        
        if data["documents"]:
            doc = data["documents"][0]
            # Required fields for each document
            assert "id" in doc, "Document missing 'id'"
            assert "filename" in doc, "Document missing 'filename'"
            assert "category" in doc, "Document missing 'category'"
            assert "status" in doc, "Document missing 'status'"
    
    def test_lista_filter_by_categoria(self):
        """Lista should filter by categoria"""
        response = requests.get(f"{BASE_URL}/api/documenti/lista?categoria=f24")
        assert response.status_code == 200
        
        data = response.json()
        for doc in data.get("documents", []):
            assert doc.get("category") == "f24", f"Expected category f24, got {doc.get('category')}"
    
    def test_lista_pagination(self):
        """Lista should support pagination"""
        response = requests.get(f"{BASE_URL}/api/documenti/lista?limit=5&skip=0")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data.get("documents", [])) <= 5, "Limit not respected"


class TestDocumentiCategorie:
    """Test /api/documenti/categorie endpoint"""
    
    def test_categorie_returns_200(self):
        """Categorie endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/documenti/categorie")
        assert response.status_code == 200
    
    def test_categorie_has_required_fields(self):
        """Categorie should return categories and descriptions"""
        response = requests.get(f"{BASE_URL}/api/documenti/categorie")
        data = response.json()
        
        assert "categories" in data, "Missing 'categories' field"
        assert "descriptions" in data, "Missing 'descriptions' field"
        
        # Verify expected categories exist
        categories = data["categories"]
        expected_cats = ["f24", "fattura", "busta_paga", "estratto_conto", "altro"]
        for cat in expected_cats:
            assert cat in categories, f"Missing expected category: {cat}"


class TestDocumentiDownload:
    """Test /api/documenti/documento/{doc_id}/download endpoint - MongoDB-only architecture"""
    
    def test_download_nonexistent_document_returns_404(self):
        """Download of non-existent document should return 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/documenti/documento/{fake_id}/download")
        assert response.status_code == 404
    
    def test_download_without_pdf_data_returns_404(self):
        """Download should return 404 if pdf_data is missing (MongoDB-only architecture)"""
        # Get a document from the list
        list_response = requests.get(f"{BASE_URL}/api/documenti/lista?limit=1")
        docs = list_response.json().get("documents", [])
        
        if docs:
            doc_id = docs[0]["id"]
            # Check if document has pdf_data
            doc_response = requests.get(f"{BASE_URL}/api/documenti/documento/{doc_id}")
            doc_data = doc_response.json()
            
            if not doc_data.get("pdf_data"):
                # Document without pdf_data should return 404 on download
                download_response = requests.get(f"{BASE_URL}/api/documenti/documento/{doc_id}/download")
                assert download_response.status_code == 404, \
                    f"Expected 404 for document without pdf_data, got {download_response.status_code}"
                
                # Verify error message mentions MongoDB/PDF not available
                error_data = download_response.json()
                error_msg = error_data.get("detail", "") or error_data.get("message", "")
                assert "MongoDB" in error_msg or "PDF non disponibile" in error_msg, \
                    f"Error should mention MongoDB/PDF not available: {error_msg}"


class TestDocumentiCambiaCategoria:
    """Test /api/documenti/documento/{doc_id}/cambia-categoria endpoint - MongoDB only"""
    
    def test_cambia_categoria_success(self):
        """Cambia categoria should update only MongoDB (no filesystem)"""
        # Get a document
        list_response = requests.get(f"{BASE_URL}/api/documenti/lista?limit=1")
        docs = list_response.json().get("documents", [])
        
        if not docs:
            pytest.skip("No documents available for testing")
        
        doc_id = docs[0]["id"]
        original_category = docs[0]["category"]
        
        # Change to a different category
        new_category = "fattura" if original_category != "fattura" else "altro"
        
        response = requests.post(
            f"{BASE_URL}/api/documenti/documento/{doc_id}/cambia-categoria",
            params={"nuova_categoria": new_category}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert data.get("nuova_categoria") == new_category, f"Expected {new_category}"
        
        # Verify change persisted in MongoDB
        verify_response = requests.get(f"{BASE_URL}/api/documenti/documento/{doc_id}")
        verify_data = verify_response.json()
        assert verify_data.get("category") == new_category, "Category not persisted in MongoDB"
        
        # Restore original category
        requests.post(
            f"{BASE_URL}/api/documenti/documento/{doc_id}/cambia-categoria",
            params={"nuova_categoria": original_category}
        )
    
    def test_cambia_categoria_invalid_category(self):
        """Cambia categoria should reject invalid categories"""
        list_response = requests.get(f"{BASE_URL}/api/documenti/lista?limit=1")
        docs = list_response.json().get("documents", [])
        
        if not docs:
            pytest.skip("No documents available for testing")
        
        doc_id = docs[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/documenti/documento/{doc_id}/cambia-categoria",
            params={"nuova_categoria": "invalid_category_xyz"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid category, got {response.status_code}"
    
    def test_cambia_categoria_nonexistent_document(self):
        """Cambia categoria should return 404 for non-existent document"""
        fake_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/documenti/documento/{fake_id}/cambia-categoria",
            params={"nuova_categoria": "fattura"}
        )
        
        assert response.status_code == 404


class TestDocumentiElimina:
    """Test DELETE /api/documenti/documento/{doc_id} endpoint - MongoDB only"""
    
    def test_elimina_nonexistent_document_returns_404(self):
        """Delete of non-existent document should return 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/documenti/documento/{fake_id}")
        assert response.status_code == 404
    
    # Note: We don't test actual deletion to avoid losing real data
    # In a real test environment, we would create a test document first


class TestDocumentiGetSingolo:
    """Test GET /api/documenti/documento/{doc_id} endpoint"""
    
    def test_get_documento_success(self):
        """Get single document should return document data"""
        list_response = requests.get(f"{BASE_URL}/api/documenti/lista?limit=1")
        docs = list_response.json().get("documents", [])
        
        if not docs:
            pytest.skip("No documents available for testing")
        
        doc_id = docs[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/documenti/documento/{doc_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("id") == doc_id
        assert "filename" in data
        assert "category" in data
    
    def test_get_documento_nonexistent_returns_404(self):
        """Get non-existent document should return 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/documenti/documento/{fake_id}")
        assert response.status_code == 404


class TestBackendStartup:
    """Test that backend starts without errors"""
    
    def test_health_check(self):
        """Backend should respond to health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        # Accept 200 or 404 (if health endpoint doesn't exist)
        assert response.status_code in [200, 404], f"Backend not responding: {response.status_code}"
    
    def test_documenti_endpoints_accessible(self):
        """All documenti endpoints should be accessible"""
        endpoints = [
            "/api/documenti/statistiche",
            "/api/documenti/lista",
            "/api/documenti/categorie"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 200, f"Endpoint {endpoint} returned {response.status_code}"


# Fixtures
@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
