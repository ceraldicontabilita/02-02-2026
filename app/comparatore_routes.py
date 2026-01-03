"""
Routes for the Comparatore Prezzi (Price Comparison) module
Handles XML invoice uploads, product mapping, price comparison, and cart management
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import xmltodict
from emergentintegrations.llm.chat import LlmChat, UserMessage
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re
from collections import defaultdict

# Setup logger
logger = logging.getLogger("comparatore")

# MongoDB connection - will be set in main server.py
db = None

def set_database(database):
    """Set the database reference from main server"""
    global db
    db = database

# Router for price comparison endpoints
comparatore_router = APIRouter(prefix="/api/comparatore", tags=["comparatore"])

# Models
class InvoiceComparatore(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    supplier_name: str
    supplier_phone: Optional[str] = None
    supplier_email: Optional[str] = None
    supplier_iban: Optional[str] = None
    invoice_number: str
    invoice_date: str
    total_amount: float
    products: List[Dict[str, Any]]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductComparatore(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_description: str
    normalized_name: Optional[str] = None
    price: float
    quantity: float
    unit: str
    supplier_name: str
    invoice_id: str
    invoice_number: str
    vat_rate: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CartItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    normalized_name: str
    original_description: str
    supplier_name: str
    price: float
    quantity: float
    unit: str
    invoice_number: str
    vat_rate: Optional[float] = None
    selected: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MapProductRequest(BaseModel):
    product_id: str
    original_description: str

class AddToCartRequest(BaseModel):
    product_id: str
    normalized_name: str
    original_description: str
    supplier_name: str
    price: float
    quantity: float
    unit: str
    invoice_number: str
    vat_rate: Optional[float] = None

class SendEmailRequest(BaseModel):
    recipient_email: str
    cart_items: List[Dict[str, Any]]

class ExcludeSupplierRequest(BaseModel):
    supplier_name: str
    excluded: bool

# Helper Functions
def parse_fatturapa_xml(xml_content: str) -> Dict[str, Any]:
    """Parse FatturaPA XML and extract relevant data"""
    try:
        data = xmltodict.parse(xml_content)
        
        # Try different namespace variations
        fattura = None
        for key in data.keys():
            if 'FatturaElettronica' in key:
                fattura = data[key]
                break
        
        if not fattura:
            fattura = {}
        
        fattura_header = fattura.get('FatturaElettronicaHeader', {})
        fattura_body = fattura.get('FatturaElettronicaBody', {})
        
        # Extract supplier info
        cedente = fattura_header.get('CedentePrestatore', {})
        dati_anagrafici = cedente.get('DatiAnagrafici', {})
        anagrafica = dati_anagrafici.get('Anagrafica', {})
        contatti = cedente.get('Contatti', {})
        sede = cedente.get('Sede', {})
        
        # Handle both company (Denominazione) and person (Nome + Cognome)
        supplier_name = anagrafica.get('Denominazione')
        if not supplier_name:
            nome = anagrafica.get('Nome', '')
            cognome = anagrafica.get('Cognome', '')
            if nome or cognome:
                supplier_name = f"{nome} {cognome}".strip()
            else:
                supplier_name = 'Unknown Supplier'
        
        supplier_phone = contatti.get('Telefono') if contatti else None
        supplier_email = contatti.get('Email') if contatti else None
        
        # Extract IBAN from DatiPagamento
        dati_pagamento = fattura_body.get('DatiPagamento', {})
        if isinstance(dati_pagamento, list):
            dati_pagamento = dati_pagamento[0] if dati_pagamento else {}
        dettaglio_pagamento = dati_pagamento.get('DettaglioPagamento', {})
        if isinstance(dettaglio_pagamento, list):
            dettaglio_pagamento = dettaglio_pagamento[0] if dettaglio_pagamento else {}
        supplier_iban = dettaglio_pagamento.get('IBAN', None)
        
        # Extract address info
        supplier_indirizzo = sede.get('Indirizzo', '')
        supplier_cap = sede.get('CAP', '')
        supplier_comune = sede.get('Comune', '')
        supplier_provincia = sede.get('Provincia', '')
        
        # Extract VAT/Tax ID
        supplier_partita_iva = dati_anagrafici.get('IdFiscaleIVA', {}).get('IdCodice', '')
        
        # Extract invoice details
        dati_generali = fattura_body.get('DatiGenerali', {})
        dati_generali_doc = dati_generali.get('DatiGeneraliDocumento', {})
        
        invoice_number = dati_generali_doc.get('Numero', 'N/A')
        invoice_date = dati_generali_doc.get('Data', 'N/A')
        total_amount = float(dati_generali_doc.get('ImportoTotaleDocumento', 0))
        
        # Extract products
        dati_beni = fattura_body.get('DatiBeniServizi', {})
        dettaglio_linee = dati_beni.get('DettaglioLinee', [])
        
        # Ensure dettaglio_linee is a list
        if isinstance(dettaglio_linee, dict):
            dettaglio_linee = [dettaglio_linee]
        
        products = []
        for linea in dettaglio_linee:
            vat_raw = linea.get('AliquotaIVA')
            try:
                vat_rate = float(vat_raw) if vat_raw is not None else None
            except Exception:
                vat_rate = None

            product = {
                'descrizione': linea.get('Descrizione', 'No description'),
                'quantity': float(linea.get('Quantita', 1)),
                'unit': linea.get('UnitaMisura', 'pz'),
                'unit_price': float(linea.get('PrezzoUnitario', 0)),
                'total_price': float(linea.get('PrezzoTotale', 0)),
                'vat_rate': vat_rate
            }
            products.append(product)
        
        return {
            'supplier_name': supplier_name,
            'supplier_phone': supplier_phone,
            'supplier_email': supplier_email,
            'supplier_iban': supplier_iban,
            'supplier_indirizzo': supplier_indirizzo,
            'supplier_cap': supplier_cap,
            'supplier_comune': supplier_comune,
            'supplier_provincia': supplier_provincia,
            'supplier_partita_iva': supplier_partita_iva,
            'invoice_number': invoice_number,
            'invoice_date': invoice_date,
            'total_amount': total_amount,
            'products': products
        }
    except Exception as e:
        logger.error(f"Error parsing XML: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid FatturaPA XML: {str(e)}")

def clean_normalized_name(name: str) -> str:
    """Clean normalized product name: remove pack size info like '96PZ' at the end."""
    try:
        if not name:
            return name
        # Normalize whitespace
        name = re.sub(r"\s+", " ", name).strip()
        # Remove trailing pack-size patterns (e.g., '96PZ', '96 PZ', '96 PEZZI')
        pattern = r"(\s*[-,/]*\s*\d+\s*(pz|pz\.|PZ|PZ\.|pezzi|PEZZI)\s*)$"
        name = re.sub(pattern, "", name).strip()
        return name
    except Exception:
        return name

async def normalize_product_name(description: str) -> str:
    """Use AI to normalize product description to common name"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            logger.warning("EMERGENT_LLM_KEY not found, using fallback normalization")
            # Fallback: use first word capitalized
            words = description.split()
            if words:
                return words[0].strip('.,!?"\'').capitalize()
            return description
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"normalize_{uuid.uuid4()}",
            system_message="Tu sei un normalizzatore di nomi prodotti alimentari e bevande. Estrai il nome essenziale del prodotto MANTENENDO varianti/gusti importanti. Rispondi SOLO con 2-3 parole massimo. Esempi: 'COCA COLA VETRO 33CL 24PZ' -> Coca Cola | 'PASSATA ALBICOCCA 720ML 12PZ' -> Passata Albicocca | 'OLIO EXTRAVERGINE OLIVA 1L' -> Olio Extravergine | 'ACQUA NATURALE 1.5L 6PZ' -> Acqua Naturale | 'BIRRA MORETTI 33CL' -> Birra Moretti"
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(text=description)
        response = await chat.send_message(user_message)
        normalized = response.strip()
        
        # Clean the response
        normalized = normalized.strip('"\'.,!? ')
        
        # If response is too long, extract first few words
        if len(normalized) > 30:
            words = normalized.split()
            if len(words) > 3:
                normalized = ' '.join(words[:3])
        
        # Clean normalized name to remove pack-size info
        normalized = clean_normalized_name(normalized)
        logger.info(f"Normalized '{description}' to '{normalized}'")
        return normalized
    except Exception as e:
        logger.error(f"Error normalizing product name: {str(e)}")
        return description  # Fallback to original description

# API Routes
@comparatore_router.get("/")
async def comparatore_root():
    return {"message": "Comparatore Prezzi API"}

@comparatore_router.post("/preview-xml")
async def preview_xml_comparatore(file: UploadFile = File(...)):
    """Preview XML file without saving - extract supplier info (DEPRECATED - use main upload)"""
    try:
        content = await file.read()
        
        # Try multiple encodings
        xml_content = None
        encodings = ['utf-8', 'iso-8859-1', 'windows-1252', 'latin-1']
        
        for encoding in encodings:
            try:
                xml_content = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if xml_content is None:
            raise HTTPException(
                status_code=400, 
                detail="Impossibile decodificare il file XML. Encoding non supportato."
            )
        
        parsed_data = parse_fatturapa_xml(xml_content)
        
        # Check if supplier is excluded
        is_excluded = await db.comparatore_supplier_exclusions.find_one({"supplier_name": parsed_data['supplier_name']})
        
        # Check if already exists
        existing_invoice = await db.comparatore_invoices.find_one({
            "invoice_number": parsed_data['invoice_number'],
            "supplier_name": parsed_data['supplier_name']
        })
        
        return {
            "filename": file.filename,
            "supplier_name": parsed_data['supplier_name'],
            "invoice_number": parsed_data['invoice_number'],
            "invoice_date": parsed_data['invoice_date'],
            "total_amount": parsed_data['total_amount'],
            "products_count": len(parsed_data['products']),
            "is_excluded": bool(is_excluded),
            "is_duplicate": bool(existing_invoice),
            "can_import": not bool(is_excluded) and not bool(existing_invoice)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing XML: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@comparatore_router.post("/upload-xml")
async def upload_xml_comparatore(file: UploadFile = File(...)):
    """Upload and parse FatturaPA XML file (DEPRECATED - use main /api/invoices/upload instead)"""
    try:
        content = await file.read()
        
        # Try multiple encodings
        xml_content = None
        encodings = ['utf-8', 'iso-8859-1', 'windows-1252', 'latin-1']
        
        for encoding in encodings:
            try:
                xml_content = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if xml_content is None:
            raise HTTPException(
                status_code=400, 
                detail="Impossibile decodificare il file XML. Encoding non supportato."
            )
        
        parsed_data = parse_fatturapa_xml(xml_content)
        
        # Check if supplier is excluded
        is_excluded = await db.comparatore_supplier_exclusions.find_one({"supplier_name": parsed_data['supplier_name']})
        if is_excluded:
            raise HTTPException(
                status_code=403,
                detail=f"Fornitore escluso: {parsed_data['supplier_name']} - Fattura non caricata"
            )
        
        # Check for duplicate
        existing_invoice = await db.comparatore_invoices.find_one({
            "invoice_number": parsed_data['invoice_number'],
            "supplier_name": parsed_data['supplier_name']
        })
        
        if existing_invoice:
            raise HTTPException(
                status_code=409,
                detail=f"Fattura duplicata: {parsed_data['invoice_number']} da {parsed_data['supplier_name']}"
            )
        
        # Create invoice
        invoice_id = str(uuid.uuid4())
        invoice = {
            "id": invoice_id,
            "filename": file.filename,
            "supplier_name": parsed_data['supplier_name'],
            "supplier_phone": parsed_data.get('supplier_phone'),
            "supplier_email": parsed_data.get('supplier_email'),
            "supplier_iban": parsed_data.get('supplier_iban'),
            "invoice_number": parsed_data['invoice_number'],
            "invoice_date": parsed_data['invoice_date'],
            "total_amount": parsed_data['total_amount'],
            "products": parsed_data['products'],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.comparatore_invoices.insert_one(invoice)
        
        # Create products
        for product in parsed_data['products']:
            product_doc = {
                "id": str(uuid.uuid4()),
                "original_description": product['description'],
                "normalized_name": None,
                "price": product['unit_price'],
                "quantity": product['quantity'],
                "unit": product['unit'],
                "supplier_name": parsed_data['supplier_name'],
                "invoice_id": invoice_id,
                "invoice_number": parsed_data['invoice_number'],
                "vat_rate": product.get('vat_rate'),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.comparatore_products.insert_one(product_doc)
        
        return {
            "message": "Fattura caricata con successo",
            "invoice_id": invoice_id,
            "products_count": len(parsed_data['products'])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading XML: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.get("/invoices")
async def get_invoices(supplier: Optional[str] = None):
    """Get all invoices from main app collection"""
    try:
        query = {}
        if supplier:
            query["supplier_name"] = supplier
        
        # Read from main invoices collection - no sort to avoid memory issues
        # Balanced limit for performance
        invoices = await db.invoices.find(query).limit(1000).to_list(length=1000)
        
        logger.info(f"Fetched {len(invoices)} invoices for comparatore")
        
        # Transform to comparatore format
        transformed = []
        for inv in invoices:
            products_list = inv.get("products", [])
            # Count products
            products_count = len(products_list)
            
            transformed.append({
                "id": inv.get("id"),
                "filename": inv.get("filename", "N/A"),
                "supplier_name": inv.get("supplier_name", "Unknown"),
                "supplier_phone": None,  # Not available in main invoices
                "supplier_email": None,  # Not available in main invoices
                "invoice_number": inv.get("invoice_number", ""),
                "invoice_date": inv.get("invoice_date", ""),
                "total_amount": float(inv.get("total_amount", 0)),
                "products": products_list,
                "products_count": products_count,
                "created_at": inv.get("uploaded_at", inv.get("invoice_date", ""))
            })
        
        return {"invoices": transformed}
    except Exception as e:
        logger.error(f"Error fetching invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.get("/suppliers")
async def get_suppliers():
    """Get list of all suppliers from main app"""
    try:
        # Read from main invoices collection
        suppliers = await db.invoices.distinct("supplier_name")
        return {"suppliers": suppliers}
    except Exception as e:
        logger.error(f"Error fetching suppliers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.get("/unmapped-products")
async def get_unmapped_products():
    """Get products without normalized names from invoices"""
    try:
        # Get all invoices
        invoices = await db.invoices.find().limit(200).to_list(length=None)
        
        unmapped = []
        seen_descriptions = set()
        
        for invoice in invoices:
            for product in invoice.get("products", []):
                # Try both field names: "descrizione" (Italian) and "description" (English)
                desc = product.get("descrizione") or product.get("description", "")
                
                # Skip if already seen
                if desc in seen_descriptions:
                    continue
                
                # Check if mapped in product_catalog
                catalog_entry = await db.product_catalog.find_one({
                    "original_description": desc
                })
                
                if not catalog_entry or not catalog_entry.get("product_name"):
                    unmapped.append({
                        "id": str(uuid.uuid4()),
                        "original_description": desc,
                        "supplier_name": invoice.get("supplier_name", ""),
                        "invoice_number": invoice.get("invoice_number", "")
                    })
                    seen_descriptions.add(desc)
        
        return {"unmapped_products": unmapped[:100]}  # Limit to 100
    except Exception as e:
        logger.error(f"Error fetching unmapped products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.get("/mapped-products")
async def get_mapped_products():
    """Get products with normalized names from product_catalog"""
    try:
        # Get mapped products from catalog
        catalog_items = await db.product_catalog.find({
            "product_name": {"$ne": None, "$ne": ""}
        }).limit(200).to_list(length=None)
        
        mapped = []
        for item in catalog_items:
            mapped.append({
                "id": item.get("id", str(uuid.uuid4())),
                "original_description": item.get("original_description", ""),
                "normalized_name": item.get("product_name", ""),
                "supplier_name": item.get("supplier_name", "")
            })
        
        return {"mapped_products": mapped}
    except Exception as e:
        logger.error(f"Error fetching mapped products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.post("/map-product")
async def map_product(request: MapProductRequest):
    """Map a single product using AI and save to product_catalog"""
    try:
        normalized_name = await normalize_product_name(request.original_description)
        
        # Save or update in product_catalog
        await db.product_catalog.update_one(
            {"original_description": request.original_description},
            {
                "$set": {
                    "product_name": normalized_name,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$setOnInsert": {
                    "id": str(uuid.uuid4()),
                    "original_description": request.original_description,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "product_id": request.product_id,
            "original_description": request.original_description,
            "normalized_name": normalized_name
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error mapping product: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.post("/map-all-products")
async def map_all_products():
    """Map all unmapped products using AI and save to product_catalog"""
    try:
        # Get unmapped products
        invoices = await db.invoices.find().limit(200).to_list(length=None)
        
        unique_descriptions = set()
        for invoice in invoices:
            for product in invoice.get("products", []):
                # Try both field names: "descrizione" (Italian) and "description" (English)
                desc = product.get("descrizione") or product.get("description", "")
                if desc:
                    unique_descriptions.add(desc)
        
        mapped_count = 0
        for desc in unique_descriptions:
            # Check if already mapped
            existing = await db.product_catalog.find_one({
                "original_description": desc,
                "product_name": {"$ne": None, "$ne": ""}
            })
            
            if existing:
                continue
            
            # Map with AI
            normalized_name = await normalize_product_name(desc)
            
            # Save to catalog
            await db.product_catalog.update_one(
                {"original_description": desc},
                {
                    "$set": {
                        "product_name": normalized_name,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$setOnInsert": {
                        "id": str(uuid.uuid4()),
                        "original_description": desc,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            mapped_count += 1
            
            # Limit to avoid timeout
            if mapped_count >= 50:
                break
        
        return {"mapped_count": mapped_count}
    except Exception as e:
        logger.error(f"Error mapping all products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.get("/products")
async def get_products(search: Optional[str] = None, supplier: Optional[str] = None):
    """Get products with price comparison from main invoices - last 6 months"""
    try:
        # Calculate date 6 months ago for better data
        from datetime import datetime, timedelta
        six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
        
        # Query invoices from last 6 months
        query = {}
        
        # Try to filter by date if possible
        try:
            query["uploaded_at"] = {"$gte": six_months_ago.isoformat()}
        except:
            pass
            
        if supplier:
            query["supplier_name"] = supplier
        
        # Increased limit for better product comparison
        invoices = await db.invoices.find(query).limit(500).to_list(length=500)
        
        logger.info(f"Processing {len(invoices)} invoices for product comparison")
        
        # Get all catalog mappings (increased limit after import)
        catalog_items = await db.product_catalog.find({
            "product_name": {"$ne": None, "$ne": ""}
        }).limit(5000).to_list(length=5000)
        
        # Create a lookup dict for fast access
        catalog_lookup = {}
        for item in catalog_items:
            catalog_lookup[item.get("original_description")] = item.get("product_name")
        
        logger.info(f"Loaded {len(catalog_lookup)} catalog mappings")
        
        # Extract all products
        all_products_data = []
        
        for invoice in invoices:
            for product in invoice.get("products", []):
                # Try both field names: "descrizione" (Italian) and "description" (English)
                desc = product.get("descrizione") or product.get("description", "")
                
                # Get normalized name from lookup
                normalized_name = catalog_lookup.get(desc)
                
                # Skip products without normalized names
                if not normalized_name:
                    continue
                
                # Apply search filter
                if search and search.lower() not in normalized_name.lower():
                    continue
                
                all_products_data.append({
                    "id": str(uuid.uuid4()),
                    "normalized_name": normalized_name,
                    "original_description": desc,
                    "supplier_name": invoice.get("supplier_name", ""),
                    "price": product.get("unit_price", 0),
                    "quantity": product.get("quantity", 0),
                    "unit": product.get("unit", ""),
                    "invoice_number": invoice.get("invoice_number", ""),
                    "vat_rate": product.get("vat_rate"),
                    "created_at": invoice.get("uploaded_at", "")
                })
        
        logger.info(f"Extracted {len(all_products_data)} mapped products")
        
        # Group by normalized_name
        grouped = defaultdict(lambda: {
            "normalized_name": "",
            "suppliers": []
        })
        
        for product in all_products_data:
            norm_name = product['normalized_name']
            grouped[norm_name]["normalized_name"] = norm_name
            grouped[norm_name]["suppliers"].append({
                "id": product['id'],
                "supplier_name": product['supplier_name'],
                "price": product['price'],
                "quantity": product['quantity'],
                "unit": product['unit'],
                "original_description": product['original_description'],
                "invoice_number": product['invoice_number'],
                "vat_rate": product.get('vat_rate'),
                "created_at": product['created_at']
            })
        
        # Convert to list and calculate best price
        comparison_data = []
        for norm_name, data in grouped.items():
            suppliers = data["suppliers"]
            if suppliers:
                best_price = min(s['price'] for s in suppliers if s['price'] > 0)
                comparison_data.append({
                    "normalized_name": norm_name,
                    "suppliers": suppliers,
                    "best_price": best_price,
                    "supplier_count": len(set(s['supplier_name'] for s in suppliers))
                })
        
        return {"comparison_data": comparison_data}
    except Exception as e:
        logger.error(f"Error fetching products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.post("/cart/add")
async def add_to_cart(request: AddToCartRequest):
    """Add product to cart"""
    try:
        cart_item = {
            "id": str(uuid.uuid4()),
            "product_id": request.product_id,
            "normalized_name": request.normalized_name,
            "original_description": request.original_description,
            "supplier_name": request.supplier_name,
            "price": request.price,
            "quantity": request.quantity,
            "unit": request.unit,
            "invoice_number": request.invoice_number,
            "vat_rate": request.vat_rate,
            "selected": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.comparatore_cart.insert_one(cart_item)
        
        return {"message": "Product added to cart", "cart_item_id": cart_item["id"]}
    except Exception as e:
        logger.error(f"Error adding to cart: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.get("/cart")
async def get_cart():
    """Get cart items grouped by supplier"""
    try:
        items = await db.comparatore_cart.find({}).to_list(length=None)
        
        # Group by supplier
        cart_by_supplier = defaultdict(lambda: {
            "supplier_name": "",
            "items": [],
            "total": 0.0
        })
        
        for item in items:
            supplier = item['supplier_name']
            cart_by_supplier[supplier]["supplier_name"] = supplier
            cart_by_supplier[supplier]["items"].append(item)
            if item.get('selected', True):
                cart_by_supplier[supplier]["total"] += item['price'] * item['quantity']
        
        return {"cart": list(cart_by_supplier.values())}
    except Exception as e:
        logger.error(f"Error fetching cart: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.delete("/cart/{item_id}")
async def remove_from_cart(item_id: str):
    """Remove item from cart"""
    try:
        result = await db.comparatore_cart.delete_one({"id": item_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Cart item not found")
        
        return {"message": "Item removed from cart"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing from cart: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.delete("/cart")
async def clear_cart():
    """Clear all cart items"""
    try:
        await db.comparatore_cart.delete_many({})
        return {"message": "Cart cleared"}
    except Exception as e:
        logger.error(f"Error clearing cart: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.post("/exclude-supplier")
async def exclude_supplier(request: ExcludeSupplierRequest):
    """Add or remove supplier from exclusion list"""
    try:
        if request.excluded:
            await db.comparatore_supplier_exclusions.update_one(
                {"supplier_name": request.supplier_name},
                {"$set": {
                    "supplier_name": request.supplier_name,
                    "excluded_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            message = f"Supplier {request.supplier_name} excluded"
        else:
            await db.comparatore_supplier_exclusions.delete_one({"supplier_name": request.supplier_name})
            message = f"Supplier {request.supplier_name} re-enabled"
        
        return {"message": message}
    except Exception as e:
        logger.error(f"Error excluding supplier: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@comparatore_router.get("/excluded-suppliers")
async def get_excluded_suppliers():
    """Get list of excluded suppliers"""
    try:
        excluded = await db.comparatore_supplier_exclusions.find({}).to_list(length=None)
        return {"excluded_suppliers": [s['supplier_name'] for s in excluded]}
    except Exception as e:
        logger.error(f"Error fetching excluded suppliers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
