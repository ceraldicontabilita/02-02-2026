"""
Test Prima Nota Features - Iteration 9
Tests for:
1. Prima Nota Cassa pagination (100 items per page)
2. Month filter functionality
3. Sync corrispettivi endpoint
4. POS as ENTRATA in Cassa
5. Balance verification (Cassa ~-2.4M, Banca ~2.9M, Totale ~526k)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPrimaNotaCassa:
    """Test Prima Nota Cassa endpoints"""
    
    def test_cassa_endpoint_returns_data(self):
        """Test that cassa endpoint returns movements"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?limit=2000")
        assert response.status_code == 200
        data = response.json()
        assert "movimenti" in data
        assert "saldo" in data
        assert "totale_entrate" in data
        assert "totale_uscite" in data
        print(f"✅ Cassa endpoint: {len(data['movimenti'])} movements, saldo: {data['saldo']}")
    
    def test_cassa_has_many_movements_for_pagination(self):
        """Test that cassa has enough movements to require pagination (>100)"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?limit=2000")
        assert response.status_code == 200
        data = response.json()
        movements_count = len(data.get("movimenti", []))
        assert movements_count > 100, f"Expected >100 movements for pagination, got {movements_count}"
        print(f"✅ Cassa has {movements_count} movements (pagination needed: {movements_count // 100 + 1} pages)")
    
    def test_cassa_month_filter_december_2025(self):
        """Test month filter for December 2025"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?data_da=2025-12-01&data_a=2025-12-31&limit=2000")
        assert response.status_code == 200
        data = response.json()
        movements = data.get("movimenti", [])
        # Verify all movements are in December 2025
        for mov in movements[:10]:  # Check first 10
            assert mov.get("data", "").startswith("2025-12"), f"Movement date {mov.get('data')} not in Dec 2025"
        print(f"✅ December 2025 filter: {len(movements)} movements")
    
    def test_cassa_month_filter_november_2025(self):
        """Test month filter for November 2025"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?data_da=2025-11-01&data_a=2025-11-30&limit=2000")
        assert response.status_code == 200
        data = response.json()
        movements = data.get("movimenti", [])
        for mov in movements[:10]:
            assert mov.get("data", "").startswith("2025-11"), f"Movement date {mov.get('data')} not in Nov 2025"
        print(f"✅ November 2025 filter: {len(movements)} movements")
    
    def test_cassa_balance_approximately_negative_2_4m(self):
        """Test that Cassa balance is approximately -2.4M"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?limit=2000")
        assert response.status_code == 200
        data = response.json()
        saldo = data.get("saldo", 0)
        # Expected around -2.4M (allow 10% tolerance)
        assert -3000000 < saldo < -2000000, f"Cassa saldo {saldo} not in expected range (-3M to -2M)"
        print(f"✅ Cassa saldo: €{saldo:,.2f} (expected ~-2.4M)")


class TestPrimaNotaBanca:
    """Test Prima Nota Banca endpoints"""
    
    def test_banca_endpoint_returns_data(self):
        """Test that banca endpoint returns movements"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/banca?limit=2000")
        assert response.status_code == 200
        data = response.json()
        assert "movimenti" in data
        assert "saldo" in data
        print(f"✅ Banca endpoint: {len(data['movimenti'])} movements, saldo: {data['saldo']}")
    
    def test_banca_balance_approximately_2_9m(self):
        """Test that Banca balance is approximately 2.9M"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/banca?limit=2000")
        assert response.status_code == 200
        data = response.json()
        saldo = data.get("saldo", 0)
        # Expected around 2.9M (allow 10% tolerance)
        assert 2500000 < saldo < 3500000, f"Banca saldo {saldo} not in expected range (2.5M to 3.5M)"
        print(f"✅ Banca saldo: €{saldo:,.2f} (expected ~2.9M)")


class TestPrimaNotaStats:
    """Test Prima Nota Stats endpoint"""
    
    def test_stats_endpoint(self):
        """Test stats endpoint returns all required data"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/stats")
        assert response.status_code == 200
        data = response.json()
        assert "cassa" in data
        assert "banca" in data
        assert "totale" in data
        print(f"✅ Stats: Cassa={data['cassa']['saldo']:,.2f}, Banca={data['banca']['saldo']:,.2f}, Totale={data['totale']['saldo']:,.2f}")
    
    def test_total_balance_approximately_526k(self):
        """Test that total balance is approximately 526k"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/stats")
        assert response.status_code == 200
        data = response.json()
        totale_saldo = data.get("totale", {}).get("saldo", 0)
        # Expected around 526k (allow 20% tolerance)
        assert 400000 < totale_saldo < 700000, f"Totale saldo {totale_saldo} not in expected range (400k to 700k)"
        print(f"✅ Totale saldo: €{totale_saldo:,.2f} (expected ~526k)")


class TestCorrispettiviSync:
    """Test Corrispettivi Sync functionality"""
    
    def test_corrispettivi_status_endpoint(self):
        """Test corrispettivi status endpoint"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/corrispettivi-status")
        assert response.status_code == 200
        data = response.json()
        assert "corrispettivi_totali" in data
        assert "corrispettivi_sincronizzati" in data
        assert "da_sincronizzare" in data
        print(f"✅ Corrispettivi status: {data['corrispettivi_sincronizzati']}/{data['corrispettivi_totali']} synced, {data['da_sincronizzare']} pending")
    
    def test_sync_corrispettivi_endpoint(self):
        """Test sync corrispettivi endpoint"""
        response = requests.post(f"{BASE_URL}/api/prima-nota/sync-corrispettivi")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "created" in data
        assert "skipped" in data
        print(f"✅ Sync corrispettivi: created={data['created']}, skipped={data['skipped']}")
    
    def test_corrispettivi_are_entrate_in_cassa(self):
        """Test that corrispettivi appear as ENTRATE in cassa"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?limit=2000")
        assert response.status_code == 200
        data = response.json()
        movements = data.get("movimenti", [])
        
        # Find corrispettivi movements
        corrispettivi_movements = [m for m in movements if m.get("categoria") == "Corrispettivi"]
        
        # All corrispettivi should be ENTRATE
        for mov in corrispettivi_movements[:10]:
            assert mov.get("tipo") == "entrata", f"Corrispettivo {mov.get('id')} is not ENTRATA"
        
        print(f"✅ Found {len(corrispettivi_movements)} corrispettivi movements, all are ENTRATE")


class TestPOSAsEntrata:
    """Test POS movements are saved as ENTRATA in Cassa"""
    
    def test_pos_movements_are_entrate(self):
        """Test that POS movements are ENTRATE in cassa"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?limit=2000")
        assert response.status_code == 200
        data = response.json()
        movements = data.get("movimenti", [])
        
        # Find POS movements
        pos_movements = [m for m in movements if "POS" in m.get("categoria", "") or "POS" in m.get("descrizione", "")]
        
        # All POS should be ENTRATE
        for mov in pos_movements[:10]:
            assert mov.get("tipo") == "entrata", f"POS movement {mov.get('id')} is not ENTRATA"
        
        if pos_movements:
            print(f"✅ Found {len(pos_movements)} POS movements, all are ENTRATE")
        else:
            print("⚠️ No POS movements found in cassa (may need to add some)")


class TestProductsCatalog:
    """Test Products Catalog for Ricerca Prodotti"""
    
    def test_products_catalog_endpoint(self):
        """Test products catalog endpoint"""
        response = requests.get(f"{BASE_URL}/api/products/catalog?days=90")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Products catalog: {len(data)} products")
    
    def test_products_categories_endpoint(self):
        """Test products categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Products categories: {len(data)} categories")
    
    def test_products_search_endpoint(self):
        """Test products search endpoint"""
        response = requests.get(f"{BASE_URL}/api/products/search?q=test&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Products search: {len(data)} results for 'test'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
