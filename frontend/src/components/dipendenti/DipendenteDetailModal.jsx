import React, { useState } from 'react';
import { MANSIONI } from './constants';

/**
 * Modale dettaglio/modifica dipendente con tab contratti
 */
export function DipendenteDetailModal({ 
  dipendente, 
  editData, 
  setEditData, 
  editMode, 
  setEditMode,
  contractTypes,
  generatingContract,
  onClose, 
  onUpdate, 
  onGenerateContract 
}) {
  const [showContracts, setShowContracts] = useState(false);
  
  if (!dipendente) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 24, maxWidth: 700, width: '100%',
        maxHeight: '90vh', overflow: 'auto'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>
            {editMode ? '✏️ Modifica Dipendente' : '👤 Dettaglio Dipendente'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '2px solid #eee', paddingBottom: 10 }}>
          <button
            onClick={() => setShowContracts(false)}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer',
              background: !showContracts ? '#2196f3' : '#f5f5f5',
              color: !showContracts ? 'white' : '#333'
            }}
          >
            📋 Dati Anagrafici
          </button>
          <button
            onClick={() => setShowContracts(true)}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer',
              background: showContracts ? '#9c27b0' : '#f5f5f5',
              color: showContracts ? 'white' : '#333'
            }}
          >
            📄 Genera Contratti
          </button>
        </div>

        {!showContracts ? (
          <DipendenteForm 
            dipendente={dipendente}
            editData={editData}
            setEditData={setEditData}
            editMode={editMode}
          />
        ) : (
          <ContractsSection 
            dipendente={dipendente}
            contractTypes={contractTypes}
            generatingContract={generatingContract}
            onGenerateContract={onGenerateContract}
          />
        )}

        {/* Action Buttons */}
        {!showContracts && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            {editMode ? (
              <>
                <button
                  onClick={() => { setEditMode(false); setEditData({ ...dipendente }); }}
                  style={{ padding: '10px 20px', background: '#9e9e9e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  Annulla
                </button>
                <button
                  onClick={onUpdate}
                  style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  data-testid="save-employee-btn"
                >
                  💾 Salva Modifiche
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                style={{ padding: '10px 20px', background: '#2196f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                data-testid="edit-employee-btn"
              >
                ✏️ Modifica Dati
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DipendenteForm({ dipendente, editData, setEditData, editMode }) {
  const getValue = (field) => editMode ? (editData[field] || '') : (dipendente[field] || '');
  const handleChange = (field, value) => setEditData({ ...editData, [field]: value });

  const inputStyle = { padding: 8, width: '100%', borderRadius: 4, border: '1px solid #ddd' };
  const labelStyle = { display: 'block', marginBottom: 5, fontWeight: 'bold', fontSize: 12 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
      <div>
        <label style={labelStyle}>Nome</label>
        <input type="text" value={getValue('nome')} onChange={(e) => handleChange('nome', e.target.value)} disabled={!editMode} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Cognome</label>
        <input type="text" value={getValue('cognome')} onChange={(e) => handleChange('cognome', e.target.value)} disabled={!editMode} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Codice Fiscale</label>
        <input type="text" value={getValue('codice_fiscale')} onChange={(e) => handleChange('codice_fiscale', e.target.value.toUpperCase())} disabled={!editMode} style={{ ...inputStyle, fontFamily: 'monospace' }} />
      </div>
      <div>
        <label style={labelStyle}>Data di Nascita</label>
        <input type="date" value={(getValue('data_nascita') || '').split('T')[0]} onChange={(e) => handleChange('data_nascita', e.target.value)} disabled={!editMode} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Luogo di Nascita</label>
        <input type="text" value={getValue('luogo_nascita')} onChange={(e) => handleChange('luogo_nascita', e.target.value)} disabled={!editMode} style={inputStyle} />
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <label style={labelStyle}>Indirizzo</label>
        <input type="text" value={getValue('indirizzo')} onChange={(e) => handleChange('indirizzo', e.target.value)} disabled={!editMode} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Telefono</label>
        <input type="tel" value={getValue('telefono')} onChange={(e) => handleChange('telefono', e.target.value)} disabled={!editMode} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Email</label>
        <input type="email" value={getValue('email')} onChange={(e) => handleChange('email', e.target.value)} disabled={!editMode} style={inputStyle} />
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <label style={labelStyle}>IBAN</label>
        <input type="text" value={getValue('iban')} onChange={(e) => handleChange('iban', e.target.value.toUpperCase())} disabled={!editMode} style={{ ...inputStyle, fontFamily: 'monospace' }} />
      </div>
      <div>
        <label style={labelStyle}>Mansione</label>
        {editMode ? (
          <select value={getValue('mansione')} onChange={(e) => handleChange('mansione', e.target.value)} style={inputStyle}>
            <option value="">Seleziona...</option>
            {MANSIONI.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <input type="text" value={dipendente.mansione || '-'} disabled style={inputStyle} />
        )}
      </div>
      <div>
        <label style={labelStyle}>Livello CCNL</label>
        <input type="text" value={getValue('livello')} onChange={(e) => handleChange('livello', e.target.value)} disabled={!editMode} placeholder="es. 5, 6S..." style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Stipendio Orario €</label>
        <input type="number" step="0.01" value={getValue('stipendio_orario')} onChange={(e) => handleChange('stipendio_orario', e.target.value)} disabled={!editMode} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Matricola</label>
        <input type="text" value={getValue('matricola')} onChange={(e) => handleChange('matricola', e.target.value)} disabled={!editMode} style={inputStyle} />
      </div>
    </div>
  );
}

function ContractsSection({ dipendente, contractTypes, generatingContract, onGenerateContract }) {
  return (
    <div>
      <p style={{ color: '#666', marginBottom: 20 }}>
        Seleziona il tipo di contratto da generare per <strong>{dipendente.nome_completo || dipendente.nome}</strong>.
        I dati del dipendente verranno automaticamente inseriti nei campi del documento.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {contractTypes.map(ct => (
          <button
            key={ct.id}
            onClick={() => onGenerateContract(ct.id)}
            disabled={generatingContract}
            style={{
              padding: '16px 20px',
              background: ct.id.includes('determinato') ? '#e3f2fd' : ct.id.includes('indeterminato') ? '#e8f5e9' : '#fff',
              border: '2px solid',
              borderColor: ct.id.includes('determinato') ? '#2196f3' : ct.id.includes('indeterminato') ? '#4caf50' : '#9e9e9e',
              borderRadius: 10,
              cursor: generatingContract ? 'wait' : 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 90
            }}
            data-testid={`generate-contract-${ct.id}`}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 14, color: '#333' }}>📄 {ct.name}</div>
            <div style={{ fontSize: 12, color: '#666', wordBreak: 'break-word' }}>{ct.filename}</div>
          </button>
        ))}
      </div>
      
      {generatingContract && (
        <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
          ⏳ Generazione contratto in corso...
        </div>
      )}
    </div>
  );
}
