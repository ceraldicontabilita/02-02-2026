"""
Test suite for Regole Categorizzazione API endpoints.
Tests CRUD operations for categorization rules management via Excel and API.
"""
import pytest
import requests
import os
import io
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRegoleCategorizzazioneAPI:
    """Tests for /api/regole/* endpoints - Categorization rules management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_pattern = f"TEST_FORNITORE_{uuid.uuid4().hex[:8]}"
        self.test_pattern_desc = f"TEST_DESCRIZIONE_{uuid.uuid4().hex[:8]}"
        yield
        # Cleanup: delete test rules
        try:
            self.session.delete(f"{BASE_URL}/api/regole/regole/fornitore/{self.test_pattern}")
            self.session.delete(f"{BASE_URL}/api/regole/regole/descrizione/{self.test_pattern_desc}")
        except:
            pass
    
    # ============== GET /api/regole/regole ==============
    
    def test_get_regole_returns_200(self):
        """GET /api/regole/regole - Should return 200 OK"""
        response = self.session.get(f"{BASE_URL}/api/regole/regole")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_get_regole_returns_required_fields(self):
        """GET /api/regole/regole - Should return regole_fornitori, regole_descrizioni, categorie"""
        response = self.session.get(f"{BASE_URL}/api/regole/regole")
        assert response.status_code == 200
        
        data = response.json()
        assert "regole_fornitori" in data, "Missing regole_fornitori field"
        assert "regole_descrizioni" in data, "Missing regole_descrizioni field"
        assert "categorie" in data, "Missing categorie field"
        assert "piano_conti" in data, "Missing piano_conti field"
        assert "totale_regole" in data, "Missing totale_regole field"
    
    def test_get_regole_fornitori_structure(self):
        """GET /api/regole/regole - regole_fornitori should have correct structure"""
        response = self.session.get(f"{BASE_URL}/api/regole/regole")
        assert response.status_code == 200
        
        data = response.json()
        regole_fornitori = data.get("regole_fornitori", [])
        
        # Should have at least some default rules
        assert len(regole_fornitori) > 0, "regole_fornitori should not be empty"
        
        # Check structure of first rule
        first_rule = regole_fornitori[0]
        assert "pattern" in first_rule, "Rule should have pattern field"
        assert "categoria" in first_rule, "Rule should have categoria field"
    
    def test_get_regole_categorie_structure(self):
        """GET /api/regole/regole - categorie should have correct structure"""
        response = self.session.get(f"{BASE_URL}/api/regole/regole")
        assert response.status_code == 200
        
        data = response.json()
        categorie = data.get("categorie", [])
        
        # Should have categories
        assert len(categorie) > 0, "categorie should not be empty"
        
        # Check structure of first category
        first_cat = categorie[0]
        assert "categoria" in first_cat, "Category should have categoria field"
        assert "conto" in first_cat, "Category should have conto field"
        assert "deducibilita_ires" in first_cat, "Category should have deducibilita_ires field"
        assert "deducibilita_irap" in first_cat, "Category should have deducibilita_irap field"
    
    # ============== GET /api/regole/download-regole ==============
    
    def test_download_regole_returns_200(self):
        """GET /api/regole/download-regole - Should return 200 OK"""
        response = self.session.get(f"{BASE_URL}/api/regole/download-regole")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_download_regole_returns_excel_file(self):
        """GET /api/regole/download-regole - Should return Excel file with correct content-type"""
        response = self.session.get(f"{BASE_URL}/api/regole/download-regole")
        assert response.status_code == 200
        
        content_type = response.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type, \
            f"Expected Excel content-type, got {content_type}"
    
    def test_download_regole_has_content_disposition(self):
        """GET /api/regole/download-regole - Should have Content-Disposition header"""
        response = self.session.get(f"{BASE_URL}/api/regole/download-regole")
        assert response.status_code == 200
        
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, "Should have attachment disposition"
        assert ".xlsx" in content_disposition, "Should be .xlsx file"
    
    def test_download_regole_file_not_empty(self):
        """GET /api/regole/download-regole - Downloaded file should not be empty"""
        response = self.session.get(f"{BASE_URL}/api/regole/download-regole")
        assert response.status_code == 200
        
        content = response.content
        assert len(content) > 1000, f"Excel file too small: {len(content)} bytes"
    
    def test_download_regole_valid_xlsx(self):
        """GET /api/regole/download-regole - Downloaded file should be valid XLSX"""
        response = self.session.get(f"{BASE_URL}/api/regole/download-regole")
        assert response.status_code == 200
        
        # XLSX files start with PK (ZIP signature)
        content = response.content
        assert content[:2] == b'PK', "File should be a valid ZIP/XLSX file"
    
    # ============== POST /api/regole/regole/fornitore ==============
    
    def test_add_regola_fornitore_success(self):
        """POST /api/regole/regole/fornitore - Should add new supplier rule"""
        payload = {
            "pattern": self.test_pattern,
            "categoria": "alimentari",
            "note": "Test rule for pytest"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/regole/regole/fornitore",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("action") in ["created", "updated"], "Should indicate action taken"
    
    def test_add_regola_fornitore_verify_persistence(self):
        """POST /api/regole/regole/fornitore - Verify rule is persisted in GET"""
        payload = {
            "pattern": self.test_pattern,
            "categoria": "bevande_alcoliche",
            "note": "Persistence test"
        }
        
        # Create rule
        response = self.session.post(
            f"{BASE_URL}/api/regole/regole/fornitore",
            json=payload
        )
        assert response.status_code == 200
        
        # Verify in GET
        get_response = self.session.get(f"{BASE_URL}/api/regole/regole")
        assert get_response.status_code == 200
        
        data = get_response.json()
        regole_fornitori = data.get("regole_fornitori", [])
        
        # Find our test rule
        found = any(r.get("pattern") == self.test_pattern for r in regole_fornitori)
        assert found, f"Test rule {self.test_pattern} not found in regole_fornitori"
    
    def test_add_regola_fornitore_missing_pattern(self):
        """POST /api/regole/regole/fornitore - Should fail without pattern"""
        payload = {
            "categoria": "alimentari",
            "note": "Missing pattern"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/regole/regole/fornitore",
            json=payload
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_add_regola_fornitore_missing_categoria(self):
        """POST /api/regole/regole/fornitore - Should fail without categoria"""
        payload = {
            "pattern": "TEST_MISSING_CAT",
            "note": "Missing categoria"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/regole/regole/fornitore",
            json=payload
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_add_regola_fornitore_update_existing(self):
        """POST /api/regole/regole/fornitore - Should update existing rule"""
        # Create first
        payload = {
            "pattern": self.test_pattern,
            "categoria": "alimentari",
            "note": "Original"
        }
        response1 = self.session.post(f"{BASE_URL}/api/regole/regole/fornitore", json=payload)
        assert response1.status_code == 200
        
        # Update with same pattern
        payload["categoria"] = "bevande_alcoliche"
        payload["note"] = "Updated"
        response2 = self.session.post(f"{BASE_URL}/api/regole/regole/fornitore", json=payload)
        assert response2.status_code == 200
        
        data = response2.json()
        assert data.get("action") == "updated", "Should indicate update action"
    
    # ============== POST /api/regole/regole/descrizione ==============
    
    def test_add_regola_descrizione_success(self):
        """POST /api/regole/regole/descrizione - Should add new description rule"""
        payload = {
            "pattern": self.test_pattern_desc,
            "categoria": "caffe",
            "note": "Test description rule"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/regole/regole/descrizione",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
    
    def test_add_regola_descrizione_verify_persistence(self):
        """POST /api/regole/regole/descrizione - Verify rule is persisted in GET"""
        payload = {
            "pattern": self.test_pattern_desc,
            "categoria": "surgelati",
            "note": "Persistence test desc"
        }
        
        # Create rule
        response = self.session.post(
            f"{BASE_URL}/api/regole/regole/descrizione",
            json=payload
        )
        assert response.status_code == 200
        
        # Verify in GET
        get_response = self.session.get(f"{BASE_URL}/api/regole/regole")
        assert get_response.status_code == 200
        
        data = get_response.json()
        regole_descrizioni = data.get("regole_descrizioni", [])
        
        # Find our test rule
        found = any(r.get("pattern") == self.test_pattern_desc for r in regole_descrizioni)
        assert found, f"Test rule {self.test_pattern_desc} not found in regole_descrizioni"
    
    def test_add_regola_descrizione_missing_fields(self):
        """POST /api/regole/regole/descrizione - Should fail without required fields"""
        payload = {"note": "Only note"}
        
        response = self.session.post(
            f"{BASE_URL}/api/regole/regole/descrizione",
            json=payload
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    # ============== DELETE /api/regole/regole/fornitore/{pattern} ==============
    
    def test_delete_regola_fornitore_success(self):
        """DELETE /api/regole/regole/fornitore/{pattern} - Should delete rule"""
        # First create a rule
        payload = {
            "pattern": self.test_pattern,
            "categoria": "alimentari",
            "note": "To be deleted"
        }
        create_response = self.session.post(
            f"{BASE_URL}/api/regole/regole/fornitore",
            json=payload
        )
        assert create_response.status_code == 200
        
        # Delete it
        delete_response = self.session.delete(
            f"{BASE_URL}/api/regole/regole/fornitore/{self.test_pattern}"
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        data = delete_response.json()
        assert data.get("success") == True, "Delete should indicate success"
    
    def test_delete_regola_fornitore_verify_removal(self):
        """DELETE /api/regole/regole/fornitore/{pattern} - Verify rule is removed"""
        # Create
        payload = {
            "pattern": self.test_pattern,
            "categoria": "alimentari",
            "note": "To be deleted and verified"
        }
        self.session.post(f"{BASE_URL}/api/regole/regole/fornitore", json=payload)
        
        # Delete
        self.session.delete(f"{BASE_URL}/api/regole/regole/fornitore/{self.test_pattern}")
        
        # Verify removal
        get_response = self.session.get(f"{BASE_URL}/api/regole/regole")
        assert get_response.status_code == 200
        
        data = get_response.json()
        regole_fornitori = data.get("regole_fornitori", [])
        
        found = any(r.get("pattern") == self.test_pattern for r in regole_fornitori)
        assert not found, f"Test rule {self.test_pattern} should have been deleted"
    
    def test_delete_regola_fornitore_not_found(self):
        """DELETE /api/regole/regole/fornitore/{pattern} - Should return 404 for non-existent"""
        response = self.session.delete(
            f"{BASE_URL}/api/regole/regole/fornitore/NON_EXISTENT_PATTERN_12345"
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ============== DELETE /api/regole/regole/descrizione/{pattern} ==============
    
    def test_delete_regola_descrizione_success(self):
        """DELETE /api/regole/regole/descrizione/{pattern} - Should delete description rule"""
        # First create a rule
        payload = {
            "pattern": self.test_pattern_desc,
            "categoria": "caffe",
            "note": "To be deleted"
        }
        create_response = self.session.post(
            f"{BASE_URL}/api/regole/regole/descrizione",
            json=payload
        )
        assert create_response.status_code == 200
        
        # Delete it
        delete_response = self.session.delete(
            f"{BASE_URL}/api/regole/regole/descrizione/{self.test_pattern_desc}"
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
    
    # ============== Special Characters in Pattern ==============
    
    def test_add_regola_with_special_characters(self):
        """POST /api/regole/regole/fornitore - Should handle special characters in pattern"""
        special_pattern = f"TEST_SPECIAL/{uuid.uuid4().hex[:4]}*"
        
        payload = {
            "pattern": special_pattern,
            "categoria": "alimentari",
            "note": "Pattern with / and *"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/regole/regole/fornitore",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Cleanup
        import urllib.parse
        encoded_pattern = urllib.parse.quote(special_pattern, safe='')
        self.session.delete(f"{BASE_URL}/api/regole/regole/fornitore/{encoded_pattern}")
    
    # ============== Data Integrity Tests ==============
    
    def test_regole_totale_count_correct(self):
        """GET /api/regole/regole - totale_regole should match sum of fornitori + descrizioni"""
        response = self.session.get(f"{BASE_URL}/api/regole/regole")
        assert response.status_code == 200
        
        data = response.json()
        fornitori_count = len(data.get("regole_fornitori", []))
        descrizioni_count = len(data.get("regole_descrizioni", []))
        totale = data.get("totale_regole", 0)
        
        assert totale == fornitori_count + descrizioni_count, \
            f"totale_regole ({totale}) should equal fornitori ({fornitori_count}) + descrizioni ({descrizioni_count})"
    
    def test_categorie_have_valid_conti(self):
        """GET /api/regole/regole - All categorie should have valid conto codes"""
        response = self.session.get(f"{BASE_URL}/api/regole/regole")
        assert response.status_code == 200
        
        data = response.json()
        categorie = data.get("categorie", [])
        piano_conti = data.get("piano_conti", {})
        
        for cat in categorie:
            conto = cat.get("conto", "")
            # Conto should be in format XX.XX.XX
            assert "." in conto, f"Conto {conto} should have dot notation"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
