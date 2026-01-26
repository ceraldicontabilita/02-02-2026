"""
Test Iteration 39 - Verbali Riconciliazione Driver Association
=============================================================
Tests for:
1. API auto-repair/verifica - statistics on verbali with driver
2. API verbali-riconciliazione/lista - returns driver_nome field
3. API auto-repair/collega-targa-driver - manual targa-driver association
4. API dipendenti - returns list of employees for dropdown
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAutoRepairVerifica:
    """Test /api/auto-repair/verifica endpoint"""
    
    def test_verifica_returns_verbali_statistics(self):
        """Verify that auto-repair/verifica returns verbali statistics with driver info"""
        response = requests.get(f"{BASE_URL}/api/auto-repair/verifica")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check verbali section exists
        assert "verbali" in data, "Response should contain 'verbali' key"
        
        verbali = data["verbali"]
        assert "totale" in verbali, "verbali should have 'totale'"
        assert "con_driver" in verbali, "verbali should have 'con_driver'"
        assert "senza_driver" in verbali, "verbali should have 'senza_driver'"
        assert "percentuale_collegati" in verbali, "verbali should have 'percentuale_collegati'"
        
        # Verify counts are consistent
        assert verbali["totale"] == verbali["con_driver"] + verbali["senza_driver"], \
            "totale should equal con_driver + senza_driver"
        
        print(f"✅ Verbali statistics: {verbali['con_driver']}/{verbali['totale']} with driver ({verbali['percentuale_collegati']}%)")
    
    def test_verifica_returns_veicoli_statistics(self):
        """Verify that auto-repair/verifica returns veicoli statistics"""
        response = requests.get(f"{BASE_URL}/api/auto-repair/verifica")
        
        assert response.status_code == 200
        
        data = response.json()
        
        assert "veicoli" in data, "Response should contain 'veicoli' key"
        
        veicoli = data["veicoli"]
        assert "totale" in veicoli
        assert "con_driver" in veicoli
        assert "senza_driver" in veicoli
        
        print(f"✅ Veicoli statistics: {veicoli['con_driver']}/{veicoli['totale']} with driver")


class TestVerbaliRiconciliazioneLista:
    """Test /api/verbali-riconciliazione/lista endpoint"""
    
    def test_lista_returns_verbali_with_driver_nome(self):
        """Verify that lista returns verbali with driver_nome field populated"""
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/lista")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        assert "success" in data and data["success"] == True
        assert "verbali" in data, "Response should contain 'verbali' key"
        
        verbali = data["verbali"]
        assert isinstance(verbali, list), "verbali should be a list"
        
        # Count verbali with driver_nome
        with_driver_nome = [v for v in verbali if v.get("driver_nome")]
        
        print(f"✅ Found {len(with_driver_nome)}/{len(verbali)} verbali with driver_nome")
        
        # Verify at least some verbali have driver_nome (based on context, should be ~30)
        assert len(with_driver_nome) > 0, "At least some verbali should have driver_nome"
    
    def test_lista_verbali_structure(self):
        """Verify verbali have expected fields"""
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/lista")
        
        assert response.status_code == 200
        
        data = response.json()
        verbali = data.get("verbali", [])
        
        if len(verbali) > 0:
            verbale = verbali[0]
            
            # Check expected fields
            expected_fields = ["numero_verbale", "targa", "stato"]
            for field in expected_fields:
                assert field in verbale, f"Verbale should have '{field}' field"
            
            # Check driver fields for verbali with driver
            verbali_with_driver = [v for v in verbali if v.get("driver_id")]
            if len(verbali_with_driver) > 0:
                v = verbali_with_driver[0]
                assert "driver_id" in v, "Verbale with driver should have driver_id"
                # driver_nome should be present (either from driver_nome or driver field)
                has_driver_name = v.get("driver_nome") or v.get("driver")
                assert has_driver_name, "Verbale with driver should have driver name"
            
            print(f"✅ Verbale structure verified with {len(verbali_with_driver)} having driver info")
    
    def test_lista_filter_by_targa(self):
        """Test filtering verbali by targa"""
        # First get a targa from the list
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/lista")
        assert response.status_code == 200
        
        verbali = response.json().get("verbali", [])
        if len(verbali) > 0:
            targa = verbali[0].get("targa")
            if targa:
                # Filter by this targa
                filter_response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/lista?targa={targa}")
                assert filter_response.status_code == 200
                
                filtered = filter_response.json().get("verbali", [])
                # All filtered verbali should have this targa
                for v in filtered:
                    assert targa.upper() in (v.get("targa") or "").upper(), \
                        f"Filtered verbale should have targa containing {targa}"
                
                print(f"✅ Filter by targa '{targa}' returned {len(filtered)} verbali")


class TestDipendentiAPI:
    """Test /api/dipendenti endpoint for driver dropdown"""
    
    def test_dipendenti_returns_list(self):
        """Verify dipendenti API returns list of employees"""
        response = requests.get(f"{BASE_URL}/api/dipendenti")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one dipendente"
        
        print(f"✅ Found {len(data)} dipendenti")
    
    def test_dipendenti_have_required_fields(self):
        """Verify dipendenti have id and name fields for dropdown"""
        response = requests.get(f"{BASE_URL}/api/dipendenti")
        
        assert response.status_code == 200
        
        data = response.json()
        
        for dip in data[:5]:  # Check first 5
            assert "id" in dip, "Dipendente should have 'id' field"
            # Name can be in different fields
            has_name = dip.get("name") or dip.get("nome_completo") or dip.get("nome")
            assert has_name, "Dipendente should have a name field"
        
        print("✅ Dipendenti have required fields for dropdown")


class TestCollegaTargaDriver:
    """Test /api/auto-repair/collega-targa-driver endpoint"""
    
    def test_collega_targa_driver_requires_params(self):
        """Verify endpoint requires targa and driver_id parameters"""
        # Test without parameters
        response = requests.post(f"{BASE_URL}/api/auto-repair/collega-targa-driver")
        
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422], \
            f"Expected 400 or 422 without params, got {response.status_code}"
        
        print("✅ Endpoint correctly requires parameters")
    
    def test_collega_targa_driver_invalid_driver(self):
        """Verify endpoint returns 404 for invalid driver_id"""
        response = requests.post(
            f"{BASE_URL}/api/auto-repair/collega-targa-driver",
            params={"targa": "XX999XX", "driver_id": "invalid-driver-id-12345"}
        )
        
        assert response.status_code == 404, \
            f"Expected 404 for invalid driver, got {response.status_code}"
        
        print("✅ Endpoint correctly returns 404 for invalid driver")
    
    def test_collega_targa_driver_success(self):
        """Test successful targa-driver association"""
        # First get a valid driver ID
        dip_response = requests.get(f"{BASE_URL}/api/dipendenti")
        assert dip_response.status_code == 200
        
        dipendenti = dip_response.json()
        if len(dipendenti) == 0:
            pytest.skip("No dipendenti available for test")
        
        driver_id = dipendenti[0].get("id")
        driver_name = dipendenti[0].get("name") or dipendenti[0].get("nome_completo") or \
                      f"{dipendenti[0].get('nome', '')} {dipendenti[0].get('cognome', '')}".strip()
        
        # Use a test targa
        test_targa = "TEST99XX"
        
        response = requests.post(
            f"{BASE_URL}/api/auto-repair/collega-targa-driver",
            params={"targa": test_targa, "driver_id": driver_id}
        )
        
        assert response.status_code == 200, \
            f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("targa") == test_targa, "Response should contain targa"
        assert "driver" in data, "Response should contain driver name"
        assert "verbali_aggiornati" in data, "Response should contain verbali_aggiornati count"
        
        print(f"✅ Successfully associated targa {test_targa} to driver {driver_name}")
        print(f"   Verbali updated: {data.get('verbali_aggiornati')}")


class TestVerbaliDashboard:
    """Test /api/verbali-riconciliazione/dashboard endpoint"""
    
    def test_dashboard_returns_statistics(self):
        """Verify dashboard returns correct statistics"""
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/dashboard")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        assert data.get("success") == True
        assert "riepilogo" in data, "Response should contain 'riepilogo'"
        
        riepilogo = data["riepilogo"]
        assert "totale_verbali" in riepilogo
        assert "da_riconciliare" in riepilogo
        assert "totale_importo" in riepilogo
        
        print(f"✅ Dashboard: {riepilogo['totale_verbali']} verbali, {riepilogo['da_riconciliare']} da riconciliare")


class TestAutoRepairGlobale:
    """Test /api/auto-repair/globale endpoint"""
    
    def test_auto_repair_globale_executes(self):
        """Verify auto-repair/globale executes and returns results"""
        response = requests.post(f"{BASE_URL}/api/auto-repair/globale")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        assert data.get("success") == True
        assert "results" in data, "Response should contain 'results'"
        
        results = data["results"]
        assert "verbali_collegati_driver" in results
        assert "timestamp" in results
        
        print(f"✅ Auto-repair globale executed: {results.get('verbali_collegati_driver')} verbali collegati a driver")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
