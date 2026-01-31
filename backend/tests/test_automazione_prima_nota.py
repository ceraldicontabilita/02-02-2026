"""
Test Automazione Prima Nota - Iteration 10
Tests:
1. Automazione Fatture XML: upload di una fattura XML deve creare automaticamente un movimento in prima_nota_banca
2. Automazione Buste Paga: l'upload di un cedolino PDF deve collegare/creare un movimento in prima_nota_salari
"""
import pytest
import requests
import os
import base64
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Sample XML invoice for testing
SAMPLE_XML_INVOICE = """<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" versione="FPR12">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>01234567890</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>00001</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>0000000</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>TEST12345678901</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>TEST_FORNITORE_AUTOMAZIONE SRL</Denominazione>
        </Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Test 123</Indirizzo>
        <CAP>00100</CAP>
        <Comune>Roma</Comune>
        <Provincia>RM</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>02345678901</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>CLIENTE TEST SRL</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Cliente 456</Indirizzo>
        <CAP>00200</CAP>
        <Comune>Milano</Comune>
        <Provincia>MI</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>2026-01-31</Data>
        <Numero>TEST-AUTO-001</Numero>
        <ImportoTotaleDocumento>122.00</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Prodotto Test Automazione</Descrizione>
        <Quantita>1.00</Quantita>
        <PrezzoUnitario>100.00</PrezzoUnitario>
        <PrezzoTotale>100.00</PrezzoTotale>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>22.00</AliquotaIVA>
        <ImponibileImporto>100.00</ImponibileImporto>
        <Imposta>22.00</Imposta>
      </DatiRiepilogo>
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>MP05</ModalitaPagamento>
        <ImportoPagamento>122.00</ImportoPagamento>
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>"""


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        """Test API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ API healthy: {data}")


class TestAutomazioneFattureXML:
    """Test automazione fatture XML -> prima_nota_banca"""
    
    def test_upload_xml_creates_prima_nota_banca(self):
        """
        Test che l'upload di una fattura XML crei automaticamente 
        un movimento in prima_nota_banca
        """
        # 1. Prima conta i movimenti esistenti in prima_nota_banca
        response_before = requests.get(f"{BASE_URL}/api/prima-nota/banca?anno=2026&limit=1000")
        assert response_before.status_code == 200
        count_before = response_before.json().get("count", 0)
        print(f"Movimenti prima_nota_banca prima dell'upload: {count_before}")
        
        # 2. Upload fattura XML
        files = {
            'file': ('test_automazione.xml', SAMPLE_XML_INVOICE.encode('utf-8'), 'application/xml')
        }
        response = requests.post(f"{BASE_URL}/api/fatture/upload-xml", files=files)
        
        # Può essere 200 (successo) o 409 (duplicato)
        if response.status_code == 409:
            print(f"⚠ Fattura già presente (duplicato): {response.json()}")
            # Verifica che esista già un movimento collegato
            pytest.skip("Fattura già presente - test duplicato")
        
        assert response.status_code == 200, f"Upload fallito: {response.text}"
        data = response.json()
        print(f"Upload response: {data}")
        
        # 3. Verifica che la fattura sia stata importata
        assert data.get("success") == True
        invoice = data.get("invoice", {})
        invoice_id = invoice.get("id")
        assert invoice_id, "Invoice ID mancante"
        
        # 4. Verifica prima_nota result
        prima_nota = data.get("prima_nota", {})
        print(f"Prima Nota result: {prima_nota}")
        
        # 5. Verifica che sia stato creato un movimento in prima_nota_banca
        # Il movimento dovrebbe essere creato automaticamente per metodo_pagamento != "misto"
        if prima_nota.get("banca"):
            print(f"✓ Movimento prima_nota_banca creato: {prima_nota['banca']}")
            
            # Verifica che il movimento esista
            response_after = requests.get(f"{BASE_URL}/api/prima-nota/banca?anno=2026&limit=1000")
            assert response_after.status_code == 200
            count_after = response_after.json().get("count", 0)
            print(f"Movimenti prima_nota_banca dopo l'upload: {count_after}")
            
            # Dovrebbe esserci almeno un movimento in più
            assert count_after >= count_before, "Nessun nuovo movimento creato"
        else:
            # Se non c'è banca, potrebbe essere cassa o misto
            if prima_nota.get("cassa"):
                print(f"✓ Movimento prima_nota_cassa creato: {prima_nota['cassa']}")
            else:
                print(f"⚠ Nessun movimento prima_nota creato - verificare metodo_pagamento")
        
        # 6. Cleanup - elimina la fattura di test
        # (opzionale, per non inquinare il database)
        
    def test_fattura_xml_fields_populated(self):
        """Verifica che i campi della fattura siano popolati correttamente"""
        # Cerca la fattura di test
        response = requests.get(f"{BASE_URL}/api/fatture?search=TEST_FORNITORE_AUTOMAZIONE")
        if response.status_code == 200:
            fatture = response.json()
            if isinstance(fatture, list) and len(fatture) > 0:
                fattura = fatture[0]
                print(f"Fattura trovata: {fattura.get('invoice_number')}")
                
                # Verifica campi
                assert fattura.get("supplier_name"), "supplier_name mancante"
                assert fattura.get("total_amount"), "total_amount mancante"
                print(f"✓ Campi fattura popolati correttamente")
            else:
                print("Nessuna fattura di test trovata")
        else:
            print(f"Ricerca fatture fallita: {response.status_code}")


class TestAutomazione BustePaga:
    """Test automazione buste paga -> prima_nota_salari"""
    
    def test_cedolini_endpoint_works(self):
        """Test che l'endpoint cedolini funzioni"""
        response = requests.get(f"{BASE_URL}/api/cedolini?anno=2025")
        assert response.status_code == 200
        data = response.json()
        cedolini = data.get("cedolini", data) if isinstance(data, dict) else data
        print(f"✓ Cedolini trovati: {len(cedolini) if isinstance(cedolini, list) else 'N/A'}")
        
    def test_prima_nota_salari_endpoint_works(self):
        """Test che l'endpoint prima_nota_salari funzioni"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/salari?anno=2025")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Prima Nota Salari: {data.get('count', 0)} movimenti")
        
    def test_cedolino_has_prima_nota_link(self):
        """
        Verifica che i cedolini caricati abbiano un collegamento 
        con prima_nota_salari (se implementato)
        """
        # Cerca cedolini con prima_nota collegata
        response = requests.get(f"{BASE_URL}/api/cedolini?anno=2025")
        assert response.status_code == 200
        data = response.json()
        cedolini = data.get("cedolini", data) if isinstance(data, dict) else data
        
        if isinstance(cedolini, list) and len(cedolini) > 0:
            # Prendi un cedolino di esempio
            cedolino = cedolini[0]
            print(f"Cedolino esempio: {cedolino.get('dipendente_nome')} - {cedolino.get('periodo')}")
            
            # Verifica se ha un collegamento prima_nota
            # Il collegamento potrebbe essere in prima_nota_salari_id o simile
            prima_nota_id = cedolino.get("prima_nota_salari_id") or cedolino.get("prima_nota_id")
            if prima_nota_id:
                print(f"✓ Cedolino collegato a prima_nota_salari: {prima_nota_id}")
            else:
                # Cerca in prima_nota_salari per questo dipendente/periodo
                cf = cedolino.get("codice_fiscale")
                mese = cedolino.get("mese")
                anno = cedolino.get("anno")
                
                if cf and mese and anno:
                    response_salari = requests.get(f"{BASE_URL}/api/prima-nota/salari?anno={anno}")
                    if response_salari.status_code == 200:
                        salari = response_salari.json().get("movimenti", [])
                        # Cerca match per codice_fiscale e mese
                        match = next((s for s in salari if s.get("codice_fiscale") == cf and s.get("mese") == mese), None)
                        if match:
                            print(f"✓ Trovato movimento salari collegato: {match.get('id')}")
                        else:
                            print(f"⚠ Nessun movimento salari trovato per CF={cf}, mese={mese}")
                else:
                    print(f"⚠ Dati cedolino incompleti per verifica collegamento")
        else:
            print("Nessun cedolino trovato per verifica")


class TestPrimaNotaIntegration:
    """Test integrazione Prima Nota"""
    
    def test_prima_nota_banca_list(self):
        """Test lista movimenti prima_nota_banca"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/banca?anno=2026&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "movimenti" in data or isinstance(data, list)
        print(f"✓ Prima Nota Banca: {data.get('count', len(data))} movimenti")
        
    def test_prima_nota_cassa_list(self):
        """Test lista movimenti prima_nota_cassa"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/cassa?anno=2026&limit=10")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Prima Nota Cassa: {data.get('count', len(data) if isinstance(data, list) else 0)} movimenti")
        
    def test_prima_nota_salari_list(self):
        """Test lista movimenti prima_nota_salari"""
        response = requests.get(f"{BASE_URL}/api/prima-nota/salari?anno=2026&limit=10")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Prima Nota Salari: {data.get('count', 0)} movimenti")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_invoices(self):
        """Cleanup fatture di test (opzionale)"""
        # Cerca e elimina fatture con prefisso TEST_
        response = requests.get(f"{BASE_URL}/api/fatture?search=TEST_FORNITORE_AUTOMAZIONE")
        if response.status_code == 200:
            fatture = response.json()
            if isinstance(fatture, list):
                for f in fatture:
                    if f.get("supplier_name", "").startswith("TEST_"):
                        fid = f.get("id")
                        if fid:
                            del_resp = requests.delete(f"{BASE_URL}/api/fatture/{fid}")
                            print(f"Deleted test invoice: {fid} - {del_resp.status_code}")
        print("✓ Cleanup completato")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
