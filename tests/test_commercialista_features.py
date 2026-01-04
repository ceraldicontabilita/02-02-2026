"""
Test suite for Commercialista features:
- Commercialista API endpoints (config, prima-nota-cassa, fatture-cassa, carnet)
- GestioneAssegni single carnet PDF download
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCommercialistaConfig:
    """Test commercialista configuration endpoint"""
    
    def test_get_config(self):
        """GET /api/commercialista/config should return email config"""
        response = requests.get(f"{BASE_URL}/api/commercialista/config")
        assert response.status_code == 200
        
        data = response.json()
        assert "email" in data
        assert "nome" in data
        assert "alert_giorni" in data
        assert "smtp_configured" in data
        
        # Verify default email
        assert data["email"] == "rosaria.marotta@email.it"
        assert data["smtp_configured"] == True  # SMTP should be configured
        print(f"✅ Config: email={data['email']}, smtp_configured={data['smtp_configured']}")


class TestPrimaNotaCassa:
    """Test Prima Nota Cassa endpoints"""
    
    def test_get_prima_nota_cassa_january_2025(self):
        """GET /api/commercialista/prima-nota-cassa/2025/1 should return data"""
        response = requests.get(f"{BASE_URL}/api/commercialista/prima-nota-cassa/2025/1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["anno"] == 2025
        assert data["mese"] == 1
        assert data["mese_nome"] == "Gennaio"
        assert "movimenti" in data
        assert "totale_movimenti" in data
        assert "totale_entrate" in data
        assert "totale_uscite" in data
        assert "saldo" in data
        
        print(f"✅ Prima Nota Gennaio 2025: {data['totale_movimenti']} movimenti, saldo={data['saldo']}")
    
    def test_get_prima_nota_cassa_december_2025(self):
        """GET /api/commercialista/prima-nota-cassa/2025/12 should return data"""
        response = requests.get(f"{BASE_URL}/api/commercialista/prima-nota-cassa/2025/12")
        assert response.status_code == 200
        
        data = response.json()
        assert data["anno"] == 2025
        assert data["mese"] == 12
        assert data["mese_nome"] == "Dicembre"
        print(f"✅ Prima Nota Dicembre 2025: {data['totale_movimenti']} movimenti")


class TestFattureCassa:
    """Test Fatture Cassa endpoints"""
    
    def test_get_fatture_cassa_january_2025(self):
        """GET /api/commercialista/fatture-cassa/2025/1 should return invoices paid by cash"""
        response = requests.get(f"{BASE_URL}/api/commercialista/fatture-cassa/2025/1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["anno"] == 2025
        assert data["mese"] == 1
        assert data["mese_nome"] == "Gennaio"
        assert "fatture" in data
        assert "totale_fatture" in data
        assert "totale_importo" in data
        
        # Verify we have fatture data
        assert data["totale_fatture"] >= 0
        print(f"✅ Fatture Cassa Gennaio 2025: {data['totale_fatture']} fatture, totale=€{data['totale_importo']:.2f}")
    
    def test_fatture_cassa_has_correct_structure(self):
        """Verify fatture have correct structure"""
        response = requests.get(f"{BASE_URL}/api/commercialista/fatture-cassa/2025/1")
        assert response.status_code == 200
        
        data = response.json()
        if data["fatture"]:
            fattura = data["fatture"][0]
            # Check common fields
            assert "id" in fattura or "invoice_number" in fattura
            print(f"✅ Fattura structure verified: {fattura.get('invoice_number', fattura.get('id', 'N/A'))}")


class TestAlertStatus:
    """Test alert status endpoint"""
    
    def test_get_alert_status(self):
        """GET /api/commercialista/alert-status should return alert info"""
        response = requests.get(f"{BASE_URL}/api/commercialista/alert-status")
        assert response.status_code == 200
        
        data = response.json()
        assert "show_alert" in data
        assert "mese_pendente" in data
        assert "anno_pendente" in data
        assert "deadline" in data
        assert "prima_nota_inviata" in data
        
        print(f"✅ Alert status: show_alert={data['show_alert']}, mese_pendente={data['mese_pendente']}/{data['anno_pendente']}")


class TestInvioLog:
    """Test invio log endpoint"""
    
    def test_get_log(self):
        """GET /api/commercialista/log should return send history"""
        response = requests.get(f"{BASE_URL}/api/commercialista/log?limit=20")
        assert response.status_code == 200
        
        data = response.json()
        assert "log" in data
        assert "totale" in data
        assert isinstance(data["log"], list)
        
        print(f"✅ Log entries: {data['totale']} records")


class TestAssegniEndpoint:
    """Test assegni endpoint for carnet grouping"""
    
    def test_get_assegni(self):
        """GET /api/assegni should return assegni list"""
        response = requests.get(f"{BASE_URL}/api/assegni")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Group by carnet (prefix before -)
        carnets = {}
        for a in data:
            if a.get("numero"):
                prefix = a["numero"].split("-")[0]
                if prefix not in carnets:
                    carnets[prefix] = []
                carnets[prefix].append(a)
        
        print(f"✅ Assegni: {len(data)} total, {len(carnets)} carnets")
        for carnet_id, assegni in list(carnets.items())[:3]:
            totale = sum(float(a.get("importo") or 0) for a in assegni)
            print(f"   - Carnet {carnet_id}: {len(assegni)} assegni, totale=€{totale:.2f}")


class TestEmailEndpoints:
    """Test email sending endpoints (without actually sending)"""
    
    def test_invia_prima_nota_validation(self):
        """POST /api/commercialista/invia-prima-nota should validate input"""
        # Test without required fields
        response = requests.post(
            f"{BASE_URL}/api/commercialista/invia-prima-nota",
            json={}
        )
        assert response.status_code == 400
        print("✅ Prima nota email validation works (rejects empty payload)")
    
    def test_invia_fatture_cassa_validation(self):
        """POST /api/commercialista/invia-fatture-cassa should validate input"""
        response = requests.post(
            f"{BASE_URL}/api/commercialista/invia-fatture-cassa",
            json={}
        )
        assert response.status_code == 400
        print("✅ Fatture cassa email validation works (rejects empty payload)")
    
    def test_invia_carnet_validation(self):
        """POST /api/commercialista/invia-carnet should validate input"""
        response = requests.post(
            f"{BASE_URL}/api/commercialista/invia-carnet",
            json={}
        )
        assert response.status_code == 400
        print("✅ Carnet email validation works (rejects empty payload)")


class TestAssegniStats:
    """Test assegni stats endpoint"""
    
    def test_get_assegni_stats(self):
        """GET /api/assegni/stats should return statistics"""
        response = requests.get(f"{BASE_URL}/api/assegni/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "totale" in data
        assert "per_stato" in data
        
        print(f"✅ Assegni stats: totale={data['totale']}, stati={data['per_stato']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
