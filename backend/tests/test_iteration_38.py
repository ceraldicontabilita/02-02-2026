"""
Iteration 38 - Test delle correzioni richieste:
1. Tab mesi nei cedolini visibili e leggibili (abbreviati a 3 lettere)
2. Dettaglio cedolino si apre cliccando su 'Vedi dettaglio'
3. Fattura view-assoinvoice mostra i dati correttamente (fornitore, importo, numero)
4. Endpoint auto-repair/verifica restituisce statistiche delle relazioni
5. Endpoint auto-repair/globale esegue collegamento dati
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAutoRepairEndpoints:
    """Test auto-repair endpoints for data relationship management"""
    
    def test_auto_repair_verifica_returns_statistics(self):
        """Test /api/auto-repair/verifica returns relationship statistics"""
        response = requests.get(f"{BASE_URL}/api/auto-repair/verifica")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify verbali statistics
        assert "verbali" in data
        assert "totale" in data["verbali"]
        assert "con_driver" in data["verbali"]
        assert "senza_driver" in data["verbali"]
        assert "percentuale_collegati" in data["verbali"]
        
        # Verify cedolini statistics
        assert "cedolini" in data
        assert "totale" in data["cedolini"]
        assert "con_dipendente" in data["cedolini"]
        assert "senza_dipendente" in data["cedolini"]
        assert "percentuale_collegati" in data["cedolini"]
        
        # Verify fatture statistics
        assert "fatture" in data
        assert "totale" in data["fatture"]
        assert "con_fornitore_id" in data["fatture"]
        assert "senza_fornitore_id" in data["fatture"]
        assert "percentuale_collegati" in data["fatture"]
        
        # Verify veicoli statistics
        assert "veicoli" in data
        assert "totale" in data["veicoli"]
        assert "con_driver" in data["veicoli"]
        
        print(f"Verbali: {data['verbali']['totale']} totali, {data['verbali']['percentuale_collegati']}% collegati")
        print(f"Cedolini: {data['cedolini']['totale']} totali, {data['cedolini']['percentuale_collegati']}% collegati")
        print(f"Fatture: {data['fatture']['totale']} totali, {data['fatture']['percentuale_collegati']}% collegati")
    
    def test_auto_repair_globale_executes(self):
        """Test /api/auto-repair/globale executes data linking"""
        response = requests.post(f"{BASE_URL}/api/auto-repair/globale")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "results" in data
        
        results = data["results"]
        assert "verbali_collegati_driver" in results
        assert "cedolini_collegati_dipendenti" in results
        assert "fatture_collegate_fornitori" in results
        assert "veicoli_collegati_verbali" in results
        assert "timestamp" in results
        
        print(f"Verbali collegati a driver: {results['verbali_collegati_driver']}")
        print(f"Cedolini collegati a dipendenti: {results['cedolini_collegati_dipendenti']}")
        print(f"Fatture collegate a fornitori: {results['fatture_collegate_fornitori']}")


class TestFatturaViewAssoinvoice:
    """Test fattura view-assoinvoice endpoint"""
    
    def test_get_invoice_list(self):
        """Get an invoice ID for testing"""
        response = requests.get(f"{BASE_URL}/api/invoices?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list) or "invoices" in data or len(data) > 0
        
        # Get first invoice
        if isinstance(data, list):
            invoice = data[0] if data else None
        else:
            invoice = data.get("invoices", [{}])[0] if data.get("invoices") else None
        
        if invoice:
            self.invoice_id = invoice.get("id")
            print(f"Found invoice ID: {self.invoice_id}")
            return self.invoice_id
        return None
    
    def test_view_assoinvoice_returns_html(self):
        """Test /api/fatture-ricevute/fattura/{id}/view-assoinvoice returns HTML with data"""
        # First get an invoice ID
        response = requests.get(f"{BASE_URL}/api/invoices?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        invoice = data[0] if isinstance(data, list) and data else None
        
        if not invoice:
            pytest.skip("No invoices found to test")
        
        invoice_id = invoice.get("id")
        
        # Test view-assoinvoice endpoint
        response = requests.get(f"{BASE_URL}/api/fatture-ricevute/fattura/{invoice_id}/view-assoinvoice")
        assert response.status_code == 200
        
        # Verify it returns HTML
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type
        
        html = response.text
        
        # Verify HTML contains key data
        assert "Fattura" in html, "HTML should contain 'Fattura'"
        assert "Fornitore" in html, "HTML should contain 'Fornitore'"
        assert "€" in html, "HTML should contain euro amounts"
        assert "TOTALE" in html, "HTML should contain 'TOTALE'"
        
        # Check for supplier info
        assert "P.IVA" in html, "HTML should contain P.IVA"
        
        print(f"View-assoinvoice HTML generated successfully for invoice {invoice_id}")
    
    def test_view_assoinvoice_safe_float_handling(self):
        """Test that safe_float() handles various input types without errors"""
        # Get an invoice
        response = requests.get(f"{BASE_URL}/api/invoices?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data if isinstance(data, list) else data.get("invoices", [])
        
        # Test multiple invoices to ensure safe_float works
        for invoice in invoices[:3]:
            invoice_id = invoice.get("id")
            if invoice_id:
                response = requests.get(f"{BASE_URL}/api/fatture-ricevute/fattura/{invoice_id}/view-assoinvoice")
                # Should not return 500 error due to float conversion issues
                assert response.status_code in [200, 404], f"Unexpected status {response.status_code} for invoice {invoice_id}"
                
                if response.status_code == 200:
                    # Verify amounts are formatted correctly (no NaN or errors)
                    html = response.text
                    assert "NaN" not in html, "HTML should not contain NaN"
                    assert "undefined" not in html, "HTML should not contain undefined"
        
        print("safe_float() handling verified for multiple invoices")


class TestCedoliniAPI:
    """Test cedolini API endpoints"""
    
    def test_cedolini_list_returns_data(self):
        """Test /api/cedolini returns cedolini data"""
        response = requests.get(f"{BASE_URL}/api/cedolini?anno=2025&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "cedolini" in data
        
        cedolini = data["cedolini"]
        if cedolini:
            cedolino = cedolini[0]
            # Verify cedolino has required fields
            assert "id" in cedolino
            assert "mese" in cedolino
            assert "anno" in cedolino
            
            print(f"Found {len(cedolini)} cedolini for 2025")
    
    def test_cedolini_mese_field_is_numeric(self):
        """Test that mese field is numeric (1-14) for proper tab mapping"""
        response = requests.get(f"{BASE_URL}/api/cedolini?anno=2025&limit=50")
        assert response.status_code == 200
        
        data = response.json()
        cedolini = data.get("cedolini", [])
        
        for cedolino in cedolini[:10]:
            mese = cedolino.get("mese")
            assert isinstance(mese, int), f"mese should be int, got {type(mese)}"
            assert 1 <= mese <= 14, f"mese should be 1-14, got {mese}"
        
        print("All cedolini have valid numeric mese field (1-14)")


class TestHealthAndBasics:
    """Basic health and connectivity tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "healthy"
        assert data.get("database") == "connected"
        
        print(f"Health check passed: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
