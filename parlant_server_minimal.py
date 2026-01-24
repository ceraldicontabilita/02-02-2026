#!/usr/bin/env python3
"""
Parlant AI Server per Ceraldi - Versione Minima
Server Parlant semplificato per debug
"""
import asyncio
import os
import sys
from dotenv import load_dotenv

# Carica variabili ambiente
load_dotenv("/app/backend/.env", override=True)

# Verifica EMCIE_API_KEY
api_key = os.getenv("EMCIE_API_KEY")
if not api_key:
    print("❌ ERRORE: EMCIE_API_KEY non trovata")
    sys.exit(1)

# IMPORTANTE: Esporta nell'ambiente
os.environ["EMCIE_API_KEY"] = api_key
print(f"🔑 Emcie API Key: {api_key[:25]}...")

import parlant.sdk as p

async def main():
    print("🚀 Avvio Parlant Server (versione minima)...")
    
    # Server con configurazione minima
    async with p.Server() as server:
        # Agente semplice senza tools/guidelines
        agent = await server.create_agent(
            name="Assistente Ceraldi",
            description="Sono un assistente AI per la contabilità. Rispondi in italiano."
        )
        
        print(f"✅ Agent creato: {agent.id}")
        
        # Salva agent_id
        with open("/tmp/parlant_agent_id.txt", "w") as f:
            f.write(agent.id)
        
        print("🌐 Server attivo su http://localhost:8800")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Server fermato")
    except Exception as e:
        print(f"❌ Errore: {e}")
        import traceback
        traceback.print_exc()
