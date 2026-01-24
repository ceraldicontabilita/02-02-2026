#!/usr/bin/env python3
"""
Parlant AI Server per Contabit - Versione Semplice
"""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

# API key
api_key = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY")
if api_key:
    os.environ["OPENAI_API_KEY"] = api_key

import parlant.sdk as p

async def main():
    print("🚀 Avvio Parlant Server...")
    print(f"OPENAI_API_KEY: {'***' + api_key[-4:] if api_key else 'NON IMPOSTATA'}")
    
    async with p.Server(nlp_service=p.NLPServices.openai, port=8800) as server:
        print("✅ Server avviato")
        
        # Crea agente
        agent = await server.create_agent(
            name="Assistente Contabit",
            description="""Sei un assistente AI per la contabilità italiana.
Aiuti con Prima Nota, fatture, F24, riconciliazione bancaria.
Rispondi sempre in italiano."""
        )
        
        print(f"✅ Agent: {agent.id}")
        
        # Guidelines base
        await agent.create_guideline(
            condition="l'utente saluta",
            action="rispondi con un saluto cordiale e chiedi come aiutare"
        )
        print("  📝 Guideline: saluti")
        
        await agent.create_guideline(
            condition="l'utente chiede della Prima Nota",
            action="spiega che è divisa in Cassa e Banca"
        )
        print("  📝 Guideline: prima nota")
        
        await agent.create_guideline(
            condition="l'utente chiede della riconciliazione",
            action="spiega il processo di riconciliazione bancaria"
        )
        print("  📝 Guideline: riconciliazione")
        
        # Salva agent_id
        with open("/tmp/parlant_agent_id.txt", "w") as f:
            f.write(agent.id)
        
        print("\n🌐 Server: http://localhost:8800")
        print(f"📋 Agent ID: {agent.id}")
        
        # Keep alive
        while True:
            await asyncio.sleep(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Fermato")
    except Exception as e:
        print(f"❌ Errore: {e}")
        import traceback
        traceback.print_exc()
