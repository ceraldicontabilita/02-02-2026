# 📚 REGOLE CONTABILI COMPLETE - ERP CERALDI

**Versione:** 1.0 - 4 Febbraio 2026

---

## 🎯 STRUTTURA DEL SISTEMA

Il sistema di categorizzazione contabile è composto da:

1. **PATTERNS DESCRIZIONE** - Regole basate sul testo della descrizione prodotto
2. **PATTERNS FORNITORE** - Regole basate sul nome fornitore
3. **PIANO DEI CONTI** - Mappatura codice → descrizione conto
4. **CATEGORIE** - Mappatura categoria → conto + deducibilità

---

## 📋 PIANO DEI CONTI COSTI (05.xx.xx)

### COSTI ACQUISTI (05.01.xx)

| Codice | Nome | Deducibilità IRES | Deducibilità IRAP |
|--------|------|-------------------|-------------------|
| 05.01.01 | Acquisto merci | 100% | 100% |
| 05.01.02 | Acquisto materie prime | 100% | 100% |
| 05.01.03 | Acquisto bevande alcoliche | 100% | 100% |
| 05.01.04 | Acquisto bevande analcoliche | 100% | 100% |
| 05.01.05 | Acquisto prodotti alimentari | 100% | 100% |
| 05.01.06 | Acquisto piccola utensileria | 100% | 100% |
| 05.01.07 | Materiali di consumo e imballaggio | 100% | 100% |
| 05.01.08 | Prodotti per pulizia e igiene | 100% | 100% |
| 05.01.09 | Acquisto caffè e affini | 100% | 100% |
| 05.01.10 | Acquisto surgelati | 100% | 100% |
| 05.01.11 | Acquisto prodotti da forno | 100% | 100% |
| 05.01.12 | Materiale edile e costruzioni | 100% | 100% |
| 05.01.13 | Additivi e ingredienti alimentari | 100% | 100% |

### COSTI SERVIZI (05.02.xx)

| Codice | Nome | Deducibilità IRES | Deducibilità IRAP | Note |
|--------|------|-------------------|-------------------|------|
| 05.02.01 | Costi per servizi | 100% | 100% | Generico |
| 05.02.02 | Utenze (luce, gas, acqua) | 100% | 100% | Generico |
| 05.02.03 | Canoni di locazione | 100% | 100% | Affitto immobili |
| 05.02.04 | Utenze - Acqua | 100% | 100% | |
| 05.02.05 | Utenze - Energia elettrica | 100% | 100% | |
| 05.02.06 | Utenze - Gas | 100% | 100% | |
| 05.02.07 | Telefonia e comunicazioni | **80%** | **80%** | Art. 102 TUIR |
| 05.02.08 | Software e servizi cloud | 100% | 100% | |
| 05.02.09 | Noleggi e locazioni operative | 100% | 100% | Beni strumentali |
| 05.02.10 | Manutenzioni e riparazioni | 100% | 100% | Max 5% beni ammortizzabili |
| 05.02.11 | Carburanti e lubrificanti | **20%** | **20%** | Auto promiscuo |
| 05.02.12 | Consulenze e prestazioni professionali | 100% | 100% | |
| 05.02.13 | Assicurazioni | 100% | 100% | |
| 05.02.14 | Pubblicità e marketing | 100% | 100% | |
| 05.02.15 | Omaggi e spese promozionali | 100% | 100% | |
| 05.02.16 | Trasporti su acquisti | 100% | 100% | |
| 05.02.17 | Spese viaggio e trasferte | 100% | 100% | |
| 05.02.18 | Spese di rappresentanza | **75%** | 100% | Limiti su fatturato |
| 05.02.19 | Spese postali | 100% | 100% | |
| 05.02.20 | Spese condominiali | 100% | 100% | |
| 05.02.21 | Diritti SIAE e licenze | 100% | 100% | |
| 05.02.22 | Noleggio automezzi | **20%** | **20%** | Limiti annui €3.615,20 |
| 05.02.23 | Canoni e abbonamenti | 100% | 100% | |
| 05.02.24 | Arredi e tappezzeria | 100% | 100% | |

### COSTI PERSONALE (05.03.xx)

| Codice | Nome | Deducibilità |
|--------|------|--------------|
| 05.03.01 | Salari e stipendi | 100% |
| 05.03.02 | Contributi previdenziali | 100% |
| 05.03.03 | Accantonamento TFR | 100% |
| 05.03.04 | Altri costi del personale | 100% |
| 05.03.05 | Buoni pasto dipendenti | 100% |

### ONERI FINANZIARI (05.05.xx)

| Codice | Nome | Note |
|--------|------|------|
| 05.05.01 | Interessi passivi | Limiti ROL |
| 05.05.02 | Spese e commissioni bancarie | 100% |

---

## 🔍 REGOLE CATEGORIZZAZIONE PER FORNITORE

### Bevande Alcoliche → 05.01.03
```
distilleria, distillerie, tanqueray, campari, martini rossi,
drink up, coop eureka, asprinio, enoteca, cantina, vinicol,
feudi di san gregorio, umani ronchi, bortolomiol, collefasani,
giordano vini, gasatissima, free srls, gruppo martellozzo
```

### Caffè → 05.01.09
```
kimbo, lavazza, illy, segafredo, costadoro, torrefazione,
foodness, domori
```

### Surgelati → 05.01.10
```
master frost, mister frost, surgela, frigori
```

### Pasticceria → 05.01.11
```
dolciaria, acquaviva, pasticceria, perfetti van melle,
amarelli, venchi, pastiglie leone, mondo senza glutine,
sweet drink, gb food, panetter, panificio, duegi
```

### Alimentari Generici → 05.01.05
```
g.i.a.l, generale ingrosso alimentar, ap commerciale,
ingrosso alimentar, big food, sud ingrosso, rondinella market,
saima, cozzolino, nasti group, di cosmo, cilatte, europa 23,
carini, san carlo, barilla, ferrero, mulino, galbani,
siro srl, flli sommella, flli fiorentino, granzuccheri,
olive miraglia, eurouova, df baldassarre, carni de,
lubrano, varriale
```

### Bevande Analcoliche → 05.01.04
```
ingrosso bibite, cinoglosso
```

### Pulizia → 05.01.08
```
langellotti, gtm detersivi, tommasino, anthirat, pest,
r.t.a. romana, pest west
```

### Imballaggi → 05.01.07
```
carta party, artecarta, alfa service, carpino, mautoneone,
ste.cla, sanson cart, m&g distribuzione
```

### Ferramenta → 05.01.06
```
wuerth, wurth, berner, leroy merlin, bricofer, obi, brico,
ferramenta flli leo, icommerce, fla srl, flli casolaro,
imperatore hotellerie, vemo hotellerie, ristosubito,
priolinox, van berkel, spillatura, novacqua, metro italia,
magma srl, amazon business, amazon eu, electronics house,
mediamarket, r-store, tufano teresa, vidoelettronica,
enzo led, any lamp, daedalustech, gruppo adam, microtecnica,
divise divise, skechers, lemiro
```

### Materiale Edile → 05.01.12
```
buonaiuto, scaramuzza, stabium, termoidraulica, ferlam,
cmt srl, le.fer, ceramiche mara, arredotop, f.covone
```

### Manutenzione → 05.02.10
```
climaria, freddo caldo, timas ascensori, monals, ifi sud,
punto a srl
```

### Utenze Elettricità → 05.02.05
```
enel, edison, a2a, iren, sorgenia
```

### Utenze Gas → 05.02.06
```
eni gas, eni plenitude, italgas
```

### Utenze Acqua → 05.02.04
```
abc acqua, acquedotto
```

### Telefonia → 05.02.07
```
tim, telecom, vodafone, wind, fastweb
```

### Software/Cloud → 05.02.08
```
google, microsoft, amazon aws, azure
```

### Canoni/Abbonamenti → 05.02.23
```
hp italy, hp instant ink, fattura24, invoicex, tnx srl,
cromo srl, madbit, infocert, aruba, register, legalmail
```

### Assicurazioni → 05.02.13
```
assicuraz, unipol, generali, allianz, axa
```

### Consulenze → 05.02.12
```
commercialista, studio legale, studio notarile,
aniello limone, de juliis, da.dif, infocamere, today service
```

### Diritti SIAE → 05.02.21
```
s.i.a.e., siae
```

### Pubblicità → 05.02.14
```
targhetdirect, cartelli, insegn, subito.it, manzoni,
paraiso, sponsoriz
```

### Trasporti → 05.02.16
```
campania 2, autostrad, telepass, parking, adr mobility
```

### Noleggio Auto → 05.02.22
```
arval, leasys, ald automotive, service lease
```

### Buoni Pasto → 05.03.05
```
edenred, sodexo, ticket restaurant
```

### Spese Bancarie → 05.05.02
```
tecmarket, satispay, sumup, nexi
```

### Rappresentanza → 05.02.18
```
vi.ma. srl, mensa, pranzo aziendale
```

### Tappezzeria → 05.02.24
```
tappezzer, tendaggi, covino
```

### Birra → 05.01.03
```
peroni, heineken, carlsberg, ab inbev, top spina
```

---

## 🔍 REGOLE CATEGORIZZAZIONE PER DESCRIZIONE

### Bevande Alcoliche (patterns)
```regex
limoncello, amaro, grappa, vodka, rum, whisky, gin, cognac,
brandy, liquore, aperitivo, vermut, vermouth, sambuca, nocino,
digestivo, distillat, spirit, cocktail, tonic, %vol,
vino, birra, prosecco, champagne, spumante, falanghina,
aglianico, fiano, greco di tufo, verdicchio, gewurztraminer,
pecorino igt, valpolicella, ripasso, docg, igt, millesimato,
extra brut, extra dry
```

### Bevande Analcoliche
```regex
acqua minerale/naturale/frizzante/tonica, succo, aranciata,
cola, the freddo, energy drink, limonata, gassosa, bibita,
bevanda, red bull, monster energy
```

### Alimentari
```regex
pasta, riso, farina, pane, pizza, formaggio, mozzarella,
prosciutto, salame, carne, pesce, verdur, frutta, zucchero,
sale, latte, burro, uova, tarall, alimentar, food, cibo,
snack, patatine, rosette, panin, olio extravergine
```

### Caffè
```regex
caffe, espresso, ginseng, capsul, ciald
```

### Surgelati
```regex
surgelat, congelat, frozen
```

### Pasticceria
```regex
cornetto, brioche, croissant, dolce, torta, cioccolat,
crema, biscott, merendina, sfogliat
```

### Utenze Acqua
```regex
fornitura [0-9]+, consumo idrico/acqua, acquedotto,
servizio idrico, acque spa, acqua bene comune, abc acqua
```

### Utenze Elettricità
```regex
energia elettrica, luce, enel, edison, a2a, iren, hera,
sorgenia, eni gas luce, consumo elettrico/energia, kwh,
potenza impegnata
```

### Utenze Gas
```regex
gas naturale/metano, eni gas, italgas, smc, consumo gas,
riscaldamento gas, metano
```

### Telefonia (80% deducibile)
```regex
tim, vodafone, wind, fastweb, telecom, telefon, mobile, sim,
roaming, adsl, fibra, internet, connettivit, dati mobili,
voip, centralino, wi-fi
```

### Carburante (20% se auto promiscuo)
```regex
benzina, gasolio, diesel, carburant, rifornimento,
eni station, q8, tamoil, ip station, total erg, esso, shell
```

### Manutenzione
```regex
manutenz, riparaz, assistenza tecnica, intervento, ricamb,
spare parts, sostituz, ripristino, revisione,
canone manutenzione, controllo semestrale, uscita tecnica,
ascensor, estintore
```

### Ferramenta/Utensileria
```regex
lama, vite, bullone, dado, nastro, fascetta, utensil, attrezz,
chiave, cacciavite, martello, pinza, trapano, sega, wuerth,
berner, wurth, cerniere, silicone, bicchier rock, teiera,
ramekin, souffle, piatto pizza, vassoio, posate, cucchiai,
forchett, coltell tavola, portaposate, pedana aliment,
pile aa/aaa/stilo, cavo hdmi/usb/lightning, mouse, tastiera,
led faro, lampada led, alimentatore
```

### Imballaggi
```regex
borsa, busta, sacchetto, imballag, carta, cartone, scatol,
confezione, pellicola, vaschett, contenitor, packaging,
tovagliolo, tovagliett, piatti pian, coppett, rotoli termico/cassa
```

### Spese Bancarie
```regex
commissione, spese gestione/incasso/bonifico,
interessi passiv/bancari, canone c/c, servizio bancario,
pos fee/mensile, rid, canone mensile pos, comm % tecnica,
pagobcm, satispay, sumup, nexi
```

### Consulenze
```regex
consulen, commercialista, avvocato, notaio, professionista,
parcella, onorario, assistenza legale/fiscale/contabile
```

### Assicurazioni
```regex
assicuraz, polizza, premio assicurativo/annuo, rca, kasko,
furto incendio, rc professionale
```

### Pubblicità
```regex
pubblicit, marketing, promoz, spot, inserzione, banner,
social media, adv, campagna, volantino, brochure, gadget
```

---

## ⚠️ REGOLE SPECIALI DEDUCIBILITÀ

### Telefonia (Art. 102 TUIR)
- **IRES:** 80%
- **IRAP:** 80%
- **Conto:** 05.02.07

### Carburante Auto Promiscuo
- **IRES:** 20%
- **IRAP:** 20%
- **Conto:** 05.02.11
- **Note:** 100% se veicolo strumentale

### Noleggio Auto (Art. 164 TUIR)
- **IRES:** 20%
- **IRAP:** 20%
- **Conto:** 05.02.22
- **Limite annuo:** €3.615,20

### Spese di Rappresentanza
- **IRES:** 75%
- **IRAP:** 100%
- **Conto:** 05.02.18
- **Limiti:** % su fatturato

### Manutenzione Ordinaria
- **IRES:** 100% fino al 5% dei beni ammortizzabili
- **Eccedenza:** Deducibile in 5 anni
- **Conto:** 05.02.10

---

## 🛠️ ENDPOINT API

### Regole Categorizzazione
```
GET  /api/regole/download-regole       → Scarica Excel con tutte le regole
POST /api/regole/upload-regole         → Carica Excel con regole aggiornate
GET  /api/regole/export-json           → Esporta regole in JSON
GET  /api/regole/stats                 → Statistiche regole
GET  /api/regole/all                   → Tutte le regole (fornitori + descrizioni)
POST /api/regole/regole/fornitore      → Aggiungi regola fornitore
POST /api/regole/regole/descrizione    → Aggiungi regola descrizione
DELETE /api/regole/regole/{tipo}/{pattern} → Elimina regola
POST /api/regole/categorie             → Aggiorna categoria
```

### Database Collections
```
regole_categorizzazione_fornitori   → Regole per nome fornitore
regole_categorizzazione_descrizioni → Regole per descrizione prodotto
regole_categorie                    → Categorie con deducibilità
```

---

## 📝 COMANDI PER EMERGENT

### Aggiungere nuova regola fornitore
```python
await db["regole_categorizzazione_fornitori"].insert_one({
    "id": str(uuid.uuid4()),
    "pattern": "nome_fornitore",
    "categoria": "categoria_merceologica",
    "note": "Descrizione",
    "tipo": "fornitore",
    "created_at": datetime.utcnow().isoformat(),
    "attivo": True
})
```

### Aggiungere nuova regola descrizione
```python
await db["regole_categorizzazione_descrizioni"].insert_one({
    "id": str(uuid.uuid4()),
    "pattern": "parola_chiave",
    "categoria": "categoria_merceologica",
    "note": "Descrizione",
    "tipo": "descrizione",
    "created_at": datetime.utcnow().isoformat(),
    "attivo": True
})
```

### Modificare deducibilità categoria
```python
await db["regole_categorie"].update_one(
    {"categoria": "telefonia"},
    {"$set": {
        "conto": "05.02.07",
        "deducibilita_ires": 80,
        "deducibilita_irap": 80
    }}
)
```

---

## 🔧 FILE SORGENTE

Le regole sono definite in:
- `/app/services/categorizzazione_contabile.py` - Regole hardcoded (1153 righe)
- `/app/routers/accounting/regole_categorizzazione.py` - API gestione regole
- Database MongoDB → Collections `regole_*`

---

**Documento generato:** 4 Febbraio 2026
