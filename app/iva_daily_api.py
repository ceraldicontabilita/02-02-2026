# IVA DAILY DASHBOARD API - DA AGGIUNGERE A server.py

@api_router.get("/iva/daily/{date}")
async def get_iva_daily(date: str, username: str = Depends(get_current_user)):
    """
    IVA giornaliera dettagliata per una specifica data.
    
    Args:
        date: Data in formato YYYY-MM-DD
    
    Returns:
        - IVA a DEBITO: Da corrispettivi XML del giorno (campo "imposta")
        - IVA a CREDITO: Da fatture XML del giorno (scorporata dai prodotti)
        - Saldo giornaliero
        - Lista dettagliata corrispettivi e fatture
    """
    try:
        # IVA A DEBITO - Da Corrispettivi XML
        # Il corrispettivo XML già contiene l'IVA totale del giorno nel campo "imposta"
        corrispettivi = await db.cash_movements.find({
            "user_id": username,
            "date": date,
            "category": "Corrispettivo"
        }, {"_id": 0}).to_list(1000)
        
        iva_debito = sum(c.get('imposta', 0) for c in corrispettivi)
        
        # IVA A CREDITO - Da Fatture XML
        # Calcolo IVA scorporata da ogni prodotto delle fatture del giorno
        fatture = await db.invoices.find({
            "user_id": username,
            "invoice_date": date
        }, {"_id": 0}).to_list(1000)
        
        iva_credito = 0
        fatture_details = []
        
        for fattura in fatture:
            fattura_iva = 0
            products = fattura.get('products', [])
            
            if products and any(p.get('aliquota_iva', 0) > 0 for p in products):
                # Calcola IVA da prodotti
                for product in products:
                    prezzo_tot = product.get('prezzo_totale', 0)
                    aliquota = product.get('aliquota_iva', 0)
                    if aliquota > 0:
                        # IVA scorporata = prezzo_totale - (prezzo_totale / (1 + aliquota/100))
                        iva_prod = prezzo_tot - (prezzo_tot / (1 + aliquota / 100))
                        fattura_iva += iva_prod
            else:
                # Fallback: scorporo IVA 22% dal totale
                total = fattura.get('total_amount', 0)
                fattura_iva = total - (total / 1.22)
            
            iva_credito += fattura_iva
            
            fatture_details.append({
                "invoice_number": fattura.get('invoice_number'),
                "supplier_name": fattura.get('supplier_name'),
                "total_amount": fattura.get('total_amount'),
                "iva": round(fattura_iva, 2)
            })
        
        # Calcola saldo giornaliero
        saldo = iva_debito - iva_credito
        
        return {
            "data": date,
            "iva_debito": round(iva_debito, 2),
            "iva_credito": round(iva_credito, 2),
            "saldo": round(saldo, 2),
            "stato": "Da versare" if saldo > 0 else "A credito" if saldo < 0 else "Pareggio",
            "corrispettivi": {
                "count": len(corrispettivi),
                "items": [
                    {
                        "description": c.get('description', 'Corrispettivo giornaliero'),
                        "imponibile": c.get('imponibile', 0),
                        "imposta": c.get('imposta', 0),
                        "total": c.get('total', 0)
                    }
                    for c in corrispettivi
                ]
            },
            "fatture": {
                "count": len(fatture),
                "items": fatture_details
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Errore calcolo IVA giornaliera: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/iva/monthly-progressive/{year}/{month}")
async def get_iva_monthly_progressive(year: int, month: int, username: str = Depends(get_current_user)):
    """
    IVA progressiva giornaliera per tutto il mese.
    Mostra giorno per giorno l'IVA accumulata.
    
    Returns:
        Lista di 30/31 giorni con:
        - Data
        - IVA debito giornaliera
        - IVA credito giornaliera
        - Saldo giornaliero
        - IVA progressiva (somma da inizio mese)
    """
    try:
        from calendar import monthrange
        
        # Ottieni numero giorni nel mese
        _, num_days = monthrange(year, month)
        
        daily_data = []
        iva_debito_progressiva = 0
        iva_credito_progressiva = 0
        
        for day in range(1, num_days + 1):
            date_str = f"{year}-{month:02d}-{day:02d}"
            
            # IVA DEBITO - Corrispettivi del giorno
            corrispettivi = await db.cash_movements.find({
                "user_id": username,
                "date": date_str,
                "category": "Corrispettivo"
            }, {"_id": 0, "imposta": 1}).to_list(1000)
            
            iva_debito_giorno = sum(c.get('imposta', 0) for c in corrispettivi)
            
            # IVA CREDITO - Fatture del giorno
            fatture = await db.invoices.find({
                "user_id": username,
                "invoice_date": date_str
            }, {"_id": 0}).to_list(1000)
            
            iva_credito_giorno = 0
            for fattura in fatture:
                products = fattura.get('products', [])
                
                if products and any(p.get('aliquota_iva', 0) > 0 for p in products):
                    for product in products:
                        prezzo_tot = product.get('prezzo_totale', 0)
                        aliquota = product.get('aliquota_iva', 0)
                        if aliquota > 0:
                            iva_prod = prezzo_tot - (prezzo_tot / (1 + aliquota / 100))
                            iva_credito_giorno += iva_prod
                else:
                    total = fattura.get('total_amount', 0)
                    iva_credito_giorno += total - (total / 1.22)
            
            # Saldo giornaliero
            saldo_giorno = iva_debito_giorno - iva_credito_giorno
            
            # Progressiva
            iva_debito_progressiva += iva_debito_giorno
            iva_credito_progressiva += iva_credito_giorno
            saldo_progressivo = iva_debito_progressiva - iva_credito_progressiva
            
            daily_data.append({
                "data": date_str,
                "giorno": day,
                "iva_debito": round(iva_debito_giorno, 2),
                "iva_credito": round(iva_credito_giorno, 2),
                "saldo": round(saldo_giorno, 2),
                "iva_debito_progressiva": round(iva_debito_progressiva, 2),
                "iva_credito_progressiva": round(iva_credito_progressiva, 2),
                "saldo_progressivo": round(saldo_progressivo, 2),
                "has_data": iva_debito_giorno > 0 or iva_credito_giorno > 0
            })
        
        return {
            "anno": year,
            "mese": month,
            "mese_nome": datetime(year, month, 1).strftime("%B"),
            "daily_data": daily_data,
            "totale_mensile": {
                "iva_debito": round(iva_debito_progressiva, 2),
                "iva_credito": round(iva_credito_progressiva, 2),
                "saldo": round(iva_debito_progressiva - iva_credito_progressiva, 2)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Errore calcolo progressivo mensile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/iva/today")
async def get_iva_today(username: str = Depends(get_current_user)):
    """
    IVA di OGGI - Shortcut per dashboard.
    Ritorna IVA giornaliera per la data odierna.
    """
    try:
        from datetime import date
        today = date.today().isoformat()
        return await get_iva_daily(today, username)
    except Exception as e:
        logger.error(f"❌ Errore IVA oggi: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SPIEGAZIONE CALCOLO ====================

"""
📊 CALCOLO IVA MENSILE - SPIEGAZIONE DETTAGLIATA

1. IVA A DEBITO (da versare allo Stato):
   ==========================================
   Fonte: CORRISPETTIVI XML giornalieri
   
   Ogni corrispettivo XML ha già il campo "imposta" che contiene l'IVA del giorno.
   
   Esempio Corrispettivo XML del giorno 15/01/2025:
   {
     "date": "2025-01-15",
     "category": "Corrispettivo",
     "imponibile": 1000.00,   // Totale vendite al netto IVA
     "imposta": 220.00,        // IVA del giorno (già calcolata)
     "total": 1220.00          // Totale incassato
   }
   
   IVA DEBITO mensile = SOMMA di tutti i campi "imposta" dei corrispettivi del mese
   
   Gennaio 2025:
   Giorno 1:  IVA €50
   Giorno 2:  IVA €80
   Giorno 3:  IVA €120
   ...
   Giorno 31: IVA €90
   -------------------------
   TOTALE IVA DEBITO GENNAIO = €2,500 (esempio)


2. IVA A CREDITO (da detrarre):
   ==============================
   Fonte: FATTURE XML passive (acquisti)
   
   Ogni fattura XML contiene prodotti con aliquota IVA.
   L'IVA viene scorporata dal prezzo totale di ogni prodotto.
   
   Formula scorporo IVA:
   IVA = Prezzo_Totale - (Prezzo_Totale / (1 + Aliquota/100))
   
   Esempio Fattura del 15/01/2025:
   Prodotto A: €122, IVA 22%
   IVA = 122 - (122 / 1.22) = 122 - 100 = €22
   
   Prodotto B: €244, IVA 22%
   IVA = 244 - (244 / 1.22) = 244 - 200 = €44
   
   IVA fattura = €22 + €44 = €66
   
   IVA CREDITO mensile = SOMMA dell'IVA scorporata da tutte le fatture del mese
   
   Gennaio 2025:
   Fattura 1 (10/01): IVA €66
   Fattura 2 (12/01): IVA €150
   Fattura 3 (20/01): IVA €200
   ...
   -------------------------
   TOTALE IVA CREDITO GENNAIO = €1,200 (esempio)


3. SALDO IVA MENSILE:
   ===================
   SALDO = IVA DEBITO - IVA CREDITO
   
   Gennaio 2025:
   IVA DEBITO:   €2,500 (da corrispettivi)
   IVA CREDITO:  €1,200 (da fatture)
   -------------------------
   SALDO:        €1,300 DA VERSARE allo Stato
   
   Se SALDO > 0 → DA VERSARE (paghi allo Stato)
   Se SALDO < 0 → A CREDITO (Stato ti deve rimborsare)


4. REGOLA 15 GIORNI:
   ==================
   Normativa ADE: Le fatture ricevute entro il 15 del mese successivo
   possono essere registrate nella liquidazione del mese precedente.
   
   Esempio:
   Fattura con data 31/01/2025, ricevuta il 10/02/2025
   → Può essere inclusa nel calcolo IVA di GENNAIO
   
   Fattura con data 31/01/2025, ricevuta il 20/02/2025
   → Va nel calcolo IVA di FEBBRAIO


5. VISUALIZZAZIONE GIORNALIERA:
   ==============================
   Card Dashboard mostra per ogni giorno:
   
   📅 Data: 15/01/2025
   
   IVA a DEBITO:    €220.00  (Corrispettivi del giorno)
   IVA a CREDITO:   €66.00   (Fatture del giorno)
   ─────────────────────────
   SALDO:           €154.00  DA VERSARE
   
   PROGRESSIVA MENSILE (da 1/01 a 15/01):
   IVA DEBITO:      €1,500
   IVA CREDITO:     €600
   SALDO:           €900


6. VISUALIZZAZIONE MENSILE:
   =========================
   Tabella con 12 mesi:
   
   | Mese     | IVA Debito | IVA Credito | Saldo   | Stato      |
   |----------|------------|-------------|---------|------------|
   | Gennaio  | €2,500     | €1,200      | €1,300  | Da versare |
   | Febbraio | €2,800     | €1,500      | €1,300  | Da versare |
   | ...      | ...        | ...         | ...     | ...        |
   |----------|------------|-------------|---------|------------|
   | TOTALE   | €30,000    | €15,000     | €15,000 | Da versare |
"""
