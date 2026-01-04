import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  DipendenteTable, 
  DipendenteDetailModal, 
  DipendenteNewModal, 
  DEFAULT_DIPENDENTE 
} from '../components/dipendenti';

/**
 * Pagina Gestione Dipendenti - Refactored
 * Componenti estratti: DipendenteTable, DipendenteDetailModal, DipendenteNewModal
 */
export default function GestioneDipendenti() {
  // Data state
  const [dipendenti, setDipendenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contractTypes, setContractTypes] = useState([]);
  
  // Filter state
  const [search, setSearch] = useState('');
  const [filterMansione, setFilterMansione] = useState('');
  
  // Modal state
  const [selectedDipendente, setSelectedDipendente] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [newDipendente, setNewDipendente] = useState(DEFAULT_DIPENDENTE);
  const [generatingContract, setGeneratingContract] = useState(false);

  useEffect(() => {
    loadData();
    loadContractTypes();
  }, [search, filterMansione]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterMansione) params.append('mansione', filterMansione);
      const res = await api.get(`/api/dipendenti?${params}`);
      setDipendenti(res.data);
    } catch (error) {
      console.error('Error loading dipendenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContractTypes = async () => {
    try {
      const res = await api.get('/api/contracts/types');
      setContractTypes(res.data);
    } catch (error) {
      console.error('Error loading contract types:', error);
    }
  };

  const handleCreate = async () => {
    if (!newDipendente.nome && !newDipendente.nome_completo) {
      alert('Nome è obbligatorio');
      return;
    }
    try {
      const data = {
        ...newDipendente,
        nome_completo: newDipendente.nome_completo || `${newDipendente.nome} ${newDipendente.cognome}`.trim()
      };
      await api.post('/api/dipendenti', data);
      setShowForm(false);
      setNewDipendente(DEFAULT_DIPENDENTE);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleUpdate = async () => {
    if (!selectedDipendente?.id) return;
    try {
      await api.put(`/api/dipendenti/${selectedDipendente.id}`, editData);
      setSelectedDipendente({ ...selectedDipendente, ...editData });
      setEditMode(false);
      loadData();
      alert('Dati aggiornati con successo!');
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

  const handleGenerateContract = async (contractType) => {
    if (!selectedDipendente?.id) return;
    setGeneratingContract(true);
    try {
      const res = await api.post(`/api/contracts/generate/${selectedDipendente.id}`, {
        contract_type: contractType,
        additional_data: {
          livello: editData.livello || selectedDipendente.livello || '',
          stipendio_orario: editData.stipendio_orario || selectedDipendente.stipendio_orario || '',
          qualifica: editData.mansione || selectedDipendente.mansione || ''
        }
      });
      
      if (res.data.success) {
        alert(`Contratto generato!\n\nFile: ${res.data.contract.filename}`);
        window.open(`${api.defaults.baseURL}${res.data.contract.download_url}`, '_blank');
      }
    } catch (error) {
      alert('Errore generazione contratto: ' + (error.response?.data?.detail || error.message));
    } finally {
      setGeneratingContract(false);
    }
  };

  const openDetail = (dip) => {
    setSelectedDipendente(dip);
    setEditData({ ...dip });
    setEditMode(false);
  };

  const closeDetail = () => {
    setSelectedDipendente(null);
    setEditMode(false);
  };

  // Get unique mansioni for filter
  const uniqueMansioni = [...new Set(dipendenti.map(d => d.mansione).filter(Boolean))];
  const completeCount = dipendenti.filter(d => d.codice_fiscale && d.email && d.telefono).length;

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      <h1 style={{ marginBottom: 10, fontSize: 'clamp(20px, 5vw, 28px)' }}>👥 Gestione Dipendenti</h1>
      <p style={{ color: '#666', marginBottom: 20, fontSize: 'clamp(12px, 3vw, 14px)' }}>
        Anagrafica dipendenti, contratti e documentazione
      </p>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#e3f2fd', padding: 'clamp(10px, 2vw, 15px)', borderRadius: 8 }}>
          <div style={{ fontSize: 'clamp(10px, 2vw, 12px)', color: '#666' }}>Totale Dipendenti</div>
          <div style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 'bold', color: '#2196f3' }}>{dipendenti.length}</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: 'clamp(10px, 2vw, 15px)', borderRadius: 8 }}>
          <div style={{ fontSize: 'clamp(10px, 2vw, 12px)', color: '#666' }}>Con Dati Completi</div>
          <div style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 'bold', color: '#4caf50' }}>{completeCount}</div>
        </div>
      </div>

      {/* Actions Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Cerca dipendente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', minWidth: 200, flex: '1 1 200px' }}
          data-testid="search-employee"
        />
        <select
          value={filterMansione}
          onChange={(e) => setFilterMansione(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd' }}
        >
          <option value="">Tutte le mansioni</option>
          {uniqueMansioni.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '8px 16px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
          data-testid="add-employee-btn"
        >
          ➕ Nuovo
        </button>
      </div>

      {/* Dipendenti Table */}
      <DipendenteTable
        dipendenti={dipendenti}
        loading={loading}
        onView={openDetail}
        onDelete={handleDelete}
      />

      {/* Detail/Edit Modal */}
      <DipendenteDetailModal
        dipendente={selectedDipendente}
        editData={editData}
        setEditData={setEditData}
        editMode={editMode}
        setEditMode={setEditMode}
        contractTypes={contractTypes}
        generatingContract={generatingContract}
        onClose={closeDetail}
        onUpdate={handleUpdate}
        onGenerateContract={handleGenerateContract}
      />

      {/* New Employee Modal */}
      <DipendenteNewModal
        show={showForm}
        newDipendente={newDipendente}
        setNewDipendente={setNewDipendente}
        onClose={() => setShowForm(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
