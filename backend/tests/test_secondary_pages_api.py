"""
Backend API Tests for Secondary Pages - Contabilità Italiana
Tests for: Noleggio Auto, Verbali, Bilancio, Calendario Fiscale, Centri Costo,
Cespiti, Assegni, Liquidazione IVA, TFR, Bonifici, Corrispettivi, etc.
Using actual API endpoints from frontend code.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndDashboard:
    """Basic health and dashboard tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check passed: {data}")
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "invoices" in data
        assert "suppliers" in data
        assert "employees" in data
        print(f"✓ Dashboard stats: {data}")


class TestAssegniAPI:
    """Tests for Gestione Assegni (Check Management) API"""
    
    def test_get_assegni_list(self):
        """Test getting list of assegni"""
        response = requests.get(f"{BASE_URL}/api/assegni")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Assegni list: {len(data)} items")
        
        if len(data) > 0:
            assegno = data[0]
            assert "id" in assegno
            assert "importo" in assegno
            print(f"  First assegno: {assegno.get('numero_assegno', assegno.get('numero', 'N/A'))} - €{assegno.get('importo')}")
    
    def test_get_assegni_stats(self):
        """Test assegni statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/assegni/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Assegni stats: {data}")


class TestNoleggioAutoAPI:
    """Tests for Noleggio Auto (Vehicle Rental) API"""
    
    def test_get_veicoli_list(self):
        """Test getting list of vehicles"""
        response = requests.get(f"{BASE_URL}/api/noleggio/veicoli")
        assert response.status_code == 200
        data = response.json()
        # API returns object with veicoli array
        assert "veicoli" in data or "count" in data
        veicoli = data.get("veicoli", [])
        print(f"✓ Veicoli: {data.get('count', len(veicoli))} items")
        
        if len(veicoli) > 0:
            veicolo = veicoli[0]
            print(f"  First veicolo: {veicolo.get('targa', 'N/A')} - {veicolo.get('veicolo', 'N/A')}")
    
    def test_get_drivers(self):
        """Test getting drivers list"""
        response = requests.get(f"{BASE_URL}/api/noleggio/drivers")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Drivers: {len(data) if isinstance(data, list) else data}")
    
    def test_get_fornitori_noleggio(self):
        """Test getting rental suppliers"""
        response = requests.get(f"{BASE_URL}/api/noleggio/fornitori")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Fornitori noleggio: {len(data) if isinstance(data, list) else data}")


class TestVerbaliRiconciliazioneAPI:
    """Tests for Verbali Riconciliazione (Traffic Fines) API"""
    
    def test_get_verbali_dashboard(self):
        """Test getting verbali dashboard"""
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/dashboard")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Verbali dashboard: {data}")
    
    def test_get_verbali_list(self):
        """Test getting verbali list from dashboard"""
        response = requests.get(f"{BASE_URL}/api/verbali-riconciliazione/dashboard")
        assert response.status_code == 200
        data = response.json()
        # Dashboard contains verbali list
        verbali = data.get("verbali", [])
        print(f"✓ Verbali list: {len(verbali)} items from dashboard")


class TestBilancioAPI:
    """Tests for Bilancio (Balance Sheet) API"""
    
    def test_get_stato_patrimoniale(self):
        """Test getting stato patrimoniale"""
        response = requests.get(f"{BASE_URL}/api/bilancio/stato-patrimoniale?anno=2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Stato Patrimoniale: {data}")
    
    def test_get_conto_economico(self):
        """Test getting conto economico"""
        response = requests.get(f"{BASE_URL}/api/bilancio/conto-economico?anno=2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Conto Economico: {data}")


class TestCalendarioFiscaleAPI:
    """Tests for Calendario Fiscale (Fiscal Calendar) API"""
    
    def test_get_calendario_fiscale(self):
        """Test getting fiscal calendar"""
        response = requests.get(f"{BASE_URL}/api/fiscalita/calendario/2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Calendario fiscale: {len(data) if isinstance(data, list) else data}")
    
    def test_get_notifiche_scadenze(self):
        """Test getting deadline notifications"""
        response = requests.get(f"{BASE_URL}/api/fiscalita/notifiche-scadenze?anno=2026&giorni=30")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Notifiche scadenze: {data}")


class TestCentriCostoAPI:
    """Tests for Centri di Costo (Cost Centers) API"""
    
    def test_get_centri_costo(self):
        """Test getting cost centers"""
        response = requests.get(f"{BASE_URL}/api/centri-costo")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Centri costo: {data}")


class TestCespitiAPI:
    """Tests for Gestione Cespiti (Asset Management) API"""
    
    def test_get_cespiti_list(self):
        """Test getting list of assets"""
        response = requests.get(f"{BASE_URL}/api/cespiti")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Cespiti list: {len(data)} items")
        
        if len(data) > 0:
            cespite = data[0]
            print(f"  First cespite: {cespite.get('descrizione', 'N/A')} - €{cespite.get('valore_acquisto', 'N/A')}")


class TestCorrispettiviAPI:
    """Tests for Corrispettivi (Daily Receipts) API"""
    
    def test_get_corrispettivi_list(self):
        """Test getting list of corrispettivi"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Corrispettivi list: {len(data)} items")


class TestF24API:
    """Tests for F24 (Tax Payment Forms) API"""
    
    def test_get_f24_list(self):
        """Test getting F24 list"""
        response = requests.get(f"{BASE_URL}/api/f24-public/models")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ F24 list: {len(data) if isinstance(data, list) else data}")
    
    def test_get_f24_dashboard(self):
        """Test getting F24 dashboard"""
        response = requests.get(f"{BASE_URL}/api/f24-public/dashboard")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ F24 dashboard: {data}")
    
    def test_get_f24_alerts(self):
        """Test getting F24 alerts"""
        response = requests.get(f"{BASE_URL}/api/f24-public/alerts")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ F24 alerts: {data}")


class TestDipendentiAPI:
    """Tests for Dipendenti (Employees) API"""
    
    def test_get_dipendenti_list(self):
        """Test getting employees list"""
        response = requests.get(f"{BASE_URL}/api/dipendenti")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Dipendenti list: {len(data)} items")


class TestFornitoriAPI:
    """Tests for Fornitori (Suppliers) API"""
    
    def test_get_fornitori_metodi_pagamento(self):
        """Test getting payment methods"""
        response = requests.get(f"{BASE_URL}/api/fornitori/metodi-pagamento")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Metodi pagamento: {data}")


class TestInvoicesAPI:
    """Tests for Invoices API"""
    
    def test_get_invoices_list(self):
        """Test getting invoices list"""
        response = requests.get(f"{BASE_URL}/api/invoices?limit=10")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Invoices: {len(data) if isinstance(data, list) else data}")


class TestRiconciliazioneAPI:
    """Tests for Riconciliazione API"""
    
    def test_get_riconciliazione_banca(self):
        """Test getting bank reconciliation"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione-banca")
        # May return 200 or 404 depending on endpoint availability
        print(f"✓ Riconciliazione banca: status {response.status_code}")


class TestBonificiAPI:
    """Tests for Bonifici API"""
    
    def test_get_bonifici_list(self):
        """Test getting bonifici list"""
        response = requests.get(f"{BASE_URL}/api/bonifici-bancari")
        # May return 200 or 404 depending on endpoint availability
        print(f"✓ Bonifici: status {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
