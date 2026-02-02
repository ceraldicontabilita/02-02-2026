/**
 * Attendance.jsx
 * 
 * Sistema di gestione presenze dipendenti con vista calendario.
 * Features:
 * - Vista calendario mensile/settimanale
 * - Click rapido per cambiare stato presenza
 * - Gestione ferie, permessi, malattie
 * - Storico ore lavorate
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { 
  ChevronLeft, ChevronRight, RefreshCw, Plus, Calendar,
  Users, Clock, FileText, History, Settings, Check, X, FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import { STYLES, COLORS, button, badge, formatEuro, formatDateIT } from '../lib/utils';
import { PageLayout } from '../components/PageLayout';

// Stati presenza con colori
const STATI_PRESENZA = {
  presente: { label: 'P', color: '#22c55e', bg: '#dcfce7', name: 'Presente' },
  assente: { label: 'A', color: '#ef4444', bg: '#fee2e2', name: 'Assente' },
  ferie: { label: 'F', color: '#f59e0b', bg: '#fef3c7', name: 'Ferie' },
  permesso: { label: 'PE', color: '#8b5cf6', bg: '#ede9fe', name: 'Permesso' },
  malattia: { label: 'M', color: '#3b82f6', bg: '#dbeafe', name: 'Malattia' },
  rol: { label: 'R', color: '#06b6d4', bg: '#cffafe', name: 'ROL' },
  chiuso: { label: 'CH', color: '#64748b', bg: '#e2e8f0', name: 'Chiuso' },
  riposo_settimanale: { label: 'RS', color: '#6b7280', bg: '#f3f4f6', name: 'Riposo Sett.' },
  trasferta: { label: 'T', color: '#6366f1', bg: '#e0e7ff', name: 'Trasferta' },
  riposo: { label: '-', color: '#9ca3af', bg: '#f3f4f6', name: 'Riposo' },
};

// Giorni settimana abbreviati
const GIORNI_SETTIMANA = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
              'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// Formatta data
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT');
  } catch {
    return dateStr;
  }
};

export default function Attendance() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [presenze, setPresenze] = useState({}); // { "employeeId_YYYY-MM-DD": "presente" }
  const [activeTab, setActiveTab] = useState('calendario');
  const [viewMode, setViewMode] = useState('mensile'); // mensile | settimanale
  
  // Data corrente per calendario
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Storico Ore
  const [storicoEmployee, setStoricoEmployee] = useState('');
  const [storicoData, setStoricoData] = useState(null);
  const [loadingStorico, setLoadingStorico] = useState(false);
  
  // Richieste pending
  const [richiestePending, setRichiestePending] = useState([]);
  
  // === SELEZIONE MULTIPLA ===
  const [selectedStato, setSelectedStato] = useState(null); // Stato selezionato per inserimento rapido
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState(new Set()); // Celle selezionate
  
  // Note presenze (protocolli malattia, etc.)
  const [notePresenze, setNotePresenze] = useState({}); // { "employeeId_YYYY-MM-DD": { protocollo: "xxx", note: "..." } }
  
  // Generazione PDF
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Calcola giorni del mese
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  
  // Genera array di giorni
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(currentYear, currentMonth, i + 1);
    return {
      day: i + 1,
      dayOfWeek: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    };
  });

  // Carica dati
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [empRes, presenzeRes, pendingRes] = await Promise.all([
        api.get('/api/employees?limit=200'),
        api.get(`/api/attendance/presenze-mese?anno=${currentYear}&mese=${currentMonth + 1}`),
        api.get('/api/attendance/richieste-pending')
      ]);
      
      // Normalizza employees - filtra solo attivi E in_carico
      const emps = (empRes.data.employees || empRes.data || [])
        .filter(e => (e.status === 'attivo' || !e.status) && (e.in_carico !== false))
        .map(e => ({
          ...e,
          nome_completo: e.nome_completo || e.name || `${e.nome || ''} ${e.cognome || ''}`.trim()
        }));
      setEmployees(emps);
      
      // Carica presenze del mese
      if (presenzeRes.data.presenze) {
        setPresenze(presenzeRes.data.presenze);
      }
      
      setRichiestePending(pendingRes.data.richieste || []);
      
    } catch (error) {
      console.error('Errore caricamento:', error);
      // Se l'endpoint presenze-mese non esiste, ignora
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cambia stato presenza (click su cella)
  const handleCellClick = async (employeeId, dateStr, currentState) => {
    // Cicla tra gli stati
    const statiArray = Object.keys(STATI_PRESENZA);
    const currentIndex = statiArray.indexOf(currentState || 'riposo');
    const nextIndex = (currentIndex + 1) % statiArray.length;
    const nextState = statiArray[nextIndex];
    
    // Mappa stato presenza a codice giustificativo
    const mappaGiustificativi = {
      'ferie': 'FER',
      'permesso': 'PER',
      'malattia': 'MAL',
      'rol': 'ROL',
      'assente': 'AI'
    };
    
    const codiceGiustificativo = mappaGiustificativi[nextState];
    
    // Se è un giustificativo con limite, valida prima
    if (codiceGiustificativo) {
      try {
        const validazione = await api.post('/api/giustificativi/valida-giustificativo', {
          employee_id: employeeId,
          codice_giustificativo: codiceGiustificativo,
          data: dateStr,
          ore: 8
        });
        
        if (!validazione.data.valido) {
          toast.error(`⛔ ${validazione.data.messaggio}`);
          return; // Blocca l'inserimento
        }
        
        // Mostra warning se vicino al limite
        if (validazione.data.warnings?.length > 0) {
          toast.warning(validazione.data.warnings[0]);
        }
      } catch (err) {
        console.error('Errore validazione giustificativo:', err);
        // Continua comunque se la validazione fallisce
      }
    }
    
    // Aggiorna UI ottimisticamente
    const key = `${employeeId}_${dateStr}`;
    setPresenze(prev => ({ ...prev, [key]: nextState }));
    
    // Salva nel backend
    try {
      await api.post('/api/attendance/set-presenza', {
        employee_id: employeeId,
        data: dateStr,
        stato: nextState
      });
    } catch (error) {
      // Ripristina stato precedente
      setPresenze(prev => ({ ...prev, [key]: currentState }));
      toast.error('Errore salvataggio');
    }
  };

  // === SELEZIONE MULTIPLA: Click su cella in modalità selezione rapida ===
  const handleMultiSelectClick = async (employeeId, dateStr) => {
    if (!selectedStato) return;
    
    const key = `${employeeId}_${dateStr}`;
    const currentState = presenze[key];
    
    // Se lo stato è già quello selezionato, rimuovi (torna a riposo)
    const newState = currentState === selectedStato ? 'riposo' : selectedStato;
    
    // Mappa stato presenza a codice giustificativo per validazione
    const mappaGiustificativi = {
      'ferie': 'FER',
      'permesso': 'PER',
      'malattia': 'MAL',
      'rol': 'ROL',
      'assente': 'AI'
    };
    
    const codiceGiustificativo = mappaGiustificativi[newState];
    
    // Se è un giustificativo con limite, valida prima
    if (codiceGiustificativo && newState !== 'riposo') {
      try {
        const validazione = await api.post('/api/giustificativi/valida-giustificativo', {
          employee_id: employeeId,
          codice_giustificativo: codiceGiustificativo,
          data: dateStr,
          ore: 8
        });
        
        if (!validazione.data.valido) {
          toast.error(`⛔ ${validazione.data.messaggio}`);
          return;
        }
      } catch (err) {
        console.error('Errore validazione:', err);
      }
    }
    
    // Aggiorna UI
    setPresenze(prev => ({ ...prev, [key]: newState }));
    
    // Salva nel backend
    try {
      await api.post('/api/attendance/set-presenza', {
        employee_id: employeeId,
        data: dateStr,
        stato: newState
      });
      
      // Se è malattia, apri dialog per protocollo
      if (newState === 'malattia') {
        const protocollo = prompt('Inserisci numero protocollo certificato medico (opzionale):');
        if (protocollo) {
          setNotePresenze(prev => ({
            ...prev,
            [key]: { ...prev[key], protocollo_malattia: protocollo }
          }));
          // Salva nota nel backend
          await api.post('/api/attendance/set-nota-presenza', {
            employee_id: employeeId,
            data: dateStr,
            protocollo_malattia: protocollo
          }).catch(() => {});
        }
      }
    } catch (error) {
      setPresenze(prev => ({ ...prev, [key]: currentState }));
      toast.error('Errore salvataggio');
    }
  };

  // Attiva/disattiva modalità selezione rapida
  const toggleMultiSelectMode = (stato) => {
    if (selectedStato === stato) {
      // Disattiva
      setSelectedStato(null);
      setMultiSelectMode(false);
      toast.info('Modalità selezione rapida disattivata');
    } else {
      // Attiva
      setSelectedStato(stato);
      setMultiSelectMode(true);
      toast.success(`Modalità ${STATI_PRESENZA[stato]?.name} attivata - Clicca sulle celle per applicare`);
    }
  };

  // === GENERAZIONE PDF PER CONSULENTE ===
  const generatePdfConsulente = async () => {
    try {
      setGeneratingPdf(true);
      toast.info('Generazione PDF in corso...');
      
      const response = await api.post('/api/attendance/genera-pdf-consulente', {
        anno: currentYear,
        mese: currentMonth + 1
      }, { responseType: 'blob' });
      
      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Presenze_${MESI[currentMonth]}_${currentYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF generato con successo!');
    } catch (error) {
      console.error('Errore generazione PDF:', error);
      toast.error('Errore nella generazione del PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Naviga mese
  const navigateMonth = (delta) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  // Carica storico ore
  const loadStoricoOre = async () => {
    if (!storicoEmployee) {
      toast.error('Seleziona un dipendente');
      return;
    }
    
    try {
      setLoadingStorico(true);
      const res = await api.get(`/api/attendance/ore-lavorate/${storicoEmployee}?mese=${currentMonth + 1}&anno=${currentYear}`);
      setStoricoData(res.data);
    } catch (error) {
      console.error('Errore caricamento storico:', error);
      toast.error('Errore caricamento storico ore');
    } finally {
      setLoadingStorico(false);
    }
  };

  // Approva richiesta
  const handleApprova = async (richiestaId) => {
    try {
      const res = await api.put(`/api/attendance/richiesta-assenza/${richiestaId}/approva`);
      if (res.data.success) {
        toast.success('Richiesta approvata');
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore approvazione');
    }
  };

  // Rifiuta richiesta
  const handleRifiuta = async (richiestaId) => {
    const motivo = prompt('Motivo del rifiuto:');
    if (!motivo) return;
    
    try {
      const res = await api.put(`/api/attendance/richiesta-assenza/${richiestaId}/rifiuta`, { motivo });
      if (res.data.success) {
        toast.success('Richiesta rifiutata');
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  // Calcola statistiche dipendente
  const getEmployeeStats = (employeeId) => {
    let presenti = 0, assenti = 0, ferie = 0, permessi = 0, malattia = 0;
    
    days.forEach(d => {
      const key = `${employeeId}_${d.dateStr}`;
      const stato = presenze[key];
      if (stato === 'presente' || stato === 'smartworking' || stato === 'trasferta') presenti++;
      else if (stato === 'assente') assenti++;
      else if (stato === 'ferie') ferie++;
      else if (stato === 'permesso' || stato === 'rol') permessi++;
      else if (stato === 'malattia') malattia++;
    });
    
    return { presenti, assenti, ferie, permessi, malattia };
  };

  // Rendering cella
  const renderCell = (employee, day) => {
    const key = `${employee.id}_${day.dateStr}`;
    const stato = presenze[key] || (day.isWeekend ? 'riposo' : null);
    const config = stato ? STATI_PRESENZA[stato] : null;
    const nota = notePresenze[key];
    
    // Determina se la cella è selezionata (in modalità multi-select)
    const isHighlighted = multiSelectMode && selectedStato && stato === selectedStato;
    
    return (
      <td
        key={day.day}
        onClick={() => multiSelectMode ? handleMultiSelectClick(employee.id, day.dateStr) : handleCellClick(employee.id, day.dateStr, stato)}
        style={{
          width: 28,
          minWidth: 28,
          height: 28,
          padding: 0,
          textAlign: 'center',
          cursor: multiSelectMode ? 'crosshair' : 'pointer',
          background: config ? config.bg : (day.isWeekend ? '#f3f4f6' : 'white'),
          borderRight: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
          fontSize: 10,
          fontWeight: 600,
          color: config ? config.color : '#9ca3af',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          outline: isHighlighted ? '2px solid #3b82f6' : 'none',
          outlineOffset: '-2px',
          position: 'relative'
        }}
        title={`${employee.nome_completo} - ${day.day}/${currentMonth + 1}: ${config?.name || 'Non definito'}${nota?.protocollo_malattia ? ` (Prot: ${nota.protocollo_malattia})` : ''}`}
        data-testid={`cell-${employee.id}-${day.day}`}
      >
        {config?.label || ''}
        {nota?.protocollo_malattia && (
          <span style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 6,
            height: 6,
            background: '#ef4444',
            borderRadius: '50%'
          }} title={`Prot: ${nota.protocollo_malattia}`} />
        )}
      </td>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <RefreshCw style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
      </div>
    );
  }

  return (
    <PageLayout title="Gestione Presenze" subtitle="Calendario presenze e assenze dipendenti">
    <div style={{ maxWidth: 1600, margin: '0 auto' }} data-testid="attendance-page">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20,
        padding: '15px 20px',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
        borderRadius: 12,
        color: 'white',
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>👥 Gestione Presenze</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>
            Calendario presenze e gestione assenze
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            onClick={loadData}
            style={{ 
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.95)',
              color: '#1e3a5f',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: '600'
            }}
            data-testid="btn-refresh"
          >
            🔄 Aggiorna
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e5e7eb', paddingBottom: 8, marginBottom: 20 }}>
        {[
          { id: 'calendario', label: 'Calendario', icon: '📅' },
          { id: 'richieste', label: `Richieste (${richiestePending.length})`, icon: '📋' },
          { id: 'storico', label: 'Storico Ore', icon: '⏱️' },
          { id: 'saldo-ferie', label: 'Saldo Ferie', icon: '🏖️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === tab.id ? '#1e3a5f' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            data-testid={`tab-${tab.id}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Calendario */}
      {activeTab === 'calendario' && (
        <div style={{ 
          background: 'white', 
          borderRadius: 12, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          {/* Toolbar Calendario */}
          <div style={{ 
            padding: '12px 16px', 
            background: '#f8fafc', 
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            {/* Vista */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setViewMode('mensile')}
                style={{
                  padding: '8px 16px',
                  background: viewMode === 'mensile' ? '#1e3a5f' : 'white',
                  color: viewMode === 'mensile' ? 'white' : '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px 0 0 6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 13
                }}
              >
                Mensile
              </button>
              <button
                onClick={() => setViewMode('settimanale')}
                style={{
                  padding: '8px 16px',
                  background: viewMode === 'settimanale' ? '#1e3a5f' : 'white',
                  color: viewMode === 'settimanale' ? 'white' : '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0 6px 6px 0',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 13
                }}
              >
                Settimanale
              </button>
            </div>

            {/* Navigazione Mese */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => navigateMonth(-1)}
                style={{
                  padding: '8px 12px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft style={{ width: 16, height: 16 }} />
              </button>
              <div style={{ 
                padding: '8px 20px', 
                background: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: 6,
                fontWeight: 600,
                minWidth: 150,
                textAlign: 'center'
              }}>
                📅 {MESI[currentMonth]} {currentYear}
              </div>
              <button
                onClick={() => navigateMonth(1)}
                style={{
                  padding: '8px 12px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Info dipendenti */}
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              👥 {employees.length} dipendenti
            </div>
          </div>

          {/* === TOOLBAR SELEZIONE RAPIDA === */}
          <div style={{ 
            padding: '10px 16px', 
            background: multiSelectMode ? '#fef3c7' : '#f1f5f9', 
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginRight: 4 }}>
              ⚡ Selezione Rapida:
            </span>
            
            {/* Bottone Tutti Presenti */}
            <button
              onClick={async () => {
                if (!confirm('Vuoi impostare TUTTI i giorni lavorativi come "Presente" per tutti i dipendenti? Potrai poi modificare singolarmente.')) return;
                
                toast.info('Impostazione presenze in corso...');
                let count = 0;
                
                for (const emp of employees) {
                  for (const day of days) {
                    if (day.isWeekend) continue; // Salta weekend
                    
                    const key = `${emp.id}_${day.dateStr}`;
                    const currentState = presenze[key];
                    
                    // Salta se già ha uno stato diverso da vuoto/riposo
                    if (currentState && currentState !== 'riposo') continue;
                    
                    setPresenze(prev => ({ ...prev, [key]: 'presente' }));
                    count++;
                  }
                }
                
                // Salva tutto in batch
                try {
                  await api.post('/api/attendance/imposta-tutti-presenti', {
                    anno: currentYear,
                    mese: currentMonth + 1,
                    employees: employees.map(e => e.id)
                  });
                  toast.success(`✅ ${count} giorni impostati come "Presente"`);
                } catch (err) {
                  console.error('Errore batch:', err);
                  toast.warning('Presenze impostate localmente, alcune potrebbero non essere salvate');
                }
              }}
              style={{
                padding: '6px 12px',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              data-testid="btn-tutti-presenti"
            >
              ✓ Tutti Presenti
            </button>
            
            <div style={{ width: 1, height: 24, background: '#d1d5db', margin: '0 4px' }} />
            
            {Object.entries(STATI_PRESENZA).filter(([key]) => key !== 'riposo').map(([key, config]) => (
              <button
                key={key}
                onClick={() => toggleMultiSelectMode(key)}
                style={{
                  padding: '6px 12px',
                  background: selectedStato === key ? config.color : config.bg,
                  color: selectedStato === key ? 'white' : config.color,
                  border: selectedStato === key ? `2px solid ${config.color}` : `1px solid ${config.color}40`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease',
                  boxShadow: selectedStato === key ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                }}
                data-testid={`btn-select-${key}`}
              >
                <span style={{ 
                  width: 16, 
                  height: 16, 
                  borderRadius: 3, 
                  background: selectedStato === key ? 'white' : config.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: config.color
                }}>
                  {config.label}
                </span>
                {config.name}
              </button>
            ))}
            
            {multiSelectMode && (
              <button
                onClick={() => { setSelectedStato(null); setMultiSelectMode(false); }}
                style={{
                  padding: '6px 12px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 11,
                  marginLeft: 'auto'
                }}
              >
                ✕ Disattiva
              </button>
            )}
            
            {/* Pulsante PDF */}
            <button
              onClick={generatePdfConsulente}
              disabled={generatingPdf}
              style={{
                padding: '6px 12px',
                background: '#1e3a5f',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: generatingPdf ? 'wait' : 'pointer',
                fontWeight: 600,
                fontSize: 11,
                marginLeft: multiSelectMode ? 8 : 'auto',
                opacity: generatingPdf ? 0.7 : 1
              }}
              data-testid="btn-genera-pdf"
            >
              📄 {generatingPdf ? 'Generando...' : 'PDF Consulente'}
            </button>
          </div>

          {multiSelectMode && (
            <div style={{ 
              padding: '8px 16px', 
              background: '#fef9c3', 
              borderBottom: '1px solid #fcd34d',
              fontSize: 12,
              color: '#854d0e',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{ fontSize: 16 }}>👆</span>
              <strong>Modalità {STATI_PRESENZA[selectedStato]?.name} attiva</strong> - 
              Clicca sulle celle per applicare &quot;{STATI_PRESENZA[selectedStato]?.label}&quot; a più giorni/dipendenti
            </div>
          )}

          {/* Tabella Calendario */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: 12
            }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ 
                    position: 'sticky', 
                    left: 0, 
                    background: '#f9fafb',
                    padding: '8px 12px', 
                    textAlign: 'left',
                    borderRight: '2px solid #e5e7eb',
                    borderBottom: '2px solid #e5e7eb',
                    minWidth: 180,
                    zIndex: 10
                  }}>
                    Dipendente
                  </th>
                  {days.map(d => (
                    <th 
                      key={d.day}
                      style={{ 
                        width: 28,
                        minWidth: 28,
                        padding: '4px 2px',
                        textAlign: 'center',
                        borderRight: '1px solid #e5e7eb',
                        borderBottom: '2px solid #e5e7eb',
                        background: d.isWeekend ? '#f3f4f6' : '#f9fafb',
                        fontSize: 10
                      }}
                    >
                      <div style={{ color: d.isWeekend ? '#ef4444' : '#6b7280' }}>
                        {GIORNI_SETTIMANA[d.dayOfWeek]}
                      </div>
                      <div style={{ fontWeight: 700, color: d.isWeekend ? '#ef4444' : '#1f2937' }}>
                        {String(d.day).padStart(2, '0')}
                      </div>
                    </th>
                  ))}
                  <th style={{ 
                    padding: '8px 12px', 
                    textAlign: 'center',
                    borderBottom: '2px solid #e5e7eb',
                    background: '#1e3a5f',
                    color: 'white',
                    minWidth: 60,
                    fontSize: 11
                  }}>
                    Totale
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => {
                  const stats = getEmployeeStats(emp.id);
                  return (
                    <tr key={emp.id} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ 
                        position: 'sticky', 
                        left: 0, 
                        background: idx % 2 === 0 ? 'white' : '#fafafa',
                        padding: '6px 12px', 
                        borderRight: '2px solid #e5e7eb',
                        borderBottom: '1px solid #e5e7eb',
                        fontWeight: 500,
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                        zIndex: 5
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ 
                            width: 28, 
                            height: 28, 
                            borderRadius: '50%', 
                            background: '#e0e7ff', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#4338ca'
                          }}>
                            {emp.nome_completo?.substring(0, 2).toUpperCase() || '??'}
                          </div>
                          <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {emp.nome_completo || emp.name || 'N/D'}
                          </span>
                        </div>
                      </td>
                      {days.map(d => renderCell(emp, d))}
                      <td style={{ 
                        padding: '6px 8px', 
                        textAlign: 'center',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f0fdf4',
                        fontWeight: 600,
                        fontSize: 11,
                        color: '#166534'
                      }}>
                        {stats.presenti}gg
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legenda */}
          <div style={{ 
            padding: '12px 16px', 
            background: '#f8fafc', 
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: 12, color: '#6b7280', marginRight: 8 }}>Legenda:</span>
            {Object.entries(STATI_PRESENZA).map(([key, config]) => (
              <div 
                key={key}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4,
                  fontSize: 11
                }}
              >
                <span style={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: 4, 
                  background: config.bg, 
                  color: config.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: 9
                }}>
                  {config.label}
                </span>
                <span style={{ color: '#6b7280' }}>{config.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Richieste */}
      {activeTab === 'richieste' && (
        <div style={{ 
          background: 'white', 
          borderRadius: 12, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '16px 20px', 
            background: '#fefce8', 
            borderBottom: '3px solid #eab308',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <FileText style={{ width: 20, height: 20, color: '#ca8a04' }} />
            <span style={{ fontWeight: 'bold', color: '#854d0e' }}>
              Richieste in Attesa di Approvazione
            </span>
          </div>
          <div style={{ padding: 16 }}>
            {richiestePending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                ✅ Nessuna richiesta in attesa
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {richiestePending.map((r) => (
                  <div key={r.id} style={{ 
                    padding: 16, 
                    background: '#f9fafb', 
                    borderRadius: 8,
                    borderLeft: '4px solid #eab308',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>{r.employee_nome}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '2px 8px', 
                          background: '#fef3c7', 
                          color: '#92400e', 
                          borderRadius: 4, 
                          fontSize: 11, 
                          fontWeight: 600,
                          marginRight: 8
                        }}>{r.tipo}</span>
                        📅 {formatDate(r.data_inizio)} → {formatDate(r.data_fine)}
                        <span style={{ marginLeft: 8, fontWeight: 600 }}>({r.giorni_totali} giorni)</span>
                      </div>
                      {r.motivo && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{r.motivo}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleApprova(r.id)}
                        style={{
                          padding: '8px 16px',
                          background: '#22c55e',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Approva
                      </button>
                      <button
                        onClick={() => handleRifiuta(r.id)}
                        style={{
                          padding: '8px 16px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ✕ Rifiuta
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Storico Ore */}
      {activeTab === 'storico' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Filtri */}
          <div style={{ 
            background: 'white', 
            borderRadius: 12, 
            padding: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                  Dipendente *
                </label>
                <select
                  value={storicoEmployee}
                  onChange={(e) => setStoricoEmployee(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                  data-testid="select-storico-employee"
                >
                  <option value="">Seleziona dipendente</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome_completo || e.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                  Periodo
                </label>
                <div style={{ 
                  padding: '10px 16px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: 8,
                  fontWeight: 500
                }}>
                  {MESI[currentMonth]} {currentYear}
                </div>
              </div>
              
              <button 
                onClick={loadStoricoOre} 
                disabled={loadingStorico}
                style={{
                  padding: '10px 20px',
                  background: '#1e3a5f',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: loadingStorico ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: loadingStorico ? 0.6 : 1
                }}
                data-testid="btn-carica-storico"
              >
                {loadingStorico ? '⏳ Caricamento...' : '📊 Carica Storico'}
              </button>
            </div>
          </div>

          {/* Risultati */}
          {storicoData && (
            <>
              {/* Riepilogo */}
              <div style={{ 
                background: 'white', 
                borderRadius: 12, 
                padding: 16, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)' 
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                  <div style={{ 
                    background: 'white', 
                    borderRadius: 8, 
                    padding: '12px', 
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
                    borderLeft: '3px solid #3b82f6',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>
                      {storicoData.riepilogo?.giorni_lavorati || 0}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Giorni Lavorati</div>
                  </div>
                  <div style={{ 
                    background: 'white', 
                    borderRadius: 8, 
                    padding: '12px', 
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
                    borderLeft: '3px solid #22c55e',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#22c55e' }}>
                      {storicoData.riepilogo?.ore_totali?.toFixed(1) || 0}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Ore Totali</div>
                  </div>
                  <div style={{ 
                    background: 'white', 
                    borderRadius: 8, 
                    padding: '12px', 
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
                    borderLeft: '3px solid #6b7280',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#6b7280' }}>
                      {storicoData.riepilogo?.ore_ordinarie?.toFixed(1) || 0}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Ore Ordinarie</div>
                  </div>
                  <div style={{ 
                    background: 'white', 
                    borderRadius: 8, 
                    padding: '12px', 
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
                    borderLeft: '3px solid #f97316',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f97316' }}>
                      {storicoData.riepilogo?.ore_straordinario?.toFixed(1) || 0}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Straordinario</div>
                  </div>
                  <div style={{ 
                    background: '#1e3a5f', 
                    borderRadius: 8, 
                    padding: '12px',
                    textAlign: 'center',
                    color: 'white'
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                      {storicoData.riepilogo?.ore_assenza || 0}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.9 }}>Ore Assenza</div>
                  </div>
                </div>
              </div>

              {/* Dettaglio Giorni */}
              <div style={{ 
                background: 'white', 
                borderRadius: 12, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  padding: '16px 20px', 
                  background: '#f8fafc', 
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>📋 Dettaglio Giornaliero</h3>
                </div>
                <div style={{ padding: 16 }}>
                  {storicoData.dettaglio_giorni?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                      Nessuna timbratura registrata per questo mese
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Data</th>
                            <th style={{ textAlign: 'center', padding: '10px 12px' }}>Entrata</th>
                            <th style={{ textAlign: 'center', padding: '10px 12px' }}>Uscita</th>
                            <th style={{ textAlign: 'right', padding: '10px 12px' }}>Ore Ord.</th>
                            <th style={{ textAlign: 'right', padding: '10px 12px' }}>Straord.</th>
                            <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700 }}>Totale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {storicoData.dettaglio_giorni?.map((g, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 500 }}>{formatDate(g.data)}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#22c55e' }}>
                                {g.entrata || '-'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#ef4444' }}>
                                {g.uscita || '-'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                {g.ore_ordinarie?.toFixed(2) || '-'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f97316' }}>
                                {g.ore_straordinario > 0 ? `+${g.ore_straordinario.toFixed(2)}` : '-'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                                {g.ore_totali?.toFixed(2) || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f0fdf4', fontWeight: 700 }}>
                            <td colSpan="3" style={{ padding: '10px 12px' }}>TOTALE MESE</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              {storicoData.riepilogo?.ore_ordinarie?.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f97316' }}>
                              {storicoData.riepilogo?.ore_straordinario > 0 ? 
                                `+${storicoData.riepilogo?.ore_straordinario?.toFixed(2)}` : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              {storicoData.riepilogo?.ore_totali?.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Placeholder */}
          {!storicoData && !loadingStorico && (
            <div style={{ 
              background: 'white', 
              borderRadius: 12, 
              padding: 40, 
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <History style={{ width: 48, height: 48, margin: '0 auto 16px', color: '#9ca3af', opacity: 0.5 }} />
              <p style={{ color: '#9ca3af', margin: 0 }}>
                Seleziona un dipendente e clicca &quot;Carica Storico&quot; per visualizzare le ore lavorate
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab Saldo Ferie */}
      {activeTab === 'saldo-ferie' && (
        <TabSaldoFerie employees={employees} currentYear={currentYear} />
      )}
    </div>
    </PageLayout>
  );
}

// ============================================
// TAB SALDO FERIE
// ============================================

function TabSaldoFerie({ employees, currentYear }) {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [saldoData, setSaldoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [anno, setAnno] = useState(currentYear);
  
  const loadSaldoFerie = async () => {
    if (!selectedEmployee) return;
    
    try {
      setLoading(true);
      const res = await api.get(`/api/giustificativi/dipendente/${selectedEmployee}/saldo-ferie?anno=${anno}`);
      setSaldoData(res.data);
    } catch (err) {
      console.error('Errore caricamento saldo ferie:', err);
      toast.error('Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (selectedEmployee) {
      loadSaldoFerie();
    }
  }, [selectedEmployee, anno]);
  
  return (
    <div>
      {/* Selezione Dipendente */}
      <div style={{ 
        background: 'white', 
        borderRadius: 12, 
        padding: 20, 
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
              Dipendente
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 14
              }}
              data-testid="select-saldo-employee"
            >
              <option value="">Seleziona dipendente...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.nome_completo}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
              Anno
            </label>
            <select
              value={anno}
              onChange={(e) => setAnno(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 14
              }}
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Risultato */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          Caricamento...
        </div>
      ) : saldoData ? (
        <div>
          {/* Card Riepilogo */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#1e3a5f', fontSize: 16, fontWeight: 600 }}>
              📊 Situazione {saldoData.employee_nome} - Anno {anno}
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {/* Ferie */}
              <div style={{ 
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                borderRadius: 16, 
                padding: 24,
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>🏖️</span>
                  <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.9 }}>FERIE</span>
                </div>
                <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>
                  {saldoData.ferie?.giorni_residui?.toFixed(1) || 0}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>giorni residui</div>
                <div style={{ marginTop: 16, fontSize: 12, opacity: 0.9 }}>
                  <div>Maturate: {saldoData.ferie?.maturate?.toFixed(0)}h</div>
                  <div>Godute: {saldoData.ferie?.godute?.toFixed(0)}h</div>
                  <div>Residue: {saldoData.ferie?.residue?.toFixed(0)}h</div>
                </div>
              </div>
              
              {/* ROL */}
              <div style={{ 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: 16, 
                padding: 24,
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>⏰</span>
                  <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.9 }}>ROL</span>
                </div>
                <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>
                  {saldoData.rol?.residui?.toFixed(0) || 0}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>ore residue</div>
                <div style={{ marginTop: 16, fontSize: 12, opacity: 0.9 }}>
                  <div>Maturati: {saldoData.rol?.maturati?.toFixed(0)}h</div>
                  <div>Goduti: {saldoData.rol?.goduti?.toFixed(0)}h</div>
                  <div>Spettanti annui: {saldoData.rol?.spettanti_annui}h</div>
                </div>
              </div>
              
              {/* Ex Festività */}
              <div style={{ 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: 16, 
                padding: 24,
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>📅</span>
                  <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.9 }}>EX FESTIVITÀ</span>
                </div>
                <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>
                  {saldoData.ex_festivita?.residue?.toFixed(0) || 0}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>ore residue</div>
                <div style={{ marginTop: 16, fontSize: 12, opacity: 0.9 }}>
                  <div>Maturate: {saldoData.ex_festivita?.maturate?.toFixed(0)}h</div>
                  <div>Godute: {saldoData.ex_festivita?.godute?.toFixed(0)}h</div>
                  <div>Spettanti annue: {saldoData.ex_festivita?.spettanti_annue}h</div>
                </div>
              </div>
              
              {/* Permessi */}
              <div style={{ 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderRadius: 16, 
                padding: 24,
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>🎫</span>
                  <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.9 }}>PERMESSI</span>
                </div>
                <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>
                  {saldoData.permessi?.goduti_anno?.toFixed(0) || 0}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>ore godute</div>
                <div style={{ marginTop: 16, fontSize: 12, opacity: 0.9 }}>
                  <div>Anno {anno}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Dettaglio Mensile */}
          {saldoData.dettaglio_mensile?.length > 0 && (
            <div style={{ 
              background: 'white', 
              borderRadius: 12, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}>
              <div style={{ 
                padding: '16px 20px', 
                background: '#f8fafc', 
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>📋 Dettaglio Mensile</h3>
              </div>
              <div style={{ padding: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px' }}>Mese</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px' }}>Ferie Maturate</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px' }}>Ferie Godute</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px' }}>ROL Maturati</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px' }}>ROL Goduti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saldoData.dettaglio_mensile.map((m, idx) => {
                      const mesiNomi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 500 }}>{mesiNomi[m.mese - 1]}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#22c55e' }}>
                            +{m.ferie_maturate?.toFixed(1)}h
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: m.ferie_godute > 0 ? '#ef4444' : '#9ca3af' }}>
                            {m.ferie_godute > 0 ? `-${m.ferie_godute?.toFixed(1)}h` : '-'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#3b82f6' }}>
                            +{m.rol_maturati?.toFixed(1)}h
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: m.rol_goduti > 0 ? '#ef4444' : '#9ca3af' }}>
                            {m.rol_goduti > 0 ? `-${m.rol_goduti?.toFixed(1)}h` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : !selectedEmployee ? (
        <div style={{ 
          background: 'white', 
          borderRadius: 12, 
          padding: 60, 
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏖️</div>
          <p style={{ color: '#6b7280', margin: 0, fontSize: 15 }}>
            Seleziona un dipendente per visualizzare il saldo ferie e permessi
          </p>
        </div>
      ) : null}
    </div>
  );
}
