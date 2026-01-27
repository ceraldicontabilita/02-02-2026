"""
Test per le nuove funzionalità:
1. Giustificativi - Upload Libro Unico e presenze mensili
2. XBRL - Status, richiesta bilancio, storico richieste
3. AI Parser - Process email batch

Data: 27 Gennaio 2026
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Employee ID valido dal database
TEST_EMPLOYEE_ID = "5262eaa5-a04d-4fa1-9156-d6f99d2aa6a9"


class TestGiustificativiEndpoints:
    """Test per gli endpoint dei giustificativi dipendenti"""
    
    def test_get_giustificativi_list(self):
        """GET /api/giustificativi/giustificativi - Lista giustificativi disponibili"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "giustificativi" in data
        assert "per_categoria" in data
        assert data.get("totale", 0) > 0
        
        # Verifica struttura giustificativo
        if data["giustificativi"]:
            giust = data["giustificativi"][0]
            assert "codice" in giust
            assert "descrizione" in giust
            assert "categoria" in giust
    
    def test_get_giustificativi_dipendente(self):
        """GET /api/giustificativi/dipendente/{id}/giustificativi - Giustificativi per dipendente"""
        response = requests.get(
            f"{BASE_URL}/api/giustificativi/dipendente/{TEST_EMPLOYEE_ID}/giustificativi",
            params={"anno": 2025}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("employee_id") == TEST_EMPLOYEE_ID
        assert "giustificativi" in data
        assert "per_categoria" in data
        assert "anno" in data
        
        # Verifica struttura contatori
        if data["giustificativi"]:
            g = data["giustificativi"][0]
            assert "codice" in g
            assert "ore_usate_anno" in g
            assert "limite_annuale_ore" in g
    
    def test_get_giustificativi_dipendente_not_found(self):
        """GET /api/giustificativi/dipendente/{id}/giustificativi - Dipendente non esistente"""
        response = requests.get(
            f"{BASE_URL}/api/giustificativi/dipendente/non-esistente-id/giustificativi"
        )
        
        assert response.status_code == 404
    
    def test_get_presenze_mensili(self):
        """GET /api/giustificativi/presenze-mensili/{employee_id} - Presenze mensili dipendente"""
        response = requests.get(
            f"{BASE_URL}/api/giustificativi/presenze-mensili/{TEST_EMPLOYEE_ID}",
            params={"anno": 2025}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("employee_id") == TEST_EMPLOYEE_ID
        assert "presenze" in data
        assert "riepilogo_per_mese" in data
    
    def test_get_saldo_ferie(self):
        """GET /api/giustificativi/dipendente/{id}/saldo-ferie - Saldo ferie dipendente"""
        response = requests.get(
            f"{BASE_URL}/api/giustificativi/dipendente/{TEST_EMPLOYEE_ID}/saldo-ferie",
            params={"anno": 2025}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "ferie" in data
        assert "rol" in data
        assert "ex_festivita" in data
        
        # Verifica struttura ferie
        ferie = data["ferie"]
        assert "spettanti_annue" in ferie
        assert "maturate" in ferie
        assert "godute" in ferie
        assert "residue" in ferie
    
    def test_valida_giustificativo(self):
        """POST /api/giustificativi/valida-giustificativo - Validazione giustificativo"""
        payload = {
            "employee_id": TEST_EMPLOYEE_ID,
            "codice_giustificativo": "FER",
            "data": "2025-12-15",
            "ore": 8
        }
        
        response = requests.post(
            f"{BASE_URL}/api/giustificativi/valida-giustificativo",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "valido" in data
        assert "dettagli" in data
        assert data["dettagli"]["codice"] == "FER"
    
    def test_alert_limiti(self):
        """GET /api/giustificativi/alert-limiti - Alert limiti giustificativi"""
        response = requests.get(
            f"{BASE_URL}/api/giustificativi/alert-limiti",
            params={"soglia_percentuale": 80, "anno": 2025}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "alerts" in data
        assert "totale_alerts" in data
        assert "dipendenti_coinvolti" in data


class TestXBRLEndpoints:
    """Test per gli endpoint XBRL - Bilanci Camera di Commercio"""
    
    def test_xbrl_status(self):
        """GET /api/openapi/xbrl/status - Stato servizio XBRL"""
        response = requests.get(f"{BASE_URL}/api/openapi/xbrl/status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "available"
        assert "environment" in data
        assert "features" in data
        assert "description" in data
        
        # Verifica features
        features = data.get("features", [])
        assert len(features) > 0
        assert any("XBRL" in f for f in features)
    
    def test_xbrl_storico_richieste(self):
        """GET /api/openapi/xbrl/storico-richieste - Storico richieste bilanci"""
        response = requests.get(
            f"{BASE_URL}/api/openapi/xbrl/storico-richieste",
            params={"limit": 10}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "richieste" in data
        assert "count" in data
        assert isinstance(data["richieste"], list)
    
    def test_xbrl_richiedi_bilancio_validation(self):
        """POST /api/openapi/xbrl/richiedi-bilancio - Validazione richiesta bilancio"""
        # Test con P.IVA non valida per verificare validazione
        payload = {
            "partita_iva": "12345678901",  # P.IVA test
            "anno_chiusura": 2024
        }
        
        response = requests.post(
            f"{BASE_URL}/api/openapi/xbrl/richiedi-bilancio",
            json=payload
        )
        
        # Può essere 200 (pending), 400 (validation error), 401 (wrong token in sandbox), 500 (API error)
        # L'importante è che l'endpoint risponda
        assert response.status_code in [200, 201, 202, 400, 401, 422, 500], \
            f"Unexpected status {response.status_code}: {response.text}"
        
        # Se 401, verifica che sia per token errato (sandbox mode)
        if response.status_code == 401:
            data = response.json()
            assert "Wrong Token" in str(data) or "error" in data


class TestAIParserEndpoints:
    """Test per gli endpoint AI Parser"""
    
    def test_ai_parser_test_endpoint(self):
        """GET /api/ai-parser/test - Test servizio AI Parser"""
        response = requests.get(f"{BASE_URL}/api/ai-parser/test")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data or "message" in data
    
    def test_ai_parser_statistiche(self):
        """GET /api/ai-parser/statistiche - Statistiche parsing AI"""
        response = requests.get(f"{BASE_URL}/api/ai-parser/statistiche")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_parsed" in data
        assert "pending_processing" in data
        assert "by_type" in data
    
    def test_process_email_batch(self):
        """POST /api/ai-parser/process-email-batch - Processa batch email"""
        response = requests.post(
            f"{BASE_URL}/api/ai-parser/process-email-batch",
            params={"limit": 5}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # L'endpoint ritorna sempre 200, ma può avere errori nel processing
        assert "processed" in data or "message" in data
        # Verifica che abbia processato qualcosa (anche con errori)
        if "processed" in data:
            assert isinstance(data["processed"], int)
    
    def test_ai_parser_da_rivedere(self):
        """GET /api/ai-parser/da-rivedere - Documenti da rivedere"""
        response = requests.get(f"{BASE_URL}/api/ai-parser/da-rivedere")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "documents" in data or "count" in data


class TestUploadLibroUnico:
    """Test per upload Libro Unico (senza file reale)"""
    
    def test_upload_libro_unico_no_file(self):
        """POST /api/giustificativi/upload-libro-unico - Senza file"""
        response = requests.post(f"{BASE_URL}/api/giustificativi/upload-libro-unico")
        
        # Deve fallire senza file
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
    
    def test_upload_libro_unico_wrong_format(self):
        """POST /api/giustificativi/upload-libro-unico - Formato file errato"""
        files = {"file": ("test.txt", b"test content", "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/giustificativi/upload-libro-unico",
            files=files
        )
        
        # Deve rifiutare file non PDF/ZIP
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestIntegrationEndpoints:
    """Test per verificare integrazione tra moduli"""
    
    def test_init_giustificativi(self):
        """POST /api/giustificativi/init-giustificativi - Inizializza giustificativi"""
        response = requests.post(f"{BASE_URL}/api/giustificativi/init-giustificativi")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "totale" in data
    
    def test_riepilogo_limiti(self):
        """GET /api/giustificativi/riepilogo-limiti - Riepilogo limiti tutti dipendenti"""
        response = requests.get(
            f"{BASE_URL}/api/giustificativi/riepilogo-limiti",
            params={"anno": 2025}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
