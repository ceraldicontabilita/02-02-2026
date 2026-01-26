import React, { useState, useEffect } from "react";
import api from "../api";
import { STYLES, COLORS, button, badge, formatEuro, formatDateIT } from '../lib/utils';

const styles = {
  container: {
    padding: 20,
    maxWidth: 1200,
    margin: '0 auto'
  },
  card: {
    background: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16
  },
  row: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  btnPrimary: {
    padding: '10px 20px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: 14
  },
  btnSecondary: {
    padding: '10px 20px',
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: 14
  },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    minWidth: 150
  },
  select: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    background: 'white',
    cursor: 'pointer',
    minWidth: 130
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    marginTop: 12,
    padding: 10,
    background: '#fef2f2',
    borderRadius: 6
  },
  small: {
    fontSize: 13,
    color: '#64748b'
  },
  eventCard: (bgColor) => ({
    background: bgColor,
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    border: '1px solid rgba(0,0,0,0.05)'
  }),
  eventTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 6
  },
  emptyState: {
    textAlign: 'center',
    padding: 40,
    color: '#64748b'
  }
};

export default function Pianificazione() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState("");
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    type: "meeting",
    notes: ""
  });

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      setLoading(true);
      const r = await api.get("/api/pianificazione/events");
      setEvents(Array.isArray(r.data) ? r.data : r.data?.items || []);
    } catch (e) {
      console.error("Error loading events:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEvent(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/api/pianificazione/events", {
        title: newEvent.title,
        scheduled_date: `${newEvent.date}T${newEvent.time}:00`,
        event_type: newEvent.type,
        notes: newEvent.notes,
        status: "scheduled"
      });
      setShowForm(false);
      setNewEvent({ title: "", date: new Date().toISOString().split("T")[0], time: "09:00", type: "meeting", notes: "" });
      loadEvents();
    } catch (e) {
      setErr("Errore: " + (e.response?.data?.detail || e.message));
    }
  }

  function getEventColor(type) {
    const colors = {
      meeting: "#dbeafe",
      deadline: "#fef2f2",
      reminder: "#fef3c7",
      task: "#dcfce7"
    };
    return colors[type] || "#f1f5f9";
  }

  function getEventIcon(type) {
    const icons = { meeting: "🤝", deadline: "⏰", reminder: "🔔", task: "✅" };
    return icons[type] || "📌";
  }

  return (
    <div style={styles.container} data-testid="pianificazione-page">
      {/* Header */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 'bold', color: '#1e293b' }}>
            📅 Pianificazione
          </h1>
          <div style={styles.row}>
            <button 
              style={styles.btnPrimary} 
              onClick={() => setShowForm(!showForm)}
              data-testid="btn-nuovo-evento"
            >
              + Nuovo Evento
            </button>
            <button style={styles.btnSecondary} onClick={loadEvents}>
              🔄 Aggiorna
            </button>
          </div>
        </div>
        {err && <div style={styles.error}>{err}</div>}
      </div>

      {/* Form Nuovo Evento */}
      {showForm && (
        <div style={styles.card}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: '600', color: '#1e293b' }}>
            ✨ Nuovo Evento
          </h2>
          <form onSubmit={handleCreateEvent}>
            <div style={{ ...styles.row, marginBottom: 16 }}>
              <input
                style={{ ...styles.input, flex: 1 }}
                placeholder="Titolo evento"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                required
                data-testid="input-titolo"
              />
              <input
                style={styles.input}
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                required
              />
              <input
                style={{ ...styles.input, width: 100 }}
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
              />
              <select
                style={styles.select}
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
              >
                <option value="meeting">🤝 Riunione</option>
                <option value="deadline">⏰ Scadenza</option>
                <option value="reminder">🔔 Promemoria</option>
                <option value="task">✅ Attività</option>
              </select>
            </div>
            <div style={styles.row}>
              <input
                style={{ ...styles.input, flex: 1 }}
                placeholder="Note (opzionale)"
                value={newEvent.notes}
                onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
              />
              <button type="submit" style={styles.btnPrimary} data-testid="btn-salva">
                💾 Salva
              </button>
              <button type="button" style={styles.btnSecondary} onClick={() => setShowForm(false)}>
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista Eventi */}
      <div style={styles.card}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: '600', color: '#1e293b' }}>
          📋 Eventi Pianificati ({events.length})
        </h2>
        
        {loading ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p>Caricamento eventi...</p>
          </div>
        ) : events.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p style={{ margin: 0, fontWeight: '500' }}>Nessun evento pianificato</p>
            <p style={{ margin: '8px 0 0 0', fontSize: 14 }}>
              Clicca su &quot;Nuovo Evento&quot; per aggiungere il primo
            </p>
          </div>
        ) : (
          <div>
            {events.map((ev, i) => (
              <div key={ev.id || i} style={styles.eventCard(getEventColor(ev.event_type))}>
                <div style={styles.eventTitle}>
                  {getEventIcon(ev.event_type)} {ev.title}
                </div>
                <div style={styles.small}>
                  📅 {new Date(ev.scheduled_date).toLocaleString("it-IT")} | 
                  🏷️ {ev.event_type} | 
                  📋 <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: 4, 
                    background: ev.status === 'completed' ? '#dcfce7' : '#e0e7ff',
                    color: ev.status === 'completed' ? '#166534' : '#3730a3',
                    fontWeight: '500'
                  }}>
                    {ev.status}
                  </span>
                </div>
                {ev.notes && (
                  <div style={{ ...styles.small, marginTop: 8, fontStyle: 'italic' }}>
                    💬 {ev.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
