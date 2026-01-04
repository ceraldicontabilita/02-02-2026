import React, { useState } from 'react';

/**
 * PrimaNotaMovementsTable - Tabella movimenti Prima Nota
 */
export function PrimaNotaMovementsTable({ 
  data, 
  activeTab, 
  loading, 
  formatCurrency, 
  onDeleteMovement,
  onEditMovement
}) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>;
  }

  return (
    <div 
      data-testid="movements-table"
      style={{ 
        background: 'white', 
        borderRadius: 8, 
        overflow: 'hidden', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
      }}
    >
      {/* Desktop Table */}
      <div style={{ display: 'block' }} className="desktop-table">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 12, textAlign: 'left' }}>Data</th>
              <th style={{ padding: 12, textAlign: 'center' }}>Tipo</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Categoria</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Descrizione</th>
              {activeTab === 'cassa' && <th style={{ padding: 12, textAlign: 'left' }}>Fornitore</th>}
              {activeTab === 'banca' && <th style={{ padding: 12, textAlign: 'center' }}>Assegno</th>}
              <th style={{ padding: 12, textAlign: 'right' }}>Importo</th>
              <th style={{ padding: 12, textAlign: 'right' }}>Saldo</th>
              <th style={{ padding: 12, textAlign: 'center' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {data.movimenti?.map((mov, idx) => (
              <MovementRow 
                key={mov.id} 
                mov={mov} 
                idx={idx} 
                activeTab={activeTab}
                formatCurrency={formatCurrency}
                onDelete={onDeleteMovement}
                onEdit={onEditMovement}
                runningTotal={calculateRunningTotal(data.movimenti, idx)}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Cards */}
      <div style={{ display: 'none' }} className="mobile-cards">
        {data.movimenti?.map((mov, idx) => (
          <MobileMovementCard
            key={mov.id}
            mov={mov}
            formatCurrency={formatCurrency}
            onDelete={onDeleteMovement}
            onEdit={onEditMovement}
          />
        ))}
      </div>
      
      {data.movimenti?.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
          Nessun movimento trovato
        </div>
      )}
      
      {/* Show count */}
      {data.movimenti?.length > 0 && (
        <div style={{ padding: '12px 16px', background: '#f9f9f9', borderTop: '1px solid #eee', fontSize: 13, color: '#666' }}>
          Mostrando {data.movimenti.length} movimenti
        </div>
      )}
      
      <style>{`
        @media (max-width: 768px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: block !important; }
        }
      `}</style>
    </div>
  );
}

// Calculate running total up to index
function calculateRunningTotal(movimenti, upToIndex) {
  let total = 0;
  for (let i = movimenti.length - 1; i >= upToIndex; i--) {
    const mov = movimenti[i];
    if (mov.tipo === 'entrata') {
      total += mov.importo;
    } else {
      total -= mov.importo;
    }
  }
  return total;
}

function MovementRow({ mov, idx, activeTab, formatCurrency, onDelete, onEdit, runningTotal }) {
  return (
    <tr style={{ 
      borderBottom: '1px solid #eee',
      background: idx % 2 === 0 ? 'white' : '#fafafa'
    }}>
      <td style={{ padding: 12, fontFamily: 'monospace' }}>
        {new Date(mov.data).toLocaleDateString('it-IT')}
      </td>
      <td style={{ padding: 12, textAlign: 'center' }}>
        <span style={{
          padding: '4px 10px',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 'bold',
          background: mov.tipo === 'entrata' ? '#4caf50' : '#f44336',
          color: 'white'
        }}>
          {mov.tipo === 'entrata' ? '↑ Entrata' : '↓ Uscita'}
        </span>
      </td>
      <td style={{ padding: 12, fontSize: 12 }}>{mov.categoria || '-'}</td>
      <td style={{ padding: 12 }}>
        <div style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {mov.descrizione}
        </div>
        {mov.riferimento && (
          <div style={{ fontSize: 11, color: '#666' }}>Rif: {mov.riferimento}</div>
        )}
      </td>
      {activeTab === 'cassa' && (
        <td style={{ padding: 12, fontSize: 12, color: '#666' }}>
          {mov.fornitore_nome || '-'}
        </td>
      )}
      {activeTab === 'banca' && (
        <td style={{ padding: 12, textAlign: 'center' }}>
          {mov.assegno_collegato ? (
            <span style={{
              padding: '4px 8px',
              background: '#e91e63',
              color: 'white',
              borderRadius: 4,
              fontSize: 11
            }}>
              ✓ {mov.assegno_collegato}
            </span>
          ) : (
            <span style={{ color: '#999', fontSize: 11 }}>-</span>
          )}
        </td>
      )}
      <td style={{ 
        padding: 12, 
        textAlign: 'right', 
        fontWeight: 'bold',
        color: mov.tipo === 'entrata' ? '#4caf50' : '#f44336'
      }}>
        {mov.tipo === 'entrata' ? '+' : '-'} {formatCurrency(mov.importo)}
      </td>
      <td style={{ padding: 12, textAlign: 'right', fontSize: 12, color: '#666' }}>
        {formatCurrency(runningTotal)}
      </td>
      <td style={{ padding: 12, textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          <button
            onClick={() => onEdit && onEdit(mov)}
            style={{ 
              padding: '4px 8px', 
              cursor: 'pointer', 
              background: '#2196f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4,
              fontSize: 12
            }}
            title="Modifica"
            data-testid={`edit-movement-${mov.id}`}
          >
            ✏️ Modifica
          </button>
          <button
            onClick={() => onDelete(mov.id)}
            style={{ 
              padding: '4px 8px', 
              cursor: 'pointer', 
              background: '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4,
              fontSize: 12
            }}
            title="Elimina"
            data-testid={`delete-movement-${mov.id}`}
          >
            🗑️ Elimina
          </button>
        </div>
      </td>
    </tr>
  );
}

function MobileMovementCard({ mov, formatCurrency, onDelete, onEdit }) {
  return (
    <div style={{
      padding: 16,
      borderBottom: '1px solid #eee',
      background: 'white'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {new Date(mov.data).toLocaleDateString('it-IT')}
        </span>
        <span style={{
          padding: '3px 8px',
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 'bold',
          background: mov.tipo === 'entrata' ? '#4caf50' : '#f44336',
          color: 'white'
        }}>
          {mov.tipo === 'entrata' ? '↑ Entrata' : '↓ Uscita'}
        </span>
      </div>
      
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{mov.categoria}</div>
      <div style={{ marginBottom: 8 }}>{mov.descrizione}</div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 12, color: '#666' }}>Importo: </span>
          <strong style={{ color: mov.tipo === 'entrata' ? '#4caf50' : '#f44336' }}>
            {mov.tipo === 'entrata' ? '+' : '-'} {formatCurrency(mov.importo)}
          </strong>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onEdit && onEdit(mov)}
            style={{ padding: '6px 12px', background: '#2196f3', color: 'white', border: 'none', borderRadius: 4, fontSize: 12 }}
          >
            Modifica
          </button>
          <button
            onClick={() => onDelete(mov.id)}
            style={{ padding: '6px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: 4, fontSize: 12 }}
          >
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}
