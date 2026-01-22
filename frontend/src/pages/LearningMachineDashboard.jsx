import React, { useState, useEffect } from 'react';
import api from '../api';
import { formatEuro } from '../lib/utils';
import { useAnnoGlobale } from '../contexts/AnnoContext';
import { 
  Brain, Warehouse, TrendingUp, RefreshCw, Package, 
  AlertTriangle, PlayCircle, FileText, ChevronDown, ChevronUp,
  Calculator, Percent, Euro, Box, Factory, Receipt, 
  CheckCircle2, XCircle, Clock, Upload, Link2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const CDC_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function LearningMachineDashboard() {
  const { anno } = useAnnoGlobale();
  const [activeTab, setActiveTab] = useState('centri-costo');
  const [loading, setLoading] = useState(true);
  
  // Dati Centri di Costo
  const [centriCosto, setCentriCosto] = useState([]);
  const [totaliCDC, setTotaliCDC] = useState({});
  const [riclassificando, setRiclassificando] = useState(false);
  
  // Dati Magazzino
  const [giacenze, setGiacenze] = useState(null);
  const [movimenti, setMovimenti] = useState([]);
  const [categorie, setCategorie] = useState([]);
  const [lottiProduzione, setLottiProduzione] = useState([]);
  
  // Produzione
  const [ricette, setRicette] = useState([]);
  const [showProduzioneModal, setShowProduzioneModal] = useState(false);
  const [selectedRicetta, setSelectedRicetta] = useState(null);
  const [porzioniProduzione, setPorzioniProduzione] = useState(10);
  const [producendo, setProducendo] = useState(false);
  const [risultatoProduzione, setRisultatoProduzione] = useState(null);
  
  // F24 Riconciliazione
  const [f24StatoRiconciliazione, setF24StatoRiconciliazione] = useState(null);
  const [f24List, setF24List] = useState([]);
  const [quietanze, setQuietanze] = useState([]);
  const [riconciliando, setRiconciliando] = useState(false);
  const [risultatoRiconciliazione, setRisultatoRiconciliazione] = useState(null);

  useEffect(() => {
    loadData();
  }, [anno]);

  async function loadData() {
    setLoading(true);
    try {
      const [cdcRes, giacenzeRes, movRes, catRes, lottiRes, ricetteRes, f24StatoRes, f24ListRes, quietanzeRes] = await Promise.all([
        api.get(`/api/learning-machine/riepilogo-centri-costo/${anno}`).catch(() => ({ data: { centri_costo: [], totali: {} } })),
        api.get('/api/magazzino/giacenze').catch(() => ({ data: { per_categoria: {}, totale_articoli: 0, valore_magazzino: 0 } })),
        api.get('/api/magazzino/movimenti?limit=20').catch(() => ({ data: [] })),
        api.get('/api/magazzino/categorie-merceologiche').catch(() => ({ data: [] })),
        api.get('/api/magazzino/lotti-produzione').catch(() => ({ data: [] })),
        api.get('/api/ricette').catch(() => ({ data: { ricette: [] } })),
        api.get('/api/f24-riconciliazione/stato-riconciliazione').catch(() => ({ data: null })),
        api.get('/api/f24-riconciliazione/commercialista?limit=100').catch(() => ({ data: { f24_list: [] } })),
        api.get('/api/quietanze-f24').catch(() => ({ data: [] }))
      ]);
      
      setCentriCosto(cdcRes.data.centri_costo || []);
      setTotaliCDC(cdcRes.data.totali || {});
      setGiacenze(giacenzeRes.data);
      setMovimenti(movRes.data || []);
      setCategorie(catRes.data || []);
      setLottiProduzione(lottiRes.data || []);
      setRicette(ricetteRes.data.ricette || ricetteRes.data || []);
      setF24StatoRiconciliazione(f24StatoRes.data);
      setF24List(f24ListRes.data?.f24_list || []);
      setQuietanze(Array.isArray(quietanzeRes.data) ? quietanzeRes.data : quietanzeRes.data?.quietanze || []);
    } catch (err) {
      console.error('Errore caricamento dati:', err);
    } finally {
      setLoading(false);
    }
  }

  async function riclassificaFatture() {
    setRiclassificando(true);
    try {
      const res = await api.post(`/api/learning-machine/riclassifica-fatture?anno=${anno}&forza=false`);
      alert(`Riclassificate ${res.data.classificate} fatture su ${res.data.totale_fatture}`);
      loadData();
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRiclassificando(false);
    }
  }
  
  async function riconciliaF24() {
    setRiconciliando(true);
    setRisultatoRiconciliazione(null);
    try {
      const res = await api.post('/api/f24-riconciliazione/riconcilia-f24');
      setRisultatoRiconciliazione(res.data);
      loadData();
    } catch (err) {
      alert('Errore riconciliazione: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRiconciliando(false);
    }
  }

  async function avviaProduzione() {
    if (!selectedRicetta) return;
    setProducendo(true);
    try {
      const res = await api.post(`/api/magazzino/scarico-produzione?ricetta_id=${selectedRicetta.id}&porzioni_prodotte=${porzioniProduzione}`);
      setRisultatoProduzione(res.data);
      loadData();
    } catch (err) {
      alert('Errore produzione: ' + (err.response?.data?.detail || err.message));
    } finally {
      setProducendo(false);
    }
  }

  // Prepara dati per grafico a torta CDC
  const pieDataCDC = centriCosto.slice(0, 8).map((c, i) => ({
    name: c.nome?.substring(0, 20) || c.id,
    value: c.totale_imponibile || 0,
    color: CDC_COLORS[i % CDC_COLORS.length]
  }));

  // Prepara dati per grafico giacenze per categoria
  const giacenzePerCategoria = giacenze?.per_categoria 
    ? Object.entries(giacenze.per_categoria).map(([cat, data]) => ({
        name: cat.substring(0, 15),
        valore: data.valore_totale || 0,
        articoli: data.num_articoli || 0
      })).sort((a, b) => b.valore - a.valore).slice(0, 10)
    : [];

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
        borderRadius: '16px',
        padding: '24px 32px',
        marginBottom: '24px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.15)', 
              borderRadius: '12px', 
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Brain size={32} />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>Learning Machine</h1>
              <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '14px' }}>
                Classificazione automatica costi e gestione magazzino - Anno {anno}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={riclassificaFatture}
              disabled={riclassificando}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                cursor: riclassificando ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              data-testid="riclassifica-btn"
            >
              <RefreshCw size={16} style={riclassificando ? { animation: 'spin 1s linear infinite' } : {}} />
              {riclassificando ? 'Classificazione...' : 'Riclassifica Fatture'}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        background: 'white',
        padding: '8px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {[
          { id: 'centri-costo', label: 'Centri di Costo', icon: Calculator },
          { id: 'magazzino', label: 'Magazzino', icon: Warehouse },
          { id: 'produzione', label: 'Produzione', icon: Factory }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === tab.id ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p>Caricamento dati...</p>
        </div>
      ) : (
        <>
          {/* TAB: Centri di Costo */}
          {activeTab === 'centri-costo' && (
            <div>
              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <StatCard 
                  title="Imponibile Totale" 
                  value={formatEuro(totaliCDC.imponibile || 0)} 
                  icon={Euro}
                  color="#3b82f6"
                />
                <StatCard 
                  title="IVA Detraibile" 
                  value={formatEuro(totaliCDC.iva_detraibile || 0)} 
                  icon={Percent}
                  color="#10b981"
                />
                <StatCard 
                  title="Deducibile IRES" 
                  value={formatEuro(totaliCDC.deducibile_ires || 0)} 
                  icon={TrendingUp}
                  color="#8b5cf6"
                />
                <StatCard 
                  title="Indeducibile" 
                  value={formatEuro(totaliCDC.indeducibile_ires || 0)} 
                  icon={AlertTriangle}
                  color="#ef4444"
                />
              </div>

              {/* Grafico e Lista */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
                {/* Grafico */}
                <div style={{ 
                  background: 'white', 
                  borderRadius: '12px', 
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '16px' }}>
                    Distribuzione Costi
                  </h3>
                  {pieDataCDC.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieDataCDC}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieDataCDC.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatEuro(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                      Nessun dato disponibile
                    </div>
                  )}
                </div>

                {/* Lista CDC */}
                <div style={{ 
                  background: 'white', 
                  borderRadius: '12px', 
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  maxHeight: '500px',
                  overflow: 'auto'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '16px' }}>
                    Dettaglio per Centro di Costo ({centriCosto.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {centriCosto.map((cdc, i) => (
                      <CDCRow key={cdc.id || i} cdc={cdc} color={CDC_COLORS[i % CDC_COLORS.length]} />
                    ))}
                    {centriCosto.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                        Nessun centro di costo. Clicca "Riclassifica Fatture" per iniziare.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Magazzino */}
          {activeTab === 'magazzino' && (
            <div>
              {/* Stats Cards Magazzino */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <StatCard 
                  title="Totale Articoli" 
                  value={giacenze?.totale_articoli || 0}
                  icon={Package}
                  color="#3b82f6"
                  suffix=" SKU"
                />
                <StatCard 
                  title="Valore Magazzino" 
                  value={formatEuro(giacenze?.valore_magazzino || 0)} 
                  icon={Euro}
                  color="#10b981"
                />
                <StatCard 
                  title="Categorie" 
                  value={Object.keys(giacenze?.per_categoria || {}).length}
                  icon={Box}
                  color="#f59e0b"
                />
                <StatCard 
                  title="Movimenti Recenti" 
                  value={movimenti.length}
                  icon={TrendingUp}
                  color="#8b5cf6"
                />
              </div>

              {/* Grafico Giacenze per Categoria */}
              <div style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '16px' }}>
                  Valore Giacenze per Categoria
                </h3>
                {giacenzePerCategoria.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={giacenzePerCategoria}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => formatEuro(value)} />
                      <Bar dataKey="valore" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                    Nessuna giacenza disponibile
                  </div>
                )}
              </div>

              {/* Ultimi Movimenti */}
              <div style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '16px' }}>
                  Ultimi Movimenti
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Data</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Tipo</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Articolo</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>Quantità</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Categoria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimenti.map((mov, i) => (
                        <tr key={mov.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 8px', color: '#64748b' }}>{mov.data}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: mov.tipo === 'carico' ? '#dcfce7' : '#fef3c7',
                              color: mov.tipo === 'carico' ? '#16a34a' : '#d97706'
                            }}>
                              {mov.tipo}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', fontWeight: 500, color: '#1f2937' }}>
                            {mov.descrizione_articolo?.substring(0, 40)}
                          </td>
                          <td style={{ 
                            padding: '12px 8px', 
                            textAlign: 'right', 
                            fontWeight: 600,
                            color: mov.quantita > 0 ? '#16a34a' : '#ef4444'
                          }}>
                            {mov.quantita > 0 ? '+' : ''}{mov.quantita} {mov.unita_misura}
                          </td>
                          <td style={{ padding: '12px 8px', color: '#64748b', fontSize: '13px' }}>
                            {mov.categoria_nome}
                          </td>
                        </tr>
                      ))}
                      {movimenti.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                            Nessun movimento registrato
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Produzione */}
          {activeTab === 'produzione' && (
            <div>
              {/* Avvia Produzione */}
              <div style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PlayCircle size={20} />
                  Avvia Lotto di Produzione
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#64748b', marginBottom: '6px' }}>
                      Seleziona Ricetta
                    </label>
                    <select
                      value={selectedRicetta?.id || ''}
                      onChange={(e) => {
                        const ricetta = ricette.find(r => r.id === e.target.value);
                        setSelectedRicetta(ricetta);
                        setRisultatoProduzione(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white'
                      }}
                      data-testid="select-ricetta"
                    >
                      <option value="">-- Seleziona ricetta --</option>
                      {ricette.filter(r => r.attivo !== false).map(r => (
                        <option key={r.id} value={r.id}>
                          {r.nome} ({r.porzioni} porzioni base)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#64748b', marginBottom: '6px' }}>
                      Porzioni da Produrre
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={porzioniProduzione}
                      onChange={(e) => setPorzioniProduzione(parseInt(e.target.value) || 1)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                      data-testid="input-porzioni"
                    />
                  </div>
                  
                  <button
                    onClick={avviaProduzione}
                    disabled={!selectedRicetta || producendo}
                    style={{
                      padding: '10px 24px',
                      background: selectedRicetta ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0',
                      color: selectedRicetta ? 'white' : '#9ca3af',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: selectedRicetta && !producendo ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    data-testid="btn-avvia-produzione"
                  >
                    <Factory size={18} />
                    {producendo ? 'Produzione...' : 'Avvia Produzione'}
                  </button>
                </div>

                {/* Risultato Produzione */}
                {risultatoProduzione && (
                  <div style={{ 
                    marginTop: '20px', 
                    padding: '16px', 
                    background: '#f0fdf4', 
                    borderRadius: '8px',
                    border: '1px solid #86efac'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#16a34a', fontWeight: 600 }}>
                      Produzione Completata - {risultatoProduzione.lotto}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Ricetta</span>
                        <div style={{ fontWeight: 600 }}>{risultatoProduzione.ricetta}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Porzioni</span>
                        <div style={{ fontWeight: 600 }}>{risultatoProduzione.porzioni_prodotte}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Fattore</span>
                        <div style={{ fontWeight: 600 }}>x{risultatoProduzione.fattore}</div>
                      </div>
                    </div>
                    
                    {risultatoProduzione.scarichi_effettuati?.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>
                          Ingredienti Scaricati:
                        </span>
                        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                          {risultatoProduzione.scarichi_effettuati.map((s, i) => (
                            <li key={i} style={{ fontSize: '13px', color: '#374151' }}>
                              {s.ingrediente}: -{s.quantita_scaricata?.toFixed(2)} {s.unita} (residuo: {s.giacenza_residua?.toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {risultatoProduzione.scarichi_non_disponibili?.length > 0 && (
                      <div style={{ 
                        padding: '12px', 
                        background: '#fef3c7', 
                        borderRadius: '6px',
                        border: '1px solid #fcd34d'
                      }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={16} />
                          Ingredienti Non Disponibili:
                        </span>
                        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                          {risultatoProduzione.scarichi_non_disponibili.map((s, i) => (
                            <li key={i} style={{ fontSize: '13px', color: '#92400e' }}>
                              {s.ingrediente}: necessari {s.quantita_necessaria?.toFixed(2)} {s.unita} - {s.motivo || 'mancante'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lotti di Produzione Recenti */}
              <div style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '16px' }}>
                  Lotti di Produzione Recenti
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {lottiProduzione.map((lotto, i) => (
                    <div 
                      key={lotto.id || i}
                      style={{
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div>
                          <span style={{ 
                            background: '#dbeafe', 
                            color: '#2563eb', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '12px', 
                            fontWeight: 600 
                          }}>
                            {lotto.lotto}
                          </span>
                          <h4 style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2937' }}>
                            {lotto.ricetta_nome}
                          </h4>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{lotto.data_produzione}</div>
                          <div style={{ fontWeight: 600, color: '#10b981' }}>{lotto.porzioni_prodotte} porzioni</div>
                        </div>
                      </div>
                      {lotto.ingredienti_mancanti?.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={14} />
                          {lotto.ingredienti_mancanti.length} ingredienti mancanti
                        </div>
                      )}
                    </div>
                  ))}
                  {lottiProduzione.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                      Nessun lotto di produzione registrato
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* CSS per animazione spin */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Componente StatCard
function StatCard({ title, value, icon: Icon, color, suffix = '' }) {
  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '12px', 
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginBottom: '4px' }}>
            {title}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
            {value}{suffix}
          </div>
        </div>
        <div style={{ 
          background: `${color}15`, 
          borderRadius: '10px', 
          padding: '10px',
          color: color
        }}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

// Componente CDCRow
function CDCRow({ cdc, color }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div 
      style={{
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}
    >
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: color 
          }} />
          <div>
            <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px' }}>
              {cdc.nome}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {cdc.codice} • {cdc.num_fatture} fatture
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: '#1f2937' }}>
              {formatEuro(cdc.totale_imponibile || 0)}
            </div>
          </div>
          {expanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
        </div>
      </div>
      
      {expanded && (
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid #e2e8f0',
          background: 'white',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          fontSize: '13px'
        }}>
          <div>
            <span style={{ color: '#64748b' }}>IVA Totale:</span>
            <span style={{ fontWeight: 600, marginLeft: '8px' }}>{formatEuro(cdc.totale_iva || 0)}</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>IVA Detraibile:</span>
            <span style={{ fontWeight: 600, marginLeft: '8px', color: '#10b981' }}>{formatEuro(cdc.iva_detraibile || 0)}</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Deducibile IRES:</span>
            <span style={{ fontWeight: 600, marginLeft: '8px', color: '#3b82f6' }}>{formatEuro(cdc.deducibile_ires || 0)}</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Indeducibile:</span>
            <span style={{ fontWeight: 600, marginLeft: '8px', color: '#ef4444' }}>{formatEuro(cdc.indeducibile_ires || 0)}</span>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ color: '#64748b' }}>Categoria Bilancio:</span>
            <span style={{ fontWeight: 500, marginLeft: '8px' }}>{cdc.categoria_bilancio || '-'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
