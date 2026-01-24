"""
Test Suite API per Riconciliazione Intelligente
================================================

Test degli endpoint REST API per il sistema di riconciliazione intelligente.
Verifica: dashboard, conferma-pagamento, applica-spostamento, rianalizza, 
stato-estratto, lock-manuale, migra-fatture-legacy.
"""

import pytest
import requests
import os
import uuid

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smart-doc-extract-1.preview.emergentagent.com').rstrip('/')


class TestRiconciliazioneIntelligenteDashboard:
    """Test per l'endpoint GET /api/riconciliazione-intelligente/dashboard"""
    
    def test_dashboard_returns_success(self):
        """Test: Dashboard ritorna success=true"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✅ Dashboard returns success=true")
    
    def test_dashboard_has_conteggi(self):
        """Test: Dashboard contiene conteggi per tutti gli stati"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        conteggi = data.get("conteggi", {})
        stati_attesi = [
            "in_attesa_conferma", "confermata_cassa", "confermata_banca",
            "sospesa_attesa_estratto", "da_verificare_spostamento", 
            "da_verificare_match_incerto", "anomalia_non_in_estratto",
            "riconciliata", "lock_manuale"
        ]
        
        for stato in stati_attesi:
            assert stato in conteggi, f"Stato {stato} mancante nei conteggi"
            assert isinstance(conteggi[stato], int), f"Conteggio {stato} non è un intero"
        
        print(f"✅ Dashboard contiene tutti i {len(stati_attesi)} stati")
    
    def test_dashboard_has_fatture_lists(self):
        """Test: Dashboard contiene liste fatture normalizzate"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Verifica presenza liste
        assert "fatture_in_attesa_conferma" in data
        assert "spostamenti_proposti" in data
        assert "match_incerti" in data
        assert "sospese_attesa_estratto" in data
        assert "anomalie" in data
        
        # Verifica che siano liste
        assert isinstance(data["fatture_in_attesa_conferma"], list)
        assert isinstance(data["spostamenti_proposti"], list)
        
        print("✅ Dashboard contiene tutte le liste fatture")
    
    def test_dashboard_fatture_normalized_fields(self):
        """Test: Fatture hanno campi normalizzati (supporta legacy e standard)"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        fatture = data.get("fatture_in_attesa_conferma", [])
        if len(fatture) > 0:
            fattura = fatture[0]
            # Campi normalizzati attesi
            assert "id" in fattura
            assert "numero_documento" in fattura or "invoice_number" in fattura
            assert "data_documento" in fattura or "invoice_date" in fattura
            assert "importo_totale" in fattura or "total_amount" in fattura
            assert "fornitore_ragione_sociale" in fattura or "supplier_name" in fattura
            print(f"✅ Fattura normalizzata: {fattura.get('numero_documento') or fattura.get('invoice_number')}")
        else:
            print("⚠️ Nessuna fattura in attesa conferma per verificare normalizzazione")
    
    def test_dashboard_has_ultima_data_estratto(self):
        """Test: Dashboard contiene ultima_data_estratto"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "ultima_data_estratto" in data
        print(f"✅ Ultima data estratto: {data.get('ultima_data_estratto')}")


class TestConfermaPagamento:
    """Test per l'endpoint POST /api/riconciliazione-intelligente/conferma-pagamento"""
    
    def test_conferma_pagamento_missing_fattura_id(self):
        """Test: Errore se fattura_id mancante"""
        response = requests.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/conferma-pagamento",
            json={"metodo": "cassa"}
        )
        assert response.status_code == 400
        print("✅ Errore 400 per fattura_id mancante")
    
    def test_conferma_pagamento_invalid_metodo(self):
        """Test: Errore se metodo non valido"""
        response = requests.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/conferma-pagamento",
            json={"fattura_id": "test-id", "metodo": "contanti"}  # metodo non valido
        )
        assert response.status_code == 400
        print("✅ Errore 400 per metodo non valido")
    
    def test_conferma_pagamento_fattura_not_found(self):
        """Test: Errore se fattura non trovata"""
        response = requests.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/conferma-pagamento",
            json={"fattura_id": str(uuid.uuid4()), "metodo": "cassa"}
        )
        assert response.status_code == 400
        data = response.json()
        # Error message can be in 'detail' or 'message' field
        error_msg = (data.get("detail", "") or data.get("message", "")).lower()
        assert "non trovata" in error_msg
        print("✅ Errore per fattura non trovata")
    
    def test_conferma_pagamento_cassa_success(self):
        """Test: Conferma pagamento cassa funziona"""
        # Prima ottieni una fattura in attesa
        dashboard = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/dashboard").json()
        fatture = dashboard.get("fatture_in_attesa_conferma", [])
        
        if len(fatture) == 0:
            pytest.skip("Nessuna fattura in attesa conferma per testare")
        
        fattura_id = fatture[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/conferma-pagamento",
            json={"fattura_id": fattura_id, "metodo": "cassa"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("metodo_confermato") == "cassa"
        assert data.get("movimento_prima_nota_collection") == "prima_nota_cassa"
        assert data.get("movimento_prima_nota_id") is not None
        print(f"✅ Conferma cassa: stato={data.get('stato_riconciliazione')}")


class TestApplicaSpostamento:
    """Test per l'endpoint POST /api/riconciliazione-intelligente/applica-spostamento"""
    
    def test_applica_spostamento_missing_fattura_id(self):
        """Test: Errore se fattura_id mancante"""
        response = requests.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/applica-spostamento",
            json={"movimento_estratto_id": "test", "conferma": True}
        )
        assert response.status_code == 400
        print("✅ Errore 400 per fattura_id mancante")
    
    def test_applica_spostamento_missing_movimento_id_on_conferma(self):
        """Test: Errore se movimento_estratto_id mancante con conferma=true"""
        response = requests.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/applica-spostamento",
            json={"fattura_id": "test-id", "conferma": True}
        )
        assert response.status_code == 400
        print("✅ Errore 400 per movimento_estratto_id mancante")
    
    def test_applica_spostamento_fattura_not_found(self):
        """Test: Errore se fattura non trovata"""
        response = requests.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/applica-spostamento",
            json={
                "fattura_id": str(uuid.uuid4()), 
                "movimento_estratto_id": "test",
                "conferma": True
            }
        )
        assert response.status_code == 400
        print("✅ Errore per fattura non trovata")


class TestRianalizza:
    """Test per l'endpoint POST /api/riconciliazione-intelligente/rianalizza"""
    
    def test_rianalizza_returns_success(self):
        """Test: Rianalizza ritorna success=true"""
        response = requests.post(f"{BASE_URL}/api/riconciliazione-intelligente/rianalizza")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✅ Rianalizza returns success=true")
    
    def test_rianalizza_has_required_fields(self):
        """Test: Rianalizza contiene campi richiesti"""
        response = requests.post(f"{BASE_URL}/api/riconciliazione-intelligente/rianalizza")
        assert response.status_code == 200
        data = response.json()
        
        assert "analizzate" in data
        assert "spostamenti_proposti" in data
        assert "riconciliate" in data
        assert "ancora_sospese" in data
        assert "anomalie" in data
        
        assert isinstance(data["analizzate"], int)
        assert isinstance(data["spostamenti_proposti"], list)
        assert isinstance(data["riconciliate"], list)
        
        print(f"✅ Rianalizza: {data['analizzate']} fatture analizzate")


class TestStatoEstratto:
    """Test per l'endpoint GET /api/riconciliazione-intelligente/stato-estratto"""
    
    def test_stato_estratto_returns_success(self):
        """Test: Stato estratto ritorna success=true"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/stato-estratto")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✅ Stato estratto returns success=true")
    
    def test_stato_estratto_has_required_fields(self):
        """Test: Stato estratto contiene campi richiesti"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/stato-estratto")
        assert response.status_code == 200
        data = response.json()
        
        assert "ultima_data_movimento" in data
        assert "totale_movimenti" in data
        assert "movimenti_non_riconciliati" in data
        assert "movimenti_per_anno" in data
        
        assert isinstance(data["totale_movimenti"], int)
        assert isinstance(data["movimenti_non_riconciliati"], int)
        
        print(f"✅ Stato estratto: {data['totale_movimenti']} movimenti, ultimo: {data['ultima_data_movimento']}")


class TestLockManuale:
    """Test per l'endpoint POST /api/riconciliazione-intelligente/lock-manuale"""
    
    def test_lock_manuale_missing_fattura_id(self):
        """Test: Errore se fattura_id mancante"""
        response = requests.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/lock-manuale",
            json={"motivo": "Test"}
        )
        assert response.status_code == 400
        print("✅ Errore 400 per fattura_id mancante")
    
    def test_lock_manuale_fattura_not_found(self):
        """Test: Errore se fattura non trovata"""
        response = requests.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/lock-manuale",
            json={"fattura_id": str(uuid.uuid4()), "motivo": "Test"}
        )
        assert response.status_code == 404
        print("✅ Errore 404 per fattura non trovata")


class TestMigraFattureLegacy:
    """Test per l'endpoint POST /api/riconciliazione-intelligente/migra-fatture-legacy"""
    
    def test_migra_fatture_legacy_returns_success(self):
        """Test: Migrazione ritorna success=true"""
        response = requests.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/migra-fatture-legacy",
            json={"limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✅ Migrazione returns success=true")
    
    def test_migra_fatture_legacy_has_required_fields(self):
        """Test: Migrazione contiene campi richiesti"""
        response = requests.post(
            f"{BASE_URL}/api/riconciliazione-intelligente/migra-fatture-legacy",
            json={"limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "migrate" in data
        assert "in_attesa_conferma" in data
        assert "confermata_cassa" in data
        assert "confermata_banca" in data
        assert "riconciliata" in data
        
        print(f"✅ Migrazione: {data['migrate']} fatture migrate")


class TestStatistiche:
    """Test per l'endpoint GET /api/riconciliazione-intelligente/statistiche"""
    
    def test_statistiche_returns_success(self):
        """Test: Statistiche ritorna success=true"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/statistiche")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✅ Statistiche returns success=true")
    
    def test_statistiche_has_required_fields(self):
        """Test: Statistiche contiene campi richiesti"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/statistiche")
        assert response.status_code == 200
        data = response.json()
        
        assert "conteggi_per_stato" in data
        assert "totale_fatture" in data
        assert "totale_gestite_sistema" in data
        assert "fatture_legacy" in data
        
        print(f"✅ Statistiche: {data['totale_fatture']} fatture totali")


class TestFattureDaConfermare:
    """Test per l'endpoint GET /api/riconciliazione-intelligente/fatture-da-confermare"""
    
    def test_fatture_da_confermare_returns_success(self):
        """Test: Fatture da confermare ritorna success=true"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/fatture-da-confermare")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✅ Fatture da confermare returns success=true")
    
    def test_fatture_da_confermare_with_limit(self):
        """Test: Fatture da confermare rispetta limit"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/fatture-da-confermare?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert "count" in data
        assert "fatture" in data
        assert isinstance(data["fatture"], list)
        assert len(data["fatture"]) <= 5
        
        print(f"✅ Fatture da confermare: {data['count']} fatture (limit=5)")


class TestSpostamentiProposti:
    """Test per l'endpoint GET /api/riconciliazione-intelligente/spostamenti-proposti"""
    
    def test_spostamenti_proposti_returns_success(self):
        """Test: Spostamenti proposti ritorna success=true"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/spostamenti-proposti")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✅ Spostamenti proposti returns success=true")


class TestAnomalie:
    """Test per l'endpoint GET /api/riconciliazione-intelligente/anomalie"""
    
    def test_anomalie_returns_success(self):
        """Test: Anomalie ritorna success=true"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-intelligente/anomalie")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✅ Anomalie returns success=true")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
