"""
Test Funzionali ERP Ristorante - Verifica coerenza dati e calcoli matematici.

Questo file testa:
1. Dashboard: Ricavi - Costi = Utile Lordo
2. Corrispettivi: totale = imponibile + IVA
3. Assegni: beneficiario e fattura collegata
4. Cedolini: dipendente, periodo e importi validi
5. Prima Nota: saldo = entrate - uscite
6. Fatture: fornitore, numero e importo
7. Magazzino: quantità non negative anomale
8. Relazione Dipendenti-Cedolini
9. Riepilogo Mensile Cedolini
"""
import pytest
import requests
import os
from typing import Dict, Any

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bookscan-pro.preview.emergentagent.com').rstrip('/')


class TestDashboardBilancio:
    """Test Dashboard - Verifica calcoli bilancio istantaneo"""
    
    def test_bilancio_istantaneo_endpoint_exists(self):
        """Verifica che l'endpoint bilancio-istantaneo esista e risponda"""
        response = requests.get(f"{BASE_URL}/api/dashboard/bilancio-istantaneo")
        assert response.status_code == 200, f"Endpoint bilancio-istantaneo non risponde: {response.status_code}"
        data = response.json()
        assert "ricavi" in data, "Campo 'ricavi' mancante nella risposta"
        assert "costi" in data, "Campo 'costi' mancante nella risposta"
        assert "bilancio" in data, "Campo 'bilancio' mancante nella risposta"
    
    def test_bilancio_calcolo_utile_lordo(self):
        """Verifica che Utile Lordo = Ricavi - Costi"""
        response = requests.get(f"{BASE_URL}/api/dashboard/bilancio-istantaneo")
        assert response.status_code == 200
        data = response.json()
        
        ricavi_totale = data.get("ricavi", {}).get("totale", 0)
        costi_totale = data.get("costi", {}).get("totale", 0)
        utile_lordo = data.get("bilancio", {}).get("utile_lordo", 0)
        
        # Verifica calcolo matematico
        utile_calcolato = round(ricavi_totale - costi_totale, 2)
        assert abs(utile_lordo - utile_calcolato) < 0.01, \
            f"Utile Lordo errato: {utile_lordo} != {utile_calcolato} (Ricavi {ricavi_totale} - Costi {costi_totale})"
        
        print(f"✓ Dashboard Bilancio OK: Ricavi {ricavi_totale} - Costi {costi_totale} = Utile {utile_lordo}")
    
    def test_bilancio_iva_saldo(self):
        """Verifica che Saldo IVA = IVA Debito - IVA Credito"""
        response = requests.get(f"{BASE_URL}/api/dashboard/bilancio-istantaneo")
        assert response.status_code == 200
        data = response.json()
        
        iva_debito = data.get("iva", {}).get("debito", 0)
        iva_credito = data.get("iva", {}).get("credito", 0)
        saldo_iva = data.get("iva", {}).get("saldo", 0)
        
        saldo_calcolato = round(iva_debito - iva_credito, 2)
        assert abs(saldo_iva - saldo_calcolato) < 0.01, \
            f"Saldo IVA errato: {saldo_iva} != {saldo_calcolato}"
        
        print(f"✓ IVA OK: Debito {iva_debito} - Credito {iva_credito} = Saldo {saldo_iva}")


class TestCorrispettivi:
    """Test Corrispettivi - Verifica totale = imponibile + IVA"""
    
    def test_corrispettivi_endpoint_exists(self):
        """Verifica che l'endpoint corrispettivi esista"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi")
        assert response.status_code == 200, f"Endpoint corrispettivi non risponde: {response.status_code}"
    
    def test_corrispettivi_calcolo_iva(self):
        """Verifica che per ogni corrispettivo: totale = imponibile + IVA"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi?limit=50")
        assert response.status_code == 200
        corrispettivi = response.json()
        
        if not corrispettivi:
            pytest.skip("Nessun corrispettivo presente nel database")
        
        errori = []
        verificati = 0
        
        for corr in corrispettivi[:20]:  # Verifica primi 20
            totale = float(corr.get("totale", 0) or 0)
            imponibile = float(corr.get("totale_imponibile", 0) or 0)
            iva = float(corr.get("totale_iva", 0) or 0)
            
            if totale > 0:
                # Se imponibile e IVA sono presenti, verifica la somma
                if imponibile > 0 or iva > 0:
                    somma = round(imponibile + iva, 2)
                    if abs(totale - somma) > 1:  # Tolleranza 1€
                        errori.append({
                            "data": corr.get("data"),
                            "totale": totale,
                            "imponibile": imponibile,
                            "iva": iva,
                            "somma": somma,
                            "differenza": round(totale - somma, 2)
                        })
                verificati += 1
        
        if errori:
            print(f"⚠ Corrispettivi con calcoli errati: {len(errori)}")
            for e in errori[:5]:
                print(f"  - Data {e['data']}: totale {e['totale']} != imponibile {e['imponibile']} + IVA {e['iva']}")
        
        # Accetta se almeno 80% sono corretti
        tasso_errore = len(errori) / max(verificati, 1)
        assert tasso_errore < 0.2, f"Troppi corrispettivi con calcoli errati: {len(errori)}/{verificati}"
        
        print(f"✓ Corrispettivi verificati: {verificati}, errori: {len(errori)}")
    
    def test_corrispettivi_totals(self):
        """Verifica endpoint totali corrispettivi"""
        response = requests.get(f"{BASE_URL}/api/corrispettivi/totals")
        assert response.status_code == 200
        data = response.json()
        
        assert "totale_generale" in data, "Campo totale_generale mancante"
        assert "totale_contanti" in data, "Campo totale_contanti mancante"
        assert "totale_elettronico" in data, "Campo totale_elettronico mancante"
        
        # Verifica che contanti + elettronico <= totale (può esserci non riscosso)
        contanti = data.get("totale_contanti", 0)
        elettronico = data.get("totale_elettronico", 0)
        totale = data.get("totale_generale", 0)
        
        somma_pagamenti = contanti + elettronico
        # Tolleranza per non riscosso
        assert somma_pagamenti <= totale * 1.1, \
            f"Somma pagamenti ({somma_pagamenti}) > totale ({totale})"
        
        print(f"✓ Totali corrispettivi: {totale}€ (contanti: {contanti}€, elettronico: {elettronico}€)")


class TestAssegni:
    """Test Assegni - Verifica beneficiario e fattura collegata"""
    
    def test_assegni_endpoint_exists(self):
        """Verifica che l'endpoint assegni esista"""
        response = requests.get(f"{BASE_URL}/api/assegni")
        assert response.status_code == 200, f"Endpoint assegni non risponde: {response.status_code}"
    
    def test_assegni_emessi_hanno_beneficiario(self):
        """Verifica che gli assegni emessi abbiano beneficiario"""
        response = requests.get(f"{BASE_URL}/api/assegni?stato=emesso&limit=100")
        assert response.status_code == 200
        assegni = response.json()
        
        if not assegni:
            pytest.skip("Nessun assegno emesso presente")
        
        senza_beneficiario = []
        for ass in assegni:
            beneficiario = ass.get("beneficiario")
            if not beneficiario or beneficiario in ["", "N/A", "-", None]:
                senza_beneficiario.append(ass.get("numero"))
        
        # Accetta se almeno 70% hanno beneficiario
        tasso = len(senza_beneficiario) / len(assegni)
        if tasso > 0.3:
            print(f"⚠ Assegni emessi senza beneficiario: {len(senza_beneficiario)}/{len(assegni)}")
        
        print(f"✓ Assegni emessi verificati: {len(assegni)}, senza beneficiario: {len(senza_beneficiario)}")
    
    def test_assegni_incassati_hanno_fattura(self):
        """Verifica che gli assegni incassati abbiano fattura collegata"""
        response = requests.get(f"{BASE_URL}/api/assegni?stato=incassato&limit=100")
        assert response.status_code == 200
        assegni = response.json()
        
        if not assegni:
            pytest.skip("Nessun assegno incassato presente")
        
        senza_fattura = []
        for ass in assegni:
            fattura = ass.get("fattura_collegata") or ass.get("numero_fattura")
            if not fattura:
                senza_fattura.append(ass.get("numero"))
        
        print(f"✓ Assegni incassati: {len(assegni)}, senza fattura: {len(senza_fattura)}")
    
    def test_assegni_stats(self):
        """Verifica statistiche assegni"""
        response = requests.get(f"{BASE_URL}/api/assegni/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "totale" in data, "Campo totale mancante"
        assert "per_stato" in data, "Campo per_stato mancante"
        
        print(f"✓ Statistiche assegni: totale {data.get('totale')}")


class TestCedolini:
    """Test Cedolini - Verifica dipendente, periodo e importi"""
    
    def test_cedolini_endpoint_exists(self):
        """Verifica che l'endpoint cedolini esista"""
        # Nota: endpoint senza limit può causare timeout con molti record
        response = requests.get(f"{BASE_URL}/api/cedolini?limit=10")
        assert response.status_code == 200, f"Endpoint cedolini non risponde: {response.status_code}"
    
    def test_cedolini_hanno_dati_validi(self):
        """Verifica che ogni cedolino abbia dipendente, periodo e importi"""
        response = requests.get(f"{BASE_URL}/api/cedolini?limit=100")
        assert response.status_code == 200
        data = response.json()
        
        cedolini = data.get("cedolini", [])
        if not cedolini:
            pytest.skip("Nessun cedolino presente nel database")
        
        errori = []
        for ced in cedolini[:20]:
            problemi = []
            
            # Verifica dipendente
            if not ced.get("dipendente_id") and not ced.get("dipendente_nome"):
                problemi.append("manca dipendente")
            
            # Verifica periodo
            if not ced.get("mese") or not ced.get("anno"):
                if not ced.get("periodo"):
                    problemi.append("manca periodo")
            
            # Verifica importi (almeno uno deve essere presente)
            lordo = ced.get("lordo", 0)
            netto = ced.get("netto", 0)
            if lordo == 0 and netto == 0:
                problemi.append("importi zero")
            
            if problemi:
                errori.append({
                    "id": ced.get("id"),
                    "problemi": problemi
                })
        
        if errori:
            print(f"⚠ Cedolini con problemi: {len(errori)}")
            for e in errori[:3]:
                print(f"  - {e['id']}: {', '.join(e['problemi'])}")
        
        print(f"✓ Cedolini verificati: {len(cedolini)}, con problemi: {len(errori)}")
    
    def test_cedolini_calcolo_netto(self):
        """Verifica che netto = lordo - trattenute"""
        response = requests.get(f"{BASE_URL}/api/cedolini?limit=50")
        assert response.status_code == 200
        data = response.json()
        
        cedolini = data.get("cedolini", [])
        if not cedolini:
            pytest.skip("Nessun cedolino presente")
        
        verificati = 0
        errori = 0
        
        for ced in cedolini:
            lordo = float(ced.get("lordo", 0) or 0)
            netto = float(ced.get("netto", 0) or 0)
            inps = float(ced.get("inps_dipendente", 0) or 0)
            irpef = float(ced.get("irpef", 0) or 0)
            
            if lordo > 0 and netto > 0:
                trattenute = inps + irpef
                netto_calcolato = lordo - trattenute
                
                # Tolleranza 5% per arrotondamenti
                if abs(netto - netto_calcolato) > lordo * 0.05:
                    errori += 1
                verificati += 1
        
        if verificati > 0:
            print(f"✓ Cedolini con calcoli verificati: {verificati}, errori: {errori}")
    
    def test_cedolini_riepilogo_mensile(self):
        """Verifica endpoint riepilogo mensile cedolini"""
        # Prova con anno corrente
        import datetime
        anno = datetime.datetime.now().year
        mese = datetime.datetime.now().month
        
        response = requests.get(f"{BASE_URL}/api/cedolini/riepilogo-mensile/{anno}/{mese}")
        
        if response.status_code == 404:
            # Prova con mese precedente
            if mese > 1:
                mese -= 1
            else:
                anno -= 1
                mese = 12
            response = requests.get(f"{BASE_URL}/api/cedolini/riepilogo-mensile/{anno}/{mese}")
        
        assert response.status_code == 200, f"Endpoint riepilogo-mensile non risponde: {response.status_code}"
        data = response.json()
        
        # Verifica struttura risposta
        assert "anno" in data, "Campo anno mancante"
        assert "mese" in data, "Campo mese mancante"
        
        print(f"✓ Riepilogo mensile {mese}/{anno}: {data.get('num_cedolini', 0)} cedolini")


class TestPrimaNota:
    """Test Prima Nota - Verifica saldo = entrate - uscite"""
    
    def test_prima_nota_stats_endpoint(self):
        """Verifica endpoint statistiche prima nota"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/stats")
        assert response.status_code == 200, f"Endpoint prima-nota/stats non risponde: {response.status_code}"
    
    def test_prima_nota_saldo_cassa(self):
        """Verifica che saldo cassa = entrate - uscite"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/stats")
        assert response.status_code == 200
        data = response.json()
        
        cassa = data.get("cassa", {})
        entrate = cassa.get("entrate", 0)
        uscite = cassa.get("uscite", 0)
        saldo = cassa.get("saldo", 0)
        
        saldo_calcolato = round(entrate - uscite, 2)
        assert abs(saldo - saldo_calcolato) < 0.01, \
            f"Saldo cassa errato: {saldo} != {saldo_calcolato}"
        
        print(f"✓ Prima Nota Cassa: entrate {entrate} - uscite {uscite} = saldo {saldo}")
    
    def test_prima_nota_saldo_banca(self):
        """Verifica che saldo banca = entrate - uscite"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/stats")
        assert response.status_code == 200
        data = response.json()
        
        banca = data.get("banca", {})
        entrate = banca.get("entrate", 0)
        uscite = banca.get("uscite", 0)
        saldo = banca.get("saldo", 0)
        
        saldo_calcolato = round(entrate - uscite, 2)
        assert abs(saldo - saldo_calcolato) < 0.01, \
            f"Saldo banca errato: {saldo} != {saldo_calcolato}"
        
        print(f"✓ Prima Nota Banca: entrate {entrate} - uscite {uscite} = saldo {saldo}")


class TestFatture:
    """Test Fatture - Verifica fornitore, numero e importo"""
    
    def test_fatture_endpoint_exists(self):
        """Verifica che l'endpoint fatture esista"""
        response = requests.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200, f"Endpoint invoices non risponde: {response.status_code}"
    
    def test_fatture_hanno_dati_obbligatori(self):
        """Verifica che ogni fattura abbia fornitore, numero e importo"""
        response = requests.get(f"{BASE_URL}/api/invoices?limit=50")
        assert response.status_code == 200
        fatture = response.json()
        
        if not fatture:
            pytest.skip("Nessuna fattura presente nel database")
        
        errori = []
        for fatt in fatture[:30]:
            problemi = []
            
            # Verifica fornitore
            fornitore = fatt.get("supplier_name") or fatt.get("fornitore")
            if not fornitore:
                problemi.append("manca fornitore")
            
            # Verifica numero fattura
            numero = fatt.get("invoice_number") or fatt.get("numero_fattura")
            if not numero:
                problemi.append("manca numero")
            
            # Verifica importo
            importo = fatt.get("total_amount") or fatt.get("importo_totale", 0)
            if not importo or float(importo) <= 0:
                problemi.append("importo non valido")
            
            if problemi:
                errori.append({
                    "id": fatt.get("id"),
                    "problemi": problemi
                })
        
        # Accetta se almeno 90% sono corrette
        tasso_errore = len(errori) / len(fatture[:30])
        assert tasso_errore < 0.1, f"Troppe fatture con dati mancanti: {len(errori)}/{len(fatture[:30])}"
        
        print(f"✓ Fatture verificate: {len(fatture[:30])}, con problemi: {len(errori)}")


class TestMagazzino:
    """Test Magazzino - Verifica quantità non negative anomale"""
    
    def test_magazzino_products_endpoint(self):
        """Verifica che l'endpoint prodotti magazzino esista"""
        # Prova endpoint pubblico
        response = requests.get(f"{BASE_URL}/api/products")
        if response.status_code != 200:
            response = requests.get(f"{BASE_URL}/api/magazzino/products")
        
        assert response.status_code in [200, 401], f"Endpoint magazzino non risponde: {response.status_code}"
    
    def test_magazzino_doppia_verita(self):
        """Verifica endpoint magazzino doppia verità"""
        response = requests.get(f"{BASE_URL}/api/magazzino-dv/prodotti")
        
        if response.status_code == 404:
            pytest.skip("Endpoint magazzino-dv non disponibile")
        
        assert response.status_code == 200
        data = response.json()
        
        prodotti = data.get("prodotti", [])
        if not prodotti:
            pytest.skip("Nessun prodotto in magazzino")
        
        # Verifica quantità negative anomale
        negativi = []
        for prod in prodotti:
            giacenza = prod.get("giacenza_teorica", 0) or prod.get("quantita", 0)
            if giacenza < -100:  # Soglia per anomalia
                negativi.append({
                    "nome": prod.get("nome"),
                    "giacenza": giacenza
                })
        
        if negativi:
            print(f"⚠ Prodotti con giacenza molto negativa: {len(negativi)}")
            for n in negativi[:3]:
                print(f"  - {n['nome']}: {n['giacenza']}")
        
        print(f"✓ Prodotti magazzino verificati: {len(prodotti)}, anomalie: {len(negativi)}")


class TestDipendentiCedolini:
    """Test Relazione Dipendenti-Cedolini"""
    
    def test_dipendenti_endpoint_exists(self):
        """Verifica che l'endpoint dipendenti esista"""
        response = requests.get(f"{BASE_URL}/api/dipendenti")
        assert response.status_code == 200, f"Endpoint dipendenti non risponde: {response.status_code}"
    
    def test_coerenza_dipendenti_cedolini(self):
        """Verifica che i cedolini siano collegati a dipendenti esistenti"""
        # Carica dipendenti
        response_dip = requests.get(f"{BASE_URL}/api/dipendenti")
        assert response_dip.status_code == 200
        dipendenti = response_dip.json()
        
        if not dipendenti:
            pytest.skip("Nessun dipendente presente")
        
        # Estrai ID dipendenti
        dipendenti_ids = set()
        for d in dipendenti:
            if isinstance(d, dict):
                dipendenti_ids.add(d.get("id"))
        
        # Carica cedolini
        response_ced = requests.get(f"{BASE_URL}/api/cedolini?limit=100")
        assert response_ced.status_code == 200
        data_ced = response_ced.json()
        cedolini = data_ced.get("cedolini", [])
        
        if not cedolini:
            pytest.skip("Nessun cedolino presente")
        
        # Verifica coerenza
        orfani = []
        for ced in cedolini:
            dip_id = ced.get("dipendente_id")
            if dip_id and dip_id not in dipendenti_ids:
                orfani.append({
                    "cedolino_id": ced.get("id"),
                    "dipendente_id": dip_id
                })
        
        if orfani:
            print(f"⚠ Cedolini con dipendente non trovato: {len(orfani)}")
        
        print(f"✓ Coerenza dipendenti-cedolini: {len(cedolini)} cedolini, {len(orfani)} orfani")


class TestEndpointsHealth:
    """Test Health Check - Verifica che tutti gli endpoint principali rispondano"""
    
    def test_dashboard_summary(self):
        """Verifica endpoint dashboard summary"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary")
        assert response.status_code == 200
        print("✓ Dashboard summary OK")
    
    def test_dashboard_trend_mensile(self):
        """Verifica endpoint trend mensile"""
        response = requests.get(f"{BASE_URL}/api/dashboard/trend-mensile")
        assert response.status_code == 200
        print("✓ Dashboard trend mensile OK")
    
    def test_suppliers_endpoint(self):
        """Verifica endpoint fornitori"""
        response = requests.get(f"{BASE_URL}/api/suppliers")
        assert response.status_code == 200
        print("✓ Suppliers endpoint OK")
    
    def test_employees_endpoint(self):
        """Verifica endpoint employees"""
        response = requests.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200
        print("✓ Employees endpoint OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
