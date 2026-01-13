import React from 'react';
import { AccontiTab } from '../components/dipendenti';

/**
 * Pagina standalone per Acconti Dipendenti
 * Accessibile da menu laterale
 */
export default function DipendenteAcconti() {
  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)', color: '#1a365d' }}>
          💰 Acconti Dipendenti
        </h1>
        <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: 'clamp(12px, 3vw, 14px)' }}>
          Gestione acconti su stipendi, TFR, ferie, 13ima e 14ima
        </p>
      </div>
      <AccontiTab />
    </div>
  );
}
