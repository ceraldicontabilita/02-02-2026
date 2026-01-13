import React, { useState } from 'react';
import { LibroUnicoTab } from '../components/dipendenti';
import { useAnnoGlobale } from '../contexts/AnnoContext';

/**
 * Pagina standalone per Libro Unico del Lavoro
 * Accessibile da menu laterale
 */
export default function DipendenteLibroUnico() {
  const { anno: selectedYear, setAnno: setSelectedYear } = useAnnoGlobale();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)', color: '#1a365d' }}>
          📚 Libro Unico del Lavoro
        </h1>
        <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: 'clamp(12px, 3vw, 14px)' }}>
          Registro presenze e retribuzioni
        </p>
      </div>
      <LibroUnicoTab
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onChangeYear={setSelectedYear}
        onChangeMonth={setSelectedMonth}
      />
    </div>
  );
}
