# Azienda ERP (pulita)

## Avvio backend
1) Crea `.env` partendo da `.env.example`
2) Installa dipendenze:
```bash
pip install -r requirements.txt
```
3) Avvia:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Note
- Codice ripulito: rimossi cache, backup, documenti, node_modules.
- Package backend rinominato in `app/`.


## Frontend (React + Vite)

Avvio rapido:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Apri: http://localhost:5173

Il frontend usa proxy Vite verso `/api` (backend su porta 8000).
