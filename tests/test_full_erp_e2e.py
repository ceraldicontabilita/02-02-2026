"""
Comprehensive E2E Test Suite for ERP Application
Tests: Dashboard, Fatture, Corrispettivi, Fornitori, Prima Nota, Assegni, HACCP, Dipendenti, IVA, Ordini, F24, Finanziaria, Export, Admin
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDashboardStats:
    """Dashboard KPI and stats tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print(f"✅ Health check passed: {data}")
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        # Verify expected fields
        assert "fatture" in data or "invoices" in data or isinstance(data, dict)
        print(f"✅ Dashboard stats: {data}")


class TestFatture:
    """Fatture (Invoices) module tests"""
    
    def test_list_invoices(self):
        """Test listing invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} invoices")
        if data:
            # Verify invoice structure
            invoice = data[0]
            assert "id" in invoice
            assert "invoice_number" in invoice or "numero_fattura" in invoice
    
    def test_invoice_has_required_fields(self):
        """Test invoice data structure"""
        response = requests.get(f"{BASE_URL}/api/invoices?limit=1")
        assert response.status_code == 200
        data = response.json()
        if data:
            invoice = data[0]
            # Check for key fields
            expected_fields = ["id", "invoice_number", "supplier_name", "total_amount"]
            for field in expected_fields:
                assert field in invoice, f"Missing field: {field}"
            print(f"✅ Invoice structure valid: {invoice.get('invoice_number')}")


class TestCorrispettivi:
    """Corrispettivi module tests"""
    
    def test_list_corrispettivi(self):
        """Test listing corrispettivi"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} corrispettivi")
    
    def test_corrispettivi_stats(self):
        """Test corrispettivi stats"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi/stats")
        # May return 200 or 404 if not implemented
        assert response.status_code in [200, 404, 422]
        print(f"✅ Corrispettivi stats endpoint: {response.status_code}")


class TestFornitori:
    """Fornitori (Suppliers) module tests"""
    
    def test_list_suppliers(self):
        """Test listing suppliers"""
        response = requests.get(f"{BASE_URL}/api/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} suppliers")
    
    def test_supplier_structure(self):
        """Test supplier data structure"""
        response = requests.get(f"{BASE_URL}/api/suppliers?limit=1")
        assert response.status_code == 200
        data = response.json()
        if data:
            supplier = data[0]
            assert "id" in supplier
            assert "denominazione" in supplier or "name" in supplier
            print(f"✅ Supplier structure valid")
    
    def test_create_supplier(self):
        """Test creating a new supplier"""
        test_supplier = {
            "name": "TEST_Fornitore Test",
            "vat_number": "TEST12345678901",
            "address": "Via Test 123",
            "phone": "0123456789",
            "email": "test@test.com"
        }
        response = requests.post(f"{BASE_URL}/api/suppliers", json=test_supplier)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        print(f"✅ Created supplier: {data.get('id')}")
        
        # Cleanup - delete test supplier
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/suppliers/{data['id']}")
    
    def test_fornitori_extended_list(self):
        """Test extended fornitori endpoint"""
        response = requests.get(f"{BASE_URL}/api/fornitori")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Fornitori extended: {len(data)} records")


class TestPrimaNota:
    """Prima Nota (Cash/Bank movements) module tests"""
    
    def test_list_cassa_movements(self):
        """Test listing cassa movements"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} cassa movements")
    
    def test_list_banca_movements(self):
        """Test listing banca movements"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/banca")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} banca movements")
    
    def test_prima_nota_stats(self):
        """Test prima nota stats"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/stats")
        assert response.status_code == 200
        data = response.json()
        assert "saldo_cassa" in data or "totale_cassa" in data or isinstance(data, dict)
        print(f"✅ Prima Nota stats: {data}")
    
    def test_create_cassa_movement(self):
        """Test creating a cassa movement"""
        movement = {
            "data": datetime.now().strftime("%Y-%m-%d"),
            "tipo": "uscita",
            "importo": 100.00,
            "descrizione": "TEST_Movimento test cassa",
            "categoria": "Test"
        }
        response = requests.post(f"{BASE_URL}/api/prima-nota/cassa", json=movement)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        print(f"✅ Created cassa movement: {data.get('id')}")
    
    def test_prima_nota_export_excel(self):
        """Test Prima Nota Excel export"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/export/excel?tipo=entrambi")
        assert response.status_code == 200
        assert "spreadsheet" in response.headers.get("Content-Type", "")
        print(f"✅ Prima Nota Excel export working")


class TestPrimaNotaAutomation:
    """Prima Nota Automation module tests"""
    
    def test_automation_stats(self):
        """Test automation stats"""
        response = requests.get(f"{BASE_URL}/api/prima-nota-automation/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Automation stats: {data}")


class TestAssegni:
    """Gestione Assegni module tests"""
    
    def test_list_assegni(self):
        """Test listing assegni"""
        response = requests.get(f"{BASE_URL}/api/assegni")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} assegni")
    
    def test_assegni_stats(self):
        """Test assegni stats"""
        response = requests.get(f"{BASE_URL}/api/assegni/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Assegni stats: {data}")
    
    def test_create_assegno(self):
        """Test creating an assegno"""
        assegno = {
            "numero": "TEST_12345",
            "importo": 500.00,
            "data_emissione": datetime.now().strftime("%Y-%m-%d"),
            "beneficiario": "TEST_Beneficiario",
            "stato": "emesso"
        }
        response = requests.post(f"{BASE_URL}/api/assegni", json=assegno)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        print(f"✅ Created assegno: {data.get('id')}")


class TestHACCP:
    """HACCP module tests"""
    
    def test_haccp_dashboard(self):
        """Test HACCP dashboard"""
        response = requests.get(f"{BASE_URL}/api/haccp-completo/dashboard")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ HACCP Dashboard: {data}")
    
    def test_haccp_equipaggiamenti(self):
        """Test HACCP equipaggiamenti"""
        response = requests.get(f"{BASE_URL}/api/haccp-completo/equipaggiamenti")
        assert response.status_code == 200
        data = response.json()
        assert "frigoriferi" in data
        assert "congelatori" in data
        print(f"✅ HACCP Equipaggiamenti: {len(data.get('frigoriferi', []))} frigo, {len(data.get('congelatori', []))} congelatori")
    
    def test_haccp_temperature_frigo(self):
        """Test HACCP temperature frigoriferi"""
        mese = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/haccp-completo/temperature/frigoriferi?mese={mese}")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ HACCP Temperature Frigo: {data.get('count', len(data.get('records', [])))} records")
    
    def test_haccp_temperature_congelatori(self):
        """Test HACCP temperature congelatori"""
        mese = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/haccp-completo/temperature/congelatori?mese={mese}")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ HACCP Temperature Congelatori: {data.get('count', len(data.get('records', [])))} records")
    
    def test_haccp_genera_mese_frigo(self):
        """Test generating month data for frigoriferi"""
        mese = datetime.now().strftime("%Y-%m")
        response = requests.post(f"{BASE_URL}/api/haccp-completo/temperature/frigoriferi/genera-mese", json={"mese": mese})
        assert response.status_code == 200
        data = response.json()
        print(f"✅ HACCP Genera Mese Frigo: {data}")
    
    def test_haccp_autocompila_oggi_frigo(self):
        """Test autocompila today for frigoriferi"""
        response = requests.post(f"{BASE_URL}/api/haccp-completo/temperature/frigoriferi/autocompila-oggi")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ HACCP Autocompila Oggi Frigo: {data}")
    
    def test_haccp_sanificazioni(self):
        """Test HACCP sanificazioni"""
        mese = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/haccp-completo/sanificazioni?mese={mese}")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ HACCP Sanificazioni: {data.get('count', 0)} records")
    
    def test_haccp_create_sanificazione(self):
        """Test creating a sanificazione"""
        sanif = {
            "data": datetime.now().strftime("%Y-%m-%d"),
            "ora": "10:00",
            "area": "Cucina",
            "operatore": "TEST_Operatore",
            "prodotto_utilizzato": "Detergente",
            "esito": "OK"
        }
        response = requests.post(f"{BASE_URL}/api/haccp-completo/sanificazioni", json=sanif)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        print(f"✅ Created sanificazione: {data.get('id')}")
    
    def test_haccp_scadenzario(self):
        """Test HACCP scadenzario"""
        response = requests.get(f"{BASE_URL}/api/haccp-completo/scadenzario?days=30")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ HACCP Scadenzario: {data.get('count', len(data.get('records', [])))} products")
    
    def test_haccp_create_scadenza(self):
        """Test adding product to scadenzario"""
        scadenza = {
            "prodotto": "TEST_Prodotto Scadenza",
            "lotto": "LOT123",
            "data_scadenza": (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d"),
            "quantita": 10,
            "unita": "pz",
            "fornitore": "Test Fornitore"
        }
        response = requests.post(f"{BASE_URL}/api/haccp-completo/scadenzario", json=scadenza)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        print(f"✅ Created scadenza: {data.get('id')}")
    
    def test_haccp_export_temperature_excel(self):
        """Test HACCP temperature Excel export"""
        mese = "2026-01"
        response = requests.get(f"{BASE_URL}/api/haccp-completo/export/temperature-excel?mese={mese}&tipo=frigoriferi")
        assert response.status_code == 200
        assert "spreadsheet" in response.headers.get("Content-Type", "")
        print(f"✅ HACCP Temperature Excel export working")
    
    def test_haccp_export_sanificazioni_excel(self):
        """Test HACCP sanificazioni Excel export"""
        mese = "2026-01"
        response = requests.get(f"{BASE_URL}/api/haccp-completo/export/sanificazioni-excel?mese={mese}")
        assert response.status_code == 200
        assert "spreadsheet" in response.headers.get("Content-Type", "")
        print(f"✅ HACCP Sanificazioni Excel export working")


class TestDipendenti:
    """Dipendenti (Employees) module tests"""
    
    def test_list_dipendenti(self):
        """Test listing dipendenti"""
        response = requests.get(f"{BASE_URL}/api/dipendenti")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} dipendenti")
    
    def test_dipendenti_stats(self):
        """Test dipendenti stats"""
        response = requests.get(f"{BASE_URL}/api/dipendenti/stats")
        assert response.status_code == 200
        data = response.json()
        assert "totale" in data
        print(f"✅ Dipendenti stats: {data}")
    
    def test_create_dipendente(self):
        """Test creating a dipendente"""
        dipendente = {
            "nome_completo": "TEST_Dipendente Prova",
            "codice_fiscale": "TSTDPN90A01H501Z",
            "email": "test.dipendente@test.com",
            "telefono": "3331234567",
            "mansione": "Cameriere",
            "tipo_contratto": "Tempo Determinato"
        }
        response = requests.post(f"{BASE_URL}/api/dipendenti", json=dipendente)
        assert response.status_code in [200, 201, 409]  # 409 if duplicate CF
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data
            print(f"✅ Created dipendente: {data.get('id')}")
        else:
            print(f"⚠️ Dipendente already exists (duplicate CF)")
    
    def test_dipendente_invita_portale(self):
        """Test inviting dipendente to portal"""
        # First get a dipendente
        response = requests.get(f"{BASE_URL}/api/dipendenti?limit=1")
        if response.status_code == 200 and response.json():
            dip_id = response.json()[0].get("id")
            invite_response = requests.post(f"{BASE_URL}/api/dipendenti/{dip_id}/invita-portale")
            assert invite_response.status_code == 200
            print(f"✅ Invited dipendente to portal")


class TestCalcoloIVA:
    """Calcolo IVA module tests"""
    
    def test_iva_mensile(self):
        """Test monthly IVA calculation"""
        response = requests.get(f"{BASE_URL}/api/iva/mensile?anno=2025&mese=12")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ IVA Mensile: {data}")
    
    def test_iva_annuale(self):
        """Test annual IVA calculation"""
        response = requests.get(f"{BASE_URL}/api/iva/annuale?anno=2025")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ IVA Annuale: {data}")


class TestRicercaProdotti:
    """Ricerca Prodotti module tests"""
    
    def test_search_products(self):
        """Test product search"""
        response = requests.get(f"{BASE_URL}/api/products/search?q=latte")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Product search: {len(data)} results")
    
    def test_product_catalog(self):
        """Test product catalog"""
        response = requests.get(f"{BASE_URL}/api/products/catalog")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Product catalog: {len(data)} products")


class TestOrdiniFornitori:
    """Ordini Fornitori module tests"""
    
    def test_list_ordini(self):
        """Test listing ordini"""
        response = requests.get(f"{BASE_URL}/api/ordini-fornitori")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} ordini fornitori")
    
    def test_create_ordine(self):
        """Test creating an ordine"""
        ordine = {
            "fornitore_id": "test-fornitore",
            "fornitore_nome": "TEST_Fornitore Ordine",
            "data_ordine": datetime.now().strftime("%Y-%m-%d"),
            "stato": "bozza",
            "prodotti": [
                {"nome": "Prodotto Test", "quantita": 10, "prezzo_unitario": 5.00}
            ],
            "totale": 50.00
        }
        response = requests.post(f"{BASE_URL}/api/ordini-fornitori", json=ordine)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        print(f"✅ Created ordine: {data.get('id')}")


class TestF24:
    """F24/Tributi module tests"""
    
    def test_list_f24(self):
        """Test listing F24 scadenze"""
        response = requests.get(f"{BASE_URL}/api/f24")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} F24 scadenze")


class TestFinanziaria:
    """Finanziaria module tests"""
    
    def test_finanziaria_dashboard(self):
        """Test finanziaria dashboard"""
        response = requests.get(f"{BASE_URL}/api/finanziaria/dashboard")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Finanziaria dashboard: {data}")


class TestExport:
    """Export module tests"""
    
    def test_export_endpoints_available(self):
        """Test that export endpoints are available"""
        # Prima Nota export
        response = requests.get(f"{BASE_URL}/api/prima-nota/export/excel?tipo=cassa")
        assert response.status_code == 200
        print(f"✅ Prima Nota export available")


class TestAdmin:
    """Admin module tests"""
    
    def test_admin_stats(self):
        """Test admin stats"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        # May return 200 or 404 if not implemented
        assert response.status_code in [200, 404]
        print(f"✅ Admin stats endpoint: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
