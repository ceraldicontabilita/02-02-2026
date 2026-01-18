#!/usr/bin/env python3
"""
Parlant AI Server per Contabit
Server Parlant con agente contabile italiano configurato con:
- Tools per accesso ai dati contabili
- Guidelines comportamentali
- Context variables
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

# Carica variabili ambiente dal .env (override=True per sovrascrivere variabili esistenti)
load_dotenv("/app/backend/.env", override=True)

# Verifica che OPENAI_API_KEY sia impostata
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("❌ ERRORE: OPENAI_API_KEY non trovata in /app/backend/.env")
    sys.exit(1)
    
print(f"🔑 Usando OpenAI API Key: {api_key[:20]}...")

import parlant.sdk as p

# ============================================
# TOOLS - Funzioni per accesso ai dati
# ============================================

@p.tool
async def get_datetime(context: p.ToolContext) -> p.ToolResult:
    """Ottiene la data e ora corrente."""
    now = datetime.now(timezone.utc)
    return p.ToolResult(f"Data: {now.strftime('%d/%m/%Y')} Ora: {now.strftime('%H:%M')}")


@p.tool
async def get_statistiche_sistema(context: p.ToolContext) -> p.ToolResult:
    """Ottiene statistiche generali del sistema contabile."""
    try:
        # Import database connection
        sys.path.insert(0, '/app/app')
        from database import Database
        
        await Database.connect_db()
        db = Database.get_db()
        
        stats = {
            "fatture": await db["invoices"].count_documents({}),
            "fornitori": await db["fornitori"].count_documents({}),
            "cedolini": await db["cedolini"].count_documents({}),
            "f24": await db["f24_models"].count_documents({}),
            "movimenti_banca": await db["estratto_conto_movimenti"].count_documents({})
        }
        
        result = f"""📊 Statistiche Sistema:
- Fatture registrate: {stats['fatture']}
- Fornitori in anagrafica: {stats['fornitori']}
- Cedolini/buste paga: {stats['cedolini']}
- Modelli F24: {stats['f24']}
- Movimenti bancari: {stats['movimenti_banca']}"""
        
        return p.ToolResult(result)
    except Exception as e:
        return p.ToolResult(f"Errore recupero statistiche: {str(e)}")


@p.tool
async def get_stato_riconciliazione(context: p.ToolContext) -> p.ToolResult:
    """Ottiene lo stato della riconciliazione bancaria."""
    try:
        sys.path.insert(0, '/app/app')
        from database import Database
        
        await Database.connect_db()
        db = Database.get_db()
        
        da_riconciliare = await db["estratto_conto_movimenti"].count_documents(
            {"riconciliato": {"$ne": True}}
        )
        riconciliati = await db["estratto_conto_movimenti"].count_documents(
            {"riconciliato": True}
        )
        
        result = f"""🏦 Stato Riconciliazione Bancaria:
- Movimenti da riconciliare: {da_riconciliare}
- Movimenti già riconciliati: {riconciliati}
- Pagina: /riconciliazione/banca"""
        
        return p.ToolResult(result)
    except Exception as e:
        return p.ToolResult(f"Errore: {str(e)}")


@p.tool
async def cerca_fattura(context: p.ToolContext, fornitore: str = "", numero: str = "") -> p.ToolResult:
    """Cerca fatture per fornitore o numero fattura."""
    try:
        sys.path.insert(0, '/app/app')
        from database import Database
        
        await Database.connect_db()
        db = Database.get_db()
        
        query = {}
        if fornitore:
            query["fornitore"] = {"$regex": fornitore, "$options": "i"}
        if numero:
            query["numero_fattura"] = {"$regex": numero, "$options": "i"}
        
        if not query:
            return p.ToolResult("Specifica un fornitore o numero fattura da cercare.")
        
        fatture = await db["invoices"].find(query, {"_id": 0}).limit(5).to_list(5)
        
        if not fatture:
            return p.ToolResult("Nessuna fattura trovata con questi criteri.")
        
        result = f"🧾 Trovate {len(fatture)} fatture:\n"
        for f in fatture:
            result += f"- {f.get('fornitore', 'N/D')}: €{f.get('importo_totale', 0):.2f} del {f.get('data', 'N/D')}\n"
        
        return p.ToolResult(result)
    except Exception as e:
        return p.ToolResult(f"Errore ricerca: {str(e)}")


@p.tool
async def get_f24_pendenti(context: p.ToolContext) -> p.ToolResult:
    """Ottiene gli F24 da pagare."""
    try:
        sys.path.insert(0, '/app/app')
        from database import Database
        
        await Database.connect_db()
        db = Database.get_db()
        
        f24_list = await db["f24_models"].find(
            {"pagato": {"$ne": True}},
            {"_id": 0, "data_scadenza": 1, "totale_debito": 1, "contribuente": 1}
        ).limit(5).to_list(5)
        
        if not f24_list:
            return p.ToolResult("Nessun F24 da pagare trovato.")
        
        result = f"📄 F24 da pagare ({len(f24_list)}):\n"
        for f in f24_list:
            result += f"- Scadenza: {f.get('data_scadenza', 'N/D')} - €{f.get('totale_debito', 0):.2f}\n"
        
        return p.ToolResult(result)
    except Exception as e:
        return p.ToolResult(f"Errore: {str(e)}")


@p.tool
async def get_cedolini_non_pagati(context: p.ToolContext) -> p.ToolResult:
    """Ottiene i cedolini/stipendi non ancora pagati."""
    try:
        sys.path.insert(0, '/app/app')
        from database import Database
        
        await Database.connect_db()
        db = Database.get_db()
        
        cedolini = await db["cedolini"].find(
            {"$or": [{"pagato": False}, {"pagato": {"$exists": False}}], "netto": {"$gt": 0}},
            {"_id": 0, "dipendente_nome": 1, "netto": 1, "periodo": 1}
        ).limit(10).to_list(10)
        
        if not cedolini:
            return p.ToolResult("Nessun cedolino da pagare trovato.")
        
        result = f"💰 Cedolini da pagare ({len(cedolini)}):\n"
        for c in cedolini:
            nome = c.get('dipendente_nome') or 'Dipendente'
            result += f"- {nome}: €{c.get('netto', 0):.2f} ({c.get('periodo', 'N/D')})\n"
        
        return p.ToolResult(result)
    except Exception as e:
        return p.ToolResult(f"Errore: {str(e)}")


@p.tool
async def naviga_pagina(context: p.ToolContext, pagina: str) -> p.ToolResult:
    """Fornisce il link alla pagina richiesta del sistema."""
    pagine = {
        "prima nota": "/prima-nota",
        "primanota": "/prima-nota",
        "riconciliazione": "/riconciliazione/banca",
        "riconciliazione banca": "/riconciliazione/banca",
        "riconciliazione assegni": "/riconciliazione/assegni",
        "riconciliazione f24": "/riconciliazione/f24",
        "riconciliazione stipendi": "/riconciliazione/stipendi",
        "import": "/import-unificato",
        "importazione": "/import-unificato",
        "fatture": "/fatture-ricevute",
        "fatture ricevute": "/fatture-ricevute",
        "fornitori": "/fornitori",
        "f24": "/f24",
        "cedolini": "/cedolini-riconciliazione",
        "stipendi": "/cedolini-riconciliazione",
        "corrispettivi": "/corrispettivi",
        "dashboard": "/",
        "home": "/"
    }
    
    pagina_lower = pagina.lower().strip()
    link = pagine.get(pagina_lower)
    
    if link:
        return p.ToolResult(f"🔗 Vai alla pagina: {link}")
    else:
        pagine_list = ", ".join(pagine.keys())
        return p.ToolResult(f"Pagina non trovata. Pagine disponibili: {pagine_list}")


# ============================================
# MAIN - Avvio server
# ============================================

async def main():
    print("🚀 Avvio Parlant Server per Contabit...")
    
    async with p.Server(nlp_service=p.NLPServices.openai, port=8800) as server:
        # Crea l'agente contabile
        agent = await server.create_agent(
            name="Assistente Contabit",
            description="""Sei un assistente AI esperto di contabilità italiana.
Lavori nel sistema gestionale Contabit e aiuti gli utenti con:
- Registrazioni in Prima Nota (Cassa e Banca separati)
- Fatturazione elettronica (ciclo attivo e passivo)
- Riconciliazione bancaria (abbinamento movimenti-fatture)
- F24 e tributi
- Gestione cedolini e stipendi
- Import documenti (PDF estratti conto, Excel, XML fatture)

Sei professionale, preciso e disponibile. Usi terminologia contabile italiana.
Rispondi sempre in italiano."""
        )
        
        print(f"✅ Agent creato: {agent.id}")
        
        # Context variable per data/ora corrente
        await agent.create_variable(name="data-ora-corrente", tool=get_datetime)
        print("  📅 Variable: data-ora-corrente")
        
        # ============================================
        # GUIDELINES - Regole comportamentali
        # ============================================
        
        guidelines = [
            # Saluti
            {
                "condition": "il cliente saluta o dice ciao/buongiorno",
                "action": "rispondi con un saluto cordiale e chiedi come puoi aiutare con la contabilità"
            },
            # Prima Nota
            {
                "condition": "il cliente chiede della Prima Nota o come registrare movimenti",
                "action": "spiega che la Prima Nota è divisa in Cassa e Banca, e suggerisci di andare a /prima-nota",
                "tools": [naviga_pagina]
            },
            # Riconciliazione
            {
                "condition": "il cliente chiede della riconciliazione o abbinamento movimenti bancari",
                "action": "usa lo strumento per verificare lo stato e guida alla pagina corretta",
                "tools": [get_stato_riconciliazione, naviga_pagina]
            },
            # Importazione documenti
            {
                "condition": "il cliente vuole importare documenti, fatture XML, estratti conto PDF o Excel",
                "action": "spiega i formati supportati (PDF, Excel, XML, ZIP) e guida a /import-unificato",
                "tools": [naviga_pagina]
            },
            # Fatture
            {
                "condition": "il cliente chiede di fatture ricevute o cerca una fattura",
                "action": "usa lo strumento di ricerca fatture per aiutarlo",
                "tools": [cerca_fattura, naviga_pagina]
            },
            # F24
            {
                "condition": "il cliente chiede degli F24 o tributi da pagare",
                "action": "mostra gli F24 pendenti e guida alla gestione",
                "tools": [get_f24_pendenti, naviga_pagina]
            },
            # Stipendi/Cedolini
            {
                "condition": "il cliente chiede di buste paga, cedolini o stipendi",
                "action": "mostra i cedolini da pagare e guida alla riconciliazione stipendi",
                "tools": [get_cedolini_non_pagati, naviga_pagina]
            },
            # Statistiche
            {
                "condition": "il cliente chiede statistiche, report o stato generale del sistema",
                "action": "mostra le statistiche generali del sistema contabile",
                "tools": [get_statistiche_sistema]
            },
            # Navigazione
            {
                "condition": "il cliente vuole andare a una pagina specifica o chiede dove trovare qualcosa",
                "action": "fornisci il link alla pagina richiesta",
                "tools": [naviga_pagina]
            },
            # Errori e problemi
            {
                "condition": "il cliente segnala un errore o problema",
                "action": "chiedi dettagli specifici sull'errore e prova a suggerire soluzioni basate sul contesto"
            },
            # Domande contabili generiche
            {
                "condition": "il cliente fa una domanda generica sulla contabilità italiana",
                "action": "rispondi in modo chiaro e conciso, usando terminologia contabile corretta"
            }
        ]
        
        for g in guidelines:
            try:
                kwargs = {
                    "condition": g["condition"],
                    "action": g["action"]
                }
                if "tools" in g:
                    kwargs["tools"] = g["tools"]
                
                await agent.create_guideline(**kwargs)
                print(f"  📝 Guideline: {g['condition'][:40]}...")
            except Exception as e:
                print(f"  ⚠️ Errore guideline: {e}")
        
        # Salva agent_id per il frontend
        with open("/tmp/parlant_agent_id.txt", "w") as f:
            f.write(agent.id)
        
        print(f"\n🌐 Server Parlant attivo su http://localhost:8800")
        print(f"📋 Agent ID: {agent.id}")
        print(f"🎮 Test playground: http://localhost:8800")
        print("\n💡 Premi Ctrl+C per fermare il server")
        
        # Mantieni il server attivo
        while True:
            await asyncio.sleep(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Server Parlant fermato")
    except Exception as e:
        print(f"❌ Errore: {e}")
        import traceback
        traceback.print_exc()
