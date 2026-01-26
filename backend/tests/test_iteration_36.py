"""
Test Iteration 36 - Testing new features:
1. Chat Intelligente (replaces Parlant)
2. Schede Tecniche endpoints
3. Documenti Non Associati PDF endpoint (supports images)
4. DELETE movimento estratto conto
5. Parlant removed (404)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestParlantRemoved:
    """Verify Parlant has been removed"""
    
    def test_parlant_status_returns_404(self):
        """Parlant status endpoint should return 404"""
        response = requests.get(f"{BASE_URL}/api/parlant/status")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: /api/parlant/status returns 404 (Parlant removed)")


class TestChatIntelligente:
    """Test Chat Intelligente endpoint (replaces Parlant)"""
    
    def test_chat_ask_endpoint_exists(self):
        """Chat ask endpoint should exist and respond"""
        response = requests.post(
            f"{BASE_URL}/api/chat/ask",
            json={"question": "Quante fatture ho?", "use_ai": True}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "response" in data, "Response should contain 'response' field"
        assert "success" in data, "Response should contain 'success' field"
        print(f"PASS: Chat responded with: {data.get('response', '')[:100]}...")
    
    def test_chat_ask_without_ai(self):
        """Chat should work without AI mode"""
        response = requests.post(
            f"{BASE_URL}/api/chat/ask",
            json={"question": "Panoramica generale", "use_ai": False}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Chat works without AI mode")


class TestSchedeTecniche:
    """Test Schede Tecniche endpoints"""
    
    def test_lista_schede_tecniche(self):
        """GET /api/schede-tecniche/lista should return list"""
        response = requests.get(f"{BASE_URL}/api/schede-tecniche/lista")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "schede" in data, "Response should contain 'schede' field"
        assert "total" in data, "Response should contain 'total' field"
        print(f"PASS: Schede tecniche lista returns {data['total']} items")
    
    def test_statistiche_riepilogo(self):
        """GET /api/schede-tecniche/statistiche/riepilogo should return stats"""
        response = requests.get(f"{BASE_URL}/api/schede-tecniche/statistiche/riepilogo")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "totale" in data, "Response should contain 'totale' field"
        assert "associate_prodotto" in data, "Response should contain 'associate_prodotto' field"
        assert "non_associate" in data, "Response should contain 'non_associate' field"
        print(f"PASS: Schede tecniche stats: totale={data['totale']}, associate={data['associate_prodotto']}")


class TestDocumentiNonAssociati:
    """Test Documenti Non Associati endpoints"""
    
    def test_lista_documenti(self):
        """GET /api/documenti-non-associati/lista should return documents"""
        response = requests.get(f"{BASE_URL}/api/documenti-non-associati/lista?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "documenti" in data, "Response should contain 'documenti' field"
        assert "total" in data, "Response should contain 'total' field"
        print(f"PASS: Documenti non associati lista returns {data['total']} total items")
        return data.get("documenti", [])
    
    def test_pdf_endpoint_with_png(self):
        """PDF endpoint should handle PNG files"""
        # First get a PNG document
        response = requests.get(f"{BASE_URL}/api/documenti-non-associati/lista?limit=50")
        data = response.json()
        
        png_doc = None
        for doc in data.get("documenti", []):
            if doc.get("filename", "").lower().endswith(('.png', '.jpg', '.jpeg')):
                png_doc = doc
                break
        
        if png_doc:
            pdf_response = requests.get(f"{BASE_URL}/api/documenti-non-associati/pdf/{png_doc['id']}")
            assert pdf_response.status_code == 200, f"Expected 200, got {pdf_response.status_code}"
            content_type = pdf_response.headers.get("content-type", "")
            assert "image" in content_type, f"Expected image content type, got {content_type}"
            print(f"PASS: PDF endpoint returns image for PNG file: {content_type}")
        else:
            print("SKIP: No PNG/JPG documents found to test")
    
    def test_pdf_endpoint_with_pdf(self):
        """PDF endpoint should handle PDF files"""
        response = requests.get(f"{BASE_URL}/api/documenti-non-associati/lista?limit=50")
        data = response.json()
        
        pdf_doc = None
        for doc in data.get("documenti", []):
            if doc.get("filename", "").lower().endswith('.pdf'):
                pdf_doc = doc
                break
        
        if pdf_doc:
            pdf_response = requests.get(f"{BASE_URL}/api/documenti-non-associati/pdf/{pdf_doc['id']}")
            assert pdf_response.status_code == 200, f"Expected 200, got {pdf_response.status_code}"
            content_type = pdf_response.headers.get("content-type", "")
            assert "pdf" in content_type, f"Expected PDF content type, got {content_type}"
            print(f"PASS: PDF endpoint returns PDF for PDF file: {content_type}")
        else:
            print("SKIP: No PDF documents found to test")


class TestEliminaMovimento:
    """Test DELETE movimento estratto conto"""
    
    def test_delete_non_existent_movimento_returns_404(self):
        """DELETE non-existent movimento should return 404"""
        response = requests.delete(f"{BASE_URL}/api/estratto-conto-movimenti/non-existent-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "Movimento non trovato" in str(data), "Should return 'Movimento non trovato' message"
        print("PASS: DELETE non-existent movimento returns 404 with correct message")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Health endpoint should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("status") == "healthy", "Status should be healthy"
        print("PASS: Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
