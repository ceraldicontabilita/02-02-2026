"""
Backend API Tests for Secondary Pages - Contabilità Italiana
Tests for: Noleggio Auto, Verbali, Bilancio, Calendario Fiscale, Centri Costo,
Cespiti, Assegni, Liquidazione IVA, TFR, Bonifici, Corrispettivi, etc.
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
        assert "database" in data
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
        
        # Verify structure of first item if exists
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


class TestCorrispettiviAPI:
    """Tests for Corrispettivi (Daily Receipts) API"""
    
    def test_get_corrispettivi_list(self):
        """Test getting list of corrispettivi"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Corrispettivi list: {len(data)} items")
    
    def test_get_corrispettivi_stats(self):
        """Test corrispettivi statistics"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Corrispettivi stats: {data}")


class TestBonificiAPI:
    """Tests for Archivio Bonifici (Bank Transfers) API"""
    
    def test_get_bonifici_list(self):
        """Test getting list of bonifici"""
        response = requests.get(f"{BASE_URL}/api/bonifici")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Bonifici list: {len(data)} items")
    
    def test_get_bonifici_stats(self):
        """Test bonifici statistics"""
        response = requests.get(f"{BASE_URL}/api/bonifici/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Bonifici stats: {data}")


class TestVerbaliAPI:
    """Tests for Verbali Riconciliazione (Traffic Fines) API"""
    
    def test_get_verbali_list(self):
        """Test getting list of verbali"""
        response = requests.get(f"{BASE_URL}/api/verbali")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Verbali list: {len(data)} items")
    
    def test_get_verbali_stats(self):
        """Test verbali statistics"""
        response = requests.get(f"{BASE_URL}/api/verbali/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Verbali stats: {data}")


class TestVeicoliAPI:
    """Tests for Noleggio Auto (Vehicle Rental) API"""
    
    def test_get_veicoli_list(self):
        """Test getting list of vehicles"""
        response = requests.get(f"{BASE_URL}/api/veicoli")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Veicoli list: {len(data)} items")
    
    def test_get_veicoli_costi(self):
        """Test getting vehicle costs"""
        response = requests.get(f"{BASE_URL}/api/veicoli/costi")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Veicoli costi: {data}")


class TestBilancioAPI:
    """Tests for Bilancio (Balance Sheet) API"""
    
    def test_get_bilancio_2026(self):
        """Test getting balance sheet for 2026"""
        response = requests.get(f"{BASE_URL}/api/bilancio/2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Bilancio 2026: {data}")
    
    def test_get_bilancio_stato_patrimoniale(self):
        """Test getting stato patrimoniale"""
        response = requests.get(f"{BASE_URL}/api/bilancio/stato-patrimoniale/2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Stato Patrimoniale: {data}")
    
    def test_get_bilancio_conto_economico(self):
        """Test getting conto economico"""
        response = requests.get(f"{BASE_URL}/api/bilancio/conto-economico/2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Conto Economico: {data}")


class TestCalendarioFiscaleAPI:
    """Tests for Calendario Fiscale (Fiscal Calendar) API"""
    
    def test_get_scadenze_fiscali(self):
        """Test getting fiscal deadlines"""
        response = requests.get(f"{BASE_URL}/api/scadenze-fiscali")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Scadenze fiscali: {len(data)} items")
    
    def test_get_scadenze_stats(self):
        """Test scadenze statistics"""
        response = requests.get(f"{BASE_URL}/api/scadenze-fiscali/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Scadenze stats: {data}")


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
    
    def test_get_ammortamenti(self):
        """Test getting depreciation data"""
        response = requests.get(f"{BASE_URL}/api/cespiti/ammortamenti/2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Ammortamenti: {data}")


class TestLiquidazioneIVAAPI:
    """Tests for Liquidazione IVA (VAT Settlement) API"""
    
    def test_get_liquidazione_iva(self):
        """Test getting VAT settlement data"""
        response = requests.get(f"{BASE_URL}/api/liquidazione-iva/2026/2")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Liquidazione IVA: {data}")
    
    def test_calcola_liquidazione_iva(self):
        """Test calculating VAT settlement"""
        response = requests.post(f"{BASE_URL}/api/liquidazione-iva/calcola", json={
            "anno": 2026,
            "mese": 2,
            "credito_precedente": 0
        })
        # May return 200 or 422 depending on data availability
        assert response.status_code in [200, 422]
        print(f"✓ Calcola liquidazione IVA: status {response.status_code}")


class TestTFRAPI:
    """Tests for TFR (Severance Pay) API"""
    
    def test_get_tfr_list(self):
        """Test getting TFR data"""
        response = requests.get(f"{BASE_URL}/api/tfr")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ TFR data: {data}")
    
    def test_get_tfr_dipendente(self):
        """Test getting TFR for specific employee"""
        response = requests.get(f"{BASE_URL}/api/tfr/dipendente/test")
        # May return 200 or 404 depending on employee existence
        assert response.status_code in [200, 404]
        print(f"✓ TFR dipendente: status {response.status_code}")


class TestSaldiFeriePermessiAPI:
    """Tests for Saldi Ferie Permessi (Leave Balances) API"""
    
    def test_get_saldi_ferie(self):
        """Test getting leave balances"""
        response = requests.get(f"{BASE_URL}/api/saldi-ferie-permessi")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Saldi ferie permessi: {data}")


class TestChiusuraEsercizioAPI:
    """Tests for Chiusura Esercizio (Year-End Closing) API"""
    
    def test_get_chiusura_status(self):
        """Test getting year-end closing status"""
        response = requests.get(f"{BASE_URL}/api/chiusura-esercizio/2026/status")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Chiusura esercizio status: {data}")


class TestMotoreContabileAPI:
    """Tests for Motore Contabile (Accounting Engine) API"""
    
    def test_get_bilancio_verifica(self):
        """Test getting trial balance"""
        response = requests.get(f"{BASE_URL}/api/motore-contabile/bilancio-verifica/2026")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Bilancio verifica: {data}")


class TestRegoleContabiliAPI:
    """Tests for Regole Contabili (Accounting Rules) API"""
    
    def test_get_regole_contabili(self):
        """Test getting accounting rules"""
        response = requests.get(f"{BASE_URL}/api/regole-contabili")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Regole contabili: {data}")


class TestRiconciliazioneAPI:
    """Tests for Riconciliazione Unificata (Unified Reconciliation) API"""
    
    def test_get_riconciliazione_stats(self):
        """Test getting reconciliation statistics"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Riconciliazione stats: {data}")
    
    def test_get_riconciliazione_banca(self):
        """Test getting bank reconciliation data"""
        response = requests.get(f"{BASE_URL}/api/riconciliazione/banca")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Riconciliazione banca: {len(data) if isinstance(data, list) else data}")


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
    
    def test_get_fornitori_list(self):
        """Test getting suppliers list"""
        response = requests.get(f"{BASE_URL}/api/fornitori")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fornitori list: {len(data)} items")
    
    def test_get_fornitori_metodi_pagamento(self):
        """Test getting payment methods"""
        response = requests.get(f"{BASE_URL}/api/fornitori/metodi-pagamento")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Metodi pagamento: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
