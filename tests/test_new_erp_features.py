"""
Test suite for new ERP features:
1. HACCP Scheduler - status and trigger-now endpoints
2. Prima Nota Cassa - PUT/DELETE endpoints
3. Prima Nota Banca - PUT endpoint
4. F24 - PUT/DELETE endpoints
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHACCPScheduler:
    """Test HACCP Scheduler endpoints"""
    
    def test_scheduler_status(self):
        """GET /api/haccp-completo/scheduler/status - should return running=true"""
        response = requests.get(f"{BASE_URL}/api/haccp-completo/scheduler/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "running" in data, "Response should contain 'running' field"
        assert data["running"] == True, f"Scheduler should be running, got: {data['running']}"
        assert "jobs" in data, "Response should contain 'jobs' field"
        print(f"✅ Scheduler status: running={data['running']}, jobs={len(data.get('jobs', []))}")
    
    def test_scheduler_trigger_now(self):
        """POST /api/haccp-completo/scheduler/trigger-now - should execute auto-population"""
        response = requests.post(f"{BASE_URL}/api/haccp-completo/scheduler/trigger-now")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Trigger should succeed, got: {data}"
        assert "message" in data, "Response should contain 'message' field"
        assert "timestamp" in data, "Response should contain 'timestamp' field"
        print(f"✅ Scheduler trigger: {data['message']}")


class TestPrimaNotaCassa:
    """Test Prima Nota Cassa PUT/DELETE endpoints"""
    
    @pytest.fixture
    def create_test_movement(self):
        """Create a test movement for testing PUT/DELETE"""
        test_data = {
            "data": datetime.now().strftime("%Y-%m-%d"),
            "tipo": "entrata",
            "importo": 100.50,
            "descrizione": f"TEST_movimento_{uuid.uuid4().hex[:8]}",
            "categoria": "Incasso cliente",
            "note": "Test movement for PUT/DELETE testing"
        }
        response = requests.post(f"{BASE_URL}/api/prima-nota/cassa", json=test_data)
        assert response.status_code == 200, f"Failed to create test movement: {response.text}"
        
        data = response.json()
        movement_id = data.get("id")
        assert movement_id, "Response should contain 'id' field"
        
        yield movement_id
        
        # Cleanup - try to delete if still exists
        requests.delete(f"{BASE_URL}/api/prima-nota/cassa/{movement_id}")
    
    def test_put_cassa_movement(self, create_test_movement):
        """PUT /api/prima-nota/cassa/{id} - should update a movement"""
        movement_id = create_test_movement
        
        update_data = {
            "importo": 200.75,
            "descrizione": "TEST_updated_description",
            "categoria": "Pagamento fornitore",
            "note": "Updated note"
        }
        
        response = requests.put(f"{BASE_URL}/api/prima-nota/cassa/{movement_id}", json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message' field"
        assert data.get("id") == movement_id, "Response should contain correct id"
        print(f"✅ PUT cassa movement: {data['message']}")
        
        # Verify update by fetching the list
        list_response = requests.get(f"{BASE_URL}/api/prima-nota/cassa")
        assert list_response.status_code == 200
        
        movements = list_response.json().get("movimenti", [])
        updated_mov = next((m for m in movements if m.get("id") == movement_id), None)
        
        if updated_mov:
            assert updated_mov.get("importo") == 200.75, f"Importo should be updated, got: {updated_mov.get('importo')}"
            assert updated_mov.get("descrizione") == "TEST_updated_description", "Descrizione should be updated"
            print(f"✅ Verified update: importo={updated_mov.get('importo')}, descrizione={updated_mov.get('descrizione')}")
    
    def test_delete_cassa_movement(self, create_test_movement):
        """DELETE /api/prima-nota/cassa/{id} - should delete a movement"""
        movement_id = create_test_movement
        
        response = requests.delete(f"{BASE_URL}/api/prima-nota/cassa/{movement_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message' field"
        print(f"✅ DELETE cassa movement: {data['message']}")
        
        # Verify deletion - should return 404 on second delete
        response2 = requests.delete(f"{BASE_URL}/api/prima-nota/cassa/{movement_id}")
        assert response2.status_code == 404, f"Second delete should return 404, got {response2.status_code}"
        print(f"✅ Verified deletion: second delete returns 404")
    
    def test_put_nonexistent_cassa(self):
        """PUT /api/prima-nota/cassa/{id} with non-existent id should return 404"""
        fake_id = f"nonexistent_{uuid.uuid4().hex}"
        response = requests.put(f"{BASE_URL}/api/prima-nota/cassa/{fake_id}", json={"importo": 100})
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ PUT non-existent returns 404")
    
    def test_delete_nonexistent_cassa(self):
        """DELETE /api/prima-nota/cassa/{id} with non-existent id should return 404"""
        fake_id = f"nonexistent_{uuid.uuid4().hex}"
        response = requests.delete(f"{BASE_URL}/api/prima-nota/cassa/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ DELETE non-existent returns 404")


class TestPrimaNotaBanca:
    """Test Prima Nota Banca PUT endpoint"""
    
    @pytest.fixture
    def create_test_banca_movement(self):
        """Create a test banca movement for testing PUT"""
        test_data = {
            "data": datetime.now().strftime("%Y-%m-%d"),
            "tipo": "uscita",
            "importo": 500.00,
            "descrizione": f"TEST_banca_{uuid.uuid4().hex[:8]}",
            "categoria": "Bonifico in uscita",
            "note": "Test banca movement"
        }
        response = requests.post(f"{BASE_URL}/api/prima-nota/banca", json=test_data)
        assert response.status_code == 200, f"Failed to create test banca movement: {response.text}"
        
        data = response.json()
        movement_id = data.get("id")
        assert movement_id, "Response should contain 'id' field"
        
        yield movement_id
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/prima-nota/banca/{movement_id}")
    
    def test_put_banca_movement(self, create_test_banca_movement):
        """PUT /api/prima-nota/banca/{id} - should update a banca movement"""
        movement_id = create_test_banca_movement
        
        update_data = {
            "importo": 750.25,
            "descrizione": "TEST_banca_updated",
            "categoria": "Pagamento fornitore"
        }
        
        response = requests.put(f"{BASE_URL}/api/prima-nota/banca/{movement_id}", json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message' field"
        print(f"✅ PUT banca movement: {data['message']}")
        
        # Verify update
        list_response = requests.get(f"{BASE_URL}/api/prima-nota/banca")
        assert list_response.status_code == 200
        
        movements = list_response.json().get("movimenti", [])
        updated_mov = next((m for m in movements if m.get("id") == movement_id), None)
        
        if updated_mov:
            assert updated_mov.get("importo") == 750.25, f"Importo should be updated"
            print(f"✅ Verified banca update: importo={updated_mov.get('importo')}")


class TestF24:
    """Test F24 PUT/DELETE endpoints"""
    
    @pytest.fixture
    def create_test_f24(self):
        """Create a test F24 record for testing PUT/DELETE"""
        # First, check if we can create via direct API (not PDF upload)
        # We'll use the models endpoint to check existing and create test data
        
        # Get existing F24s
        response = requests.get(f"{BASE_URL}/api/f24-public/models")
        assert response.status_code == 200, f"Failed to get F24 list: {response.text}"
        
        f24s = response.json().get("f24s", [])
        
        if f24s:
            # Use existing F24 for testing
            test_f24 = f24s[0]
            yield test_f24.get("id"), False  # False = don't delete after test
        else:
            # No F24s exist, skip test
            pytest.skip("No F24 records available for testing")
    
    def test_get_f24_models(self):
        """GET /api/f24-public/models - should return F24 list"""
        response = requests.get(f"{BASE_URL}/api/f24-public/models")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "f24s" in data, "Response should contain 'f24s' field"
        assert "count" in data, "Response should contain 'count' field"
        print(f"✅ GET F24 models: count={data['count']}")
    
    def test_put_f24_model(self, create_test_f24):
        """PUT /api/f24-public/models/{id} - should update an F24"""
        f24_id, should_delete = create_test_f24
        
        update_data = {
            "note": f"TEST_note_updated_{datetime.now().isoformat()}",
            "banca": "TEST_BANCA_UPDATED"
        }
        
        response = requests.put(f"{BASE_URL}/api/f24-public/models/{f24_id}", json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message' field"
        assert data.get("id") == f24_id, "Response should contain correct id"
        print(f"✅ PUT F24 model: {data['message']}")
    
    def test_put_nonexistent_f24(self):
        """PUT /api/f24-public/models/{id} with non-existent id should return 404"""
        fake_id = f"nonexistent_{uuid.uuid4().hex}"
        response = requests.put(f"{BASE_URL}/api/f24-public/models/{fake_id}", json={"note": "test"})
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ PUT non-existent F24 returns 404")
    
    def test_delete_nonexistent_f24(self):
        """DELETE /api/f24-public/models/{id} with non-existent id should return 404"""
        fake_id = f"nonexistent_{uuid.uuid4().hex}"
        response = requests.delete(f"{BASE_URL}/api/f24-public/models/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ DELETE non-existent F24 returns 404")


class TestPrimaNotaDeleteBanca:
    """Test Prima Nota Banca DELETE endpoint"""
    
    @pytest.fixture
    def create_deletable_banca_movement(self):
        """Create a banca movement specifically for deletion test"""
        test_data = {
            "data": datetime.now().strftime("%Y-%m-%d"),
            "tipo": "uscita",
            "importo": 123.45,
            "descrizione": f"TEST_delete_banca_{uuid.uuid4().hex[:8]}",
            "categoria": "Altro"
        }
        response = requests.post(f"{BASE_URL}/api/prima-nota/banca", json=test_data)
        assert response.status_code == 200, f"Failed to create: {response.text}"
        
        movement_id = response.json().get("id")
        yield movement_id
    
    def test_delete_banca_movement(self, create_deletable_banca_movement):
        """DELETE /api/prima-nota/banca/{id} - should delete a banca movement"""
        movement_id = create_deletable_banca_movement
        
        response = requests.delete(f"{BASE_URL}/api/prima-nota/banca/{movement_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message' field"
        print(f"✅ DELETE banca movement: {data['message']}")
        
        # Verify deletion
        response2 = requests.delete(f"{BASE_URL}/api/prima-nota/banca/{movement_id}")
        assert response2.status_code == 404, f"Second delete should return 404"
        print(f"✅ Verified banca deletion: second delete returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
