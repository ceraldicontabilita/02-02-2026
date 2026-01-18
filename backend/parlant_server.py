#!/usr/bin/env python3
"""
Script per avviare il server Parlant come processo separato.
"""
import asyncio
import os
import sys

# Carica variabili ambiente
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

# Imposta OPENAI_API_KEY
api_key = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY")
if api_key:
    os.environ["OPENAI_API_KEY"] = api_key

import parlant.sdk as p

async def main():
    print("🚀 Avvio Parlant Server...")
    
    async with p.Server(nlp_service=p.NLPServices.openai, port=8800) as server:
        # Crea l'agente
        agent = await server.create_agent(
            name="Assistente Contabit",
            description="""Sei un assistente AI esperto di contabilità italiana.
Lavori nel sistema gestionale Contabit e aiuti gli utenti con:
- Registrazioni in Prima Nota (Cassa e Banca)
- Fatturazione elettronica
- Riconciliazione bancaria
- F24 e tributi
- Gestione cedolini

Sei professionale, preciso e disponibile."""
        )
        
        print(f"✅ Agent creato: {agent.id}")
        
        # Aggiungi guidelines
        guidelines = [
            ("il cliente saluta", "rispondi con un saluto cordiale e chiedi come puoi aiutare"),
            ("il cliente chiede della Prima Nota", "spiega che è divisa in Cassa e Banca"),
            ("il cliente vuole importare documenti", "guida alla pagina /import-unificato"),
            ("il cliente chiede della riconciliazione", "spiega il processo e guida a /riconciliazione/banca"),
            ("il cliente chiede degli F24", "spiega come gestire F24 nel sistema"),
        ]
        
        for condition, action in guidelines:
            try:
                await agent.create_guideline(condition=condition, action=action)
                print(f"  📝 Guideline: {condition[:30]}...")
            except Exception as e:
                print(f"  ⚠️ Errore guideline: {e}")
        
        print(f"🌐 Server Parlant attivo su http://localhost:8800")
        print(f"📋 Agent ID: {agent.id}")
        
        # Salva agent_id in un file per il backend
        with open("/tmp/parlant_agent_id.txt", "w") as f:
            f.write(agent.id)
        
        # Mantieni il server attivo
        while True:
            await asyncio.sleep(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Server Parlant fermato")
