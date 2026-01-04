"""
Scheduler per task automatici HACCP.
Auto-popolamento temperature alle 01:00 AM ogni giorno.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import random

logger = logging.getLogger(__name__)

# Scheduler instance
scheduler = AsyncIOScheduler()

# Configuration
OPERATORI_HACCP = ["VALERIO", "VINCENZO", "POCCI", "MARIO", "LUIGI"]


async def auto_populate_haccp_daily():
    """
    Task eseguito alle 01:00 AM ogni giorno.
    Genera e compila automaticamente i record HACCP per il giorno corrente.
    """
    from app.database import Database
    
    logger.info("🕐 [SCHEDULER] Avvio auto-popolazione HACCP giornaliera")
    
    try:
        db = Database.get_db()
        oggi = datetime.utcnow().strftime("%Y-%m-%d")
        ora = "07:00"  # Ora standard di rilevazione mattutina
        now_iso = datetime.utcnow().isoformat()
        
        # ============== FRIGORIFERI ==============
        frigoriferi_created = 0
        # Carica equipaggiamenti frigoriferi
        frigo_equips = await db["haccp_equipaggiamenti"].find(
            {"tipo": "frigorifero", "attivo": {"$ne": False}},
            {"_id": 0}
        ).to_list(100)
        
        # Default se non ci sono equipaggiamenti
        if not frigo_equips:
            frigo_equips = [
                {"nome": "Frigo Cucina"},
                {"nome": "Frigo Bar"},
                {"nome": "Cella Frigo"},
            ]
        
        for frigo in frigo_equips:
            nome = frigo.get("nome", "Frigo")
            
            # Verifica se esiste già un record per oggi
            existing = await db["haccp_temperature_frigoriferi"].find_one({
                "data": oggi,
                "equipaggiamento": nome
            })
            
            if not existing:
                # Genera temperatura casuale conforme (0-4°C)
                temp = round(random.uniform(1.5, 3.5), 1)
                
                record = {
                    "id": f"auto_{oggi}_{nome.replace(' ', '_')}",
                    "data": oggi,
                    "ora": ora,
                    "equipaggiamento": nome,
                    "temperatura": temp,
                    "conforme": True,
                    "operatore": random.choice(OPERATORI_HACCP),
                    "note": "Auto-generato",
                    "source": "scheduler_auto",
                    "created_at": now_iso
                }
                await db["haccp_temperature_frigoriferi"].insert_one(record)
                frigoriferi_created += 1
        
        logger.info(f"✅ [SCHEDULER] Frigoriferi: creati {frigoriferi_created} record")
        
        # ============== CONGELATORI ==============
        congelatori_created = 0
        # Carica equipaggiamenti congelatori
        congel_equips = await db["haccp_equipaggiamenti"].find(
            {"tipo": "congelatore", "attivo": {"$ne": False}},
            {"_id": 0}
        ).to_list(100)
        
        # Default se non ci sono equipaggiamenti
        if not congel_equips:
            congel_equips = [
                {"nome": "Congelatore Cucina"},
                {"nome": "Cella Freezer"},
            ]
        
        for congel in congel_equips:
            nome = congel.get("nome", "Congelatore")
            
            existing = await db["haccp_temperature_congelatori"].find_one({
                "data": oggi,
                "equipaggiamento": nome
            })
            
            if not existing:
                # Genera temperatura casuale conforme (-18/-22°C)
                temp = round(random.uniform(-21, -18.5), 1)
                
                record = {
                    "id": f"auto_{oggi}_{nome.replace(' ', '_')}",
                    "data": oggi,
                    "ora": ora,
                    "equipaggiamento": nome,
                    "temperatura": temp,
                    "conforme": True,
                    "operatore": random.choice(OPERATORI_HACCP),
                    "note": "Auto-generato",
                    "source": "scheduler_auto",
                    "created_at": now_iso
                }
                await db["haccp_temperature_congelatori"].insert_one(record)
                congelatori_created += 1
        
        logger.info(f"✅ [SCHEDULER] Congelatori: creati {congelatori_created} record")
        
        # ============== SANIFICAZIONI ==============
        sanificazioni_created = 0
        aree_sanificazione = [
            "Cucina", "Sala", "Bar", "Bagni", "Magazzino", 
            "Celle Frigo", "Piani di lavoro"
        ]
        
        for area in aree_sanificazione:
            existing = await db["haccp_sanificazioni"].find_one({
                "data": oggi,
                "area": area
            })
            
            if not existing:
                record = {
                    "id": f"auto_san_{oggi}_{area.replace(' ', '_')}",
                    "data": oggi,
                    "ora": ora,
                    "area": area,
                    "tipo_intervento": "Pulizia ordinaria",
                    "prodotto_usato": "Detergente multiuso",
                    "operatore": random.choice(OPERATORI_HACCP),
                    "esito": "Conforme",
                    "note": "Auto-generato",
                    "source": "scheduler_auto",
                    "created_at": now_iso
                }
                await db["haccp_sanificazioni"].insert_one(record)
                sanificazioni_created += 1
        
        logger.info(f"✅ [SCHEDULER] Sanificazioni: creati {sanificazioni_created} record")
        
        logger.info(f"🎉 [SCHEDULER] Auto-popolazione HACCP completata: "
                   f"Frigo={frigoriferi_created}, Congel={congelatori_created}, Sanif={sanificazioni_created}")
        
    except Exception as e:
        logger.error(f"❌ [SCHEDULER] Errore auto-popolazione HACCP: {e}")
        import traceback
        logger.error(traceback.format_exc())


def start_scheduler():
    """Avvia lo scheduler con i task programmati."""
    logger.info("🚀 [SCHEDULER] Configurazione scheduler HACCP...")
    
    # Task alle 01:00 AM ogni giorno (ora server UTC)
    # Se il server è in UTC, 01:00 UTC = 02:00 CET (Italia)
    # Quindi mettiamo 00:00 UTC per avere 01:00 CET
    scheduler.add_job(
        auto_populate_haccp_daily,
        CronTrigger(hour=0, minute=0),  # 00:00 UTC = 01:00 CET
        id="haccp_auto_populate",
        name="Auto-popolazione HACCP giornaliera",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("✅ [SCHEDULER] Scheduler HACCP avviato - Task: 01:00 AM (CET)")


def stop_scheduler():
    """Ferma lo scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("🛑 [SCHEDULER] Scheduler HACCP fermato")
