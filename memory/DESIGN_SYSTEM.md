# Design System - Ceraldi ERP

## ⚠️ IMPORTANTE: MIGRAZIONE A TYPESCRIPT

**A partire dal 26 Gennaio 2026, utilizzare il nuovo Design System TypeScript:**

```typescript
import { STYLES, button, badge, formatEuro, formatDateIT } from '@/design/ceraldiDesignSystem';
```

**File**: `/app/frontend/src/design/ceraldiDesignSystem.ts`

---

## REGOLA FONDAMENTALE

**USARE SEMPRE STILI INLINE JAVASCRIPT**, mai Tailwind CSS.

```jsx
// ✅ CORRETTO - Stile inline
<div style={{ padding: 20, background: '#1e3a5f', borderRadius: 12 }}>

// ❌ SBAGLIATO - NON usare Tailwind
<div className="p-5 bg-emerald-500 rounded-xl">
```

---

## Colori Principali

```javascript
const COLORS = {
  primary: '#1e3a5f',      // Blu scuro header
  primaryLight: '#2d5a87', // Blu gradient
  success: '#4caf50',      // Verde successo
  warning: '#ff9800',      // Arancione warning
  danger: '#ef4444',       // Rosso errore
  info: '#2196f3',         // Blu info
  purple: '#9c27b0',       // Viola
  gray: '#6b7280',         // Grigio testo
  grayLight: '#e5e7eb',    // Grigio bordi
  grayBg: '#f9fafb',       // Grigio sfondo
  white: '#ffffff'
};
```

---

## Componenti Standard

### Header Pagina
```jsx
<div style={{ 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  marginBottom: 20,
  padding: '15px 20px',
  background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
  borderRadius: 12,
  color: 'white'
}}>
  <div>
    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>📒 Titolo Pagina</h1>
    <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>Sottotitolo descrittivo</p>
  </div>
</div>
```

### Card
```jsx
<div style={{
  background: 'white',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  border: '1px solid #e5e7eb'
}}>
  {children}
</div>
```

### Button Primary
```jsx
<button style={{
  padding: '10px 20px',
  background: '#4caf50',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: 14
}}>
  Testo
</button>
```

### Button Secondary
```jsx
<button style={{
  padding: '10px 20px',
  background: '#e5e7eb',
  color: '#374151',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: 14
}}>
  Testo
</button>
```

### Input
```jsx
<input style={{
  padding: '10px 12px',
  borderRadius: 8,
  border: '2px solid #e5e7eb',
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box'
}} />
```

### Select
```jsx
<select style={{
  padding: '10px 12px',
  borderRadius: 8,
  border: '2px solid #e5e7eb',
  fontSize: 14,
  background: 'white'
}}>
  <option>...</option>
</select>
```

### Tabella
```jsx
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
  <thead>
    <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Header</th>
    </tr>
  </thead>
  <tbody>
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: '12px 16px' }}>Content</td>
    </tr>
  </tbody>
</table>
```

### Badge/Tag
```jsx
// Success
<span style={{ padding: '4px 10px', background: '#dcfce7', color: '#16a34a', borderRadius: 6, fontSize: 12, fontWeight: '600' }}>
  Attivo
</span>

// Warning
<span style={{ padding: '4px 10px', background: '#fef3c7', color: '#d97706', borderRadius: 6, fontSize: 12, fontWeight: '600' }}>
  In Attesa
</span>

// Danger
<span style={{ padding: '4px 10px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, fontSize: 12, fontWeight: '600' }}>
  Errore
</span>
```

### Card Statistiche
```jsx
<div style={{
  background: 'white',
  borderRadius: 12,
  padding: 20,
  textAlign: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
}}>
  <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1e3a5f' }}>123</div>
  <div style={{ fontSize: 14, color: '#6b7280' }}>Label</div>
</div>
```

### Modal
```jsx
{showModal && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  }}>
    <div style={{
      background: 'white',
      borderRadius: 16,
      width: '90%',
      maxWidth: 500,
      maxHeight: '90vh',
      overflow: 'auto'
    }}>
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Titolo Modal</h2>
        <button onClick={() => setShowModal(false)} style={{ 
          background: 'none', 
          border: 'none', 
          fontSize: 20, 
          cursor: 'pointer' 
        }}>✕</button>
      </div>
      <div style={{ padding: 20 }}>
        {/* Content */}
      </div>
    </div>
  </div>
)}
```

### Layout Grid
```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
  {/* Cards */}
</div>
```

### Flex Row
```jsx
<div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
  {/* Items */}
</div>
```

---

## Icone

Usare **emoji** per le icone, non lucide-react:
- 📒 Documento
- 📊 Statistiche
- 💰 Soldi
- 📅 Calendario
- ✏️ Modifica
- 🗑️ Elimina
- ➕ Aggiungi
- 🔄 Aggiorna
- ✅ Successo
- ❌ Errore
- ⚠️ Warning
- 📥 Import
- 📤 Export
- 🔍 Cerca

---

## Esempio Pagina Completa

```jsx
export default function EsempioPagina() {
  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20,
        padding: '15px 20px',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
        borderRadius: 12,
        color: 'white'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>📒 Nome Pagina</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>Descrizione</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ padding: '8px 16px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>
            ➕ Nuovo
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        {/* Table, forms, etc */}
      </div>
    </div>
  );
}
```

---

## Note

1. **MAI usare Tailwind CSS** - Solo stili inline
2. **MAI usare lucide-react** - Solo emoji
3. **Colore header**: `#1e3a5f` con gradient a `#2d5a87`
4. **Border radius**: 8px per bottoni/input, 12px per card
5. **Box shadow card**: `0 2px 8px rgba(0,0,0,0.08)`
6. **Font sizes**: 12px small, 14px normal, 18-22px titoli
