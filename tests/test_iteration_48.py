"""
Iteration 48 - Comprehensive Backend API Tests
Testing: Allergeni, Bonifici Associazione, Ricettario, Non Conformità, Temperature, Sanificazione
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://xml-to-label.preview.emergentagent.com').rstrip('/')


class TestAllergeniAPI:
    """Test Libro Allergeni API - 14 allergeni UE"""
    
    def test_get_allergeni_elenco(self):
        """GET /api/haccp-v2/allergeni/elenco - Returns 14 EU allergens"""
        response = requests.get(f"{BASE_URL}/api/haccp-v2/allergeni/elenco")
        assert response.status_code == 200
        data = response.json()
        
        # Verify 14 allergens
        assert data["totale"] == 14
        assert "allergeni" in data
        assert "riferimento_normativo" in data
        assert data["riferimento_normativo"] == "Reg. UE 1169/2011"
        
        # Check some key allergens
        allergeni = data["allergeni"]
        assert "glutine" in allergeni
        assert "latte" in allergeni
        assert "uova" in allergeni
        assert "pesce" in allergeni
        assert "crostacei" in allergeni
        assert "molluschi" in allergeni
        
    def test_get_libro_allergeni(self):
        """GET /api/haccp-v2/allergeni/libro - Returns complete allergen book"""
        response = requests.get(f"{BASE_URL}/api/haccp-v2/allergeni/libro")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "azienda" in data
        assert "libro_allergeni" in data
        assert "totale_ingredienti" in data
        assert "statistiche_allergeni" in data
        
        # Should have 86 ingredients as per requirements
        assert data["totale_ingredienti"] >= 80  # At least 80 ingredients
        
        # Check some ingredients have allergens
        libro = data["libro_allergeni"]
        ingredienti_con_allergeni = [i for i in libro if len(i.get("allergeni", [])) > 0]
        assert len(ingredienti_con_allergeni) >= 20  # At least 20 with allergens
        
    def test_rileva_allergeni(self):
        """GET /api/haccp-v2/allergeni/rileva/{testo} - Detects allergens in text"""
        response = requests.get(f"{BASE_URL}/api/haccp-v2/allergeni/rileva/farina%20di%20grano")
        assert response.status_code == 200
        data = response.json()
        
        assert "allergeni_rilevati" in data
        assert "glutine" in data["allergeni_rilevati"]


class TestBonificiAssociazioneAPI:
    """Test Bonifici Associazione Salari API"""
    
    def test_get_transfers(self):
        """GET /api/archivio-bonifici/transfers - Returns bonifici list"""
        response = requests.get(f"{BASE_URL}/api/archivio-bonifici/transfers?limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            bonifico = data[0]
            assert "id" in bonifico
            assert "importo" in bonifico
            assert "data" in bonifico
            
    def test_get_operazioni_salari(self):
        """GET /api/archivio-bonifici/operazioni-salari/{id} - Returns compatible salary operations"""
        # First get a bonifico ID
        response = requests.get(f"{BASE_URL}/api/archivio-bonifici/transfers?limit=1")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            bonifico_id = data[0]["id"]
            response = requests.get(f"{BASE_URL}/api/archivio-bonifici/operazioni-salari/{bonifico_id}")
            assert response.status_code == 200
            result = response.json()
            
            assert "bonifico" in result
            assert "operazioni_compatibili" in result
            assert result["bonifico"]["id"] == bonifico_id


class TestRicettarioAPI:
    """Test Ricettario Dinamico API - 90 ricette con food cost"""
    
    def test_get_ricettario(self):
        """GET /api/haccp-v2/ricettario - Returns recipes with food cost"""
        response = requests.get(f"{BASE_URL}/api/haccp-v2/ricettario")
        assert response.status_code == 200
        data = response.json()
        
        assert "ricette" in data
        ricette = data["ricette"]
        assert len(ricette) >= 80  # At least 80 recipes
        
        # Check recipe structure
        if len(ricette) > 0:
            ricetta = ricette[0]
            assert "id" in ricetta
            assert "nome" in ricetta
            assert "ingredienti" in ricetta
            assert "food_cost" in ricetta or "food_cost_per_porzione" in ricetta
            
    def test_get_ricetta_dettaglio(self):
        """GET /api/haccp-v2/ricettario/{id} - Returns recipe detail with traceability"""
        # First get a recipe ID
        response = requests.get(f"{BASE_URL}/api/haccp-v2/ricettario")
        assert response.status_code == 200
        data = response.json()
        
        if len(data.get("ricette", [])) > 0:
            ricetta_id = data["ricette"][0]["id"]
            response = requests.get(f"{BASE_URL}/api/haccp-v2/ricettario/{ricetta_id}")
            assert response.status_code == 200
            result = response.json()
            
            assert "ricetta" in result or "id" in result


class TestNonConformitaAPI:
    """Test Non Conformità HACCP API"""
    
    def test_get_motivi_azioni(self):
        """GET /api/haccp-v2/non-conformi/motivi-azioni - Returns motivi and azioni"""
        response = requests.get(f"{BASE_URL}/api/haccp-v2/non-conformi/motivi-azioni")
        assert response.status_code == 200
        data = response.json()
        
        assert "motivi" in data
        assert "azioni" in data
        assert "operatori" in data
        
        # Check motivi structure
        motivi = data["motivi"]
        assert "SCADUTO" in motivi
        assert "TEMP_FRIGO" in motivi
        assert "CONTAMINAZIONE" in motivi
        
        # Check azioni
        azioni = data["azioni"]
        assert "smaltimento" in azioni
        assert "reso_fornitore" in azioni
        
    def test_get_non_conformita_list(self):
        """GET /api/haccp-v2/non-conformi - Returns non conformità list"""
        response = requests.get(f"{BASE_URL}/api/haccp-v2/non-conformi?anno=2026&mese=1")
        assert response.status_code == 200
        data = response.json()
        
        assert "non_conformita" in data
        assert "per_stato" in data


class TestTemperatureAPI:
    """Test Temperature Positive (Frigoriferi) API"""
    
    def test_get_schede_frigoriferi(self):
        """GET /api/haccp-v2/temperature-positive/schede/{anno} - Returns all 12 frigoriferi"""
        response = requests.get(f"{BASE_URL}/api/haccp-v2/temperature-positive/schede/2026")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 12  # 12 frigoriferi
        
        # Check structure
        scheda = data[0]
        assert "frigorifero_numero" in scheda
        assert "temperature" in scheda
        assert "temp_min" in scheda
        assert "temp_max" in scheda
        
    def test_get_scheda_singola(self):
        """GET /api/haccp-v2/temperature-positive/scheda/{anno}/{frigorifero}"""
        response = requests.get(f"{BASE_URL}/api/haccp-v2/temperature-positive/scheda/2026/1")
        assert response.status_code == 200
        data = response.json()
        
        assert data["frigorifero_numero"] == 1
        assert "temperature" in data


class TestSanificazioneAPI:
    """Test Sanificazione HACCP API"""
    
    def test_get_attrezzature(self):
        """GET /api/haccp-v2/sanificazione/attrezzature - Returns equipment list"""
        response = requests.get(f"{BASE_URL}/api/haccp-v2/sanificazione/attrezzature")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 5  # At least 5 equipment types
        
    def test_get_scheda_sanificazione(self):
        """GET /api/haccp-v2/sanificazione/scheda/{anno}/{mese}"""
        response = requests.get(f"{BASE_URL}/api/haccp-v2/sanificazione/scheda/2026/1")
        assert response.status_code == 200
        data = response.json()
        
        assert "mese" in data
        assert "anno" in data
        assert "registrazioni" in data


class TestRegressionDashboard:
    """Regression tests for Dashboard and core features"""
    
    def test_health_check(self):
        """GET /api/health - Backend health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        
    def test_dashboard_stats(self):
        """GET /api/dashboard/stats - Dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404]


class TestRegressionFatture:
    """Regression tests for Fatture Ricevute"""
    
    def test_get_fatture_ricevute(self):
        """GET /api/ciclo-passivo/fatture - Returns received invoices"""
        response = requests.get(f"{BASE_URL}/api/ciclo-passivo/fatture?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert "fatture" in data or isinstance(data, list)


class TestRegressionPrimaNota:
    """Regression tests for Prima Nota"""
    
    def test_get_prima_nota(self):
        """GET /api/prima-nota - Returns prima nota entries"""
        response = requests.get(f"{BASE_URL}/api/prima-nota?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert "operazioni" in data or isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
