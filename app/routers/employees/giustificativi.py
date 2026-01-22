"""
GESTIONE GIUSTIFICATIVI DIPENDENTI
===================================

Sistema per la gestione dei giustificativi con limiti massimali:
- Codici giustificativi standard italiani
- Limiti annuali e mensili configurabili
- Contatori automatici per dipendente
- Validazione e blocco superamento limiti

Autore: Sistema Gestionale
Data: 22 Gennaio 2026
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid

from app.database import Database

import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# GIUSTIFICATIVI STANDARD ITALIANI
# =============================================================================

GIUSTIFICATIVI_DEFAULT = [
    # Assenze
    {"codice": "AI", "descrizione": "Assenza Ingiustificata", "categoria": "assenza", 
     "limite_annuale_ore": 173, "limite_mensile_ore": 16, "retribuito": False},
    {"codice": "ASNR", "descrizione": "Aspettativa Non Retribuita", "categoria": "assenza",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": False},
    {"codice": "AS", "descrizione": "Aspettativa Retribuita", "categoria": "assenza",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": True},
    
    # Ferie e Permessi
    {"codice": "FER", "descrizione": "Ferie", "categoria": "ferie",
     "limite_annuale_ore": 208, "limite_mensile_ore": None, "retribuito": True},  # 26 giorni * 8 ore
    {"codice": "PER", "descrizione": "Permesso Retribuito", "categoria": "permesso",
     "limite_annuale_ore": 32, "limite_mensile_ore": 8, "retribuito": True},
    {"codice": "ROL", "descrizione": "Riduzione Orario Lavoro", "categoria": "permesso",
     "limite_annuale_ore": 72, "limite_mensile_ore": None, "retribuito": True},
    {"codice": "EXF", "descrizione": "Ex Festività", "categoria": "permesso",
     "limite_annuale_ore": 32, "limite_mensile_ore": None, "retribuito": True},  # 4 giorni * 8 ore
    {"codice": "PNR", "descrizione": "Permesso Non Retribuito", "categoria": "permesso",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": False},
    
    # Congedi
    {"codice": "CP", "descrizione": "Congedo Parentale", "categoria": "congedo",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": True},
    {"codice": "CPFNR", "descrizione": "Congedo Parentale Figli 12+ anni", "categoria": "congedo",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": False},
    {"codice": "CMAT", "descrizione": "Congedo Maternità", "categoria": "congedo",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": True},
    {"codice": "CPAT", "descrizione": "Congedo Paternità", "categoria": "congedo",
     "limite_annuale_ore": 80, "limite_mensile_ore": None, "retribuito": True},  # 10 giorni * 8 ore
    {"codice": "CLUT", "descrizione": "Congedo Lutto", "categoria": "congedo",
     "limite_annuale_ore": 24, "limite_mensile_ore": None, "retribuito": True},  # 3 giorni
    {"codice": "CMAT", "descrizione": "Congedo Matrimonio", "categoria": "congedo",
     "limite_annuale_ore": 120, "limite_mensile_ore": None, "retribuito": True},  # 15 giorni
    
    # Malattia e Infortunio
    {"codice": "MAL", "descrizione": "Malattia", "categoria": "malattia",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": True},
    {"codice": "INF", "descrizione": "Infortunio sul Lavoro", "categoria": "infortunio",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": True},
    {"codice": "MALF", "descrizione": "Malattia Figlio", "categoria": "malattia",
     "limite_annuale_ore": 40, "limite_mensile_ore": None, "retribuito": False},
    
    # Formazione
    {"codice": "CFG", "descrizione": "Corso di Formazione", "categoria": "formazione",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": True},
    {"codice": "CFGA", "descrizione": "Corso di Formazione (Assenza)", "categoria": "formazione",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": False},
    
    # Altro
    {"codice": "SMART", "descrizione": "Smart Working", "categoria": "lavoro",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": True},
    {"codice": "TRAS", "descrizione": "Trasferta", "categoria": "lavoro",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": True},
    {"codice": "DON", "descrizione": "Donazione Sangue", "categoria": "permesso",
     "limite_annuale_ore": 32, "limite_mensile_ore": 8, "retribuito": True},  # 4 giorni
    {"codice": "L104", "descrizione": "Permesso Legge 104", "categoria": "permesso",
     "limite_annuale_ore": None, "limite_mensile_ore": 24, "retribuito": True},  # 3 giorni/mese
    {"codice": "STUD", "descrizione": "Permesso Studio", "categoria": "permesso",
     "limite_annuale_ore": 150, "limite_mensile_ore": None, "retribuito": True},
    {"codice": "SIN", "descrizione": "Permesso Sindacale", "categoria": "permesso",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": True},
    {"codice": "VIS", "descrizione": "Visita Medica", "categoria": "permesso",
     "limite_annuale_ore": None, "limite_mensile_ore": None, "retribuito": True},
]


# =============================================================================
# INIZIALIZZAZIONE GIUSTIFICATIVI
# =============================================================================

@router.post("/init-giustificativi")
async def inizializza_giustificativi() -> Dict[str, Any]:
    """
    Inizializza la collection giustificativi con i codici standard.
    Da chiamare una volta per popolare il database.
    """
    db = Database.get_db()
    
    inseriti = 0
    aggiornati = 0
    
    for giust in GIUSTIFICATIVI_DEFAULT:
        existing = await db["giustificativi"].find_one({"codice": giust["codice"]})
        
        if existing:
            # Aggiorna se esiste
            await db["giustificativi"].update_one(
                {"codice": giust["codice"]},
                {"$set": {
                    **giust,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            aggiornati += 1
        else:
            # Inserisci nuovo
            await db["giustificativi"].insert_one({
                "id": str(uuid.uuid4()),
                **giust,
                "attivo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            inseriti += 1
    
    logger.info(f"✅ Giustificativi inizializzati: {inseriti} nuovi, {aggiornati} aggiornati")
    
    return {
        "success": True,
        "inseriti": inseriti,
        "aggiornati": aggiornati,
        "totale": len(GIUSTIFICATIVI_DEFAULT)
    }


# =============================================================================
# CRUD GIUSTIFICATIVI
# =============================================================================

@router.get("/giustificativi")
async def get_giustificativi(
    categoria: str = Query(None),
    attivo: bool = Query(True)
) -> Dict[str, Any]:
    """
    Lista tutti i giustificativi disponibili.
    """
    db = Database.get_db()
    
    query = {}
    if categoria:
        query["categoria"] = categoria
    if attivo is not None:
        query["attivo"] = attivo
    
    giustificativi = await db["giustificativi"].find(
        query, {"_id": 0}
    ).sort("codice", 1).to_list(100)
    
    # Se vuoto, inizializza
    if not giustificativi:
        await inizializza_giustificativi()
        giustificativi = await db["giustificativi"].find(
            query, {"_id": 0}
        ).sort("codice", 1).to_list(100)
    
    # Raggruppa per categoria
    per_categoria = {}
    for g in giustificativi:
        cat = g.get("categoria", "altro")
        if cat not in per_categoria:
            per_categoria[cat] = []
        per_categoria[cat].append(g)
    
    return {
        "success": True,
        "totale": len(giustificativi),
        "giustificativi": giustificativi,
        "per_categoria": per_categoria
    }


@router.put("/giustificativi/{codice}")
async def update_giustificativo(codice: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Aggiorna un giustificativo (limiti, descrizione, etc).
    
    Payload:
    {
        "limite_annuale_ore": 200,
        "limite_mensile_ore": 20,
        "descrizione": "Nuova descrizione",
        "attivo": true
    }
    """
    db = Database.get_db()
    
    giust = await db["giustificativi"].find_one({"codice": codice.upper()})
    if not giust:
        raise HTTPException(status_code=404, detail=f"Giustificativo {codice} non trovato")
    
    update_fields = {}
    
    if "limite_annuale_ore" in payload:
        update_fields["limite_annuale_ore"] = payload["limite_annuale_ore"]
    if "limite_mensile_ore" in payload:
        update_fields["limite_mensile_ore"] = payload["limite_mensile_ore"]
    if "descrizione" in payload:
        update_fields["descrizione"] = payload["descrizione"]
    if "attivo" in payload:
        update_fields["attivo"] = payload["attivo"]
    if "retribuito" in payload:
        update_fields["retribuito"] = payload["retribuito"]
    
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db["giustificativi"].update_one(
        {"codice": codice.upper()},
        {"$set": update_fields}
    )
    
    return {
        "success": True,
        "codice": codice.upper(),
        "aggiornato": update_fields
    }


# =============================================================================
# CONTATORI GIUSTIFICATIVI PER DIPENDENTE
# =============================================================================

@router.get("/dipendente/{employee_id}/giustificativi")
async def get_giustificativi_dipendente(
    employee_id: str,
    anno: int = Query(None)
) -> Dict[str, Any]:
    """
    Ritorna i contatori giustificativi per un dipendente.
    Include ore usate, limiti e saldo residuo.
    OTTIMIZZATO: Usa aggregazione invece di N query singole.
    """
    db = Database.get_db()
    
    if not anno:
        anno = datetime.now().year
    
    # Verifica dipendente
    employee = await db["employees"].find_one(
        {"id": employee_id},
        {"_id": 0, "id": 1, "nome": 1, "cognome": 1, "nome_completo": 1}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    # Recupera tutti i giustificativi
    giustificativi = await db["giustificativi"].find(
        {"attivo": True}, {"_id": 0}
    ).to_list(100)
    
    if not giustificativi:
        await inizializza_giustificativi()
        giustificativi = await db["giustificativi"].find(
            {"attivo": True}, {"_id": 0}
        ).to_list(100)
    
    # Recupera limiti personalizzati dipendente (se esistono)
    limiti_custom = await db["giustificativi_dipendente"].find_one(
        {"employee_id": employee_id, "anno": anno},
        {"_id": 0}
    )
    limiti_per_codice = limiti_custom.get("limiti", {}) if limiti_custom else {}
    
    # OTTIMIZZAZIONE: Carica tutte le ore usate in una sola query aggregata
    mese_corrente = datetime.now().month
    data_inizio_anno = f"{anno}-01-01"
    data_fine_anno = f"{anno+1}-01-01"
    data_inizio_mese = f"{anno}-{mese_corrente:02d}-01"
    data_fine_mese = f"{anno}-{mese_corrente+1:02d}-01" if mese_corrente < 12 else f"{anno+1}-01-01"
    
    # Aggregazione per presenze_mensili (anno)
    presenze_anno = await db["presenze_mensili"].aggregate([
        {"$match": {
            "employee_id": employee_id,
            "data": {"$gte": data_inizio_anno, "$lt": data_fine_anno}
        }},
        {"$group": {
            "_id": "$stato",
            "ore": {"$sum": {"$ifNull": ["$ore", 8]}}
        }}
    ]).to_list(100)
    
    # Aggregazione per presenze_mensili (mese corrente)
    presenze_mese = await db["presenze_mensili"].aggregate([
        {"$match": {
            "employee_id": employee_id,
            "data": {"$gte": data_inizio_mese, "$lt": data_fine_mese}
        }},
        {"$group": {
            "_id": "$stato",
            "ore": {"$sum": {"$ifNull": ["$ore", 8]}}
        }}
    ]).to_list(100)
    
    # Converti in dizionari per lookup veloce
    ore_anno_per_codice = {p["_id"]: p["ore"] for p in presenze_anno if p["_id"]}
    ore_mese_per_codice = {p["_id"]: p["ore"] for p in presenze_mese if p["_id"]}
    
    # Calcola risultati per ogni giustificativo
    risultato = []
    
    for giust in giustificativi:
        codice = giust["codice"]
        
        # Limiti (custom o default)
        limite_annuale = limiti_per_codice.get(codice, {}).get("limite_annuale_ore") or giust.get("limite_annuale_ore")
        limite_mensile = limiti_per_codice.get(codice, {}).get("limite_mensile_ore") or giust.get("limite_mensile_ore")
        
        # Ore usate (lookup veloce)
        ore_anno = ore_anno_per_codice.get(codice, 0) + ore_anno_per_codice.get(codice.lower(), 0)
        ore_mese = ore_mese_per_codice.get(codice, 0) + ore_mese_per_codice.get(codice.lower(), 0)
        
        # Calcola residui
        residuo_annuale = None
        residuo_mensile = None
        superato_annuale = False
        superato_mensile = False
        
        if limite_annuale is not None:
            residuo_annuale = limite_annuale - ore_anno
            superato_annuale = residuo_annuale < 0
        
        if limite_mensile is not None:
            residuo_mensile = limite_mensile - ore_mese
            superato_mensile = residuo_mensile < 0
        
        risultato.append({
            "codice": codice,
            "descrizione": giust.get("descrizione"),
            "categoria": giust.get("categoria"),
            "retribuito": giust.get("retribuito"),
            "limite_annuale_ore": limite_annuale,
            "limite_mensile_ore": limite_mensile,
            "ore_usate_anno": ore_anno,
            "ore_usate_mese": ore_mese,
            "residuo_annuale": residuo_annuale,
            "residuo_mensile": residuo_mensile,
            "superato_annuale": superato_annuale,
            "superato_mensile": superato_mensile,
            "custom_limits": codice in limiti_per_codice
        })
    
    # Raggruppa per categoria
    per_categoria = {}
    for r in risultato:
        cat = r.get("categoria", "altro")
        if cat not in per_categoria:
            per_categoria[cat] = []
        per_categoria[cat].append(r)
    
    return {
        "success": True,
        "employee_id": employee_id,
        "employee_nome": employee.get("nome_completo") or f"{employee.get('nome', '')} {employee.get('cognome', '')}",
        "anno": anno,
        "mese_corrente": mese_corrente,
        "giustificativi": risultato,
        "per_categoria": per_categoria,
        "totale_giustificativi": len(risultato)
    }


async def _calcola_ore_giustificativo(
    db, 
    employee_id: str, 
    codice_giustificativo: str, 
    anno: int, 
    mese: int = None
) -> float:
    """
    Calcola le ore usate per un giustificativo specifico.
    Cerca in: presenze_mensili, richieste_assenza, timbrature
    """
    ore_totali = 0.0
    
    # Query base per l'anno
    if mese:
        data_inizio = f"{anno}-{mese:02d}-01"
        if mese == 12:
            data_fine = f"{anno+1}-01-01"
        else:
            data_fine = f"{anno}-{mese+1:02d}-01"
    else:
        data_inizio = f"{anno}-01-01"
        data_fine = f"{anno+1}-01-01"
    
    # 1. Cerca in presenze_mensili (calendario)
    presenze = await db["presenze_mensili"].find({
        "employee_id": employee_id,
        "data": {"$gte": data_inizio, "$lt": data_fine},
        "stato": codice_giustificativo
    }).to_list(500)
    
    for p in presenze:
        ore_totali += float(p.get("ore", 8))  # Default 8 ore per giornata
    
    # 2. Cerca in richieste_assenza approvate
    richieste = await db["richieste_assenza"].find({
        "employee_id": employee_id,
        "tipo": {"$regex": codice_giustificativo, "$options": "i"},
        "stato": "approved",
        "data_inizio": {"$gte": data_inizio, "$lt": data_fine}
    }).to_list(500)
    
    for r in richieste:
        ore_totali += float(r.get("ore_totali", 0))
    
    return ore_totali


@router.put("/dipendente/{employee_id}/giustificativi/limiti")
async def set_limiti_custom_dipendente(
    employee_id: str,
    payload: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Imposta limiti personalizzati per un dipendente.
    
    Payload:
    {
        "anno": 2026,
        "limiti": {
            "FER": {"limite_annuale_ore": 240},
            "PER": {"limite_annuale_ore": 40, "limite_mensile_ore": 10}
        }
    }
    """
    db = Database.get_db()
    
    anno = payload.get("anno", datetime.now().year)
    limiti = payload.get("limiti", {})
    
    # Verifica dipendente
    employee = await db["employees"].find_one({"id": employee_id}, {"_id": 0, "id": 1})
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    # Upsert limiti custom
    await db["giustificativi_dipendente"].update_one(
        {"employee_id": employee_id, "anno": anno},
        {"$set": {
            "employee_id": employee_id,
            "anno": anno,
            "limiti": limiti,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {
        "success": True,
        "employee_id": employee_id,
        "anno": anno,
        "limiti_impostati": len(limiti)
    }


# =============================================================================
# VALIDAZIONE GIUSTIFICATIVO
# =============================================================================

@router.post("/valida-giustificativo")
async def valida_giustificativo(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Valida se è possibile inserire un giustificativo per un dipendente.
    Verifica i limiti annuali e mensili.
    
    Payload:
    {
        "employee_id": "uuid",
        "codice_giustificativo": "FER",
        "data": "2026-01-22",
        "ore": 8
    }
    
    Returns:
    {
        "valido": true/false,
        "messaggio": "...",
        "dettagli": {...}
    }
    """
    db = Database.get_db()
    
    employee_id = payload.get("employee_id")
    codice = payload.get("codice_giustificativo", "").upper()
    data = payload.get("data")
    ore_richieste = float(payload.get("ore", 8))
    
    if not employee_id or not codice:
        raise HTTPException(status_code=400, detail="employee_id e codice_giustificativo obbligatori")
    
    # Estrai anno e mese dalla data
    try:
        dt = datetime.fromisoformat(data) if data else datetime.now()
        anno = dt.year
        mese = dt.month
    except:
        anno = datetime.now().year
        mese = datetime.now().month
    
    # Recupera giustificativo
    giust = await db["giustificativi"].find_one({"codice": codice}, {"_id": 0})
    if not giust:
        return {
            "valido": False,
            "messaggio": f"Giustificativo {codice} non trovato",
            "bloccante": True
        }
    
    # Recupera limiti custom
    limiti_custom = await db["giustificativi_dipendente"].find_one(
        {"employee_id": employee_id, "anno": anno},
        {"_id": 0}
    )
    limiti_per_codice = limiti_custom.get("limiti", {}) if limiti_custom else {}
    
    # Determina limiti applicabili
    limite_annuale = limiti_per_codice.get(codice, {}).get("limite_annuale_ore") or giust.get("limite_annuale_ore")
    limite_mensile = limiti_per_codice.get(codice, {}).get("limite_mensile_ore") or giust.get("limite_mensile_ore")
    
    # Calcola ore già usate
    ore_anno = await _calcola_ore_giustificativo(db, employee_id, codice, anno)
    ore_mese = await _calcola_ore_giustificativo(db, employee_id, codice, anno, mese)
    
    # Valida
    errori = []
    warnings = []
    
    if limite_annuale is not None:
        ore_dopo = ore_anno + ore_richieste
        if ore_dopo > limite_annuale:
            errori.append({
                "tipo": "limite_annuale_superato",
                "messaggio": f"Limite annuale superato: {ore_anno:.1f}h usate + {ore_richieste:.1f}h = {ore_dopo:.1f}h > {limite_annuale:.1f}h",
                "ore_disponibili": max(0, limite_annuale - ore_anno)
            })
        elif ore_dopo > limite_annuale * 0.9:
            warnings.append(f"Attenzione: quasi al limite annuale ({ore_dopo:.1f}h / {limite_annuale:.1f}h)")
    
    if limite_mensile is not None:
        ore_dopo_mese = ore_mese + ore_richieste
        if ore_dopo_mese > limite_mensile:
            errori.append({
                "tipo": "limite_mensile_superato",
                "messaggio": f"Limite mensile superato: {ore_mese:.1f}h usate + {ore_richieste:.1f}h = {ore_dopo_mese:.1f}h > {limite_mensile:.1f}h",
                "ore_disponibili": max(0, limite_mensile - ore_mese)
            })
        elif ore_dopo_mese > limite_mensile * 0.9:
            warnings.append(f"Attenzione: quasi al limite mensile ({ore_dopo_mese:.1f}h / {limite_mensile:.1f}h)")
    
    valido = len(errori) == 0
    
    return {
        "valido": valido,
        "bloccante": not valido,
        "messaggio": errori[0]["messaggio"] if errori else "OK",
        "errori": errori,
        "warnings": warnings,
        "dettagli": {
            "codice": codice,
            "descrizione": giust.get("descrizione"),
            "ore_richieste": ore_richieste,
            "ore_anno_attuali": ore_anno,
            "ore_mese_attuali": ore_mese,
            "limite_annuale": limite_annuale,
            "limite_mensile": limite_mensile
        }
    }


# =============================================================================
# SALDO FERIE E PERMESSI
# =============================================================================

@router.get("/dipendente/{employee_id}/saldo-ferie")
async def get_saldo_ferie_dipendente(
    employee_id: str,
    anno: int = Query(None)
) -> Dict[str, Any]:
    """
    Calcola il saldo ferie e permessi per un dipendente.
    
    Include:
    - Ferie maturate/godute/residue
    - ROL maturati/goduti/residui
    - Ex-festività
    - Permessi vari
    """
    db = Database.get_db()
    
    if not anno:
        anno = datetime.now().year
    
    mese_corrente = datetime.now().month if anno == datetime.now().year else 12
    
    # Verifica dipendente
    employee = await db["employees"].find_one(
        {"id": employee_id},
        {"_id": 0, "id": 1, "nome": 1, "cognome": 1, "nome_completo": 1, 
         "data_assunzione": 1, "ore_settimanali": 1}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    # Parametri contrattuali (default CCNL Commercio)
    ore_settimanali = float(employee.get("ore_settimanali", 40))
    giorni_ferie_annuali = 26  # Giorni
    ore_ferie_annuali = giorni_ferie_annuali * 8  # 208 ore
    ore_rol_annuali = 72  # Ore
    ore_ex_festivita_annuali = 32  # 4 giorni * 8 ore
    
    # Calcola maturato (proporzionale ai mesi lavorati)
    # TODO: Verificare data assunzione per primo anno
    ferie_maturate = (ore_ferie_annuali / 12) * mese_corrente
    rol_maturati = (ore_rol_annuali / 12) * mese_corrente
    exf_maturati = (ore_ex_festivita_annuali / 12) * mese_corrente
    
    # Calcola godute
    ferie_godute = await _calcola_ore_giustificativo(db, employee_id, "FER", anno)
    rol_goduti = await _calcola_ore_giustificativo(db, employee_id, "ROL", anno)
    exf_godute = await _calcola_ore_giustificativo(db, employee_id, "EXF", anno)
    permessi_goduti = await _calcola_ore_giustificativo(db, employee_id, "PER", anno)
    
    # Recupera anno precedente per riporto
    ferie_anno_prec = await _calcola_ore_giustificativo(db, employee_id, "FER", anno - 1)
    rol_anno_prec = await _calcola_ore_giustificativo(db, employee_id, "ROL", anno - 1)
    
    # Calcola riporto (ferie non godute anno precedente)
    # Semplificato: assumiamo che il riporto sia già calcolato
    riporto_ferie = await db["riporti_ferie"].find_one(
        {"employee_id": employee_id, "anno": anno},
        {"_id": 0}
    )
    ferie_riportate = float(riporto_ferie.get("ferie_riportate", 0)) if riporto_ferie else 0
    rol_riportati = float(riporto_ferie.get("rol_riportati", 0)) if riporto_ferie else 0
    
    # Calcola residui
    ferie_totali = ferie_maturate + ferie_riportate
    rol_totali = rol_maturati + rol_riportati
    exf_totali = exf_maturati
    
    ferie_residue = ferie_totali - ferie_godute
    rol_residui = rol_totali - rol_goduti
    exf_residue = exf_totali - exf_godute
    
    # Dettaglio mensile
    dettaglio_mensile = []
    for m in range(1, mese_corrente + 1):
        ferie_mese = await _calcola_ore_giustificativo(db, employee_id, "FER", anno, m)
        rol_mese = await _calcola_ore_giustificativo(db, employee_id, "ROL", anno, m)
        
        dettaglio_mensile.append({
            "mese": m,
            "ferie_godute": ferie_mese,
            "rol_goduti": rol_mese,
            "ferie_maturate": ore_ferie_annuali / 12,
            "rol_maturati": ore_rol_annuali / 12
        })
    
    return {
        "success": True,
        "employee_id": employee_id,
        "employee_nome": employee.get("nome_completo") or f"{employee.get('nome', '')} {employee.get('cognome', '')}",
        "anno": anno,
        "mese_corrente": mese_corrente,
        
        "ferie": {
            "spettanti_annue": ore_ferie_annuali,
            "maturate": round(ferie_maturate, 1),
            "riportate_anno_prec": ferie_riportate,
            "totali_disponibili": round(ferie_totali, 1),
            "godute": ferie_godute,
            "residue": round(ferie_residue, 1),
            "giorni_residui": round(ferie_residue / 8, 1)
        },
        
        "rol": {
            "spettanti_annui": ore_rol_annuali,
            "maturati": round(rol_maturati, 1),
            "riportati_anno_prec": rol_riportati,
            "totali_disponibili": round(rol_totali, 1),
            "goduti": rol_goduti,
            "residui": round(rol_residui, 1)
        },
        
        "ex_festivita": {
            "spettanti_annue": ore_ex_festivita_annuali,
            "maturate": round(exf_maturati, 1),
            "godute": exf_godute,
            "residue": round(exf_residue, 1)
        },
        
        "permessi": {
            "goduti_anno": permessi_goduti
        },
        
        "dettaglio_mensile": dettaglio_mensile
    }


@router.post("/dipendente/{employee_id}/riporto-ferie")
async def set_riporto_ferie(
    employee_id: str,
    payload: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Imposta il riporto ferie/ROL da anno precedente.
    
    Payload:
    {
        "anno": 2026,
        "ferie_riportate": 24,
        "rol_riportati": 16
    }
    """
    db = Database.get_db()
    
    anno = payload.get("anno", datetime.now().year)
    ferie = float(payload.get("ferie_riportate", 0))
    rol = float(payload.get("rol_riportati", 0))
    
    await db["riporti_ferie"].update_one(
        {"employee_id": employee_id, "anno": anno},
        {"$set": {
            "employee_id": employee_id,
            "anno": anno,
            "ferie_riportate": ferie,
            "rol_riportati": rol,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {
        "success": True,
        "employee_id": employee_id,
        "anno": anno,
        "ferie_riportate": ferie,
        "rol_riportati": rol
    }


# =============================================================================
# NOTIFICHE LIMITI GIUSTIFICATIVI
# =============================================================================

@router.get("/alert-limiti")
async def get_alert_limiti_giustificativi(
    soglia_percentuale: float = Query(90, description="Soglia % per generare alert (default 90%)"),
    anno: int = Query(None)
) -> Dict[str, Any]:
    """
    Ritorna gli alert per dipendenti vicini al limite dei giustificativi.
    
    Verifica:
    - Dipendenti che hanno usato >= soglia_percentuale del limite annuale
    - Dipendenti che hanno usato >= soglia_percentuale del limite mensile
    
    Returns:
    {
        "alerts": [
            {
                "employee_id": "...",
                "employee_nome": "Mario Rossi",
                "codice": "FER",
                "descrizione": "Ferie",
                "tipo_limite": "annuale",
                "ore_usate": 187,
                "limite": 208,
                "percentuale": 89.9,
                "ore_residue": 21,
                "livello": "warning" | "critical"
            }
        ],
        "totale_alerts": 5,
        "dipendenti_coinvolti": 3
    }
    """
    db = Database.get_db()
    
    if not anno:
        anno = datetime.now().year
    
    mese_corrente = datetime.now().month
    
    # Recupera tutti i dipendenti in carico
    dipendenti = await db["employees"].find(
        {"$or": [{"in_carico": True}, {"in_carico": {"$exists": False}}]},
        {"_id": 0, "id": 1, "nome": 1, "cognome": 1, "nome_completo": 1}
    ).to_list(500)
    
    # Recupera giustificativi con limiti
    giustificativi = await db["giustificativi"].find(
        {"attivo": True, "$or": [
            {"limite_annuale_ore": {"$ne": None, "$gt": 0}},
            {"limite_mensile_ore": {"$ne": None, "$gt": 0}}
        ]},
        {"_id": 0}
    ).to_list(100)
    
    if not giustificativi:
        return {"alerts": [], "totale_alerts": 0, "dipendenti_coinvolti": 0}
    
    # Date per query
    data_inizio_anno = f"{anno}-01-01"
    data_fine_anno = f"{anno+1}-01-01"
    data_inizio_mese = f"{anno}-{mese_corrente:02d}-01"
    data_fine_mese = f"{anno}-{mese_corrente+1:02d}-01" if mese_corrente < 12 else f"{anno+1}-01-01"
    
    alerts = []
    dipendenti_set = set()
    
    for dip in dipendenti:
        emp_id = dip.get("id")
        if not emp_id:
            continue
        
        nome = dip.get("nome_completo") or f"{dip.get('nome', '')} {dip.get('cognome', '')}".strip()
        
        # Recupera limiti custom per questo dipendente
        limiti_custom = await db["giustificativi_dipendente"].find_one(
            {"employee_id": emp_id, "anno": anno},
            {"_id": 0, "limiti": 1}
        )
        limiti_per_codice = limiti_custom.get("limiti", {}) if limiti_custom else {}
        
        # Aggregazione ore anno per tutti i codici
        presenze_anno = await db["presenze_mensili"].aggregate([
            {"$match": {
                "employee_id": emp_id,
                "data": {"$gte": data_inizio_anno, "$lt": data_fine_anno}
            }},
            {"$group": {"_id": "$stato", "ore": {"$sum": {"$ifNull": ["$ore", 8]}}}}
        ]).to_list(100)
        
        # Aggregazione ore mese corrente
        presenze_mese = await db["presenze_mensili"].aggregate([
            {"$match": {
                "employee_id": emp_id,
                "data": {"$gte": data_inizio_mese, "$lt": data_fine_mese}
            }},
            {"$group": {"_id": "$stato", "ore": {"$sum": {"$ifNull": ["$ore", 8]}}}}
        ]).to_list(100)
        
        ore_anno = {p["_id"]: p["ore"] for p in presenze_anno if p["_id"]}
        ore_mese = {p["_id"]: p["ore"] for p in presenze_mese if p["_id"]}
        
        for giust in giustificativi:
            codice = giust["codice"]
            
            # Determina limiti (custom o default)
            limite_annuale = limiti_per_codice.get(codice, {}).get("limite_annuale_ore") or giust.get("limite_annuale_ore")
            limite_mensile = limiti_per_codice.get(codice, {}).get("limite_mensile_ore") or giust.get("limite_mensile_ore")
            
            ore_usate_anno = ore_anno.get(codice, 0) + ore_anno.get(codice.lower(), 0)
            ore_usate_mese = ore_mese.get(codice, 0) + ore_mese.get(codice.lower(), 0)
            
            # Verifica limite annuale
            if limite_annuale and limite_annuale > 0 and ore_usate_anno > 0:
                percentuale = (ore_usate_anno / limite_annuale) * 100
                if percentuale >= soglia_percentuale:
                    livello = "critical" if percentuale >= 100 else "warning"
                    alerts.append({
                        "employee_id": emp_id,
                        "employee_nome": nome,
                        "codice": codice,
                        "descrizione": giust.get("descrizione"),
                        "categoria": giust.get("categoria"),
                        "tipo_limite": "annuale",
                        "ore_usate": round(ore_usate_anno, 1),
                        "limite": limite_annuale,
                        "percentuale": round(percentuale, 1),
                        "ore_residue": round(max(0, limite_annuale - ore_usate_anno), 1),
                        "livello": livello,
                        "anno": anno
                    })
                    dipendenti_set.add(emp_id)
            
            # Verifica limite mensile
            if limite_mensile and limite_mensile > 0 and ore_usate_mese > 0:
                percentuale = (ore_usate_mese / limite_mensile) * 100
                if percentuale >= soglia_percentuale:
                    livello = "critical" if percentuale >= 100 else "warning"
                    alerts.append({
                        "employee_id": emp_id,
                        "employee_nome": nome,
                        "codice": codice,
                        "descrizione": giust.get("descrizione"),
                        "categoria": giust.get("categoria"),
                        "tipo_limite": "mensile",
                        "ore_usate": round(ore_usate_mese, 1),
                        "limite": limite_mensile,
                        "percentuale": round(percentuale, 1),
                        "ore_residue": round(max(0, limite_mensile - ore_usate_mese), 1),
                        "livello": livello,
                        "anno": anno,
                        "mese": mese_corrente
                    })
                    dipendenti_set.add(emp_id)
    
    # Ordina: critical prima, poi per percentuale decrescente
    alerts.sort(key=lambda x: (0 if x["livello"] == "critical" else 1, -x["percentuale"]))
    
    return {
        "success": True,
        "alerts": alerts,
        "totale_alerts": len(alerts),
        "dipendenti_coinvolti": len(dipendenti_set),
        "soglia_percentuale": soglia_percentuale,
        "anno": anno,
        "mese_corrente": mese_corrente
    }


@router.get("/riepilogo-limiti")
async def get_riepilogo_limiti(anno: int = Query(None)) -> Dict[str, Any]:
    """
    Ritorna un riepilogo compatto dei limiti per tutti i dipendenti.
    Utile per la dashboard.
    """
    db = Database.get_db()
    
    if not anno:
        anno = datetime.now().year
    
    # Conta dipendenti attivi
    totale_dipendenti = await db["employees"].count_documents(
        {"$or": [{"in_carico": True}, {"in_carico": {"$exists": False}}]}
    )
    
    # Recupera alert (soglia 80% per avere anche quelli vicini)
    alert_data = await get_alert_limiti_giustificativi(soglia_percentuale=80, anno=anno)
    
    # Separa per livello
    critical = [a for a in alert_data["alerts"] if a["livello"] == "critical"]
    warning = [a for a in alert_data["alerts"] if a["livello"] == "warning"]
    
    # Raggruppa per tipo giustificativo
    per_giustificativo = {}
    for a in alert_data["alerts"]:
        codice = a["codice"]
        if codice not in per_giustificativo:
            per_giustificativo[codice] = {
                "codice": codice,
                "descrizione": a["descrizione"],
                "critical": 0,
                "warning": 0
            }
        if a["livello"] == "critical":
            per_giustificativo[codice]["critical"] += 1
        else:
            per_giustificativo[codice]["warning"] += 1
    
    return {
        "success": True,
        "anno": anno,
        "totale_dipendenti": totale_dipendenti,
        "dipendenti_con_alert": alert_data["dipendenti_coinvolti"],
        "totale_critical": len(critical),
        "totale_warning": len(warning),
        "per_giustificativo": list(per_giustificativo.values()),
        "top_critical": critical[:5],  # Top 5 più critici
        "top_warning": warning[:5]     # Top 5 warning
    }
