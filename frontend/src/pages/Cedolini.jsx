import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAnnoGlobale } from '../contexts/AnnoContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calculator, Users, FileText, CheckCircle, Clock, Building2, Sun, HeartPulse, Calendar } from 'lucide-react';

const styles = {
  container: { padding: 12, maxWidth: 1200, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  label: { fontSize: 11, fontWeight: '500', color: '#475569', marginBottom: 4, display: 'block' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  card: { background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 12 },
  cardHeader: { padding: '8px 12px', borderBottom: '1px solid #f1f5f9' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 4 },
  cardContent: { padding: 12 },
  input: { height: 32, fontSize: 12 },
  btn: { height: 32, fontSize: 12, width: '100%' },
  statBox: (bg, color) => ({ background: bg, padding: 8, borderRadius: 6, textAlign: 'center' }),
  statLabel: (color) => ({ fontSize: 11, color: color }),
  statValue: (color) => ({ fontSize: 18, fontWeight: 'bold', color: color }),
  table: { width: '100%', fontSize: 12, borderCollapse: 'collapse' },
  th: { padding: '6px 8px', textAlign: 'left', background: '#f8fafc', fontWeight: '600', color: '#475569' },
  thRight: { padding: '6px 8px', textAlign: 'right', background: '#f8fafc', fontWeight: '600', color: '#475569' },
  td: { padding: '6px 8px', borderBottom: '1px solid #f1f5f9' },
  tdRight: { padding: '6px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' },
  advancedBox: { background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0', marginTop: 8 },
  resultCard: { background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' },
  resultHeader: { padding: '8px 12px', background: '#dbeafe', borderRadius: '8px 8px 0 0' },
  nettoBox: { background: '#dcfce7', padding: 8, borderRadius: 6, border: '1px solid #86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  whiteBox: { background: 'white', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 8, fontSize: 12 },
  gridRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 },
  small: { fontSize: 11, color: '#64748b' },
  icon: { width: 12, height: 12, marginRight: 4 },
  iconMd: { width: 16, height: 16 },
  iconLg: { width: 20, height: 20 }
};

const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

export default function Cedolini() {
  const { anno } = useAnnoGlobale();
  const [activeTab, setActiveTab] = useState('calcola');
  const [dipendenti, setDipendenti] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [selectedDipendente, setSelectedDipendente] = useState('');
  const [selectedMese, setSelectedMese] = useState(new Date().getMonth() + 1);
  const [oreLavorate, setOreLavorate] = useState('160');
  const [pagaOraria, setPagaOraria] = useState('');
  const [straordinari, setStraordinari] = useState('0');
  const [festivita, setFestivita] = useState('0');
  const [oreDomenicali, setOreDomenicali] = useState('0');
  const [oreMalattia, setOreMalattia] = useState('0');
  const [giorniMalattia, setGiorniMalattia] = useState('0');
  const [assenze, setAssenze] = useState('0');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stima, setStima] = useState(null);
  const [cedolini, setCedolini] = useState([]);
  const [riepilogo, setRiepilogo] = useState(null);

  useEffect(() => { loadDipendenti(); }, []);
  useEffect(() => { if (activeTab === 'storico') { loadCedolini(); loadRiepilogo(); } }, [activeTab, selectedMese, anno]);

  const loadDipendenti = async () => {
    try {
      const res = await api.get('/api/dipendenti');
      setDipendenti(res.data.filter(d => d.status === 'attivo' || d.status === 'active'));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedDipendente) {
      const dip = dipendenti.find(d => d.id === selectedDipendente);
      if (dip?.stipendio_orario) {
        setPagaOraria(dip.stipendio_orario.toString());
      } else {
        setPagaOraria('');
      }
    }
  }, [selectedDipendente, dipendenti]);

  const loadCedolini = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/cedolini/lista/${anno}/${selectedMese}`);
      setCedolini(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadRiepilogo = async () => {
    try {
      const res = await api.get(`/api/cedolini/riepilogo-mensile/${anno}/${selectedMese}`);
      setRiepilogo(res.data);
    } catch (e) { console.error(e); }
  };

  const handleCalcola = async () => {
    if (!selectedDipendente) return alert('Seleziona un dipendente');
    try {
      setCalculating(true);
      const res = await api.post('/api/cedolini/stima', {
        dipendente_id: selectedDipendente, mese: selectedMese, anno,
        ore_lavorate: parseFloat(oreLavorate) || 0,
        paga_oraria: parseFloat(pagaOraria) || 0,
        straordinari_ore: parseFloat(straordinari) || 0,
        festivita_ore: parseFloat(festivita) || 0,
        ore_domenicali: parseFloat(oreDomenicali) || 0,
        ore_malattia: parseFloat(oreMalattia) || 0,
        giorni_malattia: parseInt(giorniMalattia) || 0,
        assenze_ore: parseFloat(assenze) || 0
      });
      setStima(res.data);
    } catch (e) { alert('Errore: ' + (e.response?.data?.detail || e.message)); } finally { setCalculating(false); }
  };

  const handleConferma = async () => {
    if (!stima || !window.confirm(`Confermare cedolino?\nNetto: €${stima.netto_in_busta.toFixed(2)}`)) return;
    try {
      await api.post('/api/cedolini/conferma', stima);
      alert('Cedolino confermato');
      setStima(null);
      setSelectedDipendente('');
    } catch (e) { alert('Errore: ' + (e.response?.data?.detail || e.message)); }
  };

  const fmt = (v) => v != null ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v) : '-';

  return (
    <div style={styles.container} data-testid="cedolini-page">
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <FileText style={{ ...styles.iconLg, color: '#2563eb' }} /> Cedolini Paga
        </h1>
        <div style={styles.row}>
          <Select value={selectedMese.toString()} onValueChange={(v) => setSelectedMese(parseInt(v))}>
            <SelectTrigger style={{ width: 96, height: 32, fontSize: 12 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESI.map((m, i) => <SelectItem key={i} value={(i+1).toString()}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <span style={{ fontSize: 14, fontWeight: '600', color: '#475569' }}>{anno}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ height: 32 }}>
          <TabsTrigger value="calcola" style={{ fontSize: 12, height: 28, padding: '0 12px' }}>
            <Calculator style={styles.icon} />Calcola
          </TabsTrigger>
          <TabsTrigger value="storico" style={{ fontSize: 12, height: 28, padding: '0 12px' }}>
            <FileText style={styles.icon} />Storico
          </TabsTrigger>
        </TabsList>

        {/* TAB CALCOLA */}
        <TabsContent value="calcola" style={{ marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: stima ? '1fr 1fr' : '1fr', gap: 12 }}>
            {/* Form */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitle}><Users style={{ ...styles.iconMd, color: '#2563eb' }} />Dati</div>
              </div>
              <div style={styles.cardContent}>
                <div style={{ marginBottom: 8 }}>
                  <label style={styles.label}>Dipendente</label>
                  <Select value={selectedDipendente} onValueChange={setSelectedDipendente}>
                    <SelectTrigger style={{ height: 32, fontSize: 12 }} data-testid="dipendente-select"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      {dipendenti.map(d => <SelectItem key={d.id} value={d.id}>{d.nome_completo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div style={{ ...styles.grid2, marginBottom: 8 }}>
                  <div>
                    <label style={styles.label}>Paga Oraria €</label>
                    <Input type="number" step="0.01" value={pagaOraria} onChange={(e) => setPagaOraria(e.target.value)} style={styles.input} placeholder="Es: 9.50" />
                  </div>
                  <div>
                    <label style={styles.label}>Ore Lavorate</label>
                    <Input type="number" value={oreLavorate} onChange={(e) => setOreLavorate(e.target.value)} style={styles.input} />
                  </div>
                </div>
                
                <div style={{ ...styles.grid3, marginBottom: 8 }}>
                  <div><label style={styles.label}>Straord.</label><Input type="number" value={straordinari} onChange={(e) => setStraordinari(e.target.value)} style={styles.input} /></div>
                  <div><label style={styles.label}>Festività</label><Input type="number" value={festivita} onChange={(e) => setFestivita(e.target.value)} style={styles.input} /></div>
                  <div>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 4 }}><Sun style={{ width: 12, height: 12, color: '#f59e0b' }} />Domenicali</label>
                    <Input type="number" value={oreDomenicali} onChange={(e) => setOreDomenicali(e.target.value)} style={styles.input} />
                  </div>
                </div>
                
                <button 
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}
                >
                  {showAdvanced ? '▼' : '▶'} Opzioni Avanzate (Malattia, Assenze)
                </button>
                
                {showAdvanced && (
                  <div style={styles.advancedBox}>
                    <div style={styles.grid3}>
                      <div>
                        <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 4 }}><HeartPulse style={{ width: 12, height: 12, color: '#ef4444' }} />Ore Malattia</label>
                        <Input type="number" value={oreMalattia} onChange={(e) => setOreMalattia(e.target.value)} style={styles.input} />
                      </div>
                      <div>
                        <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar style={{ width: 12, height: 12, color: '#ef4444' }} />GG Malattia</label>
                        <Input type="number" value={giorniMalattia} onChange={(e) => setGiorniMalattia(e.target.value)} style={styles.input} />
                      </div>
                      <div>
                        <label style={styles.label}>Assenze (ore)</label>
                        <Input type="number" value={assenze} onChange={(e) => setAssenze(e.target.value)} style={styles.input} />
                      </div>
                    </div>
                    <p style={{ ...styles.small, marginTop: 8 }}>Malattia: 100% primi 3gg, 75% 4-20gg, 66% oltre.</p>
                  </div>
                )}
                
                <Button onClick={handleCalcola} disabled={calculating || !selectedDipendente} style={styles.btn}>
                  {calculating ? <Clock style={{ ...styles.icon, animation: 'spin 1s linear infinite' }} /> : <Calculator style={styles.icon} />}
                  {calculating ? 'Calcolo...' : 'Calcola'}
                </Button>
              </div>
            </div>

            {/* Risultato */}
            {stima && (
              <div style={styles.resultCard}>
                <div style={styles.resultHeader}>
                  <div style={{ fontSize: 13, fontWeight: '600', color: '#1e40af' }}>Stima - {stima.dipendente_nome}</div>
                </div>
                <div style={{ padding: 12 }}>
                  <div style={styles.whiteBox}>
                    <div style={{ fontWeight: '600', color: '#475569', marginBottom: 4 }}>Lordo</div>
                    <div style={styles.gridRow}>
                      <span style={{ color: '#64748b' }}>Base:</span><span style={{ textAlign: 'right' }}>{fmt(stima.retribuzione_base)}</span>
                    </div>
                    {stima.straordinari > 0 && (
                      <div style={styles.gridRow}>
                        <span style={{ color: '#64748b' }}>Straord:</span><span style={{ textAlign: 'right' }}>{fmt(stima.straordinari)}</span>
                      </div>
                    )}
                    <div style={{ ...styles.gridRow, borderTop: '1px solid #e2e8f0', paddingTop: 4, marginTop: 4 }}>
                      <span style={{ fontWeight: '600' }}>Totale:</span><span style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(stima.lordo_totale)}</span>
                    </div>
                  </div>
                  
                  <div style={styles.whiteBox}>
                    <div style={{ fontWeight: '600', color: '#475569', marginBottom: 4 }}>Trattenute</div>
                    <div style={styles.gridRow}>
                      <span style={{ color: '#64748b' }}>INPS:</span><span style={{ textAlign: 'right', color: '#dc2626' }}>-{fmt(stima.inps_dipendente)}</span>
                    </div>
                    <div style={styles.gridRow}>
                      <span style={{ color: '#64748b' }}>IRPEF:</span><span style={{ textAlign: 'right', color: '#dc2626' }}>-{fmt(stima.irpef_netta)}</span>
                    </div>
                    <div style={{ ...styles.gridRow, borderTop: '1px solid #e2e8f0', paddingTop: 4, marginTop: 4 }}>
                      <span style={{ fontWeight: '600' }}>Totale:</span><span style={{ textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>-{fmt(stima.totale_trattenute)}</span>
                    </div>
                  </div>
                  
                  <div style={styles.nettoBox}>
                    <span style={{ fontWeight: '600', color: '#166534', fontSize: 14 }}>NETTO</span>
                    <span style={{ fontSize: 20, fontWeight: 'bold', color: '#15803d' }} data-testid="netto-result">{fmt(stima.netto_in_busta)}</span>
                  </div>
                  
                  <div style={{ ...styles.whiteBox, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#475569' }}><Building2 style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />Costo Azienda</span>
                      <span style={{ fontWeight: 'bold', color: '#7c3aed' }}>{fmt(stima.costo_totale_azienda)}</span>
                    </div>
                  </div>
                  
                  <Button onClick={handleConferma} style={{ ...styles.btn, background: '#16a34a', marginTop: 8 }}>
                    <CheckCircle style={styles.icon} />Conferma
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB STORICO */}
        <TabsContent value="storico" style={{ marginTop: 8 }}>
          {riepilogo && riepilogo.num_cedolini > 0 && (
            <div style={{ ...styles.grid4, marginBottom: 12 }}>
              <div style={styles.statBox('#eff6ff', '#2563eb')}>
                <p style={styles.statLabel('#2563eb')}>Cedolini</p>
                <p style={styles.statValue('#1e40af')}>{riepilogo.num_cedolini}</p>
              </div>
              <div style={styles.statBox('#f0fdf4', '#16a34a')}>
                <p style={styles.statLabel('#16a34a')}>Lordo</p>
                <p style={styles.statValue('#166534')}>{fmt(riepilogo.totale_lordo)}</p>
              </div>
              <div style={styles.statBox('#ecfdf5', '#059669')}>
                <p style={styles.statLabel('#059669')}>Netto</p>
                <p style={styles.statValue('#047857')}>{fmt(riepilogo.totale_netto)}</p>
              </div>
              <div style={styles.statBox('#faf5ff', '#9333ea')}>
                <p style={styles.statLabel('#9333ea')}>Costo Az.</p>
                <p style={styles.statValue('#7c3aed')}>{fmt(riepilogo.totale_costo_azienda)}</p>
              </div>
            </div>
          )}
          
          <div style={styles.card}>
            <div style={{ padding: 8 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 16, color: '#64748b', fontSize: 12 }}>Caricamento...</div>
              ) : cedolini.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 16, color: '#64748b', fontSize: 12 }}>Nessun cedolino</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Dipendente</th>
                        <th style={styles.thRight}>Ore</th>
                        <th style={styles.thRight}>Lordo</th>
                        <th style={styles.thRight}>Netto</th>
                        <th style={styles.thRight}>Costo Az.</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Stato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cedolini.map((c, i) => (
                        <tr key={i}>
                          <td style={{ ...styles.td, fontWeight: '500' }}>{c.dipendente_nome}</td>
                          <td style={styles.tdRight}>{c.ore_lavorate}</td>
                          <td style={styles.tdRight}>{fmt(c.lordo)}</td>
                          <td style={{ ...styles.tdRight, fontWeight: '600', color: '#15803d' }}>{fmt(c.netto)}</td>
                          <td style={{ ...styles.tdRight, color: '#7c3aed' }}>{fmt(c.costo_azienda)}</td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            {c.pagato ? <span style={{ color: '#16a34a' }}>✓</span> : <span style={{ color: '#ca8a04' }}>⏳</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
