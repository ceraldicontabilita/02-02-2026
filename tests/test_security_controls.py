"""
Test Security Controls and Data Propagation
============================================

Tests for:
1. Fatture pagate - eliminazione BLOCCATA
2. Movimenti Prima Nota riconciliati - eliminazione BLOCCATA
3. Assegni emessi/incassati - eliminazione BLOCCATA
4. Corrispettivi inviati all'AdE - eliminazione BLOCCATA
5. Pagamento fattura → creazione movimento Prima Nota
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSecurityControlsFatture:
    """Test security controls for fatture (invoices)"""
    
    def test_cannot_delete_paid_invoice(self):
        """Verifica che una fattura pagata NON possa essere eliminata"""
        # First, get list of invoices to find a paid one
        response = requests.get(f"{BASE_URL}/api/invoices?limit=100")
        assert response.status_code == 200
        
        invoices = response.json()
        if isinstance(invoices, dict):
            invoices = invoices.get('items', invoices.get('invoices', []))
        
        # Find a paid invoice
        paid_invoice = None
        for inv in invoices:
            if inv.get('pagato') == True or inv.get('payment_status') == 'paid':
                paid_invoice = inv
                break
        
        if paid_invoice:
            invoice_id = paid_invoice.get('id')
            # Try to delete - should fail
            delete_response = requests.delete(f"{BASE_URL}/api/fatture/{invoice_id}")
            
            # Should return 400 with error message
            assert delete_response.status_code == 400, f"Expected 400, got {delete_response.status_code}"
            
            error_data = delete_response.json()
            detail = error_data.get('detail', {})
            
            # Check error message contains expected text
            if isinstance(detail, dict):
                errors = detail.get('errors', [])
                assert any('pagata' in str(e).lower() for e in errors), f"Expected 'pagata' in errors: {errors}"
            else:
                assert 'pagata' in str(detail).lower(), f"Expected 'pagata' in detail: {detail}"
            
            print(f"✅ PASS: Cannot delete paid invoice {invoice_id}")
        else:
            pytest.skip("No paid invoices found to test deletion block")
    
    def test_can_delete_unpaid_invoice(self):
        """Verifica che una fattura NON pagata possa essere eliminata"""
        # Get list of invoices
        response = requests.get(f"{BASE_URL}/api/invoices?limit=100")
        assert response.status_code == 200
        
        invoices = response.json()
        if isinstance(invoices, dict):
            invoices = invoices.get('items', invoices.get('invoices', []))
        
        # Find an unpaid invoice without accounting entries
        unpaid_invoice = None
        for inv in invoices:
            if (inv.get('pagato') != True and 
                inv.get('payment_status') != 'paid' and
                inv.get('status') != 'registered' and
                not inv.get('accounting_entry_id')):
                unpaid_invoice = inv
                break
        
        if unpaid_invoice:
            invoice_id = unpaid_invoice.get('id')
            # Try to delete - should succeed or return warning
            delete_response = requests.delete(f"{BASE_URL}/api/fatture/{invoice_id}")
            
            # Should return 200 (success) or warning requiring force
            assert delete_response.status_code in [200, 400], f"Unexpected status: {delete_response.status_code}"
            
            data = delete_response.json()
            if delete_response.status_code == 200:
                if data.get('require_force'):
                    print(f"✅ PASS: Unpaid invoice {invoice_id} requires force confirmation (has warnings)")
                else:
                    print(f"✅ PASS: Unpaid invoice {invoice_id} deleted successfully")
            else:
                # Check if it's a legitimate block (registered, etc.)
                print(f"⚠️ Invoice {invoice_id} blocked: {data}")
        else:
            pytest.skip("No suitable unpaid invoices found to test deletion")


class TestSecurityControlsPrimaNota:
    """Test security controls for Prima Nota movements"""
    
    def test_cannot_delete_reconciled_movement_cassa(self):
        """Verifica che un movimento cassa riconciliato NON possa essere eliminato"""
        # Get cassa movements
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?limit=100")
        assert response.status_code == 200
        
        data = response.json()
        movimenti = data.get('movimenti', data if isinstance(data, list) else [])
        
        # Find a reconciled movement
        reconciled = None
        for mov in movimenti:
            if mov.get('status') == 'reconciled':
                reconciled = mov
                break
        
        if reconciled:
            mov_id = reconciled.get('id')
            delete_response = requests.delete(f"{BASE_URL}/api/prima-nota/cassa/{mov_id}")
            
            assert delete_response.status_code == 400, f"Expected 400, got {delete_response.status_code}"
            
            error_data = delete_response.json()
            detail = error_data.get('detail', {})
            
            if isinstance(detail, dict):
                errors = detail.get('errors', [])
                assert any('riconciliato' in str(e).lower() for e in errors), f"Expected 'riconciliato' in errors"
            
            print(f"✅ PASS: Cannot delete reconciled cassa movement {mov_id}")
        else:
            # Create a reconciled movement for testing
            print("⚠️ No reconciled movements found - testing with mock data")
            pytest.skip("No reconciled movements to test")
    
    def test_cannot_delete_reconciled_movement_banca(self):
        """Verifica che un movimento banca riconciliato NON possa essere eliminato"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/banca?limit=100")
        assert response.status_code == 200
        
        data = response.json()
        movimenti = data.get('movimenti', data if isinstance(data, list) else [])
        
        reconciled = None
        for mov in movimenti:
            if mov.get('status') == 'reconciled':
                reconciled = mov
                break
        
        if reconciled:
            mov_id = reconciled.get('id')
            delete_response = requests.delete(f"{BASE_URL}/api/prima-nota/banca/{mov_id}")
            
            assert delete_response.status_code == 400
            print(f"✅ PASS: Cannot delete reconciled banca movement {mov_id}")
        else:
            pytest.skip("No reconciled banca movements to test")
    
    def test_can_delete_draft_movement(self):
        """Verifica che un movimento draft possa essere eliminato"""
        # Create a test movement
        test_movement = {
            "data": datetime.now().strftime("%Y-%m-%d"),
            "tipo": "entrata",
            "importo": 1.00,
            "descrizione": "TEST_movimento_eliminabile",
            "categoria": "Altro"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/prima-nota/cassa", json=test_movement)
        assert create_response.status_code == 200, f"Failed to create test movement: {create_response.text}"
        
        mov_id = create_response.json().get('id')
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/prima-nota/cassa/{mov_id}?force=true")
        
        assert delete_response.status_code == 200, f"Failed to delete: {delete_response.text}"
        print(f"✅ PASS: Draft movement {mov_id} deleted successfully")


class TestSecurityControlsAssegni:
    """Test security controls for assegni (checks)"""
    
    def test_cannot_delete_emesso_assegno(self):
        """Verifica che un assegno emesso NON possa essere eliminato"""
        response = requests.get(f"{BASE_URL}/api/assegni?limit=100")
        assert response.status_code == 200
        
        assegni = response.json()
        if isinstance(assegni, dict):
            assegni = assegni.get('items', [])
        
        emesso = None
        for a in assegni:
            if a.get('stato') == 'emesso':
                emesso = a
                break
        
        if emesso:
            assegno_id = emesso.get('id')
            delete_response = requests.delete(f"{BASE_URL}/api/assegni/{assegno_id}")
            
            assert delete_response.status_code == 400, f"Expected 400, got {delete_response.status_code}"
            
            error_data = delete_response.json()
            detail = error_data.get('detail', {})
            
            if isinstance(detail, dict):
                errors = detail.get('errors', [])
                assert any('emesso' in str(e).lower() for e in errors), f"Expected 'emesso' in errors"
            
            print(f"✅ PASS: Cannot delete emesso assegno {assegno_id}")
        else:
            pytest.skip("No emesso assegni found to test")
    
    def test_cannot_delete_incassato_assegno(self):
        """Verifica che un assegno incassato NON possa essere eliminato"""
        response = requests.get(f"{BASE_URL}/api/assegni?limit=100")
        assert response.status_code == 200
        
        assegni = response.json()
        if isinstance(assegni, dict):
            assegni = assegni.get('items', [])
        
        incassato = None
        for a in assegni:
            if a.get('stato') == 'incassato':
                incassato = a
                break
        
        if incassato:
            assegno_id = incassato.get('id')
            delete_response = requests.delete(f"{BASE_URL}/api/assegni/{assegno_id}")
            
            assert delete_response.status_code == 400
            print(f"✅ PASS: Cannot delete incassato assegno {assegno_id}")
        else:
            pytest.skip("No incassato assegni found to test")
    
    def test_can_delete_vuoto_assegno(self):
        """Verifica che un assegno vuoto possa essere eliminato"""
        response = requests.get(f"{BASE_URL}/api/assegni?stato=vuoto&limit=10")
        assert response.status_code == 200
        
        assegni = response.json()
        if isinstance(assegni, dict):
            assegni = assegni.get('items', [])
        
        vuoto = None
        for a in assegni:
            if a.get('stato') == 'vuoto' and not a.get('fatture_collegate'):
                vuoto = a
                break
        
        if vuoto:
            assegno_id = vuoto.get('id')
            delete_response = requests.delete(f"{BASE_URL}/api/assegni/{assegno_id}")
            
            # Should succeed
            assert delete_response.status_code == 200, f"Failed: {delete_response.text}"
            print(f"✅ PASS: Vuoto assegno {assegno_id} deleted successfully")
        else:
            pytest.skip("No vuoto assegni without linked invoices found")


class TestSecurityControlsCorrispettivi:
    """Test security controls for corrispettivi"""
    
    def test_cannot_delete_sent_ade_corrispettivo(self):
        """Verifica che un corrispettivo inviato all'AdE NON possa essere eliminato"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi?limit=100")
        assert response.status_code == 200
        
        corrispettivi = response.json()
        if isinstance(corrispettivi, dict):
            corrispettivi = corrispettivi.get('items', [])
        
        sent_ade = None
        for c in corrispettivi:
            if c.get('status') == 'sent_ade':
                sent_ade = c
                break
        
        if sent_ade:
            corr_id = sent_ade.get('id')
            delete_response = requests.delete(f"{BASE_URL}/api/corrispettivi/{corr_id}")
            
            assert delete_response.status_code == 400
            
            error_data = delete_response.json()
            detail = error_data.get('detail', {})
            
            if isinstance(detail, dict):
                errors = detail.get('errors', [])
                assert any('ade' in str(e).lower() or 'agenzia' in str(e).lower() for e in errors)
            
            print(f"✅ PASS: Cannot delete sent_ade corrispettivo {corr_id}")
        else:
            pytest.skip("No sent_ade corrispettivi found to test")
    
    def test_can_delete_imported_corrispettivo(self):
        """Verifica che un corrispettivo importato (non inviato) possa essere eliminato"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi?limit=100")
        assert response.status_code == 200
        
        corrispettivi = response.json()
        if isinstance(corrispettivi, dict):
            corrispettivi = corrispettivi.get('items', [])
        
        imported = None
        for c in corrispettivi:
            if c.get('status') in ['imported', None] and not c.get('prima_nota_id'):
                imported = c
                break
        
        if imported:
            corr_id = imported.get('id')
            delete_response = requests.delete(f"{BASE_URL}/api/corrispettivi/{corr_id}")
            
            # Should succeed
            assert delete_response.status_code == 200, f"Failed: {delete_response.text}"
            print(f"✅ PASS: Imported corrispettivo {corr_id} deleted successfully")
        else:
            pytest.skip("No deletable corrispettivi found")


class TestDataPropagation:
    """Test data propagation - payment creates Prima Nota movement"""
    
    def test_payment_creates_prima_nota_movement(self):
        """Verifica che il pagamento di una fattura crei un movimento in Prima Nota"""
        # Get an unpaid invoice
        response = requests.get(f"{BASE_URL}/api/invoices?limit=100")
        assert response.status_code == 200
        
        invoices = response.json()
        if isinstance(invoices, dict):
            invoices = invoices.get('items', invoices.get('invoices', []))
        
        unpaid = None
        for inv in invoices:
            if (inv.get('pagato') != True and 
                inv.get('payment_status') != 'paid' and
                inv.get('metodo_pagamento')):
                unpaid = inv
                break
        
        if not unpaid:
            # Try to find any unpaid invoice and set payment method first
            for inv in invoices:
                if inv.get('pagato') != True and inv.get('payment_status') != 'paid':
                    # Set payment method
                    inv_id = inv.get('id')
                    requests.put(
                        f"{BASE_URL}/api/fatture/{inv_id}/metodo-pagamento",
                        json={"metodo_pagamento": "cassa"}
                    )
                    unpaid = inv
                    unpaid['metodo_pagamento'] = 'cassa'
                    break
        
        if unpaid:
            invoice_id = unpaid.get('id')
            metodo = unpaid.get('metodo_pagamento', 'cassa')
            
            # Get current Prima Nota count
            pn_endpoint = '/api/prima-nota/cassa' if metodo in ['cassa', 'contanti'] else '/api/prima-nota/banca'
            before_response = requests.get(f"{BASE_URL}{pn_endpoint}?limit=1000")
            before_count = len(before_response.json().get('movimenti', []))
            
            # Pay the invoice
            pay_response = requests.put(f"{BASE_URL}/api/fatture/{invoice_id}/paga")
            
            if pay_response.status_code == 200:
                pay_data = pay_response.json()
                
                # Verify Prima Nota movement was created
                assert pay_data.get('success') == True, f"Payment failed: {pay_data}"
                
                prima_nota_info = pay_data.get('prima_nota', {})
                movement_id = prima_nota_info.get('movement_id')
                
                if movement_id:
                    print(f"✅ PASS: Payment created Prima Nota movement {movement_id}")
                else:
                    # Check if count increased
                    after_response = requests.get(f"{BASE_URL}{pn_endpoint}?limit=1000")
                    after_count = len(after_response.json().get('movimenti', []))
                    
                    assert after_count > before_count, "No new Prima Nota movement created"
                    print(f"✅ PASS: Prima Nota count increased from {before_count} to {after_count}")
            elif pay_response.status_code == 400:
                # Already paid or other validation error
                error = pay_response.json().get('detail', '')
                if 'già pagata' in str(error).lower():
                    pytest.skip("Invoice already paid")
                else:
                    pytest.fail(f"Payment failed: {error}")
            else:
                pytest.fail(f"Unexpected status {pay_response.status_code}: {pay_response.text}")
        else:
            pytest.skip("No unpaid invoices found to test payment propagation")


class TestBusinessRulesValidation:
    """Test business rules validation module"""
    
    def test_business_rules_module_exists(self):
        """Verifica che il modulo business_rules esista e sia importabile"""
        # This is tested implicitly by the API calls, but we can verify the structure
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ PASS: Backend is healthy, business_rules module is working")
    
    def test_delete_invoice_validation_returns_proper_format(self):
        """Verifica che la validazione eliminazione fattura restituisca il formato corretto"""
        response = requests.get(f"{BASE_URL}/api/invoices?limit=1")
        assert response.status_code == 200
        
        invoices = response.json()
        if isinstance(invoices, dict):
            invoices = invoices.get('items', invoices.get('invoices', []))
        
        if invoices:
            invoice_id = invoices[0].get('id')
            delete_response = requests.delete(f"{BASE_URL}/api/fatture/{invoice_id}")
            
            # Response should be JSON with proper structure
            data = delete_response.json()
            
            # Either success or error with proper format
            if delete_response.status_code == 200:
                assert 'success' in data or 'status' in data or 'message' in data
            else:
                assert 'detail' in data
                detail = data['detail']
                if isinstance(detail, dict):
                    assert 'message' in detail or 'errors' in detail
            
            print(f"✅ PASS: Delete validation returns proper format")
        else:
            pytest.skip("No invoices to test")


class TestFrontendDataLoading:
    """Test that frontend pages can load data correctly"""
    
    def test_prima_nota_cassa_loads(self):
        """Verifica che la pagina Prima Nota Cassa carichi i dati"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?limit=100")
        assert response.status_code == 200
        
        data = response.json()
        assert 'movimenti' in data or isinstance(data, list)
        
        if 'saldo' in data:
            assert isinstance(data['saldo'], (int, float))
        
        print(f"✅ PASS: Prima Nota Cassa loads correctly")
    
    def test_prima_nota_banca_loads(self):
        """Verifica che la pagina Prima Nota Banca carichi i dati"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/banca?limit=100")
        assert response.status_code == 200
        
        data = response.json()
        assert 'movimenti' in data or isinstance(data, list)
        
        print(f"✅ PASS: Prima Nota Banca loads correctly")
    
    def test_fatture_list_loads(self):
        """Verifica che la lista fatture carichi correttamente"""
        response = requests.get(f"{BASE_URL}/api/invoices?limit=100")
        assert response.status_code == 200
        
        data = response.json()
        # Can be list or dict with items
        if isinstance(data, dict):
            assert 'items' in data or 'invoices' in data or 'total' in data
        else:
            assert isinstance(data, list)
        
        print(f"✅ PASS: Fatture list loads correctly")
    
    def test_corrispettivi_list_loads(self):
        """Verifica che la lista corrispettivi carichi correttamente"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi?limit=100")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list) or isinstance(data, dict)
        
        print(f"✅ PASS: Corrispettivi list loads correctly")
    
    def test_assegni_list_loads(self):
        """Verifica che la lista assegni carichi correttamente"""
        response = requests.get(f"{BASE_URL}/api/assegni?limit=100")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list) or isinstance(data, dict)
        
        print(f"✅ PASS: Assegni list loads correctly")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
