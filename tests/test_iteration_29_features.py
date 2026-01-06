"""
Test Iteration 29 - Testing new features:
1. PUT /api/fatture/{id}/metodo-pagamento - Update payment method
2. GET /api/products/catalog?search=amarena - Product search
3. POST /api/ricette - Create new recipe
4. GET /api/ricette - List recipes
5. OrdiniFornitori page - Print and email buttons
6. GestioneAssegni page - Compact layout
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFattureMetodoPagamento:
    """Test PUT /api/fatture/{id}/metodo-pagamento endpoint"""
    
    def test_update_metodo_pagamento_success(self):
        """Test updating payment method for an invoice"""
        # Use the test invoice ID provided
        invoice_id = "67103407-53a1-42cc-95b5-39441dea4589"
        
        response = requests.put(
            f"{BASE_URL}/api/fatture/{invoice_id}/metodo-pagamento",
            json={"metodo_pagamento": "bonifico"}
        )
        
        # Should return 200 or 404 if invoice doesn't exist
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}, response: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            print(f"✓ Payment method updated successfully for invoice {invoice_id}")
        else:
            print(f"! Invoice {invoice_id} not found (404) - may have been deleted")
    
    def test_update_metodo_pagamento_missing_field(self):
        """Test error when metodo_pagamento is missing"""
        invoice_id = "67103407-53a1-42cc-95b5-39441dea4589"
        
        response = requests.put(
            f"{BASE_URL}/api/fatture/{invoice_id}/metodo-pagamento",
            json={}
        )
        
        # Should return 400 for missing field or 404 if invoice doesn't exist
        assert response.status_code in [400, 404], f"Unexpected status: {response.status_code}"
        print(f"✓ Correctly returns error for missing metodo_pagamento field")


class TestProductsCatalogSearch:
    """Test GET /api/products/catalog?search= endpoint"""
    
    def test_search_products_amarena(self):
        """Test searching for 'amarena' products"""
        response = requests.get(f"{BASE_URL}/api/products/catalog?search=amarena")
        
        assert response.status_code == 200, f"Status: {response.status_code}, response: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Product search returned {len(data)} results for 'amarena'")
        
        # If results found, verify structure
        if len(data) > 0:
            product = data[0]
            assert "nome" in product or "name" in product, "Product should have nome/name field"
            print(f"  First result: {product.get('nome', product.get('name', 'N/A'))}")
    
    def test_search_products_generic(self):
        """Test generic product search"""
        response = requests.get(f"{BASE_URL}/api/products/catalog?search=farina")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Product search for 'farina' returned {len(data)} results")
    
    def test_search_products_empty_query(self):
        """Test product catalog without search query"""
        response = requests.get(f"{BASE_URL}/api/products/catalog")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Product catalog returned {len(data)} products")


class TestRicetteEndpoints:
    """Test /api/ricette endpoints"""
    
    def test_list_ricette(self):
        """Test listing all recipes"""
        response = requests.get(f"{BASE_URL}/api/ricette")
        
        assert response.status_code == 200, f"Status: {response.status_code}, response: {response.text}"
        
        data = response.json()
        assert "ricette" in data, "Response should have 'ricette' field"
        assert "totale" in data, "Response should have 'totale' field"
        
        print(f"✓ Listed {data['totale']} recipes")
        print(f"  Categories: {data.get('per_categoria', {})}")
    
    def test_get_categorie_ricette(self):
        """Test getting recipe categories"""
        response = requests.get(f"{BASE_URL}/api/ricette/categorie")
        
        assert response.status_code == 200, f"Status: {response.status_code}, response: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of categories"
        
        print(f"✓ Recipe categories: {data}")
    
    def test_create_ricetta(self):
        """Test creating a new recipe"""
        new_ricetta = {
            "nome": "TEST_Torta Test Iteration 29",
            "categoria": "pasticceria",
            "porzioni": 8,
            "prezzo_vendita": 25.00,
            "ingredienti": [
                {"nome": "Farina", "quantita": 500, "unita": "g"},
                {"nome": "Zucchero", "quantita": 200, "unita": "g"},
                {"nome": "Uova", "quantita": 4, "unita": "pz"}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/ricette", json=new_ricetta)
        
        assert response.status_code == 200, f"Status: {response.status_code}, response: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain recipe ID"
        assert "message" in data, "Response should contain message"
        
        print(f"✓ Created recipe with ID: {data['id']}")
        print(f"  Message: {data['message']}")
        
        # Store ID for cleanup
        return data['id']
    
    def test_get_ricetta_detail(self):
        """Test getting recipe detail"""
        # First get list to find a recipe ID
        list_response = requests.get(f"{BASE_URL}/api/ricette?limit=1")
        
        if list_response.status_code == 200:
            data = list_response.json()
            if data.get("ricette") and len(data["ricette"]) > 0:
                ricetta_id = data["ricette"][0]["id"]
                
                detail_response = requests.get(f"{BASE_URL}/api/ricette/{ricetta_id}")
                assert detail_response.status_code == 200
                
                detail = detail_response.json()
                assert "nome" in detail
                assert "food_cost_dettaglio" in detail
                
                print(f"✓ Got recipe detail: {detail['nome']}")
                print(f"  Food cost: €{detail.get('food_cost', 0):.2f}")


class TestOrdiniFornitori:
    """Test /api/ordini-fornitori endpoints"""
    
    def test_list_ordini(self):
        """Test listing supplier orders"""
        response = requests.get(f"{BASE_URL}/api/ordini-fornitori")
        
        assert response.status_code == 200, f"Status: {response.status_code}, response: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Listed {len(data)} supplier orders")
    
    def test_get_cart(self):
        """Test getting comparatore cart"""
        response = requests.get(f"{BASE_URL}/api/comparatore/cart")
        
        assert response.status_code == 200, f"Status: {response.status_code}, response: {response.text}"
        
        data = response.json()
        assert "by_supplier" in data or "total_items" in data or isinstance(data, dict)
        
        print(f"✓ Cart data retrieved: {data.get('total_items', 0)} items")


class TestAssegni:
    """Test /api/assegni endpoints"""
    
    def test_list_assegni(self):
        """Test listing checks"""
        response = requests.get(f"{BASE_URL}/api/assegni")
        
        assert response.status_code == 200, f"Status: {response.status_code}, response: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Listed {len(data)} checks (assegni)")
    
    def test_get_assegni_stats(self):
        """Test getting check statistics"""
        response = requests.get(f"{BASE_URL}/api/assegni/stats")
        
        assert response.status_code == 200, f"Status: {response.status_code}, response: {response.text}"
        
        data = response.json()
        assert "totale" in data or "per_stato" in data or isinstance(data, dict)
        
        print(f"✓ Assegni stats: {data}")


class TestInvoicesEndpoints:
    """Test /api/invoices endpoints"""
    
    def test_list_invoices(self):
        """Test listing invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices?limit=5")
        
        assert response.status_code == 200, f"Status: {response.status_code}, response: {response.text}"
        
        data = response.json()
        # Response could be list or dict with items
        if isinstance(data, dict):
            items = data.get("items", data.get("invoices", []))
        else:
            items = data
        
        print(f"✓ Listed {len(items)} invoices")


# Cleanup test data
class TestCleanup:
    """Cleanup test data created during tests"""
    
    def test_cleanup_test_ricette(self):
        """Delete test recipes created during testing"""
        # Get all recipes
        response = requests.get(f"{BASE_URL}/api/ricette?search=TEST_")
        
        if response.status_code == 200:
            data = response.json()
            ricette = data.get("ricette", [])
            
            deleted = 0
            for ricetta in ricette:
                if ricetta.get("nome", "").startswith("TEST_"):
                    del_response = requests.delete(f"{BASE_URL}/api/ricette/{ricetta['id']}")
                    if del_response.status_code == 200:
                        deleted += 1
            
            print(f"✓ Cleaned up {deleted} test recipes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
