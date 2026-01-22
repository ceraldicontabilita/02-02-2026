"""
TEST GIUSTIFICATIVI DIPENDENTI
==============================

Test suite per il sistema di gestione giustificativi con limiti massimali.
Verifica:
- Inizializzazione giustificativi standard (26 codici italiani)
- Lista giustificativi con filtri per categoria
- Contatori giustificativi per dipendente
- Validazione inserimento con limiti annuali/mensili
- Saldo ferie/ROL/Ex-Festività

Autore: Testing Agent
Data: 22 Gennaio 2026
"""

import pytest
import requests
import os
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pastry-inventory-4.preview.emergentagent.com').rstrip('/')


class TestGiustificativiInit:
    """Test inizializzazione giustificativi standard"""
    
    def test_init_giustificativi_success(self):
        """POST /api/giustificativi/init-giustificativi - Inizializza 26 codici standard"""
        response = requests.post(f"{BASE_URL}/api/giustificativi/init-giustificativi")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["totale"] == 26  # 26 giustificativi standard italiani
        assert "inseriti" in data
        assert "aggiornati" in data


class TestGiustificativiList:
    """Test lista giustificativi"""
    
    def test_get_all_giustificativi(self):
        """GET /api/giustificativi/giustificativi - Lista tutti i giustificativi"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["totale"] >= 25  # Almeno 25 giustificativi
        assert "giustificativi" in data
        assert "per_categoria" in data
        
        # Verifica struttura giustificativo
        giust = data["giustificativi"][0]
        assert "codice" in giust
        assert "descrizione" in giust
        assert "categoria" in giust
        assert "limite_annuale_ore" in giust
        assert "limite_mensile_ore" in giust
        assert "retribuito" in giust
        assert "attivo" in giust
    
    def test_get_giustificativi_by_categoria_ferie(self):
        """GET /api/giustificativi/giustificativi?categoria=ferie - Filtra per categoria ferie"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi?categoria=ferie")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["totale"] >= 1
        
        # Verifica che tutti siano categoria ferie
        for g in data["giustificativi"]:
            assert g["categoria"] == "ferie"
    
    def test_get_giustificativi_by_categoria_permesso(self):
        """GET /api/giustificativi/giustificativi?categoria=permesso - Filtra per categoria permesso"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi?categoria=permesso")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["totale"] >= 5  # ROL, PER, EXF, DON, L104, STUD, SIN, VIS, PNR
        
        for g in data["giustificativi"]:
            assert g["categoria"] == "permesso"
    
    def test_get_giustificativi_by_categoria_malattia(self):
        """GET /api/giustificativi/giustificativi?categoria=malattia - Filtra per categoria malattia"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi?categoria=malattia")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["totale"] >= 2  # MAL, MALF
    
    def test_verify_standard_codes_exist(self):
        """Verifica che i codici standard italiani esistano"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi")
        
        assert response.status_code == 200
        data = response.json()
        
        codici = [g["codice"] for g in data["giustificativi"]]
        
        # Codici standard che devono esistere
        codici_richiesti = ["FER", "ROL", "EXF", "PER", "MAL", "AI", "SMART", "TRAS"]
        
        for codice in codici_richiesti:
            assert codice in codici, f"Codice {codice} non trovato"


class TestGiustificativiDipendente:
    """Test contatori giustificativi per dipendente"""
    
    @pytest.fixture
    def employee_id(self):
        """Ottiene un employee_id valido"""
        response = requests.get(f"{BASE_URL}/api/employees?limit=1")
        if response.status_code == 200:
            data = response.json()
            employees = data.get("employees", data) if isinstance(data, dict) else data
            if employees and len(employees) > 0:
                return employees[0]["id"]
        pytest.skip("Nessun dipendente disponibile per il test")
    
    def test_get_giustificativi_dipendente(self, employee_id):
        """GET /api/giustificativi/dipendente/{id}/giustificativi - Contatori per dipendente"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/{employee_id}/giustificativi?anno=2026")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["employee_id"] == employee_id
        assert "employee_nome" in data
        assert data["anno"] == 2026
        assert "mese_corrente" in data
        assert "giustificativi" in data
        assert "per_categoria" in data
        assert data["totale_giustificativi"] >= 25
        
        # Verifica struttura contatore
        giust = data["giustificativi"][0]
        assert "codice" in giust
        assert "descrizione" in giust
        assert "categoria" in giust
        assert "limite_annuale_ore" in giust
        assert "limite_mensile_ore" in giust
        assert "ore_usate_anno" in giust
        assert "ore_usate_mese" in giust
        assert "residuo_annuale" in giust
        assert "residuo_mensile" in giust
        assert "superato_annuale" in giust
        assert "superato_mensile" in giust
    
    def test_get_giustificativi_dipendente_not_found(self):
        """GET /api/giustificativi/dipendente/{id}/giustificativi - Dipendente non trovato"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/non-existent-id/giustificativi?anno=2026")
        
        assert response.status_code == 404
        data = response.json()
        assert "Dipendente non trovato" in data.get("detail", data.get("message", ""))


class TestValidazioneGiustificativo:
    """Test validazione inserimento giustificativo con limiti"""
    
    @pytest.fixture
    def employee_id(self):
        """Ottiene un employee_id valido"""
        response = requests.get(f"{BASE_URL}/api/employees?limit=1")
        if response.status_code == 200:
            data = response.json()
            employees = data.get("employees", data) if isinstance(data, dict) else data
            if employees and len(employees) > 0:
                return employees[0]["id"]
        pytest.skip("Nessun dipendente disponibile per il test")
    
    def test_valida_giustificativo_ok(self, employee_id):
        """POST /api/giustificativi/valida-giustificativo - Validazione OK"""
        payload = {
            "employee_id": employee_id,
            "codice_giustificativo": "FER",
            "data": "2026-01-22",
            "ore": 8
        }
        
        response = requests.post(
            f"{BASE_URL}/api/giustificativi/valida-giustificativo",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["valido"] is True
        assert data["bloccante"] is False
        assert data["messaggio"] == "OK"
        assert data["errori"] == []
        
        # Verifica dettagli
        assert data["dettagli"]["codice"] == "FER"
        assert data["dettagli"]["descrizione"] == "Ferie"
        assert data["dettagli"]["ore_richieste"] == 8.0
    
    def test_valida_giustificativo_limite_mensile_superato(self, employee_id):
        """POST /api/giustificativi/valida-giustificativo - Limite mensile superato"""
        # PER ha limite_mensile_ore=8
        payload = {
            "employee_id": employee_id,
            "codice_giustificativo": "PER",
            "data": "2026-01-22",
            "ore": 16  # Supera il limite mensile di 8 ore
        }
        
        response = requests.post(
            f"{BASE_URL}/api/giustificativi/valida-giustificativo",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["valido"] is False
        assert data["bloccante"] is True
        assert "limite_mensile_superato" in data["errori"][0]["tipo"]
        assert data["errori"][0]["ore_disponibili"] <= 8
    
    def test_valida_giustificativo_codice_non_trovato(self, employee_id):
        """POST /api/giustificativi/valida-giustificativo - Codice non trovato"""
        payload = {
            "employee_id": employee_id,
            "codice_giustificativo": "INVALID_CODE",
            "data": "2026-01-22",
            "ore": 8
        }
        
        response = requests.post(
            f"{BASE_URL}/api/giustificativi/valida-giustificativo",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["valido"] is False
        assert data["bloccante"] is True
        assert "non trovato" in data["messaggio"]
    
    def test_valida_giustificativo_missing_fields(self):
        """POST /api/giustificativi/valida-giustificativo - Campi obbligatori mancanti"""
        payload = {
            "data": "2026-01-22",
            "ore": 8
        }
        
        response = requests.post(
            f"{BASE_URL}/api/giustificativi/valida-giustificativo",
            json=payload
        )
        
        assert response.status_code == 400
    
    def test_valida_giustificativo_limite_annuale_check(self, employee_id):
        """POST /api/giustificativi/valida-giustificativo - Verifica limite annuale"""
        # AI (Assenza Ingiustificata) ha limite_annuale_ore=173
        payload = {
            "employee_id": employee_id,
            "codice_giustificativo": "AI",
            "data": "2026-01-22",
            "ore": 8
        }
        
        response = requests.post(
            f"{BASE_URL}/api/giustificativi/valida-giustificativo",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verifica che il limite annuale sia presente nei dettagli
        assert data["dettagli"]["limite_annuale"] == 173
        assert data["dettagli"]["limite_mensile"] == 16


class TestSaldoFerie:
    """Test saldo ferie e permessi per dipendente"""
    
    @pytest.fixture
    def employee_id(self):
        """Ottiene un employee_id valido"""
        response = requests.get(f"{BASE_URL}/api/employees?limit=1")
        if response.status_code == 200:
            data = response.json()
            employees = data.get("employees", data) if isinstance(data, dict) else data
            if employees and len(employees) > 0:
                return employees[0]["id"]
        pytest.skip("Nessun dipendente disponibile per il test")
    
    def test_get_saldo_ferie(self, employee_id):
        """GET /api/giustificativi/dipendente/{id}/saldo-ferie - Saldo ferie completo"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/{employee_id}/saldo-ferie?anno=2026")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["employee_id"] == employee_id
        assert "employee_nome" in data
        assert data["anno"] == 2026
        assert "mese_corrente" in data
        
        # Verifica struttura ferie
        assert "ferie" in data
        ferie = data["ferie"]
        assert "spettanti_annue" in ferie
        assert ferie["spettanti_annue"] == 208  # 26 giorni * 8 ore
        assert "maturate" in ferie
        assert "riportate_anno_prec" in ferie
        assert "totali_disponibili" in ferie
        assert "godute" in ferie
        assert "residue" in ferie
        assert "giorni_residui" in ferie
        
        # Verifica struttura ROL
        assert "rol" in data
        rol = data["rol"]
        assert "spettanti_annui" in rol
        assert rol["spettanti_annui"] == 72
        assert "maturati" in rol
        assert "riportati_anno_prec" in rol
        assert "totali_disponibili" in rol
        assert "goduti" in rol
        assert "residui" in rol
        
        # Verifica struttura Ex Festività
        assert "ex_festivita" in data
        exf = data["ex_festivita"]
        assert "spettanti_annue" in exf
        assert exf["spettanti_annue"] == 32  # 4 giorni * 8 ore
        assert "maturate" in exf
        assert "godute" in exf
        assert "residue" in exf
        
        # Verifica permessi
        assert "permessi" in data
        assert "goduti_anno" in data["permessi"]
        
        # Verifica dettaglio mensile
        assert "dettaglio_mensile" in data
    
    def test_get_saldo_ferie_not_found(self):
        """GET /api/giustificativi/dipendente/{id}/saldo-ferie - Dipendente non trovato"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/non-existent-id/saldo-ferie?anno=2026")
        
        assert response.status_code == 404
    
    def test_get_saldo_ferie_different_year(self, employee_id):
        """GET /api/giustificativi/dipendente/{id}/saldo-ferie - Anno diverso"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/dipendente/{employee_id}/saldo-ferie?anno=2025")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["anno"] == 2025


class TestGiustificativiLimiti:
    """Test limiti specifici dei giustificativi"""
    
    def test_verify_fer_limits(self):
        """Verifica limiti FER (Ferie)"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi?categoria=ferie")
        
        assert response.status_code == 200
        data = response.json()
        
        fer = next((g for g in data["giustificativi"] if g["codice"] == "FER"), None)
        assert fer is not None
        assert fer["limite_annuale_ore"] == 208  # 26 giorni * 8 ore
        assert fer["limite_mensile_ore"] is None
        assert fer["retribuito"] is True
    
    def test_verify_rol_limits(self):
        """Verifica limiti ROL"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi?categoria=permesso")
        
        assert response.status_code == 200
        data = response.json()
        
        rol = next((g for g in data["giustificativi"] if g["codice"] == "ROL"), None)
        assert rol is not None
        assert rol["limite_annuale_ore"] == 72
        assert rol["limite_mensile_ore"] is None
        assert rol["retribuito"] is True
    
    def test_verify_per_limits(self):
        """Verifica limiti PER (Permesso Retribuito)"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi?categoria=permesso")
        
        assert response.status_code == 200
        data = response.json()
        
        per = next((g for g in data["giustificativi"] if g["codice"] == "PER"), None)
        assert per is not None
        assert per["limite_annuale_ore"] == 32
        assert per["limite_mensile_ore"] == 8
        assert per["retribuito"] is True
    
    def test_verify_l104_limits(self):
        """Verifica limiti L104 (Permesso Legge 104)"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi?categoria=permesso")
        
        assert response.status_code == 200
        data = response.json()
        
        l104 = next((g for g in data["giustificativi"] if g["codice"] == "L104"), None)
        assert l104 is not None
        assert l104["limite_annuale_ore"] is None
        assert l104["limite_mensile_ore"] == 24  # 3 giorni/mese
        assert l104["retribuito"] is True
    
    def test_verify_ai_limits(self):
        """Verifica limiti AI (Assenza Ingiustificata)"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi?categoria=assenza")
        
        assert response.status_code == 200
        data = response.json()
        
        ai = next((g for g in data["giustificativi"] if g["codice"] == "AI"), None)
        assert ai is not None
        assert ai["limite_annuale_ore"] == 173
        assert ai["limite_mensile_ore"] == 16
        assert ai["retribuito"] is False


class TestGiustificativiCategorie:
    """Test categorie giustificativi"""
    
    def test_categorie_complete(self):
        """Verifica che tutte le categorie siano presenti"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi")
        
        assert response.status_code == 200
        data = response.json()
        
        categorie_attese = ["assenza", "ferie", "permesso", "congedo", "malattia", "formazione", "lavoro", "infortunio"]
        categorie_presenti = list(data["per_categoria"].keys())
        
        for cat in categorie_attese:
            assert cat in categorie_presenti, f"Categoria {cat} non trovata"
    
    def test_categoria_congedo(self):
        """Verifica giustificativi categoria congedo"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi?categoria=congedo")
        
        assert response.status_code == 200
        data = response.json()
        
        codici = [g["codice"] for g in data["giustificativi"]]
        
        # Congedi che devono esistere
        assert "CP" in codici  # Congedo Parentale
        assert "CPAT" in codici  # Congedo Paternità
        assert "CLUT" in codici  # Congedo Lutto
    
    def test_categoria_lavoro(self):
        """Verifica giustificativi categoria lavoro"""
        response = requests.get(f"{BASE_URL}/api/giustificativi/giustificativi?categoria=lavoro")
        
        assert response.status_code == 200
        data = response.json()
        
        codici = [g["codice"] for g in data["giustificativi"]]
        
        assert "SMART" in codici  # Smart Working
        assert "TRAS" in codici  # Trasferta


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
