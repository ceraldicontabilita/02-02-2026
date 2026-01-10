import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';
import { format, addDays } from 'date-fns';
import { 
  Package, BookOpen, Layers, Plus, Search, Trash2, ChefHat, 
  AlertTriangle, Calendar, FileText, Download, Printer, X, Edit, 
  Save, RefreshCw, Archive, Check, Hash
} from 'lucide-react';

const API_BASE = '';

// ==================== COMPONENTI UI ====================
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = "primary", size = "md", disabled = false, className = "", ...props }) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
    ghost: "hover:bg-gray-100 text-gray-600"
  };
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2", lg: "px-6 py-3 text-lg" };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}>{children}</button>
  );
};

const Badge = ({ children, variant = "default" }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    warning: "bg-amber-100 text-amber-700",
    success: "bg-green-100 text-green-700",
    danger: "bg-red-100 text-red-700"
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant]}`}>{children}</span>;
};

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} mx-auto max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-2xl sticky top-0">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const ALFABETO = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'Z'];

// ==================== MATERIE PRIME ====================
const MateriePrimeList = ({ items, onDelete, onAdd, search, setSearch, onUpdateAllergeni, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingAllergeni, setEditingAllergeni] = useState(null);
  const [nuoviAllergeni, setNuoviAllergeni] = useState("");
  const [letteraFiltro, setLetteraFiltro] = useState(null);
  const [form, setForm] = useState({
    materia_prima: "", azienda: "", numero_fattura: "",
    data_fattura: format(new Date(), "dd/MM/yyyy"),
    allergeni: "non contiene allergeni"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onAdd(form);
    setForm({ materia_prima: "", azienda: "", numero_fattura: "", data_fattura: format(new Date(), "dd/MM/yyyy"), allergeni: "non contiene allergeni" });
    setShowForm(false);
  };

  const itemsFiltrati = useMemo(() => {
    let risultato = items;
    if (letteraFiltro) risultato = risultato.filter(item => item.materia_prima?.toUpperCase().startsWith(letteraFiltro));
    if (search) risultato = risultato.filter(item => item.materia_prima?.toLowerCase().includes(search.toLowerCase()));
    return risultato;
  }, [items, letteraFiltro, search]);

  const itemsPerFornitore = itemsFiltrati.reduce((acc, item) => {
    const fornitore = item.azienda || "Sconosciuto";
    if (!acc[fornitore]) acc[fornitore] = [];
    acc[fornitore].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Cerca materia prima..." value={search}
            onChange={(e) => { setSearch(e.target.value); setLetteraFiltro(null); }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onRefresh} variant="secondary" size="sm"><RefreshCw size={16} /> Aggiorna</Button>
          <Button onClick={() => setShowForm(true)} size="sm"><Plus size={16} /> Nuova</Button>
        </div>
      </div>

      {/* Alfabeto */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg">
        <button onClick={() => setLetteraFiltro(null)} className={`px-2 py-1 text-xs rounded ${!letteraFiltro ? 'bg-blue-600 text-white' : 'bg-white'}`}>Tutti</button>
        {ALFABETO.map(l => (
          <button key={l} onClick={() => setLetteraFiltro(l)} className={`px-2 py-1 text-xs rounded ${letteraFiltro === l ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}>{l}</button>
        ))}
      </div>

      {/* Lista per fornitore */}
      <div className="space-y-4">
        {Object.keys(itemsPerFornitore).sort().map(fornitore => (
          <Card key={fornitore} className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 flex items-center justify-between">
              <span className="font-semibold">{fornitore}</span>
              <Badge variant="default">{itemsPerFornitore[fornitore].length} prodotti</Badge>
            </div>
            <div className="divide-y">
              {itemsPerFornitore[fornitore].map(item => (
                <div key={item.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{item.materia_prima}</div>
                    <div className="text-xs text-gray-500">Fatt. {item.numero_fattura} del {item.data_fattura}</div>
                    <div className="text-xs text-amber-600 mt-1">{item.allergeni}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingAllergeni(item); setNuoviAllergeni(item.allergeni); }} className="p-1.5 hover:bg-blue-100 rounded text-blue-600"><Edit size={16} /></button>
                    <button onClick={() => onDelete(item.id)} className="p-1.5 hover:bg-red-100 rounded text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Nuova Materia Prima */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="➕ Nuova Materia Prima">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-sm font-medium">Materia Prima *</label>
            <input type="text" required value={form.materia_prima} onChange={(e) => setForm({...form, materia_prima: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">Fornitore *</label>
            <input type="text" required value={form.azienda} onChange={(e) => setForm({...form, azienda: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">N. Fattura</label>
              <input type="text" value={form.numero_fattura} onChange={(e) => setForm({...form, numero_fattura: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
            <div><label className="text-sm font-medium">Data Fattura</label>
              <input type="text" value={form.data_fattura} onChange={(e) => setForm({...form, data_fattura: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
          </div>
          <div><label className="text-sm font-medium">Allergeni</label>
            <input type="text" value={form.allergeni} onChange={(e) => setForm({...form, allergeni: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Annulla</Button>
            <Button type="submit">Salva</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Modifica Allergeni */}
      <Modal isOpen={!!editingAllergeni} onClose={() => setEditingAllergeni(null)} title="✏️ Modifica Allergeni">
        <div className="space-y-4">
          <div className="font-medium text-gray-700">{editingAllergeni?.materia_prima}</div>
          <input type="text" value={nuoviAllergeni} onChange={(e) => setNuoviAllergeni(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="es: contiene glutine, lattosio" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingAllergeni(null)}>Annulla</Button>
            <Button onClick={async () => { await onUpdateAllergeni(editingAllergeni.id, nuoviAllergeni); setEditingAllergeni(null); }}>Salva</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ==================== RICETTE ====================
const RicetteList = ({ items, onDelete, onAdd, onUpdate, search, setSearch, materiePrime, onGeneraLotto, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingRicetta, setEditingRicetta] = useState(null);
  const [form, setForm] = useState({ nome: "", ingredienti: [] });
  const [ingredienteInput, setIngredienteInput] = useState("");
  const [showGeneraModal, setShowGeneraModal] = useState(false);
  const [selectedRicetta, setSelectedRicetta] = useState(null);
  const [dataProduzione, setDataProduzione] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dataScadenza, setDataScadenza] = useState(format(addDays(new Date(), 20), "yyyy-MM-dd"));
  const [quantita, setQuantita] = useState(1);
  const [unitaMisura, setUnitaMisura] = useState("pz");
  const [letteraFiltro, setLetteraFiltro] = useState(null);
  const [scadenzaInfo, setScadenzaInfo] = useState(null);
  const [codiceLottoPreview, setCodiceLottoPreview] = useState(null);

  const ricetteFiltrate = useMemo(() => {
    let risultato = items;
    if (letteraFiltro) risultato = risultato.filter(r => r.nome.toUpperCase().startsWith(letteraFiltro));
    if (search) risultato = risultato.filter(r => r.nome.toLowerCase().includes(search.toLowerCase()));
    return risultato;
  }, [items, letteraFiltro, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingRicetta) {
      await onUpdate(editingRicetta.id, form);
    } else {
      await onAdd(form);
    }
    setForm({ nome: "", ingredienti: [] });
    setEditingRicetta(null);
    setShowForm(false);
  };

  const addIngrediente = () => {
    if (ingredienteInput.trim()) {
      setForm({ ...form, ingredienti: [...form.ingredienti, ingredienteInput.trim()] });
      setIngredienteInput("");
    }
  };

  const removeIngrediente = (idx) => {
    setForm({ ...form, ingredienti: form.ingredienti.filter((_, i) => i !== idx) });
  };

  const openGeneraModal = async (ricetta) => {
    setSelectedRicetta(ricetta);
    setDataProduzione(format(new Date(), "yyyy-MM-dd"));
    setQuantita(1);
    
    // Calcola scadenza automatica
    try {
      const res = await api.post(`/api/haccp-v2/calcola-scadenza?data_produzione=${format(new Date(), "yyyy-MM-dd")}`, ricetta.ingredienti);
      if (res.data) {
        const [g, m, a] = res.data.data_scadenza.split('/');
        setDataScadenza(`${a}-${m}-${g}`);
        setScadenzaInfo(res.data);
      }
    } catch (e) {
      setDataScadenza(format(addDays(new Date(), 20), "yyyy-MM-dd"));
    }
    
    // Anteprima codice lotto
    try {
      const res = await api.get(`/api/haccp-v2/anteprima-codice-lotto/${encodeURIComponent(ricetta.nome)}`, {
        params: { quantita: 1, unita_misura: "pz", data_produzione: format(new Date(), "yyyy-MM-dd") }
      });
      setCodiceLottoPreview(res.data);
    } catch (e) {}
    
    setShowGeneraModal(true);
  };

  const handleGeneraLotto = async () => {
    if (!selectedRicetta) return;
    const lotto = await onGeneraLotto(selectedRicetta.nome, dataProduzione, dataScadenza, quantita, unitaMisura);
    if (lotto) {
      // Stampa etichetta
      printEtichetta(lotto);
      setShowGeneraModal(false);
    }
  };

  const printEtichetta = (lotto) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html><head><title>Lotto ${lotto.numero_lotto}</title>
      <style>
        @page { size: 72mm auto; margin: 1mm; }
        body { font-family: Arial; font-size: 11px; width: 70mm; padding: 2mm; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 2mm; margin-bottom: 2mm; }
        .header h1 { font-size: 13px; font-weight: 900; }
        .lotto-num { font-size: 14px; font-weight: 900; background: #000; color: #fff; padding: 1mm 2mm; display: inline-block; }
        .info-row { display: flex; justify-content: space-between; font-size: 10px; margin: 0.5mm 0; }
        .ing { font-size: 8px; padding: 0.5mm 0; border-bottom: 1px dotted #666; }
        .etichetta { margin-top: 2mm; padding: 1.5mm; border: 2px solid #000; text-align: center; font-weight: 900; }
      </style></head>
      <body>
        <div class="header"><h1>LOTTO</h1><div style="font-size:12px;font-weight:900">${lotto.prodotto}</div><div class="lotto-num">${lotto.numero_lotto}</div></div>
        <div class="info-row"><span>PROD:</span><span>${lotto.data_produzione}</span></div>
        <div class="info-row"><span>SCAD:</span><span>${lotto.data_scadenza}</span></div>
        <div style="border-top:1px solid #000;margin:1.5mm 0"></div>
        <div style="font-weight:900;font-size:10px;margin-bottom:1mm">INGREDIENTI:</div>
        ${(lotto.ingredienti_dettaglio || []).slice(0, 10).map(ing => `<div class="ing">• ${ing}</div>`).join("")}
        <div class="etichetta">${lotto.etichetta || 'N/D'}</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Cerca ricetta..." value={search}
            onChange={(e) => { setSearch(e.target.value); setLetteraFiltro(null); }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onRefresh} variant="secondary" size="sm"><RefreshCw size={16} /></Button>
          <Button onClick={() => { setEditingRicetta(null); setForm({ nome: "", ingredienti: [] }); setShowForm(true); }} size="sm"><Plus size={16} /> Nuova Ricetta</Button>
        </div>
      </div>

      {/* Alfabeto */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg">
        <button onClick={() => setLetteraFiltro(null)} className={`px-2 py-1 text-xs rounded ${!letteraFiltro ? 'bg-blue-600 text-white' : 'bg-white'}`}>Tutti</button>
        {ALFABETO.map(l => (
          <button key={l} onClick={() => setLetteraFiltro(l)} className={`px-2 py-1 text-xs rounded ${letteraFiltro === l ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}>{l}</button>
        ))}
      </div>

      {/* Lista Ricette */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ricetteFiltrate.map(ricetta => (
          <Card key={ricetta.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3">
              <div className="font-bold text-lg">{ricetta.nome}</div>
              <div className="text-sm opacity-80">{ricetta.ingredienti?.length || 0} ingredienti</div>
            </div>
            <div className="p-4">
              <div className="text-sm text-gray-600 mb-3">
                {ricetta.ingredienti?.slice(0, 5).map((ing, i) => (
                  <span key={i} className="inline-block bg-gray-100 px-2 py-1 rounded text-xs mr-1 mb-1">{ing}</span>
                ))}
                {ricetta.ingredienti?.length > 5 && <span className="text-gray-400 text-xs">+{ricetta.ingredienti.length - 5} altri</span>}
              </div>
              {ricetta.allergeni && (
                <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mb-3">
                  ⚠️ {ricetta.allergeni}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={() => openGeneraModal(ricetta)} className="flex-1">
                  <ChefHat size={16} /> Produci
                </Button>
                <button onClick={() => { setEditingRicetta(ricetta); setForm({ nome: ricetta.nome, ingredienti: [...ricetta.ingredienti] }); setShowForm(true); }}
                  className="p-2 hover:bg-blue-100 rounded text-blue-600"><Edit size={16} /></button>
                <button onClick={() => onDelete(ricetta.id)} className="p-2 hover:bg-red-100 rounded text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Nuova/Modifica Ricetta */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingRicetta ? "✏️ Modifica Ricetta" : "➕ Nuova Ricetta"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-sm font-medium">Nome Ricetta *</label>
            <input type="text" required value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
          
          <div><label className="text-sm font-medium">Ingredienti</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={ingredienteInput} onChange={(e) => setIngredienteInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIngrediente())}
                placeholder="Aggiungi ingrediente..." className="flex-1 px-4 py-2 border rounded-lg" />
              <Button type="button" onClick={addIngrediente}><Plus size={16} /></Button>
            </div>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg min-h-[60px]">
              {form.ingredienti.map((ing, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border text-sm">
                  {ing}
                  <button type="button" onClick={() => removeIngrediente(idx)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                </span>
              ))}
              {form.ingredienti.length === 0 && <span className="text-gray-400 text-sm">Nessun ingrediente aggiunto</span>}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Annulla</Button>
            <Button type="submit"><Save size={16} /> {editingRicetta ? 'Aggiorna' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal GENERA LOTTO */}
      <Modal isOpen={showGeneraModal} onClose={() => setShowGeneraModal(false)} title="🏭 Genera Lotto di Produzione" size="lg">
        {selectedRicetta && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="font-bold text-green-800 text-lg">{selectedRicetta.nome}</div>
              <div className="text-sm text-green-600">{selectedRicetta.ingredienti?.length || 0} ingredienti</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Data Produzione</label>
                <input type="date" value={dataProduzione} onChange={(e) => setDataProduzione(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="text-sm font-medium">Data Scadenza</label>
                <input type="date" value={dataScadenza} onChange={(e) => setDataScadenza(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Quantità</label>
                <input type="number" min="1" value={quantita} onChange={(e) => setQuantita(parseInt(e.target.value) || 1)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="text-sm font-medium">Unità</label>
                <select value={unitaMisura} onChange={(e) => setUnitaMisura(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="pz">Pezzi (pz)</option>
                  <option value="kg">Kilogrammi (kg)</option>
                  <option value="lt">Litri (lt)</option>
                </select></div>
            </div>

            {scadenzaInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <div className="font-semibold text-blue-800">📅 Scadenza calcolata automaticamente</div>
                <div className="text-blue-600 mt-1">Ingrediente critico: {scadenzaInfo.ingrediente_critico}</div>
                <div className="text-blue-600">Giorni frigo: {scadenzaInfo.giorni_frigo} | Abbattuto: {scadenzaInfo.giorni_abbattuto}</div>
              </div>
            )}

            {codiceLottoPreview && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                <div className="text-sm text-purple-600 mb-1">Anteprima Codice Lotto</div>
                <div className="font-mono font-bold text-lg text-purple-800">{codiceLottoPreview.codice}</div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowGeneraModal(false)}>Annulla</Button>
              <Button variant="success" onClick={handleGeneraLotto}><ChefHat size={18} /> Genera e Stampa</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ==================== LOTTI ====================
const LottiList = ({ items, onDelete, ricette, search, setSearch, onRefresh }) => {
  const [showRegistroModal, setShowRegistroModal] = useState(false);
  const [dataInizioRegistro, setDataInizioRegistro] = useState(format(addDays(new Date(), -30), "yyyy-MM-dd"));
  const [dataFineRegistro, setDataFineRegistro] = useState(format(new Date(), "yyyy-MM-dd"));

  const lottiFiltrati = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(l => l.prodotto?.toLowerCase().includes(s) || l.numero_lotto?.toLowerCase().includes(s));
  }, [items, search]);

  const handleStampaRegistroASL = () => {
    window.open(`${API_BASE}/api/haccp-v2/registro-lotti-asl?data_inizio=${dataInizioRegistro}&data_fine=${dataFineRegistro}`, '_blank');
    setShowRegistroModal(false);
  };

  const handlePrint = (lotto) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html><head><title>Lotto ${lotto.numero_lotto}</title>
      <style>
        @page { size: 72mm auto; margin: 1mm; }
        body { font-family: Arial; font-size: 11px; width: 70mm; padding: 2mm; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 2mm; }
        .lotto-num { font-size: 14px; font-weight: 900; background: #000; color: #fff; padding: 1mm 2mm; display: inline-block; }
        .info-row { display: flex; justify-content: space-between; font-size: 10px; margin: 0.5mm 0; }
        .ing { font-size: 8px; border-bottom: 1px dotted #666; }
        .etichetta { margin-top: 2mm; padding: 1.5mm; border: 2px solid #000; text-align: center; font-weight: 900; }
      </style></head>
      <body>
        <div class="header"><h1 style="font-size:13px;font-weight:900">LOTTO</h1><div style="font-size:12px;font-weight:900">${lotto.prodotto}</div><div class="lotto-num">${lotto.numero_lotto}</div></div>
        <div class="info-row"><span>PROD:</span><span>${lotto.data_produzione}</span></div>
        <div class="info-row"><span>SCAD:</span><span>${lotto.data_scadenza}</span></div>
        <div style="border-top:1px solid #000;margin:1.5mm 0"></div>
        <div style="font-weight:900;font-size:10px;margin-bottom:1mm">INGREDIENTI:</div>
        ${(lotto.ingredienti_dettaglio || []).slice(0, 10).map(ing => `<div class="ing">• ${ing}</div>`).join("")}
        <div class="etichetta">${lotto.etichetta || 'N/D'}</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Cerca lotto..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowRegistroModal(true)} variant="secondary"><FileText size={18} /> Registro ASL</Button>
          <Button onClick={onRefresh} variant="ghost"><RefreshCw size={18} /></Button>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-3xl font-bold text-purple-600">{items.length}</div><div className="text-sm text-gray-500">Lotti Totali</div></Card>
        <Card className="p-4"><div className="text-3xl font-bold text-green-600">{items.filter(l => new Date(l.data_scadenza?.split('/').reverse().join('-')) > new Date()).length}</div><div className="text-sm text-gray-500">Attivi</div></Card>
        <Card className="p-4"><div className="text-3xl font-bold text-blue-600">{items.filter(l => { const d = new Date(l.created_at); const week = new Date(); week.setDate(week.getDate() - 7); return d >= week; }).length}</div><div className="text-sm text-gray-500">Questa Settimana</div></Card>
        <Card className="p-4"><div className="text-3xl font-bold text-amber-600">{new Set(items.map(l => l.prodotto)).size}</div><div className="text-sm text-gray-500">Prodotti Diversi</div></Card>
      </div>

      {/* Lista Lotti */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left">Codice Lotto</th>
                <th className="px-4 py-3 text-left">Prodotto</th>
                <th className="px-4 py-3 text-center">Quantità</th>
                <th className="px-4 py-3 text-center">Produzione</th>
                <th className="px-4 py-3 text-center">Scadenza</th>
                <th className="px-4 py-3 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lottiFiltrati.map(lotto => (
                <tr key={lotto.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-purple-700">{lotto.numero_lotto}</td>
                  <td className="px-4 py-3 font-medium">{lotto.prodotto}</td>
                  <td className="px-4 py-3 text-center">{lotto.quantita} {lotto.unita_misura}</td>
                  <td className="px-4 py-3 text-center text-sm">{lotto.data_produzione}</td>
                  <td className="px-4 py-3 text-center text-sm">{lotto.data_scadenza}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handlePrint(lotto)} className="p-1.5 hover:bg-blue-100 rounded text-blue-600"><Printer size={16} /></button>
                      <button onClick={() => onDelete(lotto.id)} className="p-1.5 hover:bg-red-100 rounded text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Registro ASL */}
      <Modal isOpen={showRegistroModal} onClose={() => setShowRegistroModal(false)} title="📋 Stampa Registro Lotti per ASL">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Genera un registro di tracciabilità lotti conforme ai requisiti ASL (Reg. CE 178/2002).</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Data Inizio</label>
              <input type="date" value={dataInizioRegistro} onChange={(e) => setDataInizioRegistro(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
            <div><label className="text-sm font-medium">Data Fine</label>
              <input type="date" value={dataFineRegistro} onChange={(e) => setDataFineRegistro(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowRegistroModal(false)}>Annulla</Button>
            <Button onClick={handleStampaRegistroASL}><Download size={16} /> Genera PDF</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ==================== PAGINA PRINCIPALE ====================
export default function HACCPCompleto() {
  const [activeTab, setActiveTab] = useState("materie");
  const [stats, setStats] = useState({ materie_prime: 0, ricette: 0, lotti_totali: 0, lotti_settimana: 0 });
  const [materiePrime, setMateriePrime] = useState([]);
  const [ricette, setRicette] = useState([]);
  const [lotti, setLotti] = useState([]);
  const [searchMaterie, setSearchMaterie] = useState("");
  const [searchRicette, setSearchRicette] = useState("");
  const [searchLotti, setSearchLotti] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [mpRes, ricRes, lotRes] = await Promise.all([
        api.get('/api/haccp-v2/materie-prime').catch(() => ({ data: [] })),
        api.get('/api/haccp-v2/ricette').catch(() => ({ data: [] })),
        api.get('/api/haccp-v2/lotti').catch(() => ({ data: [] }))
      ]);
      
      setMateriePrime(mpRes.data || []);
      setRicette(ricRes.data || []);
      setLotti(lotRes.data || []);
      
      const week = new Date(); week.setDate(week.getDate() - 7);
      setStats({
        materie_prime: (mpRes.data || []).length,
        ricette: (ricRes.data || []).length,
        lotti_totali: (lotRes.data || []).length,
        lotti_settimana: (lotRes.data || []).filter(l => new Date(l.created_at) >= week).length
      });
    } catch (e) {
      console.error("Errore caricamento:", e);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Materie Prime
  const addMateriaPrima = async (data) => {
    try {
      await api.post('/api/haccp-v2/materie-prime', data);
      loadAll();
    } catch (e) { console.error(e); }
  };
  
  const deleteMateriaPrima = async (id) => {
    try {
      await api.delete(`/api/haccp-v2/materie-prime/${id}`);
      loadAll();
    } catch (e) { console.error(e); }
  };

  const updateAllergeniMateria = async (id, allergeni) => {
    try {
      await api.put(`/api/haccp-v2/materie-prime/${id}/allergeni?allergeni=${encodeURIComponent(allergeni)}`);
      loadAll();
    } catch (e) { console.error(e); }
  };

  // CRUD Ricette
  const addRicetta = async (data) => {
    try {
      await api.post('/api/haccp-v2/ricette', data);
      loadAll();
    } catch (e) { console.error(e); }
  };

  const updateRicetta = async (id, data) => {
    try {
      await api.put(`/api/haccp-v2/ricette/${id}`, data);
      loadAll();
    } catch (e) { console.error(e); }
  };

  const deleteRicetta = async (id) => {
    try {
      await api.delete(`/api/haccp-v2/ricette/${id}`);
      loadAll();
    } catch (e) { console.error(e); }
  };

  // Genera Lotto
  const generaLotto = async (ricettaNome, dataProd, dataScad, qty, unita) => {
    try {
      const res = await api.post(`/api/haccp-v2/genera-lotto/${encodeURIComponent(ricettaNome)}`, null, {
        params: { data_produzione: dataProd, data_scadenza: dataScad, quantita: qty, unita_misura: unita }
      });
      loadAll();
      return res.data;
    } catch (e) { console.error(e); return null; }
  };

  const deleteLotto = async (id) => {
    try {
      await api.delete(`/api/haccp-v2/lotti/${id}`);
      loadAll();
    } catch (e) { console.error(e); }
  };

  const tabs = [
    { id: "materie", label: "Materie Prime", icon: Package, count: stats.materie_prime },
    { id: "ricette", label: "Ricette", icon: BookOpen, count: stats.ricette },
    { id: "lotti", label: "Lotti Produzione", icon: Layers, count: stats.lotti_totali }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3"><ChefHat size={36} /> HACCP & Tracciabilità Lotti</h1>
        <p className="opacity-80 mt-1">Sistema completo gestione materie prime, ricette e produzione</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl"><Package className="text-blue-600" size={24} /></div>
          <div><div className="text-2xl font-bold">{stats.materie_prime}</div><div className="text-sm text-gray-500">Materie Prime</div></div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-xl"><BookOpen className="text-green-600" size={24} /></div>
          <div><div className="text-2xl font-bold">{stats.ricette}</div><div className="text-sm text-gray-500">Ricette</div></div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-xl"><Layers className="text-purple-600" size={24} /></div>
          <div><div className="text-2xl font-bold">{stats.lotti_totali}</div><div className="text-sm text-gray-500">Lotti Totali</div></div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-xl"><Calendar className="text-amber-600" size={24} /></div>
          <div><div className="text-2xl font-bold">{stats.lotti_settimana}</div><div className="text-sm text-gray-500">Lotti Settimana</div></div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-600'}`}>
              <Icon size={20} /> {tab.label}
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'}`}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={32} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {activeTab === "materie" && (
              <MateriePrimeList items={materiePrime} onDelete={deleteMateriaPrima} onAdd={addMateriaPrima}
                search={searchMaterie} setSearch={setSearchMaterie} onUpdateAllergeni={updateAllergeniMateria} onRefresh={loadAll} />
            )}
            {activeTab === "ricette" && (
              <RicetteList items={ricette} onDelete={deleteRicetta} onAdd={addRicetta} onUpdate={updateRicetta}
                search={searchRicette} setSearch={setSearchRicette} materiePrime={materiePrime} onGeneraLotto={generaLotto} onRefresh={loadAll} />
            )}
            {activeTab === "lotti" && (
              <LottiList items={lotti} onDelete={deleteLotto} ricette={ricette}
                search={searchLotti} setSearch={setSearchLotti} onRefresh={loadAll} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
