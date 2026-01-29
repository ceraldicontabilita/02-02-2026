import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { useAnnoGlobale } from '../contexts/AnnoContext';
import { formatEuro, formatDateIT, STYLES, COLORS, button, badge } from '../lib/utils';
import { PageLayout } from '../components/PageLayout';
import { ExportButton } from '../components/ExportButton';
import { PageInfoCard } from '../components/PageInfoCard';

/**
 * GESTIONE DIPENDENTI UNIFICATA
 * 
 * Una sola pagina con tab per:
 * - Anagrafica
 * - Contratti
 * - Retribuzione & Cedolini
 * - Bonifici
 * - Acconti
 * 
 * URL con tab: /dipendenti/anagrafica, /dipendenti/contratti, etc.
 */

const TABS = [
  { id: 'anagrafica', label: '👤 Anagrafica', icon: '👤' },
  { id: 'giustificativi', label: '📋 Giustificativi', icon: '📋' },
  { id: 'contratti', label: '📄 Contratti', icon: '📄' },
  { id: 'retribuzione', label: '💰 Retribuzione', icon: '💰' },
  { id: 'bonifici', label: '🏦 Bonifici', icon: '🏦' },
  { id: 'acconti', label: '💵 Acconti', icon: '💵' },
];

export default function GestioneDipendentiUnificata() {
  const { anno } = useAnnoGlobale();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Ottieni tab e subtab dall'URL
  const getTabFromPath = () => {
    const path = location.pathname;
    const match = path.match(/\/dipendenti\/(\w+)/);
    if (match && TABS.find(t => t.id === match[1])) {
      return match[1];
    }
    return 'anagrafica';
  };
  
  const getSubtabFromPath = () => {
    const path = location.pathname;
    const match = path.match(/\/dipendenti\/giustificativi\/(\w+)/);
    return match ? match[1] : 'tutti';
  };
  
  const [dipendenti, setDipendenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDip, setSelectedDip] = useState(null);
  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [activeSubtab, setActiveSubtab] = useState(getSubtabFromPath());
  const [search, setSearch] = useState('');
  
  // Aggiorna URL quando cambia tab
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'anagrafica') {
      navigate('/dipendenti');
    } else if (tabId === 'giustificativi') {
      navigate(`/dipendenti/giustificativi/${activeSubtab}`);
    } else {
      navigate(`/dipendenti/${tabId}`);
    }
  };
  
  // Aggiorna URL quando cambia subtab (categoria giustificativi)
  const handleSubtabChange = (subtabId) => {
    setActiveSubtab(subtabId);
    navigate(`/dipendenti/giustificativi/${subtabId}`);
  };
  
  // Sincronizza tab con URL
  useEffect(() => {
    const tab = getTabFromPath();
    const subtab = getSubtabFromPath();
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
    if (subtab !== activeSubtab) {
      setActiveSubtab(subtab);
    }
  }, [location.pathname]);
  
  // Stati per ogni tab
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contratti, setContratti] = useState([]);
  const [cedolini, setCedolini] = useState([]);
  const [bonifici, setBonifici] = useState([]);
  const [acconti, setAcconti] = useState([]);
  const [loadingTab, setLoadingTab] = useState(false);

  // Form anagrafica
  const [formData, setFormData] = useState({});

  // Carica lista dipendenti
  useEffect(() => {
    loadDipendenti();
  }, []);

  // Carica dati tab quando cambia dipendente o tab
  useEffect(() => {
    if (selectedDip) {
      loadTabData();
    }
  }, [selectedDip, activeTab, anno]);

  const loadDipendenti = async () => {
    try {
      const res = await api.get('/api/dipendenti');
      setDipendenti(res.data || []);
    } catch (e) {
      console.error('Errore:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    if (!selectedDip) return;
    console.log('loadTabData chiamato, tab:', activeTab, 'dip:', selectedDip?.id);
    setLoadingTab(true);
    
    try {
      switch (activeTab) {
        case 'anagrafica':
          setFormData({
            nome: selectedDip.nome || '',
            cognome: selectedDip.cognome || '',
            nome_completo: selectedDip.nome_completo || '',
            codice_fiscale: selectedDip.codice_fiscale || '',
            data_nascita: selectedDip.data_nascita || '',
            luogo_nascita: selectedDip.luogo_nascita || '',
            indirizzo: selectedDip.indirizzo || '',
            telefono: selectedDip.telefono || '',
            email: selectedDip.email || '',
            mansione: selectedDip.mansione || selectedDip.qualifica || '',
            data_assunzione: selectedDip.data_assunzione || '',
            ibans: selectedDip.ibans || [],
          });
          break;
          
        case 'contratti':
          const contRes = await api.get(`/api/dipendenti/contratti?dipendente_id=${selectedDip.id}`);
          setContratti(contRes.data || []);
          break;
          
        case 'retribuzione':
          const cedRes = await api.get(`/api/cedolini/dipendente/${selectedDip.id}?anno=${anno}`);
          setCedolini(Array.isArray(cedRes.data) ? cedRes.data : cedRes.data?.cedolini || []);
          break;
          
        case 'bonifici':
          // Cerca bonifici per nome dipendente (beneficiario)
          const nomeDip = selectedDip.nome_completo || `${selectedDip.cognome || ''} ${selectedDip.nome || ''}`.trim();
          const bonRes = await api.get(`/api/archivio-bonifici/transfers?beneficiario=${encodeURIComponent(nomeDip)}`);
          setBonifici(Array.isArray(bonRes.data) ? bonRes.data : []);
          break;
          
        case 'acconti':
          const accRes = await api.get(`/api/tfr/acconti/${selectedDip.id}`);
          setAcconti(Array.isArray(accRes.data) ? accRes.data : accRes.data?.acconti || []);
          break;
          
        case 'giustificativi':
          // I giustificativi vengono caricati dal componente TabGiustificativi stesso
          // Non serve caricare nulla qui
          console.log('Case giustificativi - nessuna azione');
          break;
      }
    } catch (e) {
      console.error('Errore caricamento tab:', e);
    } finally {
      console.log('Setting loadingTab = false');
      setLoadingTab(false);
    }
  };

  const handleSelectDipendente = (dip) => {
    setSelectedDip(dip);
    setEditMode(false);
  };

  const handleSaveAnagrafica = async () => {
    setSaving(true);
    try {
      await api.put(`/api/dipendenti/${selectedDip.id}`, formData);
      await loadDipendenti();
      setSelectedDip(prev => ({ ...prev, ...formData }));
      setEditMode(false);
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(false);
    }
  };

  // Filtra dipendenti
  const filteredDip = dipendenti.filter(d => {
    const nome = (d.nome_completo || `${d.cognome} ${d.nome}` || '').toLowerCase();
    return nome.includes(search.toLowerCase());
  });

  return (
    <PageLayout title="Dipendenti" icon="👥" subtitle="Gestione personale">
    <div style={{ padding: 'clamp(12px, 3vw, 20px)', height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Page Info Card */}
      <div style={{ position: 'absolute', top: 0, right: 20, zIndex: 100 }}>
        <PageInfoCard pageKey="dipendenti" />
      </div>
      
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 26px)', color: '#1e293b' }}>
            👥 Gestione Dipendenti
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Anagrafica, contratti, retribuzioni, bonifici e acconti
          </p>
        </div>
        <ExportButton
          data={filteredDip}
          columns={[
            { key: 'nome_completo', label: 'Nome' },
            { key: 'codice_fiscale', label: 'Codice Fiscale' },
            { key: 'data_assunzione', label: 'Data Assunzione' },
            { key: 'qualifica', label: 'Qualifica' },
            { key: 'livello', label: 'Livello' },
            { key: 'status', label: 'Stato' }
          ]}
          filename="dipendenti"
          format="csv"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* SIDEBAR - Lista Dipendenti */}
        <div style={{ 
          background: 'white', 
          borderRadius: 12, 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Ricerca */}
          <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
            <input
              type="text"
              placeholder="🔍 Cerca dipendente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 13
              }}
            />
          </div>
          
          {/* Lista */}
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Caricamento...</div>
            ) : filteredDip.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Nessun dipendente</div>
            ) : (
              filteredDip.map(dip => (
                <div
                  key={dip.id}
                  onClick={() => handleSelectDipendente(dip)}
                  style={{
                    padding: '12px',
                    marginBottom: 6,
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: selectedDip?.id === dip.id ? '#dbeafe' : '#f8fafc',
                    border: selectedDip?.id === dip.id ? '2px solid #3b82f6' : '1px solid transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                    {dip.nome_completo || `${dip.cognome || ''} ${dip.nome || ''}`.trim() || 'N/A'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {dip.mansione || dip.qualifica || 'Mansione N/D'}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    CF: {dip.codice_fiscale?.substring(0, 10) || 'N/D'}...
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Conteggio */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#64748b', textAlign: 'center' }}>
            {filteredDip.length} dipendenti
          </div>
        </div>

        {/* MAIN - Dettaglio con Tab */}
        <div style={{ 
          background: 'white', 
          borderRadius: 12, 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {!selectedDip ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👈</div>
                <div>Seleziona un dipendente dalla lista</div>
              </div>
            </div>
          ) : (
            <>
              {/* Header dipendente + Tab */}
              <div style={{ borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ padding: '16px 20px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>
                    {selectedDip.nome_completo || `${selectedDip.cognome || ''} ${selectedDip.nome || ''}`.trim()}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    {selectedDip.mansione || selectedDip.qualifica || 'N/D'} • CF: {selectedDip.codice_fiscale || 'N/D'}
                  </div>
                </div>
                
                {/* Tab */}
                <div style={{ display: 'flex', gap: 0, padding: '0 12px', background: 'white', overflowX: 'auto' }}>
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      style={{
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
                        color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                        fontWeight: activeTab === tab.id ? 600 : 400,
                        cursor: 'pointer',
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contenuto Tab */}
              <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                {loadingTab ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    <div style={{ fontSize: 32 }}>⏳</div>
                    <div>Caricamento...</div>
                  </div>
                ) : (
                  <>
                    {activeTab === 'anagrafica' && (
                      <TabAnagrafica 
                        formData={formData} 
                        setFormData={setFormData}
                        editMode={editMode}
                        setEditMode={setEditMode}
                        onSave={handleSaveAnagrafica}
                        saving={saving}
                      />
                    )}
                    {activeTab === 'giustificativi' && (
                      <TabGiustificativi 
                        dipendente={selectedDip}
                        anno={anno}
                        selectedCategoria={activeSubtab}
                        onCategoriaChange={handleSubtabChange}
                      />
                    )}
                    {activeTab === 'contratti' && (
                      <TabContratti 
                        contratti={contratti}
                        dipendente={selectedDip}
                        onReload={loadTabData}
                      />
                    )}
                    {activeTab === 'retribuzione' && (
                      <TabRetribuzione 
                        cedolini={cedolini}
                        dipendente={selectedDip}
                        anno={anno}
                      />
                    )}
                    {activeTab === 'bonifici' && (
                      <TabBonifici 
                        bonifici={bonifici}
                        dipendente={selectedDip}
                        onReload={loadTabData}
                      />
                    )}
                    {activeTab === 'acconti' && (
                      <TabAcconti 
                        acconti={acconti}
                        dipendente={selectedDip}
                        onReload={loadTabData}
                      />
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// TAB COMPONENTS
// ============================================

function TabAnagrafica({ formData, setFormData, editMode, setEditMode, onSave, saving }) {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddIban = () => {
    const newIban = prompt('Inserisci nuovo IBAN:');
    if (newIban && newIban.trim()) {
      setFormData(prev => ({
        ...prev,
        ibans: [...(prev.ibans || []), newIban.trim().toUpperCase()]
      }));
    }
  };

  const handleRemoveIban = (idx) => {
    setFormData(prev => ({
      ...prev,
      ibans: prev.ibans.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#374151' }}>Dati Anagrafici</h3>
        {!editMode ? (
          <button onClick={() => setEditMode(true)} style={btnStyle('#3b82f6')}>✏️ Modifica</button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditMode(false)} style={btnStyle('#94a3b8')}>Annulla</button>
            <button onClick={onSave} disabled={saving} style={btnStyle('#10b981')}>
              {saving ? '⏳' : '💾'} Salva
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <Field label="Nome" value={formData.nome} onChange={v => handleChange('nome', v)} disabled={!editMode} />
        <Field label="Cognome" value={formData.cognome} onChange={v => handleChange('cognome', v)} disabled={!editMode} />
        <Field label="Nome Completo" value={formData.nome_completo} onChange={v => handleChange('nome_completo', v)} disabled={!editMode} />
        <Field label="Codice Fiscale" value={formData.codice_fiscale} onChange={v => handleChange('codice_fiscale', v)} disabled={!editMode} />
        <Field label="Data Nascita" value={formData.data_nascita} onChange={v => handleChange('data_nascita', v)} disabled={!editMode} type="date" />
        <Field label="Luogo Nascita" value={formData.luogo_nascita} onChange={v => handleChange('luogo_nascita', v)} disabled={!editMode} />
        <Field label="Indirizzo" value={formData.indirizzo} onChange={v => handleChange('indirizzo', v)} disabled={!editMode} />
        <Field label="Telefono" value={formData.telefono} onChange={v => handleChange('telefono', v)} disabled={!editMode} />
        <Field label="Email" value={formData.email} onChange={v => handleChange('email', v)} disabled={!editMode} type="email" />
        <Field label="Mansione" value={formData.mansione} onChange={v => handleChange('mansione', v)} disabled={!editMode} />
        <Field label="Data Assunzione" value={formData.data_assunzione} onChange={v => handleChange('data_assunzione', v)} disabled={!editMode} type="date" />
      </div>

      {/* Flag In Carico - per modulo presenze */}
      <div style={{ marginTop: 20, padding: 16, background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0369a1', marginBottom: 4 }}>📋 Gestione Presenze</div>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              Se attivo, il dipendente comparirà nel modulo presenze e nel calendario timbrature
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: editMode ? 'pointer' : 'default' }}>
            <input 
              type="checkbox" 
              checked={formData.in_carico !== false}
              onChange={(e) => handleChange('in_carico', e.target.checked)}
              disabled={!editMode}
              style={{ width: 20, height: 20, cursor: editMode ? 'pointer' : 'default' }}
              data-testid="in-carico-toggle"
            />
            <span style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              padding: '6px 12px',
              borderRadius: 6,
              background: formData.in_carico !== false ? '#dcfce7' : '#fee2e2',
              color: formData.in_carico !== false ? '#166534' : '#dc2626'
            }}>
              {formData.in_carico !== false ? '✓ In Carico' : '✗ Non in Carico'}
            </span>
          </label>
        </div>
      </div>

      {/* IBAN multipli */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 14, color: '#374151' }}>🏦 IBAN</h4>
          {editMode && (
            <button onClick={handleAddIban} style={btnStyle('#3b82f6', 'small')}>+ Aggiungi IBAN</button>
          )}
        </div>
        {(!formData.ibans || formData.ibans.length === 0) ? (
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, color: '#94a3b8', textAlign: 'center' }}>
            Nessun IBAN registrato
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {formData.ibans.map((iban, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                padding: '10px 14px', 
                background: '#f8fafc', 
                borderRadius: 8,
                border: '1px solid #e5e7eb'
              }}>
                <span style={{ fontFamily: 'monospace', flex: 1 }}>{iban}</span>
                {editMode && (
                  <button onClick={() => handleRemoveIban(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabContratti({ contratti, dipendente, onReload }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#374151' }}>Contratti</h3>
      </div>
      
      {contratti.length === 0 ? (
        <EmptyState icon="📋" text="Nessun contratto registrato" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {contratti.map((c, idx) => (
            <div key={idx} style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{c.tipo_contratto || 'Contratto'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 13 }}>
                <div><span style={{ color: '#64748b' }}>Inizio:</span> {c.data_inizio || 'N/D'}</div>
                <div><span style={{ color: '#64748b' }}>Fine:</span> {c.data_fine || 'Indeterminato'}</div>
                <div><span style={{ color: '#64748b' }}>Livello:</span> {c.livello || 'N/D'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabRetribuzione({ cedolini, dipendente, anno }) {
  const totaleNetto = cedolini.reduce((sum, c) => sum + (c.netto || c.netto_in_busta || 0), 0);
  const totaleLordo = cedolini.reduce((sum, c) => sum + (c.lordo || c.lordo_totale || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#374151' }}>Cedolini {anno}</h3>
      </div>

      {/* Riepilogo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatBox label="Cedolini" value={cedolini.length} color="#3b82f6" />
        <StatBox label="Totale Lordo" value={formatEuro(totaleLordo)} color="#f59e0b" />
        <StatBox label="Totale Netto" value={formatEuro(totaleNetto)} color="#10b981" />
      </div>
      
      {cedolini.length === 0 ? (
        <EmptyState icon="💰" text={`Nessun cedolino per ${anno}`} />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={thStyle}>Mese</th>
              <th style={thStyle}>Ore</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Lordo</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Netto</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Allegato</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Stato</th>
            </tr>
          </thead>
          <tbody>
            {cedolini.map((c, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdStyle}>{getMeseName(c.mese)}</td>
                <td style={tdStyle}>{c.ore_lavorate || '-'}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{formatEuro(c.lordo || c.lordo_totale || 0)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{formatEuro(c.netto || c.netto_in_busta || 0)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {c.pdf_data ? (
                    <a
                      href={`${import.meta.env.VITE_BACKEND_URL || ''}/api/cedolini/${c.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}
                    >
                      📎 PDF
                    </a>
                  ) : '-'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {c.pagato ? <span style={{ color: '#10b981' }}>✓ Pagato</span> : <span style={{ color: '#f59e0b' }}>⏳</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TabBonifici({ bonifici, dipendente, onReload }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#374151' }}>Bonifici Effettuati</h3>
      </div>
      
      {bonifici.length === 0 ? (
        <EmptyState icon="🏦" text="Nessun bonifico registrato" />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={thStyle}>Data</th>
              <th style={thStyle}>Descrizione</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Importo</th>
              <th style={thStyle}>IBAN</th>
            </tr>
          </thead>
          <tbody>
            {bonifici.map((b, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdStyle}>{b.data ? formatDateIT(b.data) : '-'}</td>
                <td style={tdStyle}>{b.descrizione || b.causale || '-'}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatEuro(b.importo || 0)}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{b.iban?.substring(0, 20) || '-'}...</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TabAcconti({ acconti: accontiData, dipendente, onReload }) {
  const [showForm, setShowForm] = useState(false);
  const [editingAcconto, setEditingAcconto] = useState(null);
  const [newAcconto, setNewAcconto] = useState({ importo: '', data: '', note: '', tipo: 'tfr' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Gestisce sia array che oggetto strutturato
  const accontiObj = accontiData && typeof accontiData === 'object' && !Array.isArray(accontiData) 
    ? accontiData 
    : { tfr_accantonato: 0, tfr_acconti: 0, tfr_saldo: 0, totale_acconti: 0, acconti: { tfr: [], ferie: [], tredicesima: [], quattordicesima: [], prestito: [] } };
  
  // Flatten tutti gli acconti in un array
  const allAcconti = accontiObj.acconti 
    ? [...(accontiObj.acconti.tfr || []), ...(accontiObj.acconti.ferie || []), ...(accontiObj.acconti.tredicesima || []), ...(accontiObj.acconti.quattordicesima || []), ...(accontiObj.acconti.prestito || [])]
    : (Array.isArray(accontiData) ? accontiData : []);

  const handleAddAcconto = async () => {
    if (!newAcconto.importo) return alert('Inserisci importo');
    setSaving(true);
    try {
      await api.post(`/api/tfr/acconti`, {
        dipendente_id: dipendente.id,
        tipo: newAcconto.tipo,
        importo: parseFloat(newAcconto.importo),
        data: newAcconto.data || new Date().toISOString().split('T')[0],
        note: newAcconto.note
      });
      setShowForm(false);
      setNewAcconto({ importo: '', data: '', note: '', tipo: 'tfr' });
      onReload();
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAcconto = async () => {
    if (!editingAcconto || !editingAcconto.importo) return alert('Inserisci importo');
    setSaving(true);
    try {
      await api.put(`/api/tfr/acconti/${editingAcconto.id}`, {
        tipo: editingAcconto.tipo,
        importo: parseFloat(editingAcconto.importo),
        data: editingAcconto.data,
        note: editingAcconto.note
      });
      setEditingAcconto(null);
      onReload();
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAcconto = async (accontoId) => {
    if (!confirm('Sei sicuro di voler eliminare questo acconto?')) return;
    setDeleting(accontoId);
    try {
      await api.delete(`/api/tfr/acconti/${accontoId}`);
      onReload();
    } catch (e) {
      alert('Errore eliminazione: ' + (e.response?.data?.detail || e.message));
    } finally {
      setDeleting(null);
    }
  };

  const totaleAcconti = accontiObj.totale_acconti || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#374151' }}>Acconti</h3>
        <button onClick={() => setShowForm(!showForm)} style={btnStyle('#3b82f6')}>
          {showForm ? 'Annulla' : '+ Nuovo Acconto'}
        </button>
      </div>

      {/* Form nuovo acconto */}
      {showForm && (
        <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 8, marginBottom: 20, border: '1px solid #bae6fd' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Tipo</label>
              <select 
                value={newAcconto.tipo} 
                onChange={e => setNewAcconto(p => ({ ...p, tipo: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
              >
                <option value="tfr">TFR</option>
                <option value="ferie">Ferie</option>
                <option value="tredicesima">Tredicesima</option>
                <option value="quattordicesima">Quattordicesima</option>
                <option value="prestito">Prestito</option>
              </select>
            </div>
            <Field label="Importo €" value={newAcconto.importo} onChange={v => setNewAcconto(p => ({ ...p, importo: v }))} type="number" />
            <Field label="Data" value={newAcconto.data} onChange={v => setNewAcconto(p => ({ ...p, data: v }))} type="date" />
            <Field label="Note" value={newAcconto.note} onChange={v => setNewAcconto(p => ({ ...p, note: v }))} />
          </div>
          <button onClick={handleAddAcconto} disabled={saving} style={{ ...btnStyle('#10b981'), marginTop: 12 }}>
            {saving ? '⏳' : '💾'} Salva Acconto
          </button>
        </div>
      )}

      {/* Totale e TFR Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>TFR Accantonato</div>
          <div style={{ fontWeight: 700, color: '#059669' }}>{formatEuro(accontiObj.tfr_accantonato || 0)}</div>
        </div>
        <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Totale Acconti</div>
          <div style={{ fontWeight: 700, color: '#f59e0b' }}>{formatEuro(totaleAcconti)}</div>
        </div>
        <div style={{ padding: 12, background: '#dbeafe', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>TFR Saldo</div>
          <div style={{ fontWeight: 700, color: '#2563eb' }}>{formatEuro(accontiObj.tfr_saldo || 0)}</div>
        </div>
      </div>
      
      {allAcconti.length === 0 ? (
        <EmptyState icon="💵" text="Nessun acconto registrato" />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={thStyle}>Data</th>
              <th style={thStyle}>Tipo</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Importo</th>
              <th style={thStyle}>Note</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {allAcconti.map((a, idx) => (
              <tr key={a.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdStyle}>{a.data ? formatDateIT(a.data) : '-'}</td>
                <td style={tdStyle}><span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: 4, fontSize: 11 }}>{a.tipo || 'N/D'}</span></td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>{formatEuro(a.importo || 0)}</td>
                <td style={tdStyle}>{a.note || '-'}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button
                    onClick={() => setEditingAcconto({ ...a })}
                    style={{ ...btnStyle('#3b82f6', 'small'), marginRight: 4 }}
                    title="Modifica"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteAcconto(a.id)}
                    disabled={deleting === a.id}
                    style={{ ...btnStyle('#ef4444', 'small'), opacity: deleting === a.id ? 0.5 : 1 }}
                    title="Elimina"
                  >
                    {deleting === a.id ? '⏳' : '🗑️'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal di modifica acconto */}
      {editingAcconto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 500,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>✏️ Modifica Acconto</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Tipo</label>
                <select 
                  value={editingAcconto.tipo} 
                  onChange={e => setEditingAcconto(p => ({ ...p, tipo: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
                >
                  <option value="tfr">TFR</option>
                  <option value="ferie">Ferie</option>
                  <option value="tredicesima">Tredicesima</option>
                  <option value="quattordicesima">Quattordicesima</option>
                  <option value="prestito">Prestito</option>
                </select>
              </div>
              <Field 
                label="Importo €" 
                value={editingAcconto.importo} 
                onChange={v => setEditingAcconto(p => ({ ...p, importo: v }))} 
                type="number" 
              />
              <Field 
                label="Data" 
                value={editingAcconto.data} 
                onChange={v => setEditingAcconto(p => ({ ...p, data: v }))} 
                type="date" 
              />
              <Field 
                label="Note" 
                value={editingAcconto.note} 
                onChange={v => setEditingAcconto(p => ({ ...p, note: v }))} 
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button 
                onClick={() => setEditingAcconto(null)} 
                style={{ ...btnStyle('#64748b'), flex: 1 }}
              >
                Annulla
              </button>
              <button 
                onClick={handleUpdateAcconto} 
                disabled={saving}
                style={{ ...btnStyle('#10b981'), flex: 1 }}
              >
                {saving ? '⏳' : '💾'} Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function Field({ label, value, onChange, disabled, type = 'text' }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          fontSize: 13,
          background: disabled ? '#f8fafc' : 'white'
        }}
      />
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.5 }}>{icon}</div>
      <div>{text}</div>
    </div>
  );
}

const btnStyle = (color, size = 'normal') => ({
  padding: size === 'small' ? '6px 12px' : '10px 16px',
  background: color,
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: size === 'small' ? 12 : 13
});

const thStyle = { padding: 10, textAlign: 'left', fontWeight: 600, color: '#374151' };
const tdStyle = { padding: 10 };

const getMeseName = (mese) => {
  const mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return mesi[(mese || 1) - 1] || mese;
};


// ============================================
// TAB GIUSTIFICATIVI
// ============================================

function TabGiustificativi({ dipendente, anno, selectedCategoria = 'tutti', onCategoriaChange }) {
  const [giustificativi, setGiustificativi] = useState([]);
  const [saldoFerie, setSaldoFerie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Handler per cambio categoria - usa la prop se fornita
  const handleCategoriaClick = (cat) => {
    if (onCategoriaChange) {
      onCategoriaChange(cat);
    }
  };
  
  // Carica dati al mount e quando cambia dipendente
  useEffect(() => {
    if (!dipendente?.id) {
      setLoading(false);
      return;
    }
    
    let cancelled = false;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Prima chiamata - giustificativi
        const giustRes = await api.get(`/api/giustificativi/dipendente/${dipendente.id}/giustificativi`, { 
          params: { anno },
          timeout: 60000 // 60 secondi di timeout
        });
        
        if (cancelled) return;
        setGiustificativi(giustRes.data?.giustificativi || []);
        
        // Seconda chiamata - ferie
        const ferieRes = await api.get(`/api/giustificativi/dipendente/${dipendente.id}/saldo-ferie`, { 
          params: { anno },
          timeout: 60000
        });
        
        if (cancelled) return;
        setSaldoFerie(ferieRes.data || null);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Errore caricamento:', err);
        setError(err.response?.data?.detail || err.message || 'Errore caricamento');
        setLoading(false);
      }
    };
    
    fetchData();
    
    return () => { cancelled = true; };
  }, [dipendente?.id, anno]);
  
  // Se non c'è dipendente selezionato
  if (!dipendente?.id) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Seleziona un dipendente</div>;
  }
  
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ color: '#dc2626', marginBottom: 16 }}>Errore: {error}</div>
      </div>
    );
  }
  
  const categorie = ['tutti', 'ferie', 'permesso', 'assenza', 'congedo', 'malattia', 'formazione', 'lavoro'];
  
  const filteredGiustificativi = selectedCategoria === 'tutti' 
    ? giustificativi 
    : giustificativi.filter(g => g.categoria === selectedCategoria);
  
  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Caricamento...</div>;
  
  return (
    <div>
      {/* Riepilogo Ferie/ROL/Ex-Festività */}
      {saldoFerie && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1e3a5f', fontSize: 15 }}>📊 Riepilogo {anno}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {/* Ferie */}
            <div style={{ background: '#dcfce7', borderRadius: 10, padding: 16, border: '1px solid #86efac' }}>
              <div style={{ fontSize: 12, color: '#166534', marginBottom: 4 }}>🏖️ FERIE</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>
                {saldoFerie.ferie?.giorni_residui?.toFixed(1) || 0} <span style={{ fontSize: 12 }}>giorni</span>
              </div>
              <div style={{ fontSize: 11, color: '#15803d', marginTop: 4 }}>
                Maturate: {saldoFerie.ferie?.maturate?.toFixed(0)}h | Godute: {saldoFerie.ferie?.godute?.toFixed(0)}h
              </div>
            </div>
            
            {/* ROL */}
            <div style={{ background: '#dbeafe', borderRadius: 10, padding: 16, border: '1px solid #93c5fd' }}>
              <div style={{ fontSize: 12, color: '#1e40af', marginBottom: 4 }}>⏰ ROL</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>
                {saldoFerie.rol?.residui?.toFixed(0) || 0} <span style={{ fontSize: 12 }}>ore</span>
              </div>
              <div style={{ fontSize: 11, color: '#1d4ed8', marginTop: 4 }}>
                Maturati: {saldoFerie.rol?.maturati?.toFixed(0)}h | Goduti: {saldoFerie.rol?.goduti?.toFixed(0)}h
              </div>
            </div>
            
            {/* Ex Festività */}
            <div style={{ background: '#fef3c7', borderRadius: 10, padding: 16, border: '1px solid #fcd34d' }}>
              <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}>📅 EX FESTIVITÀ</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#92400e' }}>
                {saldoFerie.ex_festivita?.residue?.toFixed(0) || 0} <span style={{ fontSize: 12 }}>ore</span>
              </div>
              <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>
                Maturate: {saldoFerie.ex_festivita?.maturate?.toFixed(0)}h | Godute: {saldoFerie.ex_festivita?.godute?.toFixed(0)}h
              </div>
            </div>
            
            {/* Permessi */}
            <div style={{ background: '#f3e8ff', borderRadius: 10, padding: 16, border: '1px solid #d8b4fe' }}>
              <div style={{ fontSize: 12, color: '#6b21a8', marginBottom: 4 }}>🎫 PERMESSI</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#6b21a8' }}>
                {saldoFerie.permessi?.goduti_anno?.toFixed(0) || 0} <span style={{ fontSize: 12 }}>ore usate</span>
              </div>
              <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 4 }}>
                Anno {anno}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Filtro Categorie */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {categorie.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoriaClick(cat)}
            data-testid={`categoria-${cat}`}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              background: selectedCategoria === cat ? '#1e3a5f' : '#e5e7eb',
              color: selectedCategoria === cat ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'capitalize'
            }}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {/* Tabella Giustificativi */}
      <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ ...thStyle, width: 80 }}>Codice</th>
              <th style={thStyle}>Descrizione</th>
              <th style={{ ...thStyle, width: 100, textAlign: 'center' }}>Limite Anno</th>
              <th style={{ ...thStyle, width: 100, textAlign: 'center' }}>Limite Mese</th>
              <th style={{ ...thStyle, width: 100, textAlign: 'center' }}>Usate Anno</th>
              <th style={{ ...thStyle, width: 100, textAlign: 'center' }}>Usate Mese</th>
              <th style={{ ...thStyle, width: 100, textAlign: 'center' }}>Residuo</th>
              <th style={{ ...thStyle, width: 80, textAlign: 'center' }}>Stato</th>
            </tr>
          </thead>
          <tbody>
            {filteredGiustificativi.map((g, idx) => {
              const superato = g.superato_annuale || g.superato_mensile;
              const warning = g.residuo_annuale !== null && g.residuo_annuale < 10 && g.residuo_annuale >= 0;
              
              return (
                <tr 
                  key={g.codice}
                  style={{ 
                    background: superato ? '#fef2f2' : (idx % 2 === 0 ? 'white' : '#f9fafb'),
                    borderBottom: '1px solid #e5e7eb'
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#1e3a5f' }}>{g.codice}</td>
                  <td style={tdStyle}>
                    {g.descrizione}
                    {g.retribuito && <span style={{ marginLeft: 6, fontSize: 10, color: '#059669' }}>💰 Retribuito</span>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {g.limite_annuale_ore != null ? `${g.limite_annuale_ore}h` : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {g.limite_mensile_ore != null ? `${g.limite_mensile_ore}h` : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: g.ore_usate_anno > 0 ? 600 : 400 }}>
                    {g.ore_usate_anno > 0 ? `${g.ore_usate_anno.toFixed(1)}h` : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {g.ore_usate_mese > 0 ? `${g.ore_usate_mese.toFixed(1)}h` : '-'}
                  </td>
                  <td style={{ 
                    ...tdStyle, 
                    textAlign: 'center',
                    color: superato ? '#dc2626' : (warning ? '#d97706' : '#059669'),
                    fontWeight: 600
                  }}>
                    {g.residuo_annuale != null ? `${g.residuo_annuale.toFixed(1)}h` : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {superato ? (
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>⛔ SUPERATO</span>
                    ) : warning ? (
                      <span style={{ color: '#d97706' }}>⚠️ Attenzione</span>
                    ) : (
                      <span style={{ color: '#059669' }}>✓ OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Legenda */}
      <div style={{ marginTop: 16, padding: 12, background: '#f0f9ff', borderRadius: 8, fontSize: 11, color: '#0369a1' }}>
        <strong>ℹ️ Note:</strong> I limiti mostrati sono quelli di default del CCNL. Possono essere personalizzati per ogni dipendente.
        Se viene superato un limite, il sistema bloccherà l'inserimento di nuovi giustificativi di quel tipo.
      </div>
    </div>
  </PageLayout>
  );
}

