Prd – Tech Recon Accounting System (super Articolato)
Product Requirements Document (PRD)
TechRecon Accounting System – Versione Super Articolata
1. Obiettivo del sistema

Costruire un sistema contabile che:

sia conforme alla normativa italiana,

riduca l’errore umano,

renda ogni numero difendibile,

cresca senza introdurre incoerenze.

2. Modello di controllo a cascata

Anagrafiche

Documenti

Regole decisionali

Prima Nota

Riconciliazione

Controlli trasversali

Un errore a monte invalida i livelli successivi.

3. Validatori automatici
P0 – Bloccanti

Fornitore senza metodo pagamento

Metodo ≠ contanti senza IBAN

Documento senza anagrafica valida

Movimento contabile senza documento

Salari post luglio 2018 pagati in contanti

P1 – Critici

Differenza tra cedolino e bonifico

Metodo pagamento misto

Pagamenti parziali

P2 – Informativi

Dati anagrafici incompleti non critici

IBAN multipli non consolidati

4. Ciclo Passivo

Import XML

Aggiornamento anagrafica fornitore

Metodo pagamento da anagrafica

Scrittura deterministica in prima nota

5. Gestione Dipendenti e Salari

Import cedolini

Import bonifici

Calcolo differenze

Evidenziazione differenze

Saldo differenze aggregato

6. Prima Nota

Cassa e Banca separate

Saldi per anno

Riporto automatico

Immutabilità delle scritture

7. Riconciliazione

Bancaria

Salari

F24

Ogni riconciliazione chiude il ciclo documentale.

8. Matrice di rischio fiscale
Livello	Rischio
Anagrafiche	Altissimo
Documenti	Alto
Regole	Altissimo
Prima Nota	Critico
Riconciliazione	Medio
9. Test funzionali (concettuali, non esecutivi)
Test P0

Import fattura senza metodo pagamento → BLOCCO

Pagamento salari non conforme → BLOCCO

Test P1

Cedolino ≠ bonifico → ALERT + saldo differenze

Test P2

IBAN multipli → LOG

10. Scalabilità

Si scala:

aggiungendo fonti di input,

non modificando la contabilità,

rafforzando i controlli.

11. Clausola finale

Questo PRD è vincolante.

Ogni sviluppo futuro deve:

rispettare i validatori,

non introdurre eccezioni silenziose,

mantenere la tracciabilità completa.