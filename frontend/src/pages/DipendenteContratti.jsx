import React from 'react';
import { ContrattiTab } from '../components/dipendenti';

/**
 * Pagina standalone per Contratti Dipendenti
 * Accessibile da menu laterale
 */
export default function DipendenteContratti() {
  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)', color: '#1a365d' }}>
          📄 Contratti Dipendenti
        </h1>
        <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: 'clamp(12px, 3vw, 14px)' }}>
          Gestione contratti di lavoro
        </p>
      </div>
      <ContrattiTab />
    </div>
  );
}
