"""
Definizione centralizzata delle collezioni MongoDB.
Questo file serve come unica fonte di verità per i nomi delle collezioni.

REGOLA: Ogni router deve importare i nomi delle collezioni da qui.
Non usare mai stringhe hardcoded per i nomi delle collezioni.
"""

# ===========================================
# COLLEZIONI PRINCIPALI
# ===========================================

# Fatture e Fornitori
COLL_INVOICES = "invoices"
COLL_SUPPLIERS = "suppliers"
COLL_FORNITORI = "fornitori"  # Alias italiano

# Estratto Conto Bancario
COLL_ESTRATTO_CONTO = "estratto_conto_movimenti"  # Collezione principale con tutti i movimenti

# F24 e Tributi
# NOTA: Usiamo f24_commercialista come collezione UNICA per tutti gli F24
# Le collezioni f24 e f24_models sono DEPRECATE e verranno migrate
COLL_F24 = "f24_commercialista"  # Collezione principale F24 (schema completo)
COLL_F24_COMMERCIALISTA = "f24_commercialista"  # Alias per retrocompatibilità
COLL_QUIETANZE_F24 = "quietanze_f24"  # Quietanze di pagamento (303 docs)
COLL_F24_ALERTS = "f24_riconciliazione_alerts"

# Dipendenti e Cedolini
# NOTA: employees è la collezione UNICA per i dipendenti
# anagrafica_dipendenti è DEPRECATA (tutti i dati sono già in employees)
COLL_EMPLOYEES = "employees"  # Collezione principale dipendenti (34 dipendenti)
COLL_CEDOLINI = "cedolini"  # Buste paga (1873 cedolini)
COLL_BONIFICI_STIPENDI = "bonifici_stipendi"  # Bonifici stipendi (736 bonifici)
COLL_GIUSTIFICATIVI = "giustificativi"  # Permessi/ferie (25 giustificativi)

# Magazzino
# NOTA: warehouse_inventory è la collezione UNICA per i prodotti
# warehouse_stocks è DEPRECATA (contiene dati errati)
COLL_WAREHOUSE = "warehouse_inventory"  # Collezione principale (5372 prodotti)
COLL_WAREHOUSE_MOVEMENTS = "warehouse_movements"  # Movimenti magazzino (3670 movimenti)
COLL_ACQUISTI_PRODOTTI = "acquisti_prodotti"  # Log acquisti da fatture (15065 record)
COLL_RICETTE = "ricette"
COLL_LOTTI_PRODUZIONE = "lotti_produzione"

# Contabilità
COLL_PRIMA_NOTA_CASSA = "prima_nota_cassa"
COLL_PRIMA_NOTA_BANCA = "prima_nota_banca"
COLL_CORRISPETTIVI = "corrispettivi"

# Documenti
COLL_DOCUMENTI_EMAIL = "documenti_email"
COLL_DOCUMENTI_CLASSIFICATI = "documenti_classificati"  # Documenti classificati dalla Learning Machine

# Learning Machine
COLL_LEARNING_FEEDBACK = "learning_feedback"  # Feedback utente per correzioni classificazione
COLL_LEARNING_RULES = "learning_rules"  # Regole apprese dal sistema

# Noleggio Auto
COLL_VEICOLI_NOLEGGIO = "veicoli_noleggio"
COLL_VERBALI_NOLEGGIO = "verbali_noleggio"

# ===========================================
# QUERY PATTERNS COMUNI
# ===========================================

# Pattern per identificare pagamenti F24 nell'estratto conto
QUERY_F24_PATTERN = {
    "$or": [
        {"descrizione_originale": {"$regex": "I24.*AGENZIA", "$options": "i"}},
        {"descrizione_originale": {"$regex": "AGENZIA.*ENTRATE", "$options": "i"}},
        {"descrizione_originale": {"$regex": "F24", "$options": "i"}},
        {"categoria": {"$regex": "Tasse|Imposte|Tributi|F24", "$options": "i"}}
    ]
}

# Pattern per identificare stipendi nell'estratto conto
QUERY_STIPENDI_PATTERN = {
    "$or": [
        {"descrizione_originale": {"$regex": "STIP", "$options": "i"}},
        {"descrizione_originale": {"$regex": "SALARIO", "$options": "i"}},
        {"categoria": {"$regex": "Stipendi|Personale", "$options": "i"}}
    ]
}

# Pattern per identificare assegni
QUERY_ASSEGNI_PATTERN = {
    "descrizione_originale": {"$regex": "ASSEGNO.*N\\.", "$options": "i"}
}


# ===========================================
# COLLEZIONI DEPRECATE (non usare)
# ===========================================
# Le seguenti collezioni sono state sostituite o sono vuote:
# - "f24" -> DEPRECATA, usare COLL_F24 (f24_commercialista)
# - "f24_models" -> DEPRECATA, usare COLL_F24 (f24_commercialista)
# - "movimenti_f24_banca" -> vuota, usare COLL_ESTRATTO_CONTO con QUERY_F24_PATTERN
# - "estratto_conto" -> vecchia versione, usare COLL_ESTRATTO_CONTO (estratto_conto_movimenti)
# - "warehouse_stocks" -> DEPRECATA, contiene dati errati, usare COLL_WAREHOUSE (warehouse_inventory)
