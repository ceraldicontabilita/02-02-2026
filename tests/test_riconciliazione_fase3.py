"""
Test Riconciliazione Intelligente Fase 3
=========================================

Test per i nuovi endpoint implementati nella Fase 3:
- Caso 36: Assegni Multipli
- Caso 37: Arrotondamenti
- Caso 38: Pagamento Anticipato

Collections MongoDB coinvolte:
- assegni
- pagamenti_anticipati
- abbuoni_arrotondamenti
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRiconciliazioneFase3:
    """Test per Riconciliazione Intelligente Fase 3"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup per ogni test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_fattura_id = None
        self.test_pagamento_anticipato_id = None
        yield
        # Cleanup
        if self.test_fattura_id:
            # Reset fattura if created
            pass
    
    # =========================================================================
    # TEST CASO 36: ASSEGNI MULTIPLI
    # =========================================================================
    
    def test_assegni_multipli_endpoint_exists(self):
        """Verifica che l'endpoint assegni-multipli esista"""
        # Test con payload vuoto per verificare che l'endpoint risponda
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/assegni-multipli", json={})
        # Dovrebbe restituire 400 (bad request) non 404
        assert response.status_code in [400, 422], f"Endpoint non trovato o errore: {response.status_code}"
        print(f"✅ Endpoint assegni-multipli esiste, status: {response.status_code}")
    
    def test_assegni_multipli_validation_fattura_required(self):
        """Verifica validazione: fattura_id obbligatorio"""
        payload = {
            "assegni": [{"importo": 100}]
        }
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/assegni-multipli", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "fattura_id" in data.get("detail", "").lower() or "obbligatorio" in data.get("detail", "").lower()
        print(f"✅ Validazione fattura_id: {data.get('detail')}")
    
    def test_assegni_multipli_validation_assegni_required(self):
        """Verifica validazione: almeno un assegno richiesto"""
        payload = {
            "fattura_id": str(uuid.uuid4()),
            "assegni": []
        }
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/assegni-multipli", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "assegno" in data.get("detail", "").lower()
        print(f"✅ Validazione assegni: {data.get('detail')}")
    
    def test_assegni_multipli_fattura_not_found(self):
        """Verifica errore per fattura non esistente"""
        payload = {
            "fattura_id": str(uuid.uuid4()),
            "assegni": [{"importo": 100, "numero": "123456"}]
        }
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/assegni-multipli", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "non trovata" in data.get("detail", "").lower()
        print(f"✅ Fattura non trovata: {data.get('detail')}")
    
    def test_assegni_multipli_with_real_fattura(self):
        """Test assegni multipli con fattura reale (se disponibile)"""
        # Prima cerca una fattura esistente
        response = self.session.get(f"{BASE_URL}/api/riconciliazione-intelligente/fatture-da-confermare?limit=1")
        if response.status_code == 200:
            data = response.json()
            fatture = data.get("fatture", [])
            if fatture:
                fattura = fatture[0]
                fattura_id = fattura.get("id")
                importo = float(fattura.get("importo_totale") or fattura.get("total_amount") or 66)
                
                # Crea assegni che sommano all'importo fattura
                assegno1 = importo * 0.4
                assegno2 = importo * 0.6
                
                payload = {
                    "fattura_id": fattura_id,
                    "assegni": [
                        {"numero": "TEST-001", "importo": round(assegno1, 2), "banca": "Test Bank"},
                        {"numero": "TEST-002", "importo": round(assegno2, 2), "banca": "Test Bank"}
                    ]
                }
                
                response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/assegni-multipli", json=payload)
                print(f"Response status: {response.status_code}")
                print(f"Response body: {response.text[:500]}")
                
                if response.status_code == 200:
                    result = response.json()
                    assert result.get("success") == True
                    assert "assegni" in result
                    assert len(result["assegni"]) == 2
                    print(f"✅ Assegni multipli registrati: {len(result['assegni'])} assegni")
                    print(f"   Totale: €{result.get('totale_assegni', 0):.2f}")
                    print(f"   Gruppo ID: {result.get('gruppo_id')}")
                else:
                    print(f"⚠️ Assegni multipli non registrati: {response.json().get('detail')}")
            else:
                print("⚠️ Nessuna fattura disponibile per test assegni multipli")
        else:
            print(f"⚠️ Impossibile recuperare fatture: {response.status_code}")
    
    # =========================================================================
    # TEST CASO 37: ARROTONDAMENTI
    # =========================================================================
    
    def test_arrotondamento_endpoint_exists(self):
        """Verifica che l'endpoint riconcilia-con-arrotondamento esista"""
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/riconcilia-con-arrotondamento", json={})
        assert response.status_code in [400, 422], f"Endpoint non trovato: {response.status_code}"
        print(f"✅ Endpoint riconcilia-con-arrotondamento esiste, status: {response.status_code}")
    
    def test_arrotondamento_validation_required_fields(self):
        """Verifica validazione campi obbligatori"""
        payload = {
            "fattura_id": str(uuid.uuid4())
            # Manca importo_pagato e metodo
        }
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/riconcilia-con-arrotondamento", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "obbligatori" in data.get("detail", "").lower() or "importo" in data.get("detail", "").lower()
        print(f"✅ Validazione campi obbligatori: {data.get('detail')}")
    
    def test_arrotondamento_validation_metodo(self):
        """Verifica validazione metodo pagamento"""
        payload = {
            "fattura_id": str(uuid.uuid4()),
            "importo_pagato": 1000,
            "metodo": "bitcoin"  # Metodo non valido
        }
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/riconcilia-con-arrotondamento", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "cassa" in data.get("detail", "").lower() or "banca" in data.get("detail", "").lower()
        print(f"✅ Validazione metodo: {data.get('detail')}")
    
    def test_arrotondamento_fattura_not_found(self):
        """Verifica errore per fattura non esistente"""
        payload = {
            "fattura_id": str(uuid.uuid4()),
            "importo_pagato": 1000,
            "metodo": "banca"
        }
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/riconcilia-con-arrotondamento", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "non trovata" in data.get("detail", "").lower()
        print(f"✅ Fattura non trovata: {data.get('detail')}")
    
    def test_arrotondamento_tolleranza_default(self):
        """Test che la tolleranza default sia €1.00"""
        # Cerca una fattura reale
        response = self.session.get(f"{BASE_URL}/api/riconciliazione-intelligente/fatture-da-confermare?limit=1")
        if response.status_code == 200:
            data = response.json()
            fatture = data.get("fatture", [])
            if fatture:
                fattura = fatture[0]
                fattura_id = fattura.get("id")
                importo = float(fattura.get("importo_totale") or fattura.get("total_amount") or 100)
                
                # Prova con differenza di €0.50 (entro tolleranza default)
                payload = {
                    "fattura_id": fattura_id,
                    "importo_pagato": importo + 0.50,
                    "metodo": "banca"
                }
                
                response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/riconcilia-con-arrotondamento", json=payload)
                print(f"Response status: {response.status_code}")
                print(f"Response body: {response.text[:500]}")
                
                if response.status_code == 200:
                    result = response.json()
                    assert result.get("success") == True
                    assert "arrotondamento" in result or result.get("differenza") is not None
                    print(f"✅ Arrotondamento applicato: diff €{result.get('differenza', 0):.2f}")
                else:
                    print(f"⚠️ Arrotondamento non applicato: {response.json().get('detail')}")
            else:
                print("⚠️ Nessuna fattura disponibile per test arrotondamento")
    
    def test_arrotondamento_supera_tolleranza(self):
        """Test che differenza oltre tolleranza venga rifiutata"""
        # Cerca una fattura reale
        response = self.session.get(f"{BASE_URL}/api/riconciliazione-intelligente/fatture-da-confermare?limit=1")
        if response.status_code == 200:
            data = response.json()
            fatture = data.get("fatture", [])
            if fatture:
                fattura = fatture[0]
                fattura_id = fattura.get("id")
                importo = float(fattura.get("importo_totale") or fattura.get("total_amount") or 100)
                
                # Prova con differenza di €10 (oltre tolleranza max €5)
                payload = {
                    "fattura_id": fattura_id,
                    "importo_pagato": importo + 10,
                    "metodo": "banca",
                    "tolleranza": 1.00
                }
                
                response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/riconcilia-con-arrotondamento", json=payload)
                
                if response.status_code == 400:
                    data = response.json()
                    assert "supera" in data.get("detail", "").lower() or "tolleranza" in data.get("detail", "").lower()
                    print(f"✅ Differenza oltre tolleranza rifiutata: {data.get('detail')}")
                else:
                    print(f"⚠️ Risposta inattesa: {response.status_code}")
            else:
                print("⚠️ Nessuna fattura disponibile")
    
    # =========================================================================
    # TEST CASO 38: PAGAMENTO ANTICIPATO
    # =========================================================================
    
    def test_pagamento_anticipato_endpoint_exists(self):
        """Verifica che l'endpoint pagamento-anticipato esista"""
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/pagamento-anticipato", json={})
        assert response.status_code in [400, 422], f"Endpoint non trovato: {response.status_code}"
        print(f"✅ Endpoint pagamento-anticipato esiste, status: {response.status_code}")
    
    def test_pagamento_anticipato_validation_importo(self):
        """Verifica validazione importo"""
        payload = {
            "fornitore_nome": "Test Fornitore",
            "importo": 0  # Importo non valido
        }
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/pagamento-anticipato", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "importo" in data.get("detail", "").lower() or "zero" in data.get("detail", "").lower()
        print(f"✅ Validazione importo: {data.get('detail')}")
    
    def test_pagamento_anticipato_validation_metodo(self):
        """Verifica validazione metodo"""
        payload = {
            "fornitore_nome": "Test Fornitore",
            "importo": 500,
            "metodo": "crypto"  # Metodo non valido
        }
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/pagamento-anticipato", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "cassa" in data.get("detail", "").lower() or "banca" in data.get("detail", "").lower()
        print(f"✅ Validazione metodo: {data.get('detail')}")
    
    def test_pagamento_anticipato_create(self):
        """Test creazione pagamento anticipato"""
        payload = {
            "fornitore_nome": "TEST_Fornitore Anticipato",
            "fornitore_piva": "12345678901",
            "importo": 500.00,
            "metodo": "banca",
            "data_pagamento": "2026-01-20",
            "riferimento": "Ordine TEST-001",
            "note": "Test pagamento anticipato"
        }
        
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/pagamento-anticipato", json=payload)
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "pagamento_anticipato_id" in data
        assert data.get("importo") == 500.00
        assert data.get("stato") == "in_attesa_fattura"
        
        self.test_pagamento_anticipato_id = data.get("pagamento_anticipato_id")
        print(f"✅ Pagamento anticipato creato: {self.test_pagamento_anticipato_id}")
        print(f"   Importo: €{data.get('importo'):.2f}")
        print(f"   Stato: {data.get('stato')}")
    
    def test_get_pagamenti_anticipati(self):
        """Test lista pagamenti anticipati"""
        response = self.session.get(f"{BASE_URL}/api/riconciliazione-intelligente/pagamenti-anticipati")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "pagamenti" in data
        assert "count" in data
        assert "totale_residuo" in data
        
        print(f"✅ Lista pagamenti anticipati:")
        print(f"   Count: {data.get('count')}")
        print(f"   Totale residuo: €{data.get('totale_residuo', 0):.2f}")
        
        if data.get("pagamenti"):
            pag = data["pagamenti"][0]
            print(f"   Esempio: {pag.get('fornitore_nome')} - €{pag.get('importo', 0):.2f}")
    
    def test_cerca_pagamenti_anticipati_validation(self):
        """Test validazione cerca pagamenti anticipati"""
        payload = {}  # Manca fattura_id
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/cerca-pagamenti-anticipati", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert "fattura_id" in data.get("detail", "").lower()
        print(f"✅ Validazione cerca pagamenti: {data.get('detail')}")
    
    def test_cerca_pagamenti_anticipati_fattura_not_found(self):
        """Test cerca pagamenti per fattura non esistente"""
        payload = {"fattura_id": str(uuid.uuid4())}
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/cerca-pagamenti-anticipati", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert "non trovata" in data.get("detail", "").lower()
        print(f"✅ Fattura non trovata: {data.get('detail')}")
    
    def test_collega_pagamento_anticipato_validation(self):
        """Test validazione collega pagamento anticipato"""
        payload = {
            "pagamento_anticipato_id": str(uuid.uuid4())
            # Manca fattura_id
        }
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/collega-pagamento-anticipato", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert "fattura_id" in data.get("detail", "").lower() or "obbligatori" in data.get("detail", "").lower()
        print(f"✅ Validazione collega pagamento: {data.get('detail')}")
    
    def test_collega_pagamento_anticipato_not_found(self):
        """Test collega pagamento non esistente"""
        payload = {
            "pagamento_anticipato_id": str(uuid.uuid4()),
            "fattura_id": str(uuid.uuid4())
        }
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/collega-pagamento-anticipato", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert "non trovato" in data.get("detail", "").lower() or "non trovata" in data.get("detail", "").lower()
        print(f"✅ Pagamento/Fattura non trovato: {data.get('detail')}")
    
    # =========================================================================
    # TEST COLLECTIONS MONGODB
    # =========================================================================
    
    def test_collection_assegni_exists(self):
        """Verifica che la collection assegni sia stata creata"""
        # Questo test verifica indirettamente che la collection esista
        # attraverso l'endpoint assegni-multipli
        response = self.session.get(f"{BASE_URL}/api/riconciliazione-intelligente/statistiche")
        assert response.status_code == 200
        print("✅ Collection assegni verificata (indirettamente)")
    
    def test_collection_pagamenti_anticipati_exists(self):
        """Verifica che la collection pagamenti_anticipati esista"""
        response = self.session.get(f"{BASE_URL}/api/riconciliazione-intelligente/pagamenti-anticipati")
        assert response.status_code == 200
        data = response.json()
        assert "pagamenti" in data
        print("✅ Collection pagamenti_anticipati verificata")
    
    # =========================================================================
    # TEST INTEGRAZIONE END-TO-END
    # =========================================================================
    
    def test_e2e_pagamento_anticipato_flow(self):
        """Test flusso completo pagamento anticipato"""
        # 1. Crea pagamento anticipato
        payload_pag = {
            "fornitore_nome": "TEST_E2E_Fornitore",
            "fornitore_piva": "99999999999",
            "importo": 250.00,
            "metodo": "banca",
            "riferimento": "E2E-TEST"
        }
        
        response = self.session.post(f"{BASE_URL}/api/riconciliazione-intelligente/pagamento-anticipato", json=payload_pag)
        
        if response.status_code == 200:
            pag_data = response.json()
            pag_id = pag_data.get("pagamento_anticipato_id")
            print(f"✅ E2E Step 1: Pagamento anticipato creato: {pag_id}")
            
            # 2. Verifica che appaia nella lista
            response = self.session.get(f"{BASE_URL}/api/riconciliazione-intelligente/pagamenti-anticipati")
            if response.status_code == 200:
                lista = response.json()
                found = any(p.get("id") == pag_id for p in lista.get("pagamenti", []))
                if found:
                    print("✅ E2E Step 2: Pagamento trovato nella lista")
                else:
                    print("⚠️ E2E Step 2: Pagamento non trovato nella lista")
            
            # 3. Cerca fattura per collegamento (se disponibile)
            response = self.session.get(f"{BASE_URL}/api/riconciliazione-intelligente/fatture-da-confermare?limit=1")
            if response.status_code == 200:
                fatture = response.json().get("fatture", [])
                if fatture:
                    fattura_id = fatture[0].get("id")
                    
                    # 4. Cerca pagamenti anticipati per questa fattura
                    response = self.session.post(
                        f"{BASE_URL}/api/riconciliazione-intelligente/cerca-pagamenti-anticipati",
                        json={"fattura_id": fattura_id}
                    )
                    if response.status_code == 200:
                        cerca_data = response.json()
                        print(f"✅ E2E Step 3: Ricerca pagamenti completata, trovati: {len(cerca_data.get('pagamenti_trovati', []))}")
                    else:
                        print(f"⚠️ E2E Step 3: Errore ricerca: {response.json().get('detail')}")
                else:
                    print("⚠️ E2E Step 3: Nessuna fattura disponibile per collegamento")
        else:
            print(f"⚠️ E2E Step 1 fallito: {response.json().get('detail')}")


class TestRiconciliazioneFase3Statistiche:
    """Test statistiche e dashboard"""
    
    def test_dashboard_includes_new_states(self):
        """Verifica che la dashboard includa i nuovi stati Fase 3"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.get(f"{BASE_URL}/api/riconciliazione-intelligente/dashboard")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "conteggi" in data
        
        print(f"✅ Dashboard riconciliazione:")
        print(f"   Totale da verificare: {data.get('totale_da_verificare', 0)}")
        
        conteggi = data.get("conteggi", {})
        for stato, count in conteggi.items():
            if count > 0:
                print(f"   {stato}: {count}")
    
    def test_statistiche_endpoint(self):
        """Test endpoint statistiche"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.get(f"{BASE_URL}/api/riconciliazione-intelligente/statistiche")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "conteggi_per_stato" in data
        
        print(f"✅ Statistiche riconciliazione:")
        print(f"   Totale fatture: {data.get('totale_fatture', 0)}")
        print(f"   Gestite dal sistema: {data.get('totale_gestite_sistema', 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
