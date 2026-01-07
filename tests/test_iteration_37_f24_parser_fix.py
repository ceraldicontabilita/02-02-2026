"""
Test F24 Parser Fix - Iteration 37
Verifies that the F24 commercialista parser correctly extracts ALL tribute rows
as separate records, even when they have the same codice tributo but different
anni/periodi/importi.

Bug fixed: Parser was aggregating rows with same codice tributo.
Fix: Using re.finditer instead of re.search to iterate ALL tribute rows.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Expected F24 ID from the uploaded file
F24_STIPENDI_ID = "e551ec48-80d6-4ad0-8559-1d8373252c6b"


class TestF24ParserFix:
    """Test that F24 parser extracts all tribute rows separately"""
    
    def test_f24_has_13_tributi_erario(self):
        """F24 stipendi novembre should have exactly 13 tributi erario"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista/{F24_STIPENDI_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        sezione_erario = data.get("sezione_erario", [])
        
        assert len(sezione_erario) == 13, f"Expected 13 tributi erario, got {len(sezione_erario)}"
        print(f"✅ F24 has {len(sezione_erario)} tributi erario (expected 13)")
    
    def test_codice_3802_appears_twice(self):
        """Codice 3802 should appear twice (2024 and 2025)"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista/{F24_STIPENDI_ID}")
        assert response.status_code == 200
        
        data = response.json()
        sezione_erario = data.get("sezione_erario", [])
        
        # Filter for codice 3802
        tributi_3802 = [t for t in sezione_erario if t["codice_tributo"] == "3802"]
        
        assert len(tributi_3802) == 2, f"Expected 2 occurrences of codice 3802, got {len(tributi_3802)}"
        
        # Verify different years
        anni = sorted([t.get("anno") for t in tributi_3802])
        assert "2024" in anni, "Missing 3802 for year 2024"
        assert "2025" in anni, "Missing 3802 for year 2025"
        
        # Verify importi
        importi = sorted([t["importo_debito"] for t in tributi_3802])
        assert abs(importi[0] - 142.88) < 0.01, f"Expected €142.88 for 3802/2024, got €{importi[0]}"
        assert abs(importi[1] - 185.52) < 0.01, f"Expected €185.52 for 3802/2025, got €{importi[1]}"
        
        print(f"✅ Codice 3802 appears twice: 2024 (€142.88) and 2025 (€185.52)")
    
    def test_codice_3847_appears_twice(self):
        """Codice 3847 should appear twice with different importi (€7.89 and €35.94)"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista/{F24_STIPENDI_ID}")
        assert response.status_code == 200
        
        data = response.json()
        sezione_erario = data.get("sezione_erario", [])
        
        # Filter for codice 3847
        tributi_3847 = [t for t in sezione_erario if t["codice_tributo"] == "3847"]
        
        assert len(tributi_3847) == 2, f"Expected 2 occurrences of codice 3847, got {len(tributi_3847)}"
        
        # Verify importi
        importi = sorted([t["importo_debito"] for t in tributi_3847])
        assert abs(importi[0] - 7.89) < 0.01, f"Expected €7.89 for 3847, got €{importi[0]}"
        assert abs(importi[1] - 35.94) < 0.01, f"Expected €35.94 for 3847, got €{importi[1]}"
        
        print(f"✅ Codice 3847 appears twice: €7.89 and €35.94")
    
    def test_codice_3797_appears_twice(self):
        """Codice 3797 should appear twice (€49.02 and €64.46)"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista/{F24_STIPENDI_ID}")
        assert response.status_code == 200
        
        data = response.json()
        sezione_erario = data.get("sezione_erario", [])
        
        # Filter for codice 3797
        tributi_3797 = [t for t in sezione_erario if t["codice_tributo"] == "3797"]
        
        assert len(tributi_3797) == 2, f"Expected 2 occurrences of codice 3797, got {len(tributi_3797)}"
        
        # Verify importi
        importi = sorted([t["importo_debito"] for t in tributi_3797])
        assert abs(importi[0] - 49.02) < 0.01, f"Expected €49.02 for 3797, got €{importi[0]}"
        assert abs(importi[1] - 64.46) < 0.01, f"Expected €64.46 for 3797, got €{importi[1]}"
        
        print(f"✅ Codice 3797 appears twice: €49.02 and €64.46")
    
    def test_codice_1001_appears_twice(self):
        """Codice 1001 should appear twice (€1288.72 and €64.46)"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista/{F24_STIPENDI_ID}")
        assert response.status_code == 200
        
        data = response.json()
        sezione_erario = data.get("sezione_erario", [])
        
        # Filter for codice 1001
        tributi_1001 = [t for t in sezione_erario if t["codice_tributo"] == "1001"]
        
        assert len(tributi_1001) == 2, f"Expected 2 occurrences of codice 1001, got {len(tributi_1001)}"
        
        # Verify importi
        importi = sorted([t["importo_debito"] for t in tributi_1001])
        assert abs(importi[0] - 64.46) < 0.01, f"Expected €64.46 for 1001, got €{importi[0]}"
        assert abs(importi[1] - 1288.72) < 0.01, f"Expected €1288.72 for 1001, got €{importi[1]}"
        
        print(f"✅ Codice 1001 appears twice: €64.46 and €1288.72")
    
    def test_saldo_netto_is_correct(self):
        """Saldo netto should be €10,345.68"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista/{F24_STIPENDI_ID}")
        assert response.status_code == 200
        
        data = response.json()
        saldo_netto = data.get("totali", {}).get("saldo_netto", 0)
        
        # Allow small floating point tolerance
        expected_saldo = 10345.68
        assert abs(saldo_netto - expected_saldo) < 0.01, f"Expected saldo €{expected_saldo}, got €{saldo_netto}"
        
        print(f"✅ Saldo netto: €{saldo_netto:.2f} (expected €{expected_saldo:.2f})")
    
    def test_all_tributi_have_required_fields(self):
        """All tributi should have required fields"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista/{F24_STIPENDI_ID}")
        assert response.status_code == 200
        
        data = response.json()
        sezione_erario = data.get("sezione_erario", [])
        
        required_fields = ["codice_tributo", "anno", "importo_debito", "periodo_riferimento"]
        
        for i, tributo in enumerate(sezione_erario):
            for field in required_fields:
                assert field in tributo, f"Tributo {i} missing field: {field}"
                assert tributo[field] is not None, f"Tributo {i} has None value for: {field}"
        
        print(f"✅ All {len(sezione_erario)} tributi have required fields")


class TestF24ListAPI:
    """Test F24 list API returns correct data"""
    
    def test_commercialista_list_includes_f24_with_13_tributi(self):
        """GET /api/f24-riconciliazione/commercialista should include F24 with 13 tributi"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista")
        assert response.status_code == 200
        
        data = response.json()
        f24_list = data.get("f24_list", [])
        
        # Find the F24 stipendi novembre
        f24_stipendi = None
        for f24 in f24_list:
            if f24.get("id") == F24_STIPENDI_ID:
                f24_stipendi = f24
                break
        
        assert f24_stipendi is not None, f"F24 {F24_STIPENDI_ID} not found in list"
        
        # Verify it has 13 tributi erario
        sezione_erario = f24_stipendi.get("sezione_erario", [])
        assert len(sezione_erario) == 13, f"Expected 13 tributi in list, got {len(sezione_erario)}"
        
        print(f"✅ F24 list includes F24 with {len(sezione_erario)} tributi erario")
    
    def test_totale_da_pagare_includes_correct_amount(self):
        """Totale da pagare should include €10,345.68 from F24 stipendi"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista?status=da_pagare")
        assert response.status_code == 200
        
        data = response.json()
        totale_da_pagare = data.get("totale_da_pagare", 0)
        
        # Should be at least €10,345.68 (could be more if other F24s exist)
        assert totale_da_pagare >= 10345.68, f"Totale da pagare €{totale_da_pagare} is less than expected €10,345.68"
        
        print(f"✅ Totale da pagare: €{totale_da_pagare:.2f}")


class TestDashboardAPI:
    """Test dashboard API reflects correct data"""
    
    def test_dashboard_shows_correct_totale_da_pagare(self):
        """Dashboard should show correct totale da pagare"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        totale_da_pagare = data.get("totale_da_pagare", 0)
        
        # Should include at least €10,345.68 from F24 stipendi
        assert totale_da_pagare >= 10345.68, f"Dashboard totale €{totale_da_pagare} is less than expected"
        
        print(f"✅ Dashboard totale da pagare: €{totale_da_pagare:.2f}")


class TestDeduplicationLogic:
    """Test that deduplication only removes exact duplicates"""
    
    def test_same_codice_different_anno_not_deduplicated(self):
        """Same codice with different anno should NOT be deduplicated"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista/{F24_STIPENDI_ID}")
        assert response.status_code == 200
        
        data = response.json()
        sezione_erario = data.get("sezione_erario", [])
        
        # Check 3802 - same codice, different anni
        tributi_3802 = [t for t in sezione_erario if t["codice_tributo"] == "3802"]
        assert len(tributi_3802) == 2, "3802 with different anni should not be deduplicated"
        
        anni_3802 = set([t.get("anno") for t in tributi_3802])
        assert len(anni_3802) == 2, "3802 should have 2 different anni"
        
        print(f"✅ Codice 3802 with different anni preserved: {anni_3802}")
    
    def test_same_codice_different_importo_not_deduplicated(self):
        """Same codice with different importo should NOT be deduplicated"""
        response = requests.get(f"{BASE_URL}/api/f24-riconciliazione/commercialista/{F24_STIPENDI_ID}")
        assert response.status_code == 200
        
        data = response.json()
        sezione_erario = data.get("sezione_erario", [])
        
        # Check 3847 - same codice, same anno, different importi
        tributi_3847 = [t for t in sezione_erario if t["codice_tributo"] == "3847"]
        assert len(tributi_3847) == 2, "3847 with different importi should not be deduplicated"
        
        importi_3847 = set([t["importo_debito"] for t in tributi_3847])
        assert len(importi_3847) == 2, "3847 should have 2 different importi"
        
        print(f"✅ Codice 3847 with different importi preserved: {importi_3847}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
