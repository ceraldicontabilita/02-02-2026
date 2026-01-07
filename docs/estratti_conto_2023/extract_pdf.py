import pdfplumber
import pandas as pd
import re
import os

def parse_importo(val):
    """Converte stringa importo in float"""
    if not val or val == '-' or val.strip() == '':
        return None
    val = str(val).replace('.', '').replace(',', '.').strip()
    try:
        return float(val)
    except:
        return None

def extract_movements_from_pdf(pdf_path, output_excel):
    """Estrae tutti i movimenti da un estratto conto PDF"""
    movements = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            
            for table in tables:
                if not table:
                    continue
                    
                for row in table:
                    if not row or len(row) < 4:
                        continue
                    
                    # Cerca righe con date (formato DD/MM/YY)
                    first_cell = str(row[0]).strip() if row[0] else ''
                    
                    # Pattern per data operazione
                    date_pattern = r'\d{2}/\d{2}/\d{2}'
                    
                    if re.match(date_pattern, first_cell):
                        data_op = first_cell
                        data_val = str(row[1]).strip() if len(row) > 1 and row[1] else ''
                        descrizione = str(row[2]).strip() if len(row) > 2 and row[2] else ''
                        
                        # Cerca Dare e Avere nelle colonne successive
                        dare = None
                        avere = None
                        
                        for i in range(3, len(row)):
                            cell = str(row[i]).strip() if row[i] else ''
                            if cell and cell != '-':
                                # Converti in numero
                                importo = parse_importo(cell)
                                if importo is not None:
                                    if dare is None:
                                        dare = importo
                                    else:
                                        avere = importo
                        
                        if data_op:
                            movements.append({
                                'Data Operazione': data_op,
                                'Data Valuta': data_val if re.match(date_pattern, data_val) else '',
                                'Descrizione': descrizione.replace('\n', ' '),
                                'Dare': dare,
                                'Avere': avere
                            })
    
    # Se non ha trovato movimenti con le tabelle, prova con il testo
    if len(movements) < 10:
        movements = []
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
            
            # Pattern per trovare righe di movimento
            lines = full_text.split('\n')
            for line in lines:
                # Cerca linee che iniziano con data
                match = re.match(r'(\d{2}/\d{2}/\d{2})\s+(\d{2}/\d{2}/\d{2})?\s*(.+?)\s+([\d\.,]+)?\s*([\d\.,]+)?$', line)
                if match:
                    data_op = match.group(1)
                    data_val = match.group(2) or ''
                    descrizione = match.group(3).strip()
                    val1 = parse_importo(match.group(4))
                    val2 = parse_importo(match.group(5))
                    
                    movements.append({
                        'Data Operazione': data_op,
                        'Data Valuta': data_val,
                        'Descrizione': descrizione,
                        'Dare': val1,
                        'Avere': val2
                    })
    
    # Crea DataFrame e salva
    df = pd.DataFrame(movements)
    
    # Pulisci i dati
    if not df.empty:
        df['Dare'] = df['Dare'].apply(lambda x: x if x and x > 0 else None)
        df['Avere'] = df['Avere'].apply(lambda x: x if x and x > 0 else None)
    
    df.to_excel(output_excel, index=False, engine='openpyxl')
    return len(movements)

# Processa tutti i PDF
files = [
    ('/app/docs/estratti_conto_2023/EC_Q1.pdf', '/app/docs/estratti_conto_2023/EC_Q1_2023_Gen-Mar.xlsx'),
    ('/app/docs/estratti_conto_2023/EC_Q2.pdf', '/app/docs/estratti_conto_2023/EC_Q2_2023_Apr-Giu.xlsx'),
    ('/app/docs/estratti_conto_2023/EC_Q3.pdf', '/app/docs/estratti_conto_2023/EC_Q3_2023_Lug-Set.xlsx'),
    ('/app/docs/estratti_conto_2023/EC_Q4.pdf', '/app/docs/estratti_conto_2023/EC_Q4_2023_Ott-Dic.xlsx'),
]

for pdf_path, excel_path in files:
    try:
        count = extract_movements_from_pdf(pdf_path, excel_path)
        print(f"✓ {os.path.basename(excel_path)}: {count} movimenti estratti")
    except Exception as e:
        print(f"✗ {os.path.basename(pdf_path)}: Errore - {e}")

print("\nFile creati!")
