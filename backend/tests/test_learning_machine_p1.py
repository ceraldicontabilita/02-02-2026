"""
Test Learning Machine APIs - Task P1
Tests for:
1. GET /api/fornitori-learning/lista - List configured suppliers (>100)
2. PUT /api/fatture/{id}/classifica - Manual invoice classification
3. POST /api/fornitori-learning/riclassifica-con-keywords - Reclassify invoices
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLearningMachineAPIs:
    """Learning Machine API tests"""
    
    def test_fornitori_learning_lista_count(self):
        """Test that fornitori-learning/lista returns > 100 configured suppliers"""
        response = requests.get(f"{BASE_URL}/api/fornitori-learning/lista")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "totale" in data, "Response should contain 'totale' field"
        assert "fornitori" in data, "Response should contain 'fornitori' field"
        
        # Verify > 100 configured suppliers
        totale = data["totale"]
        assert totale > 100, f"Expected > 100 configured suppliers, got {totale}"
        print(f"✓ Found {totale} configured suppliers (> 100)")
        
        # Verify fornitori list matches count
        assert len(data["fornitori"]) == totale, "Fornitori list length should match totale"
    
    def test_fornitori_learning_lista_structure(self):
        """Test fornitori-learning/lista response structure"""
        response = requests.get(f"{BASE_URL}/api/fornitori-learning/lista")
        assert response.status_code == 200
        
        data = response.json()
        if data["fornitori"]:
            fornitore = data["fornitori"][0]
            # Check required fields
            required_fields = ["fornitore_nome", "keywords", "fatture_count"]
            for field in required_fields:
                assert field in fornitore, f"Fornitore should have '{field}' field"
            print(f"✓ Fornitore structure is correct")
    
    def test_centri_costo_disponibili(self):
        """Test centri-costo-disponibili endpoint"""
        response = requests.get(f"{BASE_URL}/api/fornitori-learning/centri-costo-disponibili")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one centro di costo"
        
        # Check structure
        if data:
            cdc = data[0]
            assert "id" in cdc, "Centro costo should have 'id'"
            assert "nome" in cdc, "Centro costo should have 'nome'"
        print(f"✓ Found {len(data)} centri di costo disponibili")
    
    def test_riclassifica_con_keywords(self):
        """Test riclassifica-con-keywords endpoint"""
        response = requests.post(f"{BASE_URL}/api/fornitori-learning/riclassifica-con-keywords")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data, "Response should contain 'success' field"
        assert data["success"] == True, "Reclassification should succeed"
        assert "totale_riclassificate" in data, "Response should contain 'totale_riclassificate'"
        print(f"✓ Reclassified {data['totale_riclassificate']} invoices")


class TestFattureClassificaAPI:
    """Test PUT /api/fatture/{id}/classifica endpoint"""
    
    @pytest.fixture
    def sample_invoice_id(self):
        """Get a sample invoice ID for testing"""
        response = requests.get(f"{BASE_URL}/api/invoices?limit=1")
        if response.status_code == 200:
            data = response.json()
            if data:
                return data[0]["id"]
        pytest.skip("No invoices available for testing")
    
    def test_classifica_fattura_success(self, sample_invoice_id):
        """Test successful invoice classification"""
        response = requests.put(
            f"{BASE_URL}/api/fatture/{sample_invoice_id}/classifica",
            json={"centro_costo_id": "1.1_CAFFE_BEVANDE_CALDE"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True, "Classification should succeed"
        assert "centro_costo_id" in data, "Response should contain centro_costo_id"
        assert "centro_costo_nome" in data, "Response should contain centro_costo_nome"
        print(f"✓ Invoice classified successfully as '{data['centro_costo_nome']}'")
    
    def test_classifica_fattura_missing_centro_costo(self, sample_invoice_id):
        """Test classification without centro_costo_id"""
        response = requests.put(
            f"{BASE_URL}/api/fatture/{sample_invoice_id}/classifica",
            json={}
        )
        assert response.status_code == 400, "Should return 400 for missing centro_costo_id"
        print("✓ Correctly returns 400 for missing centro_costo_id")
    
    def test_classifica_fattura_not_found(self):
        """Test classification of non-existent invoice"""
        response = requests.put(
            f"{BASE_URL}/api/fatture/non-existent-id/classifica",
            json={"centro_costo_id": "1.1_CAFFE_BEVANDE_CALDE"}
        )
        assert response.status_code == 404, "Should return 404 for non-existent invoice"
        print("✓ Correctly returns 404 for non-existent invoice")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
