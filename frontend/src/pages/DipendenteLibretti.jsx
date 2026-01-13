import React from 'react';
import { LibrettiSanitariTab } from '../components/dipendenti';

/**
 * Pagina standalone per Libretti Sanitari
 * Accessibile da menu laterale
 */
export default function DipendenteLibretti() {
  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)', color: '#1a365d' }}>
          🏥 Libretti Sanitari
        </h1>
        <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: 'clamp(12px, 3vw, 14px)' }}>
          Scadenze e rinnovi libretti sanitari dipendenti
        </p>
      </div>
      <LibrettiSanitariTab />
    </div>
  );
}
