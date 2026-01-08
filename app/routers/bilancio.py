"""
Router Bilancio - Bilancio civilistico, cespiti, indici, budget
Gestione semplificata per PMI/ristorazione
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from uuid import uuid4
from decimal import Decimal
import logging

from app.database import Database

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================
# COSTANTI
# ============================================

# Coefficienti ammortamento fiscali (DM 31/12/1988)
COEFFICIENTI_AMMORTAMENTO = {
    "fabbricati": 3,
    "impianti_cucina": 12,
    "attrezzature": 15,
    "mobili_arredi": 12,
    "automezzi": 20,
    "macchine_ufficio": 20,
    "software": 20,
    "insegne": 20,
}

# Aliquote imposte
ALIQUOTA_IRES = 24  # %
ALIQUOTA_IRAP = 3.9  # %


# ============================================
# MODELLI CESPITI
# ============================================

class CespiteInput(BaseModel):
    descrizione: str
    categoria: str  # chiave di COEFFICIENTI_AMMORTAMENTO
    data_acquisto: str  # YYYY-MM-DD
    valore_acquisto: float
    fornitore: Optional[str] = None
    numero_fattura: Optional[str] = None
    ubicazione: Optional[str] = None
    note: Optional[str] = None


class BudgetInput(BaseModel):
    anno: int
    voce: str  # es: "ricavi_ristorante", "costi_personale"
    importo_previsto: float
    note: Optional[str] = None


# ============================================
# ENDPOINT CESPITI
# ============================================

@router.post("/cespiti")
async def crea_cespite(cespite: CespiteInput) -> Dict[str, Any]:
    """Registra un nuovo cespite ammortizzabile"""
    db = Database.get_db()
    
    coeff = COEFFICIENTI_AMMORTAMENTO.get(cespite.categoria, 10)
    anni_ammortamento = 100 / coeff
    
    nuovo_cespite = {
        "id": str(uuid4()),
        "descrizione": cespite.descrizione,
        "categoria": cespite.categoria,
        "coefficiente_ammortamento": coeff,
        "data_acquisto": cespite.data_acquisto,
        "anno_acquisto": int(cespite.data_acquisto[:4]),
        "valore_acquisto": cespite.valore_acquisto,
        "valore_residuo": cespite.valore_acquisto,
        "fondo_ammortamento": 0,
        "fornitore": cespite.fornitore,
        "numero_fattura": cespite.numero_fattura,
        "ubicazione": cespite.ubicazione,
        "note": cespite.note,
        "stato": "attivo",
        "ammortamento_completato": False,
        "anni_ammortamento_stimati": anni_ammortamento,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db["cespiti"].insert_one(nuovo_cespite)
    
    return {
        "success": True,
        "cespite_id": nuovo_cespite["id"],
        "messaggio": f"Cespite '{cespite.descrizione}' registrato",
        "piano_ammortamento": {
            "valore": cespite.valore_acquisto,
            "coefficiente": coeff,
            "quota_annua": round(cespite.valore_acquisto * coeff / 100, 2),
            "anni_stimati": anni_ammortamento
        }
    }


@router.get("/cespiti")
async def lista_cespiti(attivi: bool = True) -> List[Dict[str, Any]]:
    """Lista cespiti con stato ammortamento"""
    db = Database.get_db()
    
    query = {"stato": "attivo"} if attivi else {}
    cespiti = await db["cespiti"].find(query, {"_id": 0}).to_list(1000)
    
    return cespiti


@router.post("/cespiti/calcola-ammortamenti/{anno}")
async def calcola_ammortamenti_anno(anno: int) -> Dict[str, Any]:
    """Calcola ammortamenti per tutti i cespiti attivi per l'anno"""
    db = Database.get_db()
    
    cespiti = await db["cespiti"].find(
        {"stato": "attivo", "ammortamento_completato": False},
        {"_id": 0}
    ).to_list(1000)
    
    ammortamenti = []
    totale = 0
    
    for cespite in cespiti:
        valore = cespite["valore_acquisto"]
        coeff = cespite["coefficiente_ammortamento"]
        fondo = cespite.get("fondo_ammortamento", 0)
        anno_acquisto = cespite["anno_acquisto"]
        
        # Quota ordinaria
        quota_ordinaria = valore * coeff / 100
        
        # Primo anno: dimezzata
        if anno == anno_acquisto:
            quota = quota_ordinaria / 2
        else:
            quota = quota_ordinaria
        
        # Non superare valore residuo
        valore_residuo = valore - fondo
        quota = min(quota, valore_residuo)
        
        if quota > 0:
            ammortamenti.append({
                "cespite_id": cespite["id"],
                "descrizione": cespite["descrizione"],
                "categoria": cespite["categoria"],
                "valore_acquisto": valore,
                "fondo_precedente": fondo,
                "quota_anno": round(quota, 2),
                "nuovo_fondo": round(fondo + quota, 2),
                "nuovo_residuo": round(valore_residuo - quota, 2),
                "completato": (valore_residuo - quota) <= 0.01
            })
            totale += quota
    
    return {
        "anno": anno,
        "ammortamenti": ammortamenti,
        "totale_ammortamenti": round(totale, 2),
        "num_cespiti": len(ammortamenti)
    }


@router.post("/cespiti/registra-ammortamenti/{anno}")
async def registra_ammortamenti_anno(anno: int) -> Dict[str, Any]:
    """Registra gli ammortamenti calcolati in contabilità"""
    db = Database.get_db()
    
    # Calcola ammortamenti
    calcolo = await calcola_ammortamenti_anno(anno)
    
    for amm in calcolo["ammortamenti"]:
        # Aggiorna cespite
        update = {
            "$set": {
                "fondo_ammortamento": amm["nuovo_fondo"],
                "valore_residuo": amm["nuovo_residuo"],
                "ammortamento_completato": amm["completato"],
                f"ammortamenti.{anno}": amm["quota_anno"]
            }
        }
        
        await db["cespiti"].update_one(
            {"id": amm["cespite_id"]},
            update
        )
    
    # Crea movimento contabile
    if calcolo["totale_ammortamenti"] > 0:
        movimento = {
            "id": str(uuid4()),
            "data": f"{anno}-12-31",
            "descrizione": f"Ammortamenti cespiti {anno}",
            "tipo": "ammortamento",
            "importo": calcolo["totale_ammortamenti"],
            "anno": anno,
            "dettaglio": calcolo["ammortamenti"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db["movimenti_contabili"].insert_one(movimento)
    
    return {
        "success": True,
        "anno": anno,
        "totale_registrato": calcolo["totale_ammortamenti"],
        "cespiti_ammortizzati": len(calcolo["ammortamenti"]),
        "messaggio": f"Ammortamenti {anno} registrati in contabilità"
    }


# ============================================
# ENDPOINT BILANCIO CIVILISTICO
# ============================================

@router.get("/civilistico/{anno}")
async def bilancio_civilistico(anno: int) -> Dict[str, Any]:
    """
    Genera bilancio civilistico semplificato
    Schema art. 2424-2425 c.c.
    """
    db = Database.get_db()
    
    # --- STATO PATRIMONIALE ---
    
    # B) IMMOBILIZZAZIONI
    cespiti = await db["cespiti"].find(
        {"stato": "attivo"},
        {"_id": 0, "valore_acquisto": 1, "fondo_ammortamento": 1, "categoria": 1}
    ).to_list(1000)
    
    immobilizzazioni_lorde = sum(c.get("valore_acquisto", 0) for c in cespiti)
    fondi_ammortamento = sum(c.get("fondo_ammortamento", 0) for c in cespiti)
    immobilizzazioni_nette = immobilizzazioni_lorde - fondi_ammortamento
    
    # C.I) RIMANENZE (dal magazzino)
    rimanenze = await db["warehouse_inventory"].aggregate([
        {"$group": {"_id": None, "totale": {"$sum": {"$multiply": ["$quantita", "$prezzo_medio"]}}}}
    ]).to_list(1)
    valore_rimanenze = rimanenze[0]["totale"] if rimanenze else 0
    
    # C.IV) DISPONIBILITÀ LIQUIDE
    # Dalla prima nota cassa e banca
    cassa = await db["prima_nota_cassa"].aggregate([
        {"$match": {"anno": anno}},
        {"$group": {"_id": None, "saldo": {"$sum": "$importo"}}}
    ]).to_list(1)
    saldo_cassa = cassa[0]["saldo"] if cassa else 0
    
    banca = await db["prima_nota_banca"].aggregate([
        {"$match": {"anno": anno}},
        {"$group": {"_id": None, "saldo": {"$sum": "$importo"}}}
    ]).to_list(1)
    saldo_banca = banca[0]["saldo"] if banca else 0
    
    disponibilita_liquide = saldo_cassa + saldo_banca
    
    # TOTALE ATTIVO
    totale_attivo = immobilizzazioni_nette + valore_rimanenze + disponibilita_liquide
    
    # --- PASSIVO ---
    
    # C) TFR
    tfr = await db["employees"].aggregate([
        {"$group": {"_id": None, "totale": {"$sum": "$tfr_accantonato"}}}
    ]).to_list(1)
    fondo_tfr = tfr[0]["totale"] if tfr else 0
    
    # D) DEBITI v/fornitori
    fatture_da_pagare = await db["invoices"].aggregate([
        {"$match": {"pagata": {"$ne": True}, "invoice_date": {"$regex": f"^{anno}"}}},
        {"$group": {"_id": None, "totale": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    debiti_fornitori = fatture_da_pagare[0]["totale"] if fatture_da_pagare else 0
    
    # TOTALE PASSIVO (senza PN)
    totale_debiti = fondo_tfr + debiti_fornitori
    
    # A) PATRIMONIO NETTO (per differenza - semplificato)
    patrimonio_netto = totale_attivo - totale_debiti
    
    # --- CONTO ECONOMICO ---
    
    # A) VALORE DELLA PRODUZIONE
    # A.1 Ricavi da corrispettivi
    corrispettivi = await db["corrispettivi"].aggregate([
        {"$match": {"data": {"$regex": f"^{anno}"}}},
        {"$group": {"_id": None, "totale": {"$sum": "$totale"}}}
    ]).to_list(1)
    ricavi_corrispettivi = corrispettivi[0]["totale"] if corrispettivi else 0
    
    # B) COSTI DELLA PRODUZIONE
    # B.6 Acquisti
    acquisti = await db["invoices"].aggregate([
        {"$match": {"invoice_date": {"$regex": f"^{anno}"}}},
        {"$group": {"_id": None, "totale": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    costi_acquisti = acquisti[0]["totale"] if acquisti else 0
    
    # B.9 Costi personale
    costi_personale = await db["cedolini"].aggregate([
        {"$match": {"anno": anno}},
        {"$group": {"_id": None, "totale": {"$sum": "$costo_azienda"}}}
    ]).to_list(1)
    totale_personale = costi_personale[0]["totale"] if costi_personale else 0
    
    # Se non ci sono cedolini, stima da prima_nota_salari
    if totale_personale == 0:
        salari = await db["prima_nota_salari"].aggregate([
            {"$match": {"anno": anno}},
            {"$group": {"_id": None, "totale": {"$sum": "$importo"}}}
        ]).to_list(1)
        totale_personale = salari[0]["totale"] if salari else 0
    
    # B.10 Ammortamenti
    ammortamenti = await db["movimenti_contabili"].aggregate([
        {"$match": {"anno": anno, "tipo": "ammortamento"}},
        {"$group": {"_id": None, "totale": {"$sum": "$importo"}}}
    ]).to_list(1)
    totale_ammortamenti = ammortamenti[0]["totale"] if ammortamenti else 0
    
    # Totale costi produzione
    totale_costi = costi_acquisti + totale_personale + totale_ammortamenti
    
    # RISULTATO OPERATIVO
    risultato_operativo = ricavi_corrispettivi - totale_costi
    
    # Imposte stimate
    if risultato_operativo > 0:
        ires_stimata = risultato_operativo * ALIQUOTA_IRES / 100
        irap_stimata = risultato_operativo * ALIQUOTA_IRAP / 100
    else:
        ires_stimata = 0
        irap_stimata = 0
    
    # UTILE/PERDITA
    utile_perdita = risultato_operativo - ires_stimata - irap_stimata
    
    return {
        "anno": anno,
        "stato_patrimoniale": {
            "attivo": {
                "B_immobilizzazioni": {
                    "immobilizzazioni_lorde": round(immobilizzazioni_lorde, 2),
                    "fondi_ammortamento": round(-fondi_ammortamento, 2),
                    "immobilizzazioni_nette": round(immobilizzazioni_nette, 2)
                },
                "C_attivo_circolante": {
                    "C_I_rimanenze": round(valore_rimanenze, 2),
                    "C_IV_disponibilita_liquide": {
                        "cassa": round(saldo_cassa, 2),
                        "banca": round(saldo_banca, 2),
                        "totale": round(disponibilita_liquide, 2)
                    }
                },
                "totale_attivo": round(totale_attivo, 2)
            },
            "passivo": {
                "A_patrimonio_netto": round(patrimonio_netto, 2),
                "C_tfr": round(fondo_tfr, 2),
                "D_debiti": {
                    "debiti_fornitori": round(debiti_fornitori, 2)
                },
                "totale_passivo": round(totale_attivo, 2)  # Deve quadrare
            }
        },
        "conto_economico": {
            "A_valore_produzione": {
                "A1_ricavi_vendite": round(ricavi_corrispettivi, 2),
                "totale_A": round(ricavi_corrispettivi, 2)
            },
            "B_costi_produzione": {
                "B6_materie_merci": round(costi_acquisti, 2),
                "B9_personale": round(totale_personale, 2),
                "B10_ammortamenti": round(totale_ammortamenti, 2),
                "totale_B": round(totale_costi, 2)
            },
            "differenza_A_B": round(risultato_operativo, 2),
            "imposte": {
                "ires_stimata": round(ires_stimata, 2),
                "irap_stimata": round(irap_stimata, 2),
                "totale_imposte": round(ires_stimata + irap_stimata, 2)
            },
            "utile_perdita_esercizio": round(utile_perdita, 2)
        },
        "nota": "Bilancio semplificato - Valori stimati"
    }


# ============================================
# ENDPOINT INDICI DI BILANCIO (LEGGERO)
# ============================================

@router.get("/indici/{anno}")
async def indici_bilancio(anno: int) -> Dict[str, Any]:
    """
    Calcola indici di bilancio principali in forma semplificata.
    Per capire a sommi capi la situazione aziendale.
    """
    # Recupera bilancio
    bilancio = await bilancio_civilistico(anno)
    
    sp = bilancio["stato_patrimoniale"]
    ce = bilancio["conto_economico"]
    
    # Valori base
    totale_attivo = sp["attivo"]["totale_attivo"]
    patrimonio_netto = sp["passivo"]["A_patrimonio_netto"]
    debiti = sp["passivo"]["C_tfr"] + sp["passivo"]["D_debiti"]["debiti_fornitori"]
    ricavi = ce["A_valore_produzione"]["totale_A"]
    utile = ce["utile_perdita_esercizio"]
    
    # Disponibilità liquide
    liquidita = sp["attivo"]["C_attivo_circolante"]["C_IV_disponibilita_liquide"]["totale"]
    
    # --- INDICI ---
    
    indici = {
        "anno": anno,
        "redditività": {},
        "solidità": {},
        "liquidità": {},
        "interpretazione": []
    }
    
    # ROE (Return on Equity) = Utile / Patrimonio Netto
    if patrimonio_netto > 0:
        roe = (utile / patrimonio_netto) * 100
        indici["redditività"]["ROE"] = round(roe, 2)
        if roe > 10:
            indici["interpretazione"].append("✅ ROE buono: l'azienda genera buon rendimento sul capitale proprio")
        elif roe > 0:
            indici["interpretazione"].append("⚠️ ROE positivo ma basso: margine di miglioramento")
        else:
            indici["interpretazione"].append("❌ ROE negativo: l'azienda sta perdendo")
    
    # ROS (Return on Sales) = Utile / Ricavi
    if ricavi > 0:
        ros = (utile / ricavi) * 100
        indici["redditività"]["ROS"] = round(ros, 2)
        if ros > 5:
            indici["interpretazione"].append("✅ ROS buono: buon margine sulle vendite")
        elif ros > 0:
            indici["interpretazione"].append("⚠️ ROS basso: margini ridotti")
        else:
            indici["interpretazione"].append("❌ ROS negativo: vendite in perdita")
    
    # Indice di indipendenza finanziaria = PN / Totale Attivo
    if totale_attivo > 0:
        indip = (patrimonio_netto / totale_attivo) * 100
        indici["solidità"]["indipendenza_finanziaria"] = round(indip, 2)
        if indip > 30:
            indici["interpretazione"].append("✅ Buona indipendenza finanziaria")
        else:
            indici["interpretazione"].append("⚠️ Bassa indipendenza: dipendenza da terzi")
    
    # Indice di indebitamento = Debiti / PN
    if patrimonio_netto > 0:
        leverage = debiti / patrimonio_netto
        indici["solidità"]["leverage"] = round(leverage, 2)
        if leverage < 2:
            indici["interpretazione"].append("✅ Indebitamento contenuto")
        else:
            indici["interpretazione"].append("⚠️ Indebitamento elevato")
    
    # Liquidità immediata = Disponibilità liquide / Debiti a breve
    if debiti > 0:
        liq = liquidita / debiti
        indici["liquidità"]["liquidità_immediata"] = round(liq, 2)
        if liq > 1:
            indici["interpretazione"].append("✅ Buona liquidità: può pagare i debiti")
        elif liq > 0.5:
            indici["interpretazione"].append("⚠️ Liquidità sufficiente")
        else:
            indici["interpretazione"].append("❌ Liquidità scarsa: rischio")
    
    return indici


# ============================================
# ENDPOINT BUDGET ECONOMICO
# ============================================

@router.post("/budget")
async def crea_budget(budget: BudgetInput) -> Dict[str, Any]:
    """Crea/aggiorna voce di budget"""
    db = Database.get_db()
    
    record = {
        "id": str(uuid4()),
        "anno": budget.anno,
        "voce": budget.voce,
        "importo_previsto": budget.importo_previsto,
        "importo_consuntivo": 0,
        "scostamento": 0,
        "note": budget.note,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert per voce
    await db["budget"].update_one(
        {"anno": budget.anno, "voce": budget.voce},
        {"$set": record},
        upsert=True
    )
    
    return {
        "success": True,
        "messaggio": f"Budget {budget.voce} per {budget.anno} registrato"
    }


@router.get("/budget/{anno}")
async def get_budget(anno: int) -> Dict[str, Any]:
    """Recupera budget con confronto consuntivo"""
    db = Database.get_db()
    
    # Recupera budget
    budget_items = await db["budget"].find(
        {"anno": anno},
        {"_id": 0}
    ).to_list(100)
    
    # Calcola consuntivi
    bilancio = await bilancio_civilistico(anno)
    ce = bilancio["conto_economico"]
    
    consuntivi = {
        "ricavi_vendite": ce["A_valore_produzione"]["totale_A"],
        "costi_acquisti": ce["B_costi_produzione"]["B6_materie_merci"],
        "costi_personale": ce["B_costi_produzione"]["B9_personale"],
        "ammortamenti": ce["B_costi_produzione"]["B10_ammortamenti"],
        "utile": ce["utile_perdita_esercizio"]
    }
    
    # Aggiorna scostamenti
    for item in budget_items:
        voce = item["voce"]
        if voce in consuntivi:
            item["importo_consuntivo"] = consuntivi[voce]
            item["scostamento"] = item["importo_consuntivo"] - item["importo_previsto"]
            item["scostamento_percent"] = round(
                (item["scostamento"] / item["importo_previsto"] * 100) if item["importo_previsto"] else 0,
                1
            )
    
    return {
        "anno": anno,
        "voci": budget_items,
        "consuntivi_calcolati": consuntivi
    }


# ============================================
# ENDPOINT CONTROLLO DI GESTIONE
# ============================================

@router.get("/controllo-gestione/{anno}")
async def controllo_gestione(anno: int) -> Dict[str, Any]:
    """
    Dashboard controllo di gestione:
    - Margini per centro di costo
    - Break-even stimato
    - Costi variabili vs fissi
    """
    db = Database.get_db()
    
    # Ricavi totali
    bilancio = await bilancio_civilistico(anno)
    ricavi = bilancio["conto_economico"]["A_valore_produzione"]["totale_A"]
    
    # Costi per categoria
    costi_personale = bilancio["conto_economico"]["B_costi_produzione"]["B9_personale"]
    costi_acquisti = bilancio["conto_economico"]["B_costi_produzione"]["B6_materie_merci"]
    ammortamenti = bilancio["conto_economico"]["B_costi_produzione"]["B10_ammortamenti"]
    
    # Stima costi fissi/variabili (semplificata)
    # Fissi: personale + ammortamenti + 20% acquisti (spese generali)
    # Variabili: 80% acquisti (materie prime)
    costi_fissi = costi_personale + ammortamenti + (costi_acquisti * 0.2)
    costi_variabili = costi_acquisti * 0.8
    
    # Margine di contribuzione
    margine_contribuzione = ricavi - costi_variabili
    margine_percent = (margine_contribuzione / ricavi * 100) if ricavi > 0 else 0
    
    # Break-even point
    if margine_percent > 0:
        break_even = costi_fissi / (margine_percent / 100)
    else:
        break_even = 0
    
    # Margine di sicurezza
    margine_sicurezza = ricavi - break_even
    margine_sicurezza_percent = (margine_sicurezza / ricavi * 100) if ricavi > 0 else 0
    
    # Analisi per centro di costo (se disponibile)
    centri_costo = await db["centri_costo"].find({}, {"_id": 0}).to_list(100)
    
    return {
        "anno": anno,
        "ricavi_totali": round(ricavi, 2),
        "analisi_costi": {
            "costi_fissi": round(costi_fissi, 2),
            "costi_variabili": round(costi_variabili, 2),
            "totale_costi": round(costi_fissi + costi_variabili, 2)
        },
        "margine_contribuzione": {
            "importo": round(margine_contribuzione, 2),
            "percentuale": round(margine_percent, 1)
        },
        "break_even_point": {
            "fatturato_minimo": round(break_even, 2),
            "messaggio": f"Devi fatturare almeno €{round(break_even, 0):,.0f} per coprire i costi"
        },
        "margine_sicurezza": {
            "importo": round(margine_sicurezza, 2),
            "percentuale": round(margine_sicurezza_percent, 1),
            "stato": "✅ In utile" if margine_sicurezza > 0 else "❌ Sotto break-even"
        },
        "centri_costo": centri_costo
    }
