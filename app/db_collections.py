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
COLL_F24_COMMERCIALISTA = "f24_commercialista"  # F24 ricevuti dal commercialista (46 docs)
COLL_F24_MODELS = "f24_models"  # F24 parsati da PDF (68 docs)
COLL_QUIETANZE_F24 = "quietanze_f24"  # Quietanze di pagamento (303 docs)
COLL_F24_ALERTS = "f24_riconciliazione_alerts"

# Dipendenti e Cedolini
COLL_EMPLOYEES = "employees"
COLL_ANAGRAFICA_DIPENDENTI = "anagrafica_dipendenti"
COLL_CEDOLINI = "cedolini"
COLL_BONIFICI_STIPENDI = "bonifici_stipendi"
COLL_GIUSTIFICATIVI = "giustificativi"

# Magazzino
COLL_WAREHOUSE_STOCKS = "warehouse_stocks"
COLL_MOVIMENTI_MAGAZZINO = "movimenti_magazzino"
COLL_RICETTE = "ricette"
COLL_LOTTI_PRODUZIONE = "lotti_produzione"

# Contabilità
COLL_PRIMA_NOTA_CASSA = "prima_nota_cassa"
COLL_PRIMA_NOTA_BANCA = "prima_nota_banca"
COLL_CORRISPETTIVI = "corrispettivi"

# Documenti
COLL_DOCUMENTI_EMAIL = "documenti_email"
COLL_DOCUMENTI_CLASSIFICATI = "documenti_classificati"

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
# - "f24" -> usare COLL_F24_COMMERCIALISTA o COLL_F24_MODELS
# - "movimenti_f24_banca" -> vuota, usare COLL_ESTRATTO_CONTO con QUERY_F24_PATTERN
# - "estratto_conto" -> vecchia versione, usare COLL_ESTRATTO_CONTO
