import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAnnoGlobale } from '../contexts/AnnoContext';
import { 
  Search, Edit2, Trash2, Plus, FileText, Building2, 
  Phone, Mail, MapPin, CreditCard, AlertCircle, Check,
  Users, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const METODI_PAGAMENTO = [
  { value: "cassa", label: "Contanti", color: "bg-emerald-500" },
  { value: "banca", label: "Bonifico", color: "bg-blue-500" },
  { value: "bonifico", label: "Bonifico", color: "bg-blue-500" },
  { value: "assegno", label: "Assegno", color: "bg-amber-500" },
  { value: "misto", label: "Misto", color: "bg-slate-500" },
];

const getMetodoInfo = (metodo) => {
  return METODI_PAGAMENTO.find(m => m.value === metodo) || { label: metodo || 'N/D', color: 'bg-slate-400' };
};

const emptySupplier = {
  ragione_sociale: '',
  partita_iva: '',
  codice_fiscale: '',
  indirizzo: '',
  cap: '',
  comune: '',
  provincia: '',
  nazione: 'IT',
  telefono: '',
  email: '',
  pec: '',
  iban: '',
  metodo_pagamento: 'bonifico',
  giorni_pagamento: 30,
  note: ''
};

// Card statistica
function StatCard({ title, value, icon: Icon, color, subtext }) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Modale Form Fornitore
function SupplierModal({ isOpen, onClose, supplier, onSave, saving }) {
  const [form, setForm] = useState(emptySupplier);
  const isNew = !supplier?.id;
  
  useEffect(() => {
    if (isOpen && supplier) {
      setForm({ ...emptySupplier, ...supplier });
    } else if (isOpen && !supplier) {
      setForm(emptySupplier);
    }
  }, [isOpen, supplier]);
  
  if (!isOpen) return null;
  
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = () => {
    if (!form.ragione_sociale) {
      alert('Inserisci la ragione sociale');
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="supplier-modal-overlay">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        data-testid="supplier-modal"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {isNew ? 'Nuovo Fornitore' : 'Modifica Anagrafica'}
            </h2>
            <p className="text-sm text-slate-500">
              {isNew ? 'Inserisci i dati del nuovo fornitore' : `${form.ragione_sociale || form.denominazione}`}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            data-testid="close-modal-btn"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {/* Dati Azienda */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Dati Azienda
            </h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Ragione Sociale <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.ragione_sociale || ''}
                onChange={(e) => handleChange('ragione_sociale', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Inserisci ragione sociale"
                data-testid="input-ragione-sociale"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Partita IVA</label>
                <input
                  type="text"
                  value={form.partita_iva || ''}
                  onChange={(e) => handleChange('partita_iva', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                  placeholder="01234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Codice Fiscale</label>
                <input
                  type="text"
                  value={form.codice_fiscale || ''}
                  onChange={(e) => handleChange('codice_fiscale', e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Indirizzo */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Indirizzo
            </h4>
            <input
              type="text"
              value={form.indirizzo || ''}
              onChange={(e) => handleChange('indirizzo', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Via/Piazza, numero civico"
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={form.cap || ''}
                onChange={(e) => handleChange('cap', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="CAP"
                maxLength={5}
              />
              <input
                type="text"
                value={form.comune || ''}
                onChange={(e) => handleChange('comune', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Comune"
              />
              <input
                type="text"
                value={form.provincia || ''}
                onChange={(e) => handleChange('provincia', e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Prov"
                maxLength={2}
              />
            </div>
          </div>

          {/* Contatti */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
              <Phone className="w-4 h-4" /> Contatti
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="tel"
                value={form.telefono || ''}
                onChange={(e) => handleChange('telefono', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Telefono"
              />
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Email"
              />
            </div>
            <input
              type="email"
              value={form.pec || ''}
              onChange={(e) => handleChange('pec', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="PEC (Posta Elettronica Certificata)"
            />
          </div>

          {/* Pagamento */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Pagamento
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Metodo</label>
                <select
                  value={form.metodo_pagamento || 'bonifico'}
                  onChange={(e) => handleChange('metodo_pagamento', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                >
                  <option value="bonifico">Bonifico</option>
                  <option value="cassa">Contanti</option>
                  <option value="assegno">Assegno</option>
                  <option value="misto">Misto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Giorni Pagamento</label>
                <input
                  type="number"
                  value={form.giorni_pagamento || 30}
                  onChange={(e) => handleChange('giorni_pagamento', parseInt(e.target.value) || 30)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                  min={0}
                  max={365}
                />
              </div>
            </div>
            <input
              type="text"
              value={form.iban || ''}
              onChange={(e) => handleChange('iban', e.target.value.toUpperCase().replace(/\s/g, ''))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
              placeholder="IBAN (es. IT60X0542811101000000123456)"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Note</label>
            <textarea
              value={form.note || ''}
              onChange={(e) => handleChange('note', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              rows={2}
              placeholder="Note aggiuntive..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
            data-testid="cancel-btn"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.ragione_sociale}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            data-testid="save-supplier-btn"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Salva
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Fornitori() {
  const { anno: selectedYear } = useAnnoGlobale();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/api/suppliers${params}`);
      setSuppliers(res.data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNewSupplier = () => {
    setCurrentSupplier(null);
    setModalOpen(true);
  };

  const openEditSupplier = (supplier) => {
    console.log('Edit supplier:', supplier.ragione_sociale || supplier.denominazione);
    setCurrentSupplier(supplier);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentSupplier(null);
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (currentSupplier?.id) {
        await api.put(`/api/suppliers/${currentSupplier.id}`, formData);
      } else {
        await api.post('/api/suppliers', {
          denominazione: formData.ragione_sociale,
          ...formData
        });
      }
      closeModal();
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo fornitore?')) return;
    try {
      await api.delete(`/api/suppliers/${id}`);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleViewInvoices = (supplier) => {
    const searchParam = supplier.ragione_sociale || supplier.partita_iva;
    window.location.href = `/fatture?fornitore=${encodeURIComponent(searchParam)}&anno=${selectedYear}`;
  };

  // Stats
  const stats = {
    total: suppliers.length,
    withInvoices: suppliers.filter(s => (s.fatture_count || 0) > 0).length,
    incomplete: suppliers.filter(s => !s.partita_iva || !s.indirizzo || !s.email).length,
    cash: suppliers.filter(s => s.metodo_pagamento === 'cassa').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" data-testid="fornitori-page">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Gestione Fornitori</h1>
          <p className="text-slate-500">Anagrafica completa dei fornitori e metodi di pagamento</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Totale Fornitori" 
            value={stats.total} 
            icon={Users} 
            color="text-blue-600"
          />
          <StatCard 
            title="Con Fatture" 
            value={stats.withInvoices} 
            icon={FileText} 
            color="text-emerald-600"
            subtext={`${stats.total > 0 ? Math.round((stats.withInvoices / stats.total) * 100) : 0}% attivi`}
          />
          <StatCard 
            title="Dati Incompleti" 
            value={stats.incomplete} 
            icon={AlertCircle} 
            color="text-amber-600"
            subtext="Da completare"
          />
          <StatCard 
            title="Pagamento Cash" 
            value={stats.cash} 
            icon={CreditCard} 
            color="text-violet-600"
          />
        </div>

        {/* Search & Actions */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cerca per nome, P.IVA, comune..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  data-testid="search-input"
                />
              </div>
              <button
                onClick={openNewSupplier}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
                data-testid="new-supplier-btn"
              >
                <Plus className="w-5 h-5" />
                Nuovo Fornitore
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Suppliers List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Elenco Fornitori
              <Badge variant="secondary" className="ml-2">{suppliers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">
                  {search ? 'Nessun fornitore trovato per questa ricerca' : 'Nessun fornitore presente'}
                </p>
                {!search && (
                  <button
                    onClick={openNewSupplier}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mx-auto"
                  >
                    <Plus className="w-4 h-4" /> Aggiungi il primo fornitore
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {suppliers.map((supplier) => {
                  const metodoInfo = getMetodoInfo(supplier.metodo_pagamento);
                  const hasIncompleteData = !supplier.partita_iva || !supplier.indirizzo || !supplier.email;
                  
                  return (
                    <div 
                      key={supplier.id} 
                      className="p-4 hover:bg-slate-50 transition-colors"
                      data-testid={`supplier-row-${supplier.id}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                          {(supplier.ragione_sociale || supplier.denominazione || '?')[0].toUpperCase()}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-800">
                              {supplier.ragione_sociale || supplier.denominazione || 'Senza nome'}
                            </h3>
                            {hasIncompleteData && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                Incompleto
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 mt-1">
                            {supplier.partita_iva && (
                              <span className="font-mono text-xs">P.IVA {supplier.partita_iva}</span>
                            )}
                            {supplier.comune && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {supplier.comune}
                              </span>
                            )}
                            {supplier.email && (
                              <span className="flex items-center gap-1 hidden md:flex">
                                <Mail className="w-3 h-3" />
                                {supplier.email}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Fatture count */}
                        <div className="text-center px-3 hidden sm:block">
                          <p className="text-xs text-slate-400">Fatture</p>
                          <p className="text-lg font-bold text-slate-700">{supplier.fatture_count || 0}</p>
                        </div>
                        
                        {/* Badge metodo */}
                        <Badge className={`${metodoInfo.color} text-white border-0 shrink-0`}>
                          {metodoInfo.label}
                        </Badge>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleViewInvoices(supplier)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                            title="Vedi fatture"
                            data-testid={`view-invoices-${supplier.id}`}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditSupplier(supplier)}
                            className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                            title="Modifica anagrafica"
                            data-testid={`edit-supplier-${supplier.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                            title="Elimina"
                            data-testid={`delete-supplier-${supplier.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <SupplierModal 
        isOpen={modalOpen}
        onClose={closeModal}
        supplier={currentSupplier}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
