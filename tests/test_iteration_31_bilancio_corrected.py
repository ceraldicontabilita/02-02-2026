"""
Test Iteration 31 - Bilancio e Liquidazione IVA (Corrected Accounting Logic)

CORREZIONE IMPORTANTE:
- Ricavi = SOLO Corrispettivi (vendite al pubblico) - NO altri_ricavi
- Costi = Fatture Ricevute (da fornitori) - Note Credito
- Tutte le fatture nella collezione 'invoices' sono RICEVUTE (acquisti), NON emesse

Valori attesi 2025:
- Ricavi €857,515.42 (corrispettivi)
- Costi netti €496,180.07 (acquisti €510,523.78 - NC €14,343.71)
- Utile €361,335.35 (margine 42.1%)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://italian-accounting.preview.emergentagent.com')


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print(f"✅ API Health: {data['status']}, DB: {data['database']}, Version: {data['version']}")


class TestContoEconomico:
    """Test Conto Economico endpoint - /api/bilancio/conto-economico
    
    LOGICA CORRETTA:
    - Ricavi = SOLO corrispettivi (NO altri_ricavi)
    - Costi = acquisti - note_credito
    """
    
    def test_conto_economico_structure_no_altri_ricavi(self):
        """Test Conto Economico does NOT have altri_ricavi field"""
        response = requests.get(f"{BASE_URL}/api/bilancio/conto-economico?anno=2025")
        assert response.status_code == 200
        data = response.json()
        
        # Verify ricavi structure - NO altri_ricavi
        ricavi = data["ricavi"]
        assert "corrispettivi" in ricavi, "Missing corrispettivi in ricavi"
        assert "totale_ricavi" in ricavi, "Missing totale_ricavi in ricavi"
        assert "altri_ricavi" not in ricavi, "altri_ricavi should NOT exist - ricavi = SOLO corrispettivi"
        
        # Verify costi structure - NO altri_costi
        costi = data["costi"]
        assert "acquisti" in costi, "Missing acquisti in costi"
        assert "note_credito" in costi, "Missing note_credito in costi"
        assert "totale_costi" in costi, "Missing totale_costi in costi"
        assert "altri_costi" not in costi, "altri_costi should NOT exist"
        
        print(f"✅ Conto Economico structure correct: NO altri_ricavi, NO altri_costi")
    
    def test_conto_economico_values_2025(self):
        """Test Conto Economico returns expected values for 2025"""
        response = requests.get(f"{BASE_URL}/api/bilancio/conto-economico?anno=2025")
        assert response.status_code == 200
        data = response.json()
        
        ricavi = data["ricavi"]
        costi = data["costi"]
        risultato = data["risultato"]
        
        # Expected values
        expected_corrispettivi = 857515.42
        expected_acquisti = 510523.78
        expected_note_credito = 14343.71
        expected_costi_netti = 496180.07
        expected_utile = 361335.35
        expected_margine = 42.1
        
        # Verify values (with tolerance)
        assert abs(ricavi["corrispettivi"] - expected_corrispettivi) < 1, f"Corrispettivi mismatch: {ricavi['corrispettivi']} vs {expected_corrispettivi}"
        assert abs(costi["acquisti"] - expected_acquisti) < 1, f"Acquisti mismatch: {costi['acquisti']} vs {expected_acquisti}"
        assert abs(costi["note_credito"] - expected_note_credito) < 1, f"Note credito mismatch: {costi['note_credito']} vs {expected_note_credito}"
        assert abs(costi["totale_costi"] - expected_costi_netti) < 1, f"Costi netti mismatch: {costi['totale_costi']} vs {expected_costi_netti}"
        assert abs(risultato["utile_perdita"] - expected_utile) < 1, f"Utile mismatch: {risultato['utile_perdita']} vs {expected_utile}"
        assert abs(risultato["margine_percentuale"] - expected_margine) < 0.5, f"Margine mismatch: {risultato['margine_percentuale']} vs {expected_margine}"
        
        # Verify totale_ricavi = corrispettivi (NO altri_ricavi)
        assert abs(ricavi["totale_ricavi"] - ricavi["corrispettivi"]) < 1, "totale_ricavi should equal corrispettivi"
        
        # Verify costi_netti = acquisti - note_credito
        costi_netti_calc = costi["acquisti"] - costi["note_credito"]
        assert abs(costi["totale_costi"] - costi_netti_calc) < 1, f"Costi netti calculation error: {costi['totale_costi']} vs {costi_netti_calc}"
        
        print(f"✅ Conto Economico 2025 values correct:")
        print(f"   Corrispettivi: €{ricavi['corrispettivi']:,.2f}")
        print(f"   Totale Ricavi: €{ricavi['totale_ricavi']:,.2f}")
        print(f"   Acquisti: €{costi['acquisti']:,.2f}")
        print(f"   Note Credito: €{costi['note_credito']:,.2f}")
        print(f"   Totale Costi: €{costi['totale_costi']:,.2f}")
        print(f"   Utile: €{risultato['utile_perdita']:,.2f} ({risultato['tipo']})")
        print(f"   Margine: {risultato['margine_percentuale']}%")
    
    def test_conto_economico_with_month(self):
        """Test Conto Economico with specific month"""
        response = requests.get(f"{BASE_URL}/api/bilancio/conto-economico?anno=2025&mese=1")
        assert response.status_code == 200
        data = response.json()
        
        assert data["anno"] == 2025
        assert data["mese"] == 1
        assert data["periodo"]["da"] == "2025-01-01"
        assert data["periodo"]["a"] == "2025-01-31"
        
        # Verify structure is consistent
        assert "altri_ricavi" not in data["ricavi"]
        assert "altri_costi" not in data["costi"]
        
        print(f"✅ Conto Economico Gennaio 2025: Ricavi €{data['ricavi']['totale_ricavi']:,.2f}, Costi €{data['costi']['totale_costi']:,.2f}")


class TestStatoPatrimoniale:
    """Test Stato Patrimoniale endpoint - /api/bilancio/stato-patrimoniale"""
    
    def test_stato_patrimoniale_balanced(self):
        """Test Stato Patrimoniale returns balanced attivo/passivo"""
        response = requests.get(f"{BASE_URL}/api/bilancio/stato-patrimoniale?anno=2025")
        assert response.status_code == 200
        data = response.json()
        
        attivo = data["attivo"]
        passivo = data["passivo"]
        
        # Verify balance: Totale Attivo = Totale Passivo
        assert abs(attivo["totale_attivo"] - passivo["totale_passivo"]) < 1, \
            f"Bilancio non bilanciato: Attivo {attivo['totale_attivo']} != Passivo {passivo['totale_passivo']}"
        
        print(f"✅ Stato Patrimoniale 2025 BILANCIATO:")
        print(f"   Totale Attivo: €{attivo['totale_attivo']:,.2f}")
        print(f"   Totale Passivo: €{passivo['totale_passivo']:,.2f}")


class TestRiepilogoBilancio:
    """Test Riepilogo Bilancio endpoint - /api/bilancio/riepilogo"""
    
    def test_riepilogo_bilancio(self):
        """Test Riepilogo returns both stato patrimoniale and conto economico"""
        response = requests.get(f"{BASE_URL}/api/bilancio/riepilogo?anno=2025")
        assert response.status_code == 200
        data = response.json()
        
        assert data["anno"] == 2025
        assert "stato_patrimoniale" in data
        assert "conto_economico" in data
        
        # Verify conto economico structure in riepilogo
        ce = data["conto_economico"]
        assert "corrispettivi" in ce["ricavi"]
        assert "totale" in ce["ricavi"]
        
        print(f"✅ Riepilogo Bilancio 2025 includes both Stato Patrimoniale and Conto Economico")


class TestConfrontoAnnuale:
    """Test Confronto Annuale endpoint - /api/bilancio/confronto-annuale"""
    
    def test_confronto_annuale_structure(self):
        """Test Confronto Annuale returns correct structure without altri_ricavi"""
        response = requests.get(f"{BASE_URL}/api/bilancio/confronto-annuale?anno_corrente=2025&anno_precedente=2024")
        assert response.status_code == 200
        data = response.json()
        
        assert data["anno_corrente"] == 2025
        assert data["anno_precedente"] == 2024
        
        ce = data["conto_economico"]
        
        # Verify NO altri_ricavi in confronto
        assert "corrispettivi" in ce["ricavi"]
        assert "totale_ricavi" in ce["ricavi"]
        assert "altri_ricavi" not in ce["ricavi"], "altri_ricavi should NOT exist in confronto"
        
        # Verify note_credito instead of costi_operativi
        assert "acquisti" in ce["costi"]
        assert "note_credito" in ce["costi"]
        assert "totale_costi" in ce["costi"]
        assert "costi_operativi" not in ce["costi"], "costi_operativi should NOT exist"
        
        print(f"✅ Confronto Annuale structure correct: NO altri_ricavi, NO costi_operativi")
        print(f"   Ricavi 2025: €{ce['ricavi']['totale_ricavi']['attuale']:,.2f}")
        print(f"   Ricavi 2024: €{ce['ricavi']['totale_ricavi']['precedente']:,.2f}")
        print(f"   Variazione: {ce['ricavi']['totale_ricavi']['variazione_pct']:+.1f}%")


class TestLiquidazioneIVA:
    """Test Liquidazione IVA endpoint - /api/liquidazione-iva/calcola/{anno}/{mese}"""
    
    def test_liquidazione_iva_gennaio_2025(self):
        """Test Liquidazione IVA for January 2025"""
        response = requests.get(f"{BASE_URL}/api/liquidazione-iva/calcola/2025/1")
        assert response.status_code == 200
        data = response.json()
        
        assert data["anno"] == 2025
        assert data["mese"] == 1
        assert "iva_debito" in data
        assert "iva_credito" in data
        assert "sales_detail" in data  # IVA debito per aliquota (da corrispettivi)
        assert "purchase_detail" in data  # IVA credito per aliquota (da fatture)
        
        print(f"✅ Liquidazione IVA Gennaio 2025:")
        print(f"   IVA Debito (da corrispettivi): €{data['iva_debito']:,.2f}")
        print(f"   IVA Credito (da fatture): €{data['iva_credito']:,.2f}")
        print(f"   Stato: {data['stato']}")
    
    def test_liquidazione_iva_invalid_month(self):
        """Test Liquidazione IVA with invalid month returns 400"""
        response = requests.get(f"{BASE_URL}/api/liquidazione-iva/calcola/2025/13")
        assert response.status_code == 400
        print("✅ Invalid month (13) correctly returns 400")
    
    def test_liquidazione_iva_riepilogo_annuale(self):
        """Test Riepilogo Annuale IVA"""
        response = requests.get(f"{BASE_URL}/api/liquidazione-iva/riepilogo-annuale/2025")
        assert response.status_code == 200
        data = response.json()
        
        assert data["anno"] == 2025
        assert "mensile" in data
        assert len(data["mensile"]) == 12
        
        print(f"✅ Riepilogo Annuale IVA 2025: 12 mesi")


class TestPDFExport:
    """Test PDF Export endpoints"""
    
    def test_export_bilancio_pdf(self):
        """Test Bilancio PDF export"""
        response = requests.get(f"{BASE_URL}/api/bilancio/export-pdf?anno=2025")
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 1000  # PDF should be at least 1KB
        print(f"✅ Bilancio PDF export: {len(response.content)} bytes")
    
    def test_export_confronto_pdf(self):
        """Test Confronto PDF export"""
        response = requests.get(f"{BASE_URL}/api/bilancio/export/pdf/confronto?anno_corrente=2025&anno_precedente=2024")
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 1000
        print(f"✅ Confronto PDF export: {len(response.content)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
