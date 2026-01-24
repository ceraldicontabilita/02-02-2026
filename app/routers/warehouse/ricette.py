"""
Ricette e Produzione Router
Sistema di gestione ricette con calcolo food cost e scarico magazzino automatico.
Include generazione LOTTI di produzione e registro lotti.
"""
from fastapi import APIRouter, HTTPException, Query, Body, UploadFile, File
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.database import Database
import uuid
import json
import re

router = APIRouter()


async def genera_codice_lotto(ricetta_nome: str, quantita: int, unita: str = "pz") -> dict:
    """
    Genera un codice lotto nel formato dell'app di riferimento.
    Formato: NOME-PROGRESSIVO-QTÀunità-DDMMYYYY
    Esempio: BABA-004-1pz-06012026
    """
    db = Database.get_db()
    now = datetime.now(timezone.utc)
    
    # Estrai prefisso dal nome ricetta (max 8 caratteri, solo lettere/numeri)
    nome_clean = re.sub(r'[^A-Z0-9]', '', ricetta_nome.upper())[:8] or "PROD"
    
    # Trova il prossimo progressivo per questo prodotto
    ultimo_lotto = await db["registro_lotti"].find_one(
        {"prodotto_finito": {"$regex": f"^{re.escape(ricetta_nome)}$", "$options": "i"}},
        {"_id": 0, "codice_lotto": 1},
        sort=[("created_at", -1)]
    )
    
    progressivo = 1
    if ultimo_lotto and ultimo_lotto.get("codice_lotto"):
        # Estrai progressivo dal codice esistente
        match = re.search(r'-(\d{3})-', ultimo_lotto["codice_lotto"])
        if match:
            progressivo = int(match.group(1)) + 1
    
    # Formatta la data come DDMMYYYY
    data_str = now.strftime('%d%m%Y')
    
    # Costruisci il codice lotto
    codice_lotto = f"{nome_clean}-{progressivo:03d}-{quantita}{unita}-{data_str}"
    
    return {
        "codice_lotto": codice_lotto,
        "progressivo": progressivo,
        "nome_clean": nome_clean
    }


# ============== RICETTE ==============

@router.get("")
async def list_ricette(
    skip: int = Query(0),
    limit: int = Query(100),
    search: Optional[str] = Query(None),
    centro_costo: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Lista tutte le ricette con calcolo food cost."""
    db = Database.get_db()
    
    query = {"attivo": True}
    if search:
        query["$or"] = [
            {"nome": {"$regex": search, "$options": "i"}},
            {"categoria": {"$regex": search, "$options": "i"}}
        ]
    if centro_costo:
        query["centro_costo"] = centro_costo
    if categoria:
        query["categoria"] = categoria
    
    ricette = await db["ricette"].find(query, {"_id": 0}).sort("nome", 1).skip(skip).limit(limit).to_list(limit)
    
    # Calcola food cost per ogni ricetta
    for ricetta in ricette:
        ricetta["food_cost"] = await calcola_food_cost(ricetta)
    
    totale = await db["ricette"].count_documents(query)
    
    # Statistiche
    stats = await db["ricette"].aggregate([
        {"$match": {"attivo": True}},
        {"$group": {
            "_id": "$categoria",
            "count": {"$sum": 1}
        }}
    ]).to_list(50)
    
    return {
        "ricette": ricette,
        "totale": totale,
        "per_categoria": {s["_id"]: s["count"] for s in stats if s["_id"]}
    }


@router.get("/categorie")
async def get_categorie_ricette() -> List[str]:
    """Lista categorie ricette disponibili."""
    db = Database.get_db()
    
    categorie = await db["ricette"].distinct("categoria", {"attivo": True})
    return sorted([c for c in categorie if c])


# ============== REGISTRO LOTTI (PRIMA di /{ricetta_id}) ==============

@router.get("/lotti")
async def list_lotti(
    skip: int = Query(0),
    limit: int = Query(100),
    data_da: Optional[str] = Query(None),
    data_a: Optional[str] = Query(None),
    stato: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Lista lotti di produzione con tracciabilità ingredienti."""
    db = Database.get_db()
    
    query = {}
    if data_da:
        query["data_produzione"] = {"$gte": data_da}
    if data_a:
        if "data_produzione" in query:
            query["data_produzione"]["$lte"] = data_a
        else:
            query["data_produzione"] = {"$lte": data_a}
    if stato:
        query["stato"] = stato
    if search:
        query["$or"] = [
            {"codice_lotto": {"$regex": search, "$options": "i"}},
            {"prodotto_finito": {"$regex": search, "$options": "i"}}
        ]
    
    lotti = await db["registro_lotti"].find(query, {"_id": 0}).sort("data_produzione", -1).skip(skip).limit(limit).to_list(limit)
    totale = await db["registro_lotti"].count_documents(query)
    
    # Statistiche per stato
    stats_pipeline = [
        {"$group": {
            "_id": "$stato",
            "count": {"$sum": 1},
            "quantita": {"$sum": "$quantita"}
        }}
    ]
    stats_result = await db["registro_lotti"].aggregate(stats_pipeline).to_list(10)
    per_stato = {s["_id"]: {"count": s["count"], "quantita": s["quantita"]} for s in stats_result if s["_id"]}
    
    return {
        "lotti": lotti,
        "totale": totale,
        "per_stato": per_stato
    }


@router.get("/lotti/{codice_lotto}")
async def get_lotto_dettaglio(codice_lotto: str) -> Dict[str, Any]:
    """Dettaglio completo di un lotto con tracciabilità ingredienti."""
    db = Database.get_db()
    
    lotto = await db["registro_lotti"].find_one({"codice_lotto": codice_lotto}, {"_id": 0})
    if not lotto:
        raise HTTPException(status_code=404, detail="Lotto non trovato")
    
    # Recupera produzione associata
    produzione = await db["produzioni"].find_one({"id": lotto.get("produzione_id")}, {"_id": 0})
    
    return {
        "lotto": lotto,
        "produzione": produzione
    }


@router.put("/lotti/{codice_lotto}/stato")
async def aggiorna_stato_lotto(
    codice_lotto: str,
    data: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    """Aggiorna lo stato di un lotto (disponibile, venduto, scaduto, eliminato)."""
    db = Database.get_db()
    
    nuovo_stato = data.get("stato")
    if nuovo_stato not in ["disponibile", "venduto", "scaduto", "eliminato"]:
        raise HTTPException(status_code=400, detail="Stato non valido")
    
    result = await db["registro_lotti"].update_one(
        {"codice_lotto": codice_lotto},
        {"$set": {
            "stato": nuovo_stato,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lotto non trovato")
    
    return {"success": True, "message": f"Stato lotto aggiornato a: {nuovo_stato}"}


# ============== PRODUZIONI (PRIMA di /{ricetta_id}) ==============

@router.get("/produzioni")
async def list_produzioni(
    skip: int = Query(0),
    limit: int = Query(100),
    data_da: Optional[str] = Query(None),
    data_a: Optional[str] = Query(None),
    ricetta_id: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Lista produzioni con filtri."""
    db = Database.get_db()
    
    query = {}
    if data_da:
        query["data"] = {"$gte": data_da}
    if data_a:
        if "data" in query:
            query["data"]["$lte"] = data_a
        else:
            query["data"] = {"$lte": data_a}
    if ricetta_id:
        query["ricetta_id"] = ricetta_id
    
    produzioni = await db["produzioni"].find(query, {"_id": 0}).sort("data", -1).skip(skip).limit(limit).to_list(limit)
    
    # Statistiche
    stats_pipeline = [
        {"$match": query},
        {"$group": {
            "_id": None,
            "totale_costo": {"$sum": "$costo_produzione"},
            "totale_quantita": {"$sum": "$quantita_prodotta"},
            "count": {"$sum": 1}
        }}
    ]
    stats_result = await db["produzioni"].aggregate(stats_pipeline).to_list(1)
    stats = stats_result[0] if stats_result else {}
    
    return {
        "produzioni": produzioni,
        "totale": await db["produzioni"].count_documents(query),
        "statistiche": {
            "produzioni_count": stats.get("count", 0),
            "costo_totale": round(stats.get("totale_costo", 0), 2),
            "quantita_totale": stats.get("totale_quantita", 0)
        }
    }


# ============== DETTAGLIO RICETTA (DOPO le route specifiche) ==============

@router.get("/{ricetta_id}")
async def get_ricetta(ricetta_id: str) -> Dict[str, Any]:
    """Dettaglio ricetta con food cost calcolato."""
    db = Database.get_db()
    
    ricetta = await db["ricette"].find_one({"id": ricetta_id}, {"_id": 0})
    if not ricetta:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")
    
    # Calcola food cost dettagliato
    ricetta["food_cost_dettaglio"] = await calcola_food_cost_dettagliato(ricetta)
    ricetta["food_cost"] = ricetta["food_cost_dettaglio"]["totale"]
    
    return ricetta


@router.post("")
async def create_ricetta(data: Dict[str, Any] = Body(...)) -> Dict[str, str]:
    """Crea nuova ricetta."""
    db = Database.get_db()
    
    ricetta = {
        "id": str(uuid.uuid4()),
        "nome": data.get("nome"),
        "descrizione": data.get("descrizione", ""),
        "categoria": data.get("categoria", "altro"),
        "centro_costo": data.get("centro_costo", "CDC-02"),  # Default pasticceria
        "porzioni": data.get("porzioni", 1),
        "tempo_preparazione": data.get("tempo_preparazione", 0),  # minuti
        "difficolta": data.get("difficolta", "media"),
        "ingredienti": data.get("ingredienti", []),
        "procedimento": data.get("procedimento", ""),
        "note_haccp": data.get("note_haccp", ""),
        "allergeni": data.get("allergeni", []),
        "prezzo_vendita": data.get("prezzo_vendita", 0),
        "food_cost_target": data.get("food_cost_target", 0.30),  # 30% default
        "attivo": True,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    if not ricetta["nome"]:
        raise HTTPException(status_code=400, detail="Nome ricetta obbligatorio")
    
    await db["ricette"].insert_one(ricetta.copy())
    
    return {"message": f"Ricetta '{ricetta['nome']}' creata", "id": ricetta["id"]}


@router.put("/{ricetta_id}")
async def update_ricetta(ricetta_id: str, data: Dict[str, Any] = Body(...)) -> Dict[str, str]:
    """Aggiorna ricetta esistente."""
    db = Database.get_db()
    
    data["updated_at"] = datetime.utcnow().isoformat()
    
    result = await db["ricette"].update_one(
        {"id": ricetta_id},
        {"$set": data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")
    
    return {"message": "Ricetta aggiornata"}


@router.delete("/{ricetta_id}")
async def delete_ricetta(ricetta_id: str) -> Dict[str, str]:
    """Disattiva ricetta (soft delete)."""
    db = Database.get_db()
    
    result = await db["ricette"].update_one(
        {"id": ricetta_id},
        {"$set": {"attivo": False, "updated_at": datetime.utcnow().isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")
    
    return {"message": "Ricetta disattivata"}


async def calcola_food_cost(ricetta: Dict[str, Any]) -> float:
    """Calcola il food cost totale di una ricetta."""
    db = Database.get_db()
    totale = 0
    
    for ing in ricetta.get("ingredienti", []):
        prodotto_id = ing.get("prodotto_id")
        quantita = ing.get("quantita", 0)
        
        if prodotto_id:
            # Cerca nel magazzino doppia verità
            prodotto = await db["magazzino_doppia_verita"].find_one({"id": prodotto_id})
            if prodotto:
                costo_unitario = prodotto.get("costo_medio", 0)
                totale += quantita * costo_unitario
    
    return round(totale, 2)


async def calcola_food_cost_dettagliato(ricetta: Dict[str, Any]) -> Dict[str, Any]:
    """Calcola il food cost dettagliato per ingrediente."""
    db = Database.get_db()
    dettaglio = []
    totale = 0
    
    for ing in ricetta.get("ingredienti", []):
        prodotto_id = ing.get("prodotto_id")
        nome_ingrediente = ing.get("nome", "")
        quantita = ing.get("quantita", 0)
        unita = ing.get("unita", "")
        
        costo_unitario = 0
        costo_totale = 0
        disponibile = True
        
        if prodotto_id:
            prodotto = await db["magazzino_doppia_verita"].find_one({"id": prodotto_id})
            if prodotto:
                costo_unitario = prodotto.get("costo_medio", 0)
                costo_totale = quantita * costo_unitario
                disponibile = prodotto.get("giacenza_teorica", 0) >= quantita
                nome_ingrediente = nome_ingrediente or prodotto.get("nome", "")
        
        dettaglio.append({
            "nome": nome_ingrediente,
            "quantita": quantita,
            "unita": unita,
            "costo_unitario": round(costo_unitario, 4),
            "costo_totale": round(costo_totale, 2),
            "disponibile": disponibile,
            "prodotto_id": prodotto_id
        })
        
        totale += costo_totale
    
    porzioni = ricetta.get("porzioni", 1) or 1
    prezzo_vendita = ricetta.get("prezzo_vendita", 0)
    
    food_cost_percentuale = (totale / prezzo_vendita * 100) if prezzo_vendita > 0 else 0
    margine = prezzo_vendita - (totale / porzioni)
    
    return {
        "ingredienti": dettaglio,
        "totale": round(totale, 2),
        "costo_per_porzione": round(totale / porzioni, 2),
        "prezzo_vendita": prezzo_vendita,
        "margine_per_porzione": round(margine, 2),
        "food_cost_percentuale": round(food_cost_percentuale, 1),
        "food_cost_target": ricetta.get("food_cost_target", 0.30) * 100,
        "in_target": food_cost_percentuale <= ricetta.get("food_cost_target", 0.30) * 100
    }


# ============== PRODUZIONE ==============

@router.post("/produzioni")
async def registra_produzione(data: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Registra un evento di produzione.
    Consuma ingredienti dal magazzino e genera prodotti finiti.
    Formato codice lotto: NOME-PROGRESSIVO-QTÀunità-DDMMYYYY
    """
    db = Database.get_db()
    
    ricetta_id = data.get("ricetta_id")
    quantita = data.get("quantita", 1)  # Quantità da produrre
    unita = data.get("unita", "pz")  # Unità di misura
    
    # Recupera ricetta
    ricetta = await db["ricette"].find_one({"id": ricetta_id})
    if not ricetta:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")
    
    # Verifica disponibilità ingredienti (solo se hanno prodotto_id collegato)
    ingredienti_mancanti = []
    for ing in ricetta.get("ingredienti", []):
        prodotto_id = ing.get("prodotto_id")
        qta_necessaria = ing.get("quantita", 0) * quantita
        
        if prodotto_id:
            prodotto = await db["magazzino_doppia_verita"].find_one({"id": prodotto_id})
            if prodotto:
                if prodotto.get("giacenza_teorica", 0) < qta_necessaria:
                    ingredienti_mancanti.append({
                        "nome": ing.get("nome") or prodotto.get("nome"),
                        "richiesto": qta_necessaria,
                        "disponibile": prodotto.get("giacenza_teorica", 0)
                    })
    
    # Non bloccare la produzione se mancano ingredienti (forza automaticamente)
    # L'utente può vedere il warning ma la produzione procede
    
    # Scarica ingredienti dal magazzino e raccogli info tracciabilità
    costo_produzione = 0
    scarichi = []
    ingredienti_tracciabilita = []
    
    for ing in ricetta.get("ingredienti", []):
        prodotto_id = ing.get("prodotto_id")
        nome_ingrediente = ing.get("nome", "")
        qta_scarico = ing.get("quantita", 0) * quantita
        
        # Aggiungi sempre l'ingrediente alla tracciabilità anche senza prodotto_id
        tracciabilita_entry = {
            "prodotto": nome_ingrediente,
            "prodotto_id": prodotto_id,
            "quantita_usata": qta_scarico,
            "unita": ing.get("unita", "g"),
            "lotto_fornitore": None,
            "fornitore": None,
            "data_consegna": None,
            "scadenza": None
        }
        
        if prodotto_id and qta_scarico > 0:
            prodotto = await db["magazzino_doppia_verita"].find_one({"id": prodotto_id})
            if prodotto:
                nuova_giacenza = prodotto.get("giacenza_teorica", 0) - qta_scarico
                costo_unitario = prodotto.get("costo_medio", 0)
                costo_ingrediente = qta_scarico * costo_unitario
                costo_produzione += costo_ingrediente
                
                # Aggiorna giacenza
                await db["magazzino_doppia_verita"].update_one(
                    {"id": prodotto_id},
                    {"$set": {
                        "giacenza_teorica": nuova_giacenza,
                        "updated_at": datetime.utcnow().isoformat()
                    }}
                )
                
                # Cerca info tracciabilità per questo prodotto (ultimo lotto ricevuto)
                tracciabilita_info = await db["tracciabilita"].find_one(
                    {"prodotto": {"$regex": prodotto.get("nome", ""), "$options": "i"}},
                    {"_id": 0, "lotto": 1, "fornitore": 1, "data_consegna": 1, "scadenza": 1}
                )
                
                # Registra movimento
                movimento = {
                    "id": str(uuid.uuid4()),
                    "prodotto_id": prodotto_id,
                    "tipo": "scarico",
                    "motivo": "produzione",
                    "quantita": -qta_scarico,
                    "costo_unitario": costo_unitario,
                    "valore": costo_ingrediente,
                    "ricetta_id": ricetta_id,
                    "produzione_id": None,  # Sarà aggiornato dopo
                    "data": datetime.utcnow().isoformat()
                }
                await db["magazzino_movimenti"].insert_one(movimento.copy())
                
                scarichi.append({
                    "prodotto": prodotto.get("nome"),
                    "prodotto_id": prodotto_id,
                    "quantita": qta_scarico,
                    "unita": ing.get("unita", prodotto.get("unita_misura", "kg")),
                    "costo": round(costo_ingrediente, 2)
                })
                
                # Aggiorna tracciabilità con info del prodotto
                tracciabilita_entry = {
                    "prodotto": prodotto.get("nome") or nome_ingrediente,
                    "prodotto_id": prodotto_id,
                    "quantita_usata": qta_scarico,
                    "unita": ing.get("unita", prodotto.get("unita_misura", "kg")),
                    "lotto_fornitore": tracciabilita_info.get("lotto") if tracciabilita_info else None,
                    "fornitore": tracciabilita_info.get("fornitore") if tracciabilita_info else prodotto.get("fornitore"),
                    "data_consegna": tracciabilita_info.get("data_consegna") if tracciabilita_info else None,
                    "scadenza": tracciabilita_info.get("scadenza") if tracciabilita_info else None
                }
        
        ingredienti_tracciabilita.append(tracciabilita_entry)
    
    # Genera codice LOTTO produzione con il nuovo formato
    lotto_info = await genera_codice_lotto(ricetta.get("nome", "PROD"), quantita, unita)
    codice_lotto = lotto_info["codice_lotto"]
    progressivo = lotto_info["progressivo"]
    
    # Date produzione e scadenza
    data_produzione_str = data.get("data_produzione") or datetime.now(timezone.utc).isoformat()
    scadenza_str = data.get("scadenza")
    conservazione = data.get("conservazione", "frigo")
    
    # Registra produzione con LOTTO
    produzione = {
        "id": str(uuid.uuid4()),
        "codice_lotto": codice_lotto,
        "progressivo": progressivo,
        "ricetta_id": ricetta_id,
        "ricetta_nome": ricetta.get("nome"),
        "categoria": ricetta.get("categoria"),
        "quantita_prodotta": quantita,
        "unita": unita,
        "costo_produzione": round(costo_produzione, 2),
        "costo_per_unita": round(costo_produzione / max(quantita, 1), 2),
        "centro_costo": ricetta.get("centro_costo", "CDC-03"),
        "data_produzione": data_produzione_str,
        "scadenza": scadenza_str,
        "conservazione": conservazione,
        "data": datetime.utcnow().isoformat(),
        "utente": data.get("utente", "system"),
        "note": data.get("note", ""),
        "scarichi": scarichi,
        "ingredienti_tracciabilita": ingredienti_tracciabilita,
        "stato": "completato"
    }
    
    await db["produzioni"].insert_one(produzione.copy())
    
    # Registra nel Registro Lotti
    registro_lotto = {
        "id": str(uuid.uuid4()),
        "codice_lotto": codice_lotto,
        "progressivo": progressivo,
        "produzione_id": produzione["id"],
        "prodotto_finito": ricetta.get("nome"),
        "ricetta_id": ricetta_id,
        "categoria": ricetta.get("categoria"),
        "quantita": quantita,
        "unita": unita,
        "data_produzione": data_produzione_str,
        "scadenza_stimata": scadenza_str,
        "conservazione": conservazione,
        "ingredienti": ingredienti_tracciabilita,
        "costo_totale": round(costo_produzione, 2),
        "costo_unitario": round(costo_produzione / max(quantita, 1), 2),
        "stato": "disponibile",
        "note": data.get("note", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db["registro_lotti"].insert_one(registro_lotto.copy())
    
    # Aggiorna movimento con ID produzione
    await db["magazzino_movimenti"].update_many(
        {"ricetta_id": ricetta_id, "produzione_id": None},
        {"$set": {"produzione_id": produzione["id"]}}
    )
    
    return {
        "success": True,
        "message": f"Produzione registrata: {quantita} {unita} di {ricetta.get('nome')}",
        "codice_lotto": codice_lotto,
        "progressivo": progressivo,
        "produzione_id": produzione["id"],
        "quantita_prodotta": quantita,
        "costo_totale": produzione["costo_produzione"],
        "costo_per_unita": produzione["costo_per_unita"],
        "scarichi": scarichi,
        "ingredienti_tracciabilita": ingredienti_tracciabilita,
        "ingredienti_mancanti": ingredienti_mancanti if ingredienti_mancanti else None
    }


# ============== IMPORT RICETTE ==============

@router.post("/import")
async def import_ricette(data: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Importa ricette da JSON.
    Formato atteso: { "ricette": [ { "nome": "...", "ingredienti_dettaglio": [...], "porzioni": N }, ... ] }
    """
    db = Database.get_db()
    
    ricette_data = data.get("ricette", [])
    if not ricette_data:
        raise HTTPException(status_code=400, detail="Nessuna ricetta da importare")
    
    importate = 0
    errori = []
    
    for r in ricette_data:
        try:
            # Prepara ingredienti
            ingredienti = []
            for ing in r.get("ingredienti_dettaglio", []):
                nome_ing = ing.get("nome", "")
                quantita = ing.get("quantita")
                unita = ing.get("unita", "")
                
                # Cerca prodotto esistente nel magazzino
                prodotto = await db["magazzino_doppia_verita"].find_one({
                    "nome": {"$regex": nome_ing, "$options": "i"}
                })
                
                prodotto_id = prodotto["id"] if prodotto else None
                
                ingredienti.append({
                    "nome": nome_ing,
                    "quantita": quantita if isinstance(quantita, (int, float)) else 0,
                    "unita": unita,
                    "prodotto_id": prodotto_id
                })
            
            # Crea ricetta
            ricetta = {
                "id": str(uuid.uuid4()),
                "nome": r.get("nome"),
                "descrizione": r.get("descrizione", ""),
                "categoria": r.get("categoria", "pasticceria"),
                "centro_costo": r.get("centro_costo", "CDC-02"),
                "porzioni": r.get("porzioni", 1),
                "tempo_preparazione": r.get("tempo_preparazione", 0),
                "difficolta": r.get("difficolta", "media"),
                "ingredienti": ingredienti,
                "procedimento": r.get("procedimento", ""),
                "note_haccp": r.get("note_haccp", ""),
                "allergeni": r.get("allergeni", []),
                "prezzo_vendita": r.get("prezzo_vendita", 0),
                "food_cost_target": r.get("food_cost_target", 0.30),
                "attivo": True,
                "imported": True,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Verifica duplicato
            existing = await db["ricette"].find_one({"nome": ricetta["nome"]})
            if existing:
                # Aggiorna esistente
                await db["ricette"].update_one(
                    {"nome": ricetta["nome"]},
                    {"$set": {**ricetta, "id": existing["id"]}}
                )
            else:
                await db["ricette"].insert_one(ricetta.copy())
            
            importate += 1
            
        except Exception as e:
            errori.append({"ricetta": r.get("nome", "?"), "errore": str(e)})
    
    return {
        "message": f"Import completato: {importate} ricette importate",
        "importate": importate,
        "errori": errori if errori else None
    }


@router.post("/import-file")
async def import_ricette_file(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Importa ricette da file JSON."""
    content = await file.read()
    
    try:
        data = json.loads(content.decode("utf-8"))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"JSON non valido: {str(e)}")
    
    return await import_ricette(data)


# ============== REPORT FOOD COST ==============

@router.get("/report/food-cost")
async def report_food_cost(
    centro_costo: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Report food cost per tutte le ricette."""
    db = Database.get_db()
    
    query = {"attivo": True}
    if centro_costo:
        query["centro_costo"] = centro_costo
    
    ricette = await db["ricette"].find(query, {"_id": 0}).to_list(1000)
    
    report = []
    totale_food_cost = 0
    ricette_in_target = 0
    ricette_fuori_target = 0
    
    for ricetta in ricette:
        fc = await calcola_food_cost_dettagliato(ricetta)
        
        report.append({
            "nome": ricetta["nome"],
            "categoria": ricetta.get("categoria"),
            "centro_costo": ricetta.get("centro_costo"),
            "prezzo_vendita": fc["prezzo_vendita"],
            "costo_ingredienti": fc["totale"],
            "costo_per_porzione": fc["costo_per_porzione"],
            "margine": fc["margine_per_porzione"],
            "food_cost_percentuale": fc["food_cost_percentuale"],
            "in_target": fc["in_target"]
        })
        
        totale_food_cost += fc["totale"]
        if fc["in_target"]:
            ricette_in_target += 1
        else:
            ricette_fuori_target += 1
    
    # Ordina per food cost (peggiori prima)
    report.sort(key=lambda x: x["food_cost_percentuale"], reverse=True)
    
    return {
        "ricette": report,
        "statistiche": {
            "totale_ricette": len(ricette),
            "ricette_in_target": ricette_in_target,
            "ricette_fuori_target": ricette_fuori_target,
            "food_cost_medio": round(sum(r["food_cost_percentuale"] for r in report) / len(report), 1) if report else 0
        }
    }



# ============== LOTTI FORNITORE PER INGREDIENTI ==============

@router.get("/lotti-fornitore/cerca")
async def cerca_lotti_fornitore(
    prodotto: Optional[str] = Query(None, description="Nome prodotto/ingrediente da cercare"),
    fornitore_piva: Optional[str] = Query(None, description="Partita IVA fornitore"),
    solo_con_scadenza: bool = Query(False, description="Solo lotti con scadenza")
) -> Dict[str, Any]:
    """
    Cerca lotti fornitore disponibili per un ingrediente.
    Cerca sia nella collezione tracciabilita che in dettaglio_righe_fatture.
    """
    db = Database.get_db()
    lotti = []
    
    # Cerca nella tracciabilita
    query_tracc = {}
    if prodotto:
        query_tracc["$or"] = [
            {"prodotto": {"$regex": prodotto, "$options": "i"}},
            {"descrizione_completa": {"$regex": prodotto, "$options": "i"}}
        ]
    if fornitore_piva:
        query_tracc["fornitore_piva"] = fornitore_piva
    if solo_con_scadenza:
        query_tracc["scadenza"] = {"$ne": None}
    
    tracc_records = await db.tracciabilita.find(
        query_tracc,
        {"_id": 0, "id": 1, "prodotto": 1, "lotto": 1, "scadenza": 1, "fornitore": 1, 
         "fornitore_piva": 1, "data_consegna": 1, "quantita": 1, "unita_misura": 1}
    ).sort("data_consegna", -1).limit(50).to_list(50)
    
    for rec in tracc_records:
        lotti.append({
            "id": rec.get("id"),
            "source": "tracciabilita",
            "prodotto": rec.get("prodotto"),
            "lotto_fornitore": rec.get("lotto"),
            "scadenza": rec.get("scadenza"),
            "fornitore": rec.get("fornitore"),
            "fornitore_piva": rec.get("fornitore_piva"),
            "data_consegna": rec.get("data_consegna"),
            "quantita": rec.get("quantita"),
            "unita_misura": rec.get("unita_misura")
        })
    
    # Cerca in dettaglio_righe_fatture (join con invoices per fornitore)
    query_righe = {"lotto_fornitore": {"$ne": None}}
    if prodotto:
        query_righe["descrizione"] = {"$regex": prodotto, "$options": "i"}
    if solo_con_scadenza:
        query_righe["data_scadenza"] = {"$ne": None}
    
    righe_records = await db.dettaglio_righe_fatture.find(
        query_righe,
        {"_id": 0, "id": 1, "fattura_id": 1, "descrizione": 1, "lotto_fornitore": 1, 
         "data_scadenza": 1, "quantita": 1, "unita_misura": 1}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Arricchisci con dati fornitore dalla fattura
    for riga in righe_records:
        fattura = await db.invoices.find_one(
            {"id": riga.get("fattura_id")},
            {"_id": 0, "fornitore_ragione_sociale": 1, "fornitore_partita_iva": 1, "data_documento": 1}
        )
        
        # Filtro per fornitore se specificato
        if fornitore_piva and fattura and fattura.get("fornitore_partita_iva") != fornitore_piva:
            continue
        
        lotti.append({
            "id": riga.get("id"),
            "source": "fattura",
            "prodotto": riga.get("descrizione"),
            "lotto_fornitore": riga.get("lotto_fornitore"),
            "scadenza": riga.get("data_scadenza"),
            "fornitore": fattura.get("fornitore_ragione_sociale") if fattura else None,
            "fornitore_piva": fattura.get("fornitore_partita_iva") if fattura else None,
            "data_consegna": fattura.get("data_documento") if fattura else None,
            "quantita": riga.get("quantita"),
            "unita_misura": riga.get("unita_misura")
        })
    
    # Rimuovi duplicati per lotto
    lotti_unici = {}
    for lotto_item in lotti:
        key = f"{lotto_item['lotto_fornitore']}_{lotto_item['prodotto']}"
        if key not in lotti_unici or (lotto_item.get('scadenza') and not lotti_unici[key].get('scadenza')):
            lotti_unici[key] = lotto_item
    
    return {
        "lotti": list(lotti_unici.values()),
        "totale": len(lotti_unici)
    }


@router.post("/{ricetta_id}/ingredienti/{ingrediente_idx}/lotto")
async def associa_lotto_ingrediente(
    ricetta_id: str,
    ingrediente_idx: int,
    data: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    """
    Associa un lotto fornitore a un ingrediente della ricetta.
    
    Args:
        ricetta_id: ID della ricetta
        ingrediente_idx: Indice dell'ingrediente nella lista
        data: { lotto_fornitore: str, scadenza: str, fornitore: str }
    """
    db = Database.get_db()
    
    ricetta = await db["ricette"].find_one({"id": ricetta_id})
    if not ricetta:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")
    
    ingredienti = ricetta.get("ingredienti", [])
    if ingrediente_idx < 0 or ingrediente_idx >= len(ingredienti):
        raise HTTPException(status_code=400, detail="Indice ingrediente non valido")
    
    # Aggiorna l'ingrediente con i dati del lotto
    ingredienti[ingrediente_idx]["lotto_fornitore"] = data.get("lotto_fornitore")
    ingredienti[ingrediente_idx]["scadenza_lotto"] = data.get("scadenza")
    ingredienti[ingrediente_idx]["fornitore_lotto"] = data.get("fornitore")
    ingredienti[ingrediente_idx]["data_associazione_lotto"] = datetime.now(timezone.utc).isoformat()
    
    # Salva
    await db["ricette"].update_one(
        {"id": ricetta_id},
        {"$set": {
            "ingredienti": ingredienti,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Lotto {data.get('lotto_fornitore')} associato all'ingrediente",
        "ingrediente": ingredienti[ingrediente_idx]
    }


@router.delete("/{ricetta_id}/ingredienti/{ingrediente_idx}/lotto")
async def rimuovi_lotto_ingrediente(
    ricetta_id: str,
    ingrediente_idx: int
) -> Dict[str, Any]:
    """Rimuove l'associazione del lotto da un ingrediente."""
    db = Database.get_db()
    
    ricetta = await db["ricette"].find_one({"id": ricetta_id})
    if not ricetta:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")
    
    ingredienti = ricetta.get("ingredienti", [])
    if ingrediente_idx < 0 or ingrediente_idx >= len(ingredienti):
        raise HTTPException(status_code=400, detail="Indice ingrediente non valido")
    
    # Rimuovi dati lotto
    ingredienti[ingrediente_idx].pop("lotto_fornitore", None)
    ingredienti[ingrediente_idx].pop("scadenza_lotto", None)
    ingredienti[ingrediente_idx].pop("fornitore_lotto", None)
    ingredienti[ingrediente_idx].pop("data_associazione_lotto", None)
    
    await db["ricette"].update_one(
        {"id": ricetta_id},
        {"$set": {
            "ingredienti": ingredienti,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Associazione lotto rimossa"}


@router.get("/{ricetta_id}/lotti-ingredienti")
async def get_lotti_ingredienti_ricetta(ricetta_id: str) -> Dict[str, Any]:
    """
    Ottiene tutti i lotti associati agli ingredienti di una ricetta.
    Utile per la tracciabilità HACCP.
    """
    db = Database.get_db()
    
    ricetta = await db["ricette"].find_one({"id": ricetta_id}, {"_id": 0})
    if not ricetta:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")
    
    ingredienti_con_lotto = []
    ingredienti_senza_lotto = []
    
    for idx, ing in enumerate(ricetta.get("ingredienti", [])):
        ing_data = {
            "indice": idx,
            "nome": ing.get("nome"),
            "quantita": ing.get("quantita"),
            "unita": ing.get("unita"),
            "prodotto_id": ing.get("prodotto_id")
        }
        
        if ing.get("lotto_fornitore"):
            ing_data["lotto_fornitore"] = ing.get("lotto_fornitore")
            ing_data["scadenza_lotto"] = ing.get("scadenza_lotto")
            ing_data["fornitore_lotto"] = ing.get("fornitore_lotto")
            ingredienti_con_lotto.append(ing_data)
        else:
            ingredienti_senza_lotto.append(ing_data)
    
    return {
        "ricetta_id": ricetta_id,
        "ricetta_nome": ricetta.get("nome"),
        "ingredienti_con_lotto": ingredienti_con_lotto,
        "ingredienti_senza_lotto": ingredienti_senza_lotto,
        "totale_ingredienti": len(ricetta.get("ingredienti", [])),
        "percentuale_tracciabilita": round(
            len(ingredienti_con_lotto) / max(len(ricetta.get("ingredienti", [])), 1) * 100, 1
        )
    }
