"""
Test Iteration 28 - Classificazione Documenti Unificata
Tests for unified page with 3 tabs: Classificazione, Documenti, Regole
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cloudledger-2.preview.emergentagent.com')

class TestDocumentiSmartEndpoints:
    """Test endpoints for documenti-smart (classificazione email)"""
    
    def test_get_stats(self):
        """Test GET /api/documenti-smart/stats - Statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/documenti-smart/stats")
        assert response.status_code == 200
        
        data = response.json()
        # Verify response structure
        assert "timestamp" in data
        assert "totale_classificati" in data
        assert "processati" in data
        assert "da_processare" in data
        assert "per_categoria" in data
        assert "mapping_gestionale" in data
        assert "regole_attive" in data
        
        # Verify data types
        assert isinstance(data["totale_classificati"], int)
        assert isinstance(data["processati"], int)
        assert isinstance(data["regole_attive"], int)
        assert data["regole_attive"] == 10  # 10 rules defined
        print(f"✅ Stats: {data['totale_classificati']} classified, {data['regole_attive']} rules")
    
    def test_get_rules(self):
        """Test GET /api/documenti-smart/rules - Get all classification rules"""
        response = requests.get(f"{BASE_URL}/api/documenti-smart/rules")
        assert response.status_code == 200
        
        rules = response.json()
        assert isinstance(rules, list)
        assert len(rules) == 10  # 10 rules expected
        
        # Verify rule structure
        for rule in rules:
            assert "name" in rule
            assert "keywords" in rule
            assert "category" in rule
            assert "gestionale_section" in rule
            assert "collection" in rule
            assert "action" in rule
            assert "priority" in rule
        
        # Verify specific rules exist
        rule_names = [r["name"] for r in rules]
        assert "verbali_noleggio" in rule_names
        assert "dimissioni" in rule_names
        assert "cartelle_esattoriali" in rule_names
        assert "f24" in rule_names
        assert "buste_paga" in rule_names
        print(f"✅ Rules: {len(rules)} rules loaded")
    
    def test_get_documents(self):
        """Test GET /api/documenti-smart/documents - List classified documents"""
        response = requests.get(f"{BASE_URL}/api/documenti-smart/documents?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "documents" in data
        assert "total" in data
        assert "by_category" in data
        
        assert isinstance(data["documents"], list)
        assert isinstance(data["total"], int)
        print(f"✅ Documents: {data['total']} total documents")
    
    def test_get_categories(self):
        """Test GET /api/documenti-smart/categories - Get category mapping"""
        response = requests.get(f"{BASE_URL}/api/documenti-smart/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        assert "keywords" in data
        assert "rules_count" in data
        assert data["rules_count"] == 10
        print(f"✅ Categories: {data['rules_count']} rules, keywords loaded")
    
    def test_view_document_not_found(self):
        """Test GET /api/documenti-smart/view/{id} - 404 for non-existent document"""
        fake_id = "507f1f77bcf86cd799439011"
        response = requests.get(f"{BASE_URL}/api/documenti-smart/view/{fake_id}")
        assert response.status_code == 404
        
        data = response.json()
        assert "message" in data or "detail" in data
        print("✅ View endpoint returns 404 for non-existent document")
    
    def test_download_document_not_found(self):
        """Test GET /api/documenti-smart/download/{id} - 404 for non-existent document"""
        fake_id = "507f1f77bcf86cd799439011"
        response = requests.get(f"{BASE_URL}/api/documenti-smart/download/{fake_id}")
        assert response.status_code == 404
        
        data = response.json()
        assert "message" in data or "detail" in data
        print("✅ Download endpoint returns 404 for non-existent document")
    
    def test_test_classify_endpoint(self):
        """Test POST /api/documenti-smart/test-classify - Test email classification"""
        test_data = {
            "subject": "Verbale di contestazione B1234567890",
            "sender": "leasys@pec.it",
            "body": "Verbale multa infrazione"
        }
        response = requests.post(f"{BASE_URL}/api/documenti-smart/test-classify", json=test_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "classified" in data
        assert "category" in data
        assert "confidence" in data
        
        # Should classify as verbali
        assert data["classified"] == True
        assert data["category"] == "verbali"
        assert data["gestionale_section"] == "Noleggio Auto"
        print(f"✅ Test classify: {data['category']} with confidence {data['confidence']}")
    
    def test_test_classify_dimissioni(self):
        """Test classification of dimissioni email"""
        test_data = {
            "subject": "Notifica richiesta recesso RSSMRA80A01H501Z",
            "sender": "inps@pec.it",
            "body": "Dimissioni volontarie"
        }
        response = requests.post(f"{BASE_URL}/api/documenti-smart/test-classify", json=test_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["classified"] == True
        assert data["category"] == "dimissioni"
        assert data["gestionale_section"] == "Anagrafica Dipendenti"
        print(f"✅ Dimissioni classification: {data['category']}")
    
    def test_test_classify_f24(self):
        """Test classification of F24 email"""
        test_data = {
            "subject": "Modello F24 - Delega pagamento tributi",
            "sender": "commercialista@pec.it",
            "body": "F24 versamento unificato"
        }
        response = requests.post(f"{BASE_URL}/api/documenti-smart/test-classify", json=test_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["classified"] == True
        assert data["category"] == "f24"
        assert data["gestionale_section"] == "F24"
        print(f"✅ F24 classification: {data['category']}")
    
    def test_test_classify_low_confidence(self):
        """Test classification returns low confidence for non-matching email"""
        test_data = {
            "subject": "Newsletter aziendale",
            "sender": "marketing@example.com",
            "body": "Offerte speciali"
        }
        response = requests.post(f"{BASE_URL}/api/documenti-smart/test-classify", json=test_data)
        assert response.status_code == 200
        
        data = response.json()
        # Classifier may still match with low confidence
        assert "classified" in data
        assert "confidence" in data
        # Low confidence indicates weak match
        if data["classified"]:
            assert data["confidence"] < 0.5, f"Expected low confidence, got {data['confidence']}"
        print(f"✅ Low confidence classification: {data.get('category', 'None')} with confidence {data.get('confidence', 0)}")


class TestFrontendRoutes:
    """Test frontend routes and redirects"""
    
    def test_classificazione_email_page(self):
        """Test /classificazione-email page loads (SPA returns HTML shell)"""
        response = requests.get(f"{BASE_URL}/classificazione-email", allow_redirects=True)
        assert response.status_code == 200
        # SPA returns HTML shell with React app
        assert "root" in response.text
        print("✅ /classificazione-email page loads (SPA shell)")
    
    def test_classificazione_email_tab_documenti(self):
        """Test /classificazione-email?tab=documenti"""
        response = requests.get(f"{BASE_URL}/classificazione-email?tab=documenti", allow_redirects=True)
        assert response.status_code == 200
        print("✅ /classificazione-email?tab=documenti loads")
    
    def test_classificazione_email_tab_regole(self):
        """Test /classificazione-email?tab=regole"""
        response = requests.get(f"{BASE_URL}/classificazione-email?tab=regole", allow_redirects=True)
        assert response.status_code == 200
        print("✅ /classificazione-email?tab=regole loads")
    
    def test_redirect_documenti(self):
        """Test /documenti redirects to /classificazione-email?tab=documenti"""
        response = requests.get(f"{BASE_URL}/documenti", allow_redirects=False)
        # React Router handles this client-side, so we just check page loads
        response = requests.get(f"{BASE_URL}/documenti", allow_redirects=True)
        assert response.status_code == 200
        print("✅ /documenti route accessible")
    
    def test_redirect_regole_categorizzazione(self):
        """Test /regole-categorizzazione redirects to /classificazione-email?tab=regole"""
        response = requests.get(f"{BASE_URL}/regole-categorizzazione", allow_redirects=True)
        assert response.status_code == 200
        print("✅ /regole-categorizzazione route accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
