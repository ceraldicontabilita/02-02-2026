import React, { useState, useEffect } from 'react';
import api from '../api';

const MANSIONI = [
  "Cameriere", "Cuoco", "Aiuto Cuoco", "Barista", "Pizzaiolo", 
  "Lavapiatti", "Cassiera", "Responsabile Sala", "Chef", "Sommelier"
];

const CONTRATTI = [
  "Tempo Indeterminato", "Tempo Determinato", "Apprendistato", 
  "Stage/Tirocinio", "Collaborazione", "Part-time"
];

export default function GestioneDipendenti() {
  const [dipendenti, setDipendenti] = useState([]);
  const [stats, setStats] = useState({});
  const [librettiScadenza, setLibrettiScadenza] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMansione, setFilterMansione] = useState('');
  const [selectedDipendente, setSelectedDipendente] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newDipendente, setNewDipendente] = useState({
    nome_completo: '',
    codice_fiscale: '',
    email: '',
    telefono: '',
    mansione: '',
    tipo_contratto: 'Tempo Indeterminato',
    data_assunzione: '',
    ore_settimanali: 40,
    libretto_numero: '',
    libretto_scadenza: ''
  });

  useEffect(() => {
    loadData();
  }, [search, filterMansione]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterMansione) params.append('mansione', filterMansione);

      const [dipRes, statsRes, librettiRes] = await Promise.all([
        api.get(`/api/dipendenti?${params}`),
        api.get('/api/dipendenti/stats'),
        api.get('/api/dipendenti/libretti/scadenze?days=60')
      ]);

      setDipendenti(dipRes.data);
      setStats(statsRes.data);
      setLibrettiScadenza(librettiRes.data);
    } catch (error) {
      console.error('Error loading dipendenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newDipendente.nome_completo) {
      alert('Nome completo è obbligatorio');
      return;
    }
    try {
      await api.post('/api/dipendenti', newDipendente);
      setShowForm(false);
      setNewDipendente({
        nome_completo: '',
        codice_fiscale: '',
        email: '',
        telefono: '',
        mansione: '',
        tipo_contratto: 'Tempo Indeterminato',
        data_assunzione: '',
        ore_settimanali: 40,
        libretto_numero: '',
        libretto_scadenza: ''
      });
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await api.put(`/api/dipendenti/${id}`, data);
      loadData();
      if (selectedDipendente?.id === id) {
        setSelectedDipendente({ ...selectedDipendente, ...data });
      }
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo dipendente?')) return;
    try {
      await api.delete(`/api/dipendenti/${id}`);
      setSelectedDipendente(null);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleInvitaPortale = async (id) => {
    try {
      await api.post(`/api/dipendenti/${id}/invita-portale`);
      alert('Invito inviato!');
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 10 }}>👥 Gestione Dipendenti</h1>
      <p style={{ color: '#666', marginBottom: 20 }}>
        Anagrafica dipendenti, turni, libretti sanitari e portale
      </p>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 15, marginBottom: 20 }}>
        <div style={{ background: '#e3f2fd', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Totale Dipendenti</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#2196f3' }}>{stats.totale || 0}</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Attivi</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#4caf50' }}>{stats.attivi || 0}</div>
        </div>
        <div style={{ 
          background: librettiScadenza.length > 0 ? '#fff3e0' : '#f5f5f5', 
          padding: 15, 
          borderRadius: 8,
          border: librettiScadenza.length > 0 ? '2px solid #ff9800' : 'none'
        }}>
          <div style={{ fontSize: 12, color: '#666' }}>⚠️ Libretti in Scadenza</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: librettiScadenza.length > 0 ? '#ff9800' : '#9e9e9e' }}>
            {librettiScadenza.length}
          </div>
        </div>
      </div>

      {/* Libretti Alert */}
      {librettiScadenza.length > 0 && (
        <div style={{ 
          background: '#fff8e1', 
          border: '1px solid #ff9800', 
          borderRadius: 8, 
          padding: 15, 
          marginBottom: 20 
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#ff9800' }}>⚠️ Libretti Sanitari in Scadenza</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {librettiScadenza.map(d => (
              <span key={d.id} style={{ 
                background: 'white', 
                padding: '5px 10px', 
                borderRadius: 4,
                fontSize: 13
              }}>
                <strong>{d.nome_completo}</strong> - scade: {new Date(d.libretto_scadenza).toLocaleDateString('it-IT')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Cerca dipendente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', minWidth: 250 }}
        />
        <select
          value={filterMansione}
          onChange={(e) => setFilterMansione(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd' }}
        >
          <option value="">Tutte le mansioni</option>
          {MANSIONI.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        
        <button
          onClick={() => setShowForm(true)}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          ➕ Nuovo Dipendente
        </button>
      </div>

      {/* Dipendenti List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: 12, textAlign: 'left' }}>Nome</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Codice Fiscale</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Mansione</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Contratto</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Libretto</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Portale</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {dipendenti.map((dip, idx) => {
                const librettoScaduto = dip.libretto_scadenza && new Date(dip.libretto_scadenza) < new Date();
                const librettoInScadenza = dip.libretto_scadenza && 
                  new Date(dip.libretto_scadenza) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
                
                return (
                  <tr key={dip.id || idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 12 }}>
                      <strong>{dip.nome_completo || dip.codice_fiscale || 'N/A'}</strong>
                      {dip.email && <div style={{ fontSize: 11, color: '#666' }}>{dip.email}</div>}
                    </td>
                    <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>
                      {dip.codice_fiscale || '-'}
                    </td>
                    <td style={{ padding: 12 }}>{dip.mansione || dip.qualifica || '-'}</td>
                    <td style={{ padding: 12, fontSize: 12 }}>{dip.tipo_contratto || '-'}</td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      {dip.libretto_scadenza ? (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          background: librettoScaduto ? '#f44336' : librettoInScadenza ? '#ff9800' : '#4caf50',
                          color: 'white'
                        }}>
                          {new Date(dip.libretto_scadenza).toLocaleDateString('it-IT')}
                        </span>
                      ) : (
                        <span style={{ color: '#999', fontSize: 12 }}>Non inserito</span>
                      )}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      {dip.portale_registrato ? (
                        <span style={{ color: '#4caf50' }}>✓ Registrato</span>
                      ) : dip.portale_invitato ? (
                        <span style={{ color: '#ff9800' }}>Invitato</span>
                      ) : (
                        <button
                          onClick={() => handleInvitaPortale(dip.id)}
                          style={{ padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
                        >
                          Invita
                        </button>
                      )}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedDipendente(dip)}
                        style={{ padding: '4px 8px', marginRight: 5, cursor: 'pointer' }}
                        title="Dettagli"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => handleDelete(dip.id)}
                        style={{ padding: '4px 8px', cursor: 'pointer', color: '#f44336' }}
                        title="Elimina"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {dipendenti.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
              Nessun dipendente trovato
            </div>
          )}
        </div>
      )}

      {/* New Dipendente Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 24,
            maxWidth: 600,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>➕ Nuovo Dipendente</h2>
            
            <div style={{ display: 'grid', gap: 15 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Nome Completo *</label>
                  <input
                    type="text"
                    value={newDipendente.nome_completo}
                    onChange={(e) => setNewDipendente({ ...newDipendente, nome_completo: e.target.value })}
                    placeholder="Cognome Nome"
                    style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Codice Fiscale</label>
                  <input
                    type="text"
                    value={newDipendente.codice_fiscale}
                    onChange={(e) => setNewDipendente({ ...newDipendente, codice_fiscale: e.target.value.toUpperCase() })}
                    maxLength={16}
                    style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Email</label>
                  <input
                    type="email"
                    value={newDipendente.email}
                    onChange={(e) => setNewDipendente({ ...newDipendente, email: e.target.value })}
                    style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Telefono</label>
                  <input
                    type="tel"
                    value={newDipendente.telefono}
                    onChange={(e) => setNewDipendente({ ...newDipendente, telefono: e.target.value })}
                    style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Mansione</label>
                  <select
                    value={newDipendente.mansione}
                    onChange={(e) => setNewDipendente({ ...newDipendente, mansione: e.target.value })}
                    style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  >
                    <option value="">Seleziona...</option>
                    {MANSIONI.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Tipo Contratto</label>
                  <select
                    value={newDipendente.tipo_contratto}
                    onChange={(e) => setNewDipendente({ ...newDipendente, tipo_contratto: e.target.value })}
                    style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  >
                    {CONTRATTI.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Data Assunzione</label>
                  <input
                    type="date"
                    value={newDipendente.data_assunzione}
                    onChange={(e) => setNewDipendente({ ...newDipendente, data_assunzione: e.target.value })}
                    style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Ore Settimanali</label>
                  <input
                    type="number"
                    value={newDipendente.ore_settimanali}
                    onChange={(e) => setNewDipendente({ ...newDipendente, ore_settimanali: parseInt(e.target.value) })}
                    style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                </div>
              </div>
              
              <hr style={{ margin: '10px 0' }} />
              <h4 style={{ margin: 0 }}>📋 Libretto Sanitario</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Numero Libretto</label>
                  <input
                    type="text"
                    value={newDipendente.libretto_numero}
                    onChange={(e) => setNewDipendente({ ...newDipendente, libretto_numero: e.target.value })}
                    style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Scadenza Libretto</label>
                  <input
                    type="date"
                    value={newDipendente.libretto_scadenza}
                    onChange={(e) => setNewDipendente({ ...newDipendente, libretto_scadenza: e.target.value })}
                    style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: '10px 20px', background: '#9e9e9e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Annulla
              </button>
              <button
                onClick={handleCreate}
                style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDipendente && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setSelectedDipendente(null)}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 24,
            maxWidth: 600,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>👤 {selectedDipendente.nome_completo}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginTop: 20 }}>
              <div>
                <strong>Codice Fiscale:</strong> {selectedDipendente.codice_fiscale || '-'}
              </div>
              <div>
                <strong>Matricola:</strong> {selectedDipendente.matricola || '-'}
              </div>
              <div>
                <strong>Email:</strong> {selectedDipendente.email || '-'}
              </div>
              <div>
                <strong>Telefono:</strong> {selectedDipendente.telefono || '-'}
              </div>
              <div>
                <strong>Mansione:</strong> {selectedDipendente.mansione || selectedDipendente.qualifica || '-'}
              </div>
              <div>
                <strong>Contratto:</strong> {selectedDipendente.tipo_contratto || '-'}
              </div>
              <div>
                <strong>Data Assunzione:</strong> {selectedDipendente.data_assunzione ? new Date(selectedDipendente.data_assunzione).toLocaleDateString('it-IT') : '-'}
              </div>
              <div>
                <strong>Ore Settimanali:</strong> {selectedDipendente.ore_settimanali || '-'}
              </div>
            </div>
            
            <hr style={{ margin: '20px 0' }} />
            
            <h3>📋 Libretto Sanitario</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div>
                <strong>Numero:</strong> {selectedDipendente.libretto_numero || '-'}
              </div>
              <div>
                <strong>Scadenza:</strong>{' '}
                {selectedDipendente.libretto_scadenza ? (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: new Date(selectedDipendente.libretto_scadenza) < new Date() ? '#f44336' : '#4caf50',
                    color: 'white'
                  }}>
                    {new Date(selectedDipendente.libretto_scadenza).toLocaleDateString('it-IT')}
                  </span>
                ) : '-'}
              </div>
            </div>
            
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button
                onClick={() => setSelectedDipendente(null)}
                style={{ padding: '10px 20px', background: '#9e9e9e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
