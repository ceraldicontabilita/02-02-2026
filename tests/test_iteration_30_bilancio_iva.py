"""
Test Iteration 30 - Bilancio e Liquidazione IVA
Testing the corrected accounting logic for:
- Conto Economico (corrispettivi, altri_ricavi, acquisti, note_credito, margine_percentuale)
- Stato Patrimoniale (attivo/passivo bilanciati)
- Confronto Annuale
- Liquidazione IVA (IVA debito da corrispettivi, IVA credito da fatture)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://code-cleanup-105.preview.emergentagent.com')

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
    """Test Conto Economico endpoint - /api/bilancio/conto-economico"""
    
    def test_conto_economico_anno_2025(self):
        """Test Conto Economico returns correct structure for 2025"""
        response = requests.get(f"{BASE_URL}/api/bilancio/conto-economico?anno=2025")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "anno" in data
        assert data["anno"] == 2025
        assert "periodo" in data
        assert "ricavi" in data
        assert "costi" in data
        assert "risultato" in data
        
        # Verify ricavi structure
        ricavi = data["ricavi"]
        assert "corrispettivi" in ricavi, "Missing corrispettivi in ricavi"
        assert "altri_ricavi" in ricavi, "Missing altri_ricavi in ricavi"
        assert "totale_ricavi" in ricavi, "Missing totale_ricavi in ricavi"
        
        # Verify costi structure
        costi = data["costi"]
        assert "acquisti" in costi, "Missing acquisti in costi"
        assert "note_credito" in costi, "Missing note_credito in costi"
        assert "altri_costi" in costi, "Missing altri_costi in costi"
        assert "totale_costi" in costi, "Missing totale_costi in costi"
        
        # Verify risultato structure
        risultato = data["risultato"]
        assert "utile_perdita" in risultato, "Missing utile_perdita in risultato"
        assert "margine_percentuale" in risultato, "Missing margine_percentuale in risultato"
        assert "tipo" in risultato, "Missing tipo in risultato"
        
        # Verify calculations
        assert ricavi["totale_ricavi"] == round(ricavi["corrispettivi"] + ricavi["altri_ricavi"], 2)
        
        # Note credito should reduce costs
        costi_netti = costi["acquisti"] - costi["note_credito"] + costi["altri_costi"]
        assert abs(costi["totale_costi"] - costi_netti) < 1, f"Costi totali mismatch: {costi['totale_costi']} vs {costi_netti}"
        
        # Utile = Ricavi - Costi
        utile_calcolato = ricavi["totale_ricavi"] - costi["totale_costi"]
        assert abs(risultato["utile_perdita"] - utile_calcolato) < 1, f"Utile mismatch: {risultato['utile_perdita']} vs {utile_calcolato}"
        
        print(f"✅ Conto Economico 2025:")
        print(f"   Corrispettivi: €{ricavi['corrispettivi']:,.2f}")
        print(f"   Altri Ricavi: €{ricavi['altri_ricavi']:,.2f}")
        print(f"   Totale Ricavi: €{ricavi['totale_ricavi']:,.2f}")
        print(f"   Acquisti: €{costi['acquisti']:,.2f}")
        print(f"   Note Credito: €{costi['note_credito']:,.2f}")
        print(f"   Altri Costi: €{costi['altri_costi']:,.2f}")
        print(f"   Totale Costi: €{costi['totale_costi']:,.2f}")
        print(f"   Utile/Perdita: €{risultato['utile_perdita']:,.2f} ({risultato['tipo']})")
        print(f"   Margine %: {risultato['margine_percentuale']}%")
    
    def test_conto_economico_with_month(self):
        """Test Conto Economico with specific month"""
        response = requests.get(f"{BASE_URL}/api/bilancio/conto-economico?anno=2025&mese=1")
        assert response.status_code == 200
        data = response.json()
        
        assert data["anno"] == 2025
        assert data["mese"] == 1
        assert data["periodo"]["da"] == "2025-01-01"
        assert data["periodo"]["a"] == "2025-01-31"
        
        print(f"✅ Conto Economico Gennaio 2025: Ricavi €{data['ricavi']['totale_ricavi']:,.2f}, Costi €{data['costi']['totale_costi']:,.2f}")
    
    def test_conto_economico_statistiche(self):
        """Test Conto Economico includes statistics"""
        response = requests.get(f"{BASE_URL}/api/bilancio/conto-economico?anno=2025")
        assert response.status_code == 200
        data = response.json()
        
        assert "statistiche" in data
        stats = data["statistiche"]
        assert "num_corrispettivi" in stats
        assert "num_fatture_ricevute" in stats
        assert "num_note_credito" in stats
        
        print(f"✅ Statistiche: {stats['num_corrispettivi']} corrispettivi, {stats['num_fatture_ricevute']} fatture, {stats['num_note_credito']} note credito")
    
    def test_conto_economico_dettaglio_iva(self):
        """Test Conto Economico includes IVA details"""
        response = requests.get(f"{BASE_URL}/api/bilancio/conto-economico?anno=2025")
        assert response.status_code == 200
        data = response.json()
        
        assert "dettaglio_iva" in data
        iva = data["dettaglio_iva"]
        assert "iva_vendite" in iva
        assert "iva_acquisti" in iva
        assert "iva_netta" in iva
        
        # IVA netta = IVA vendite - IVA acquisti
        iva_netta_calc = iva["iva_vendite"] - iva["iva_acquisti"]
        assert abs(iva["iva_netta"] - iva_netta_calc) < 1
        
        print(f"✅ Dettaglio IVA: Vendite €{iva['iva_vendite']:,.2f}, Acquisti €{iva['iva_acquisti']:,.2f}, Netta €{iva['iva_netta']:,.2f}")


class TestStatoPatrimoniale:
    """Test Stato Patrimoniale endpoint - /api/bilancio/stato-patrimoniale"""
    
    def test_stato_patrimoniale_anno_2025(self):
        """Test Stato Patrimoniale returns balanced attivo/passivo"""
        response = requests.get(f"{BASE_URL}/api/bilancio/stato-patrimoniale?anno=2025")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "anno" in data
        assert data["anno"] == 2025
        assert "attivo" in data
        assert "passivo" in data
        
        attivo = data["attivo"]
        passivo = data["passivo"]
        
        # Verify attivo structure
        assert "disponibilita_liquide" in attivo
        assert "cassa" in attivo["disponibilita_liquide"]
        assert "banca" in attivo["disponibilita_liquide"]
        assert "crediti" in attivo
        assert "totale_attivo" in attivo
        
        # Verify passivo structure
        assert "debiti" in passivo
        assert "patrimonio_netto" in passivo
        assert "totale_passivo" in passivo
        
        # Verify balance: Totale Attivo = Totale Passivo
        assert abs(attivo["totale_attivo"] - passivo["totale_passivo"]) < 1, \
            f"Bilancio non bilanciato: Attivo {attivo['totale_attivo']} != Passivo {passivo['totale_passivo']}"
        
        print(f"✅ Stato Patrimoniale 2025:")
        print(f"   ATTIVO:")
        print(f"     Cassa: €{attivo['disponibilita_liquide']['cassa']:,.2f}")
        print(f"     Banca: €{attivo['disponibilita_liquide']['banca']:,.2f}")
        print(f"     Crediti vs Clienti: €{attivo['crediti']['crediti_vs_clienti']:,.2f}")
        print(f"     TOTALE ATTIVO: €{attivo['totale_attivo']:,.2f}")
        print(f"   PASSIVO:")
        print(f"     Debiti vs Fornitori: €{passivo['debiti']['debiti_vs_fornitori']:,.2f}")
        print(f"     Patrimonio Netto: €{passivo['patrimonio_netto']:,.2f}")
        print(f"     TOTALE PASSIVO: €{passivo['totale_passivo']:,.2f}")
        print(f"   ✅ Bilancio bilanciato!")


class TestConfrontoAnnuale:
    """Test Confronto Annuale endpoint - /api/bilancio/confronto-annuale"""
    
    def test_confronto_annuale_2025_vs_2024(self):
        """Test Confronto Annuale returns correct comparison"""
        response = requests.get(f"{BASE_URL}/api/bilancio/confronto-annuale?anno_corrente=2025&anno_precedente=2024")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert data["anno_corrente"] == 2025
        assert data["anno_precedente"] == 2024
        assert "conto_economico" in data
        assert "stato_patrimoniale" in data
        assert "kpi" in data
        assert "sintesi" in data
        
        ce = data["conto_economico"]
        
        # Verify conto economico comparison structure
        assert "ricavi" in ce
        assert "costi" in ce
        assert "risultato" in ce
        
        # Verify each comparison has required fields
        for key in ["corrispettivi", "altri_ricavi", "totale_ricavi"]:
            assert key in ce["ricavi"]
            item = ce["ricavi"][key]
            assert "attuale" in item
            assert "precedente" in item
            assert "variazione" in item
            assert "variazione_pct" in item
            assert "trend" in item
        
        # Verify KPI
        kpi = data["kpi"]
        assert "margine_lordo_pct" in kpi
        assert "roi_pct" in kpi
        assert "crescita_ricavi_pct" in kpi
        assert "crescita_costi_pct" in kpi
        
        print(f"✅ Confronto Annuale 2025 vs 2024:")
        print(f"   Ricavi: €{ce['ricavi']['totale_ricavi']['attuale']:,.2f} vs €{ce['ricavi']['totale_ricavi']['precedente']:,.2f} ({ce['ricavi']['totale_ricavi']['variazione_pct']:+.1f}%)")
        print(f"   Costi: €{ce['costi']['totale_costi']['attuale']:,.2f} vs €{ce['costi']['totale_costi']['precedente']:,.2f} ({ce['costi']['totale_costi']['variazione_pct']:+.1f}%)")
        print(f"   Utile Netto: €{ce['risultato']['utile_netto']['attuale']:,.2f} vs €{ce['risultato']['utile_netto']['precedente']:,.2f}")
        print(f"   Sintesi: {data['sintesi']}")


class TestLiquidazioneIVA:
    """Test Liquidazione IVA endpoint - /api/liquidazione-iva/calcola/{anno}/{mese}"""
    
    def test_liquidazione_iva_gennaio_2025(self):
        """Test Liquidazione IVA for January 2025"""
        response = requests.get(f"{BASE_URL}/api/liquidazione-iva/calcola/2025/1")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert data["anno"] == 2025
        assert data["mese"] == 1
        assert "iva_debito" in data
        assert "iva_credito" in data
        assert "iva_da_versare" in data
        assert "credito_da_riportare" in data
        assert "stato" in data
        
        # Verify IVA calculation logic
        saldo = data["iva_debito"] - data["iva_credito"] - data.get("credito_precedente", 0)
        if saldo > 0:
            assert data["iva_da_versare"] == round(saldo, 2) or abs(data["iva_da_versare"] - saldo) < 1
            assert data["credito_da_riportare"] == 0
        else:
            assert data["iva_da_versare"] == 0
            assert data["credito_da_riportare"] == round(abs(saldo), 2) or abs(data["credito_da_riportare"] - abs(saldo)) < 1
        
        print(f"✅ Liquidazione IVA Gennaio 2025:")
        print(f"   IVA Debito (da corrispettivi): €{data['iva_debito']:,.2f}")
        print(f"   IVA Credito (da fatture): €{data['iva_credito']:,.2f}")
        print(f"   IVA da Versare: €{data['iva_da_versare']:,.2f}")
        print(f"   Credito da Riportare: €{data['credito_da_riportare']:,.2f}")
        print(f"   Stato: {data['stato']}")
    
    def test_liquidazione_iva_detail_by_aliquota(self):
        """Test Liquidazione IVA includes detail by aliquota"""
        response = requests.get(f"{BASE_URL}/api/liquidazione-iva/calcola/2025/1")
        assert response.status_code == 200
        data = response.json()
        
        # Verify sales detail (IVA debito per aliquota)
        assert "sales_detail" in data
        sales = data["sales_detail"]
        
        # Verify purchase detail (IVA credito per aliquota)
        assert "purchase_detail" in data
        purchases = data["purchase_detail"]
        
        # Verify statistics
        assert "statistiche" in data
        stats = data["statistiche"]
        assert "fatture_incluse" in stats
        assert "note_credito" in stats
        assert "corrispettivi_count" in stats
        
        print(f"✅ Dettaglio per Aliquota:")
        print(f"   Sales (IVA Debito): {sales}")
        print(f"   Purchases (IVA Credito): {purchases}")
        print(f"   Statistiche: {stats['corrispettivi_count']} corrispettivi, {stats['fatture_incluse']} fatture, {stats['note_credito']} note credito")
    
    def test_liquidazione_iva_with_credito_precedente(self):
        """Test Liquidazione IVA with previous credit"""
        response = requests.get(f"{BASE_URL}/api/liquidazione-iva/calcola/2025/2?credito_precedente=1000")
        assert response.status_code == 200
        data = response.json()
        
        assert data["credito_precedente"] == 1000.0
        print(f"✅ Liquidazione IVA Febbraio 2025 con credito precedente €1000:")
        print(f"   IVA Debito: €{data['iva_debito']:,.2f}")
        print(f"   IVA Credito: €{data['iva_credito']:,.2f}")
        print(f"   Credito Precedente: €{data['credito_precedente']:,.2f}")
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
        assert "totali" in data
        
        # Verify monthly data
        mensile = data["mensile"]
        assert len(mensile) == 12, "Should have 12 months"
        
        for m in mensile:
            assert "mese" in m
            assert "mese_nome" in m
            assert "iva_debito" in m
            assert "iva_credito" in m
        
        print(f"✅ Riepilogo Annuale IVA 2025:")
        print(f"   Totale IVA Debito: €{data['totali']['iva_debito_totale']:,.2f}")
        print(f"   Totale IVA Credito: €{data['totali']['iva_credito_totale']:,.2f}")


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
        
        print(f"✅ Riepilogo Bilancio 2025 includes both Stato Patrimoniale and Conto Economico")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
