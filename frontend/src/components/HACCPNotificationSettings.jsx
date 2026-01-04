import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';

/**
 * Hook per gestire le notifiche push del browser per alert HACCP critici
 */
export function useHACCPNotifications() {
  const [permission, setPermission] = useState('default');
  const [lastChecked, setLastChecked] = useState(null);
  const [criticalAlerts, setCriticalAlerts] = useState([]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  // Send browser notification
  const sendNotification = useCallback((title, body, options = {}) => {
    if (permission !== 'granted') return;

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'haccp-alert',
      renotify: true,
      requireInteraction: true,
      ...options
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = '/haccp/notifiche';
      notification.close();
    };

    // Auto-close after 30 seconds
    setTimeout(() => notification.close(), 30000);

    return notification;
  }, [permission]);

  // Check for critical HACCP alerts
  const checkCriticalAlerts = useCallback(async () => {
    try {
      const res = await api.get('/api/haccp-completo/notifiche/stats');
      const stats = res.data;

      const critiche = stats.per_severita?.critica?.non_lette || 0;
      const alte = stats.per_severita?.alta?.non_lette || 0;

      // Send notification for new critical alerts
      if (critiche > 0) {
        sendNotification(
          '🔴 ALERT HACCP CRITICO!',
          `${critiche} anomalie critiche rilevate. Temperatura fuori range critico!`,
          { urgency: 'high' }
        );
      } else if (alte > 0 && !lastChecked) {
        // Only notify for high severity on first check
        sendNotification(
          '🟠 Alert HACCP',
          `${alte} anomalie con severità alta rilevate.`,
          { urgency: 'normal' }
        );
      }

      setCriticalAlerts({
        critica: critiche,
        alta: alte,
        totale_non_lette: stats.totale_non_lette || 0
      });
      setLastChecked(new Date());

      return stats;
    } catch (error) {
      console.error('Error checking HACCP alerts:', error);
      return null;
    }
  }, [sendNotification, lastChecked]);

  // Initial permission check and periodic polling
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  return {
    permission,
    requestPermission,
    sendNotification,
    checkCriticalAlerts,
    criticalAlerts,
    lastChecked,
    isSupported: 'Notification' in window
  };
}

/**
 * Componente per gestire le impostazioni notifiche HACCP
 */
export default function HACCPNotificationSettings({ onClose }) {
  const { 
    permission, 
    requestPermission, 
    checkCriticalAlerts, 
    criticalAlerts, 
    isSupported 
  } = useHACCPNotifications();
  
  const [checking, setChecking] = useState(false);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      // Immediately check for alerts
      setChecking(true);
      await checkCriticalAlerts();
      setChecking(false);
    }
  };

  const handleTestNotification = () => {
    if (permission === 'granted') {
      new Notification('🧪 Test Notifica HACCP', {
        body: 'Le notifiche sono attive! Riceverai alert per anomalie critiche.',
        icon: '/favicon.ico'
      });
    }
  };

  if (!isSupported) {
    return (
      <div style={{ padding: 20, background: '#fef2f2', borderRadius: 8, marginBottom: 20 }}>
        <p style={{ color: '#dc2626', margin: 0 }}>
          ⚠️ Il tuo browser non supporta le notifiche push.
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'white', 
      borderRadius: 12, 
      padding: 20, 
      marginBottom: 20,
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>🔔 Notifiche Push HACCP</h3>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
            ✕
          </button>
        )}
      </div>

      <div style={{ marginBottom: 15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            background: permission === 'granted' ? '#16a34a' : permission === 'denied' ? '#dc2626' : '#d97706'
          }} />
          <span style={{ fontSize: 14 }}>
            Stato: {permission === 'granted' ? 'Attive' : permission === 'denied' ? 'Bloccate' : 'Non attive'}
          </span>
        </div>

        {permission === 'default' && (
          <button
            onClick={handleEnableNotifications}
            data-testid="enable-notifications-btn"
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔔 Attiva Notifiche Push
          </button>
        )}

        {permission === 'granted' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleTestNotification}
              data-testid="test-notification-btn"
              style={{
                padding: '8px 16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              🧪 Test Notifica
            </button>
            <button
              onClick={async () => { setChecking(true); await checkCriticalAlerts(); setChecking(false); }}
              disabled={checking}
              style={{
                padding: '8px 16px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: checking ? 'not-allowed' : 'pointer'
              }}
            >
              {checking ? '⏳ Controllo...' : '🔍 Controlla Alert'}
            </button>
          </div>
        )}

        {permission === 'denied' && (
          <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>
            Le notifiche sono state bloccate. Per attivarle, vai nelle impostazioni del browser.
          </p>
        )}
      </div>

      {criticalAlerts && criticalAlerts.totale_non_lette > 0 && (
        <div style={{ 
          background: criticalAlerts.critica > 0 ? '#fef2f2' : '#fef3c7', 
          padding: 12, 
          borderRadius: 8 
        }}>
          <div style={{ fontSize: 13, color: criticalAlerts.critica > 0 ? '#dc2626' : '#b45309' }}>
            {criticalAlerts.critica > 0 && (
              <div style={{ marginBottom: 4 }}>
                🔴 <strong>{criticalAlerts.critica}</strong> alert critici non letti
              </div>
            )}
            {criticalAlerts.alta > 0 && (
              <div style={{ marginBottom: 4 }}>
                🟠 <strong>{criticalAlerts.alta}</strong> alert alta severità non letti
              </div>
            )}
            <div>
              📊 Totale non letti: {criticalAlerts.totale_non_lette}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 15, fontSize: 12, color: '#666' }}>
        <strong>Come funziona:</strong>
        <ul style={{ margin: '5px 0 0 0', paddingLeft: 20 }}>
          <li>Ricevi notifiche push per temperature fuori range critico</li>
          <li>🔴 Critiche: Azione immediata richiesta</li>
          <li>🟠 Alte: Fuori range significativo</li>
          <li>Click sulla notifica per aprire i dettagli</li>
        </ul>
      </div>
    </div>
  );
}
