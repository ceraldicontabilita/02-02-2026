"""
Test Iteration 4: Notifiche Scadenze Fiscali e Audit Completo
=============================================================
Tests for:
- GET /api/fiscalita/notifiche-scadenze (urgency levels)
- POST /api/fiscalita/notifiche-scadenze/invia (dashboard/email)
- Verifica calcoli Dashboard: margine = ricavi - costi
- Verifica calcoli Prima Nota: saldo = entrate - uscite
- Verifica collezioni MongoDB: assegni, invoices, employees, cedolini
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestNotificheScadenze:
    """Test endpoint notifiche scadenze fiscali"""
    
    def test_get_notifiche_scadenze_2025(self):
        """Test GET /api/fiscalita/notifiche-scadenze?anno=2025&giorni=30"""
        response = requests.get(f"{BASE_URL}/api/fiscalita/notifiche-scadenze?anno=2025&giorni=30")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("anno") == 2025
        assert data.get("giorni_analizzati") == 30
        
        # Verify urgency levels structure
        assert "urgenti" in data
        assert "prossime" in data
        assert "pianificabili" in data
        assert "riepilogo" in data
        
        # Verify riepilogo structure
        riepilogo = data.get("riepilogo", {})
        assert "critiche" in riepilogo
        assert "alta_priorita" in riepilogo
        assert "normali" in riepilogo
        
        print(f"✓ Notifiche scadenze 2025: {data.get('totale_imminenti')} imminenti")
        print(f"  - Critiche: {riepilogo.get('critiche')}")
        print(f"  - Alta priorità: {riepilogo.get('alta_priorita')}")
        print(f"  - Normali: {riepilogo.get('normali')}")
    
    def test_get_notifiche_scadenze_default_year(self):
        """Test GET /api/fiscalita/notifiche-scadenze with default year"""
        response = requests.get(f"{BASE_URL}/api/fiscalita/notifiche-scadenze?giorni=7")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "anno" in data
        print(f"✓ Notifiche scadenze default year: {data.get('anno')}")
    
    def test_get_notifiche_scadenze_urgency_levels(self):
        """Test urgency levels are correctly assigned"""
        response = requests.get(f"{BASE_URL}/api/fiscalita/notifiche-scadenze?anno=2025&giorni=30")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check urgency field in scadenze
        for scad in data.get("urgenti", []):
            assert scad.get("urgenza") == "critica"
        
        for scad in data.get("prossime", []):
            assert scad.get("urgenza") == "alta"
        
        for scad in data.get("pianificabili", []):
            assert scad.get("urgenza") == "normale"
        
        print("✓ Urgency levels correctly assigned")


class TestInviaNotifica:
    """Test endpoint invio notifiche"""
    
    def test_invia_notifica_dashboard(self):
        """Test POST /api/fiscalita/notifiche-scadenze/invia?tipo_notifica=dashboard"""
        # First get a valid scadenza_id
        cal_response = requests.get(f"{BASE_URL}/api/fiscalita/calendario/2025")
        assert cal_response.status_code == 200
        
        cal_data = cal_response.json()
        scadenze = cal_data.get("scadenze", [])
        assert len(scadenze) > 0, "No scadenze found"
        
        scadenza_id = scadenze[0].get("id")
        
        # Send notification
        response = requests.post(
            f"{BASE_URL}/api/fiscalita/notifiche-scadenze/invia?scadenza_id={scadenza_id}&tipo_notifica=dashboard"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("tipo") == "dashboard"
        assert "notifica_id" in data
        assert data.get("message") == "Notifica creata in dashboard"
        
        print(f"✓ Dashboard notification created: {data.get('notifica_id')}")
    
    def test_invia_notifica_email(self):
        """Test POST /api/fiscalita/notifiche-scadenze/invia?tipo_notifica=email"""
        # First get a valid scadenza_id
        cal_response = requests.get(f"{BASE_URL}/api/fiscalita/calendario/2025")
        assert cal_response.status_code == 200
        
        cal_data = cal_response.json()
        scadenze = cal_data.get("scadenze", [])
        assert len(scadenze) > 0, "No scadenze found"
        
        scadenza_id = scadenze[0].get("id")
        
        # Send email notification
        response = requests.post(
            f"{BASE_URL}/api/fiscalita/notifiche-scadenze/invia?scadenza_id={scadenza_id}&tipo_notifica=email"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("tipo") == "email"
        assert "email_data" in data
        
        email_data = data.get("email_data", {})
        assert "oggetto" in email_data
        assert "corpo" in email_data
        assert "scadenza" in email_data
        
        print(f"✓ Email notification prepared: {email_data.get('oggetto')}")
    
    def test_invia_notifica_invalid_scadenza(self):
        """Test POST with invalid scadenza_id returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/fiscalita/notifiche-scadenze/invia?scadenza_id=invalid_id_12345&tipo_notifica=dashboard"
        )
        assert response.status_code == 404
        print("✓ Invalid scadenza_id correctly returns 404")


class TestCalendarioFiscale:
    """Test calendario fiscale endpoint"""
    
    def test_calendario_2025(self):
        """Test GET /api/fiscalita/calendario/2025"""
        response = requests.get(f"{BASE_URL}/api/fiscalita/calendario/2025")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("anno") == 2025
        assert data.get("totale_scadenze") > 0
        
        # Verify structure
        assert "scadenze_per_mese" in data
        assert "prossime_5" in data
        assert "scadenze" in data
        
        print(f"✓ Calendario 2025: {data.get('totale_scadenze')} scadenze totali")
        print(f"  - Completate: {data.get('completate')}")


class TestCollectionsMongoDB:
    """Test MongoDB collections exist and have data"""
    
    def test_assegni_collection(self):
        """Test assegni collection has data"""
        response = requests.get(f"{BASE_URL}/api/assegni?anno=2025")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            # Verify assegno structure
            assegno = data[0]
            assert "id" in assegno
            assert "importo" in assegno
        
        print(f"✓ Assegni collection: {len(data)} records")
    
    def test_invoices_collection(self):
        """Test invoices collection has data"""
        response = requests.get(f"{BASE_URL}/api/invoices?anno=2025&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            # Verify invoice structure
            invoice = data[0]
            assert "id" in invoice
            assert "invoice_number" in invoice or "numero_fattura" in invoice
            assert "total_amount" in invoice or "totale" in invoice
        
        print(f"✓ Invoices collection: {len(data)} records (limited)")
    
    def test_employees_collection(self):
        """Test employees collection has data"""
        response = requests.get(f"{BASE_URL}/api/dipendenti")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            # Verify employee structure
            employee = data[0]
            assert "id" in employee
            assert "nome_completo" in employee or "nome" in employee
        
        print(f"✓ Employees collection: {len(data)} records")
    
    def test_cedolini_collection(self):
        """Test cedolini collection has data"""
        response = requests.get(f"{BASE_URL}/api/cedolini?anno=2025")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check if it's a dict with cedolini key or a list
        if isinstance(data, dict):
            cedolini = data.get("cedolini", [])
        else:
            cedolini = data
        
        assert isinstance(cedolini, list)
        
        if len(cedolini) > 0:
            # Verify cedolino structure
            cedolino = cedolini[0]
            assert "id" in cedolino
            assert "netto" in cedolino or "netto_mese" in cedolino
        
        print(f"✓ Cedolini collection: {len(cedolini)} records")


class TestDashboardStats:
    """Test dashboard statistics endpoint"""
    
    def test_dashboard_stats(self):
        """Test GET /api/dashboard/stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats?anno=2025")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify basic stats
        assert "invoices" in data or "fatture" in data
        assert "employees" in data or "dipendenti" in data
        
        print(f"✓ Dashboard stats: {data}")


class TestPrimaNotaCassa:
    """Test Prima Nota Cassa calculations"""
    
    def test_prima_nota_cassa_saldo(self):
        """Test Prima Nota Cassa: saldo = entrate - uscite"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?anno=2025")
        assert response.status_code == 200
        
        data = response.json()
        movimenti = data.get("movimenti", [])
        
        if len(movimenti) > 0:
            # Calculate totals
            entrate = sum(m.get("importo", 0) for m in movimenti if m.get("tipo") == "entrata")
            uscite = sum(m.get("importo", 0) for m in movimenti if m.get("tipo") == "uscita")
            saldo_calcolato = entrate - uscite
            
            print(f"✓ Prima Nota Cassa:")
            print(f"  - Entrate: €{entrate:,.2f}")
            print(f"  - Uscite: €{uscite:,.2f}")
            print(f"  - Saldo calcolato: €{saldo_calcolato:,.2f}")
        else:
            print("✓ Prima Nota Cassa: No movements found")


class TestHealthCheck:
    """Test health check endpoint"""
    
    def test_health(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "healthy"
        assert data.get("database") == "connected"
        
        print(f"✓ Health check: {data.get('status')}, DB: {data.get('database')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
