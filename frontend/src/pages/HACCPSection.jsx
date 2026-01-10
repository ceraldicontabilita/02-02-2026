import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  Boxes, 
  Thermometer, 
  Snowflake, 
  Bug, 
  Sparkles, 
  FileText,
  AlertTriangle,
  Package,
  ChefHat,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Calendar,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Sezioni HACCP con stile card blu
const HACCP_SECTIONS = [
  {
    id: 'lotti-produzione',
    title: 'Lotti di Produzione',
    subtitle: 'Gestione lotti e tracciabilità prodotti',
    icon: Boxes,
    color: '#1e40af',
    bgGradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    route: '/haccp/tracciabilita',
    stats: ['lotti_attivi', 'prodotti_settimana']
  },
  {
    id: 'temperature-positive',
    title: 'Frigoriferi (Temp +)',
    subtitle: 'Registrazione temperature 0/+4°C',
    icon: Thermometer,
    color: '#f59e0b',
    bgGradient: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
    route: '/haccp/frigoriferi',
    stats: ['frigoriferi_monitorati', 'anomalie_giorno']
  },
  {
    id: 'temperature-negative',
    title: 'Congelatori (Temp -)',
    subtitle: 'Registrazione temperature -22/-18°C',
    icon: Snowflake,
    color: '#0ea5e9',
    bgGradient: 'linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)',
    route: '/haccp/congelatori',
    stats: ['congelatori_monitorati', 'anomalie_giorno']
  },
  {
    id: 'sanificazioni',
    title: 'Sanificazioni',
    subtitle: 'Registro pulizia e sanificazione locali',
    icon: Sparkles,
    color: '#10b981',
    bgGradient: 'linear-gradient(135deg, #047857 0%, #34d399 100%)',
    route: '/haccp/sanificazioni',
    stats: ['sanificazioni_mese', 'completate']
  },
  {
    id: 'disinfestazioni',
    title: 'Disinfestazione',
    subtitle: 'Monitoraggio pest control mensile',
    icon: Bug,
    color: '#78350f',
    bgGradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)',
    route: '/haccp/disinfestazioni',
    stats: ['interventi_anno', 'prossimo']
  },
  {
    id: 'manuale-haccp',
    title: 'Manuale HACCP',
    subtitle: 'Documentazione e procedure',
    icon: FileText,
    color: '#6366f1',
    bgGradient: 'linear-gradient(135deg, #4338ca 0%, #818cf8 100%)',
    route: '/haccp/manuale',
    stats: ['documenti', 'ultima_revisione']
  },
  {
    id: 'non-conformita',
    title: 'Non Conformità',
    subtitle: 'Gestione anomalie e azioni correttive',
    icon: AlertTriangle,
    color: '#dc2626',
    bgGradient: 'linear-gradient(135deg, #b91c1c 0%, #f87171 100%)',
    route: '/haccp/non-conformita',
    stats: ['aperte', 'risolte_mese']
  },
  {
    id: 'materie-prime',
    title: 'Materie Prime',
    subtitle: 'Anagrafica ingredienti e fornitori',
    icon: Package,
    color: '#8b5cf6',
    bgGradient: 'linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)',
    route: '/haccp/materie-prime',
    stats: ['totale', 'con_allergeni']
  },
  {
    id: 'ricette',
    title: 'Ricette',
    subtitle: 'Schede tecniche e allergeni',
    icon: ChefHat,
    color: '#ec4899',
    bgGradient: 'linear-gradient(135deg, #be185d 0%, #f472b6 100%)',
    route: '/haccp/ricette',
    stats: ['totale', 'con_allergeni']
  }
];

export default function HACCPSection() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carica statistiche da vari endpoint
      const [tracRes, tempRes, sanifRes] = await Promise.all([
        api.get('/api/tracciabilita?limit=100').catch(() => ({ data: [] })),
        api.get('/api/haccp/temperature-positive/stats').catch(() => ({ data: {} })),
        api.get('/api/haccp/sanificazione/stats').catch(() => ({ data: {} }))
      ]);
      
      const tracciabilita = tracRes.data || [];
      
      setStats({
        lotti_attivi: tracciabilita.length,
        prodotti_settimana: tracciabilita.filter(t => {
          const d = new Date(t.data_consegna);
          const week = new Date();
          week.setDate(week.getDate() - 7);
          return d >= week;
        }).length,
        frigoriferi_monitorati: tempRes.data?.frigoriferi || 12,
        congelatori_monitorati: tempRes.data?.congelatori || 12,
        anomalie_giorno: tempRes.data?.anomalie || 0,
        sanificazioni_mese: sanifRes.data?.totale || 0,
        completate: sanifRes.data?.completate || 0
      });
      
      // Attività recenti dalla tracciabilità
      setRecentActivity(tracciabilita.slice(0, 5));
      
    } catch (err) {
      console.error('Errore caricamento dati HACCP:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStat = (statKey) => {
    const value = stats[statKey];
    if (value === undefined) return '-';
    return value;
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      
      {/* Header con stile blu */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        borderRadius: 16,
        padding: '24px 32px',
        marginBottom: 32,
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 10px 40px -10px rgba(30, 64, 175, 0.4)'
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: 32, 
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <Boxes size={36} />
            HACCP & Tracciabilità
          </h1>
          <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 15 }}>
            Sistema completo per la gestione HACCP e tracciabilità lotti
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={loadDashboardData}
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600
            }}
          >
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Statistiche rapide */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        <StatCard 
          icon={<Boxes size={24} />}
          label="Lotti Attivi"
          value={stats.lotti_attivi || 0}
          color="#3b82f6"
          trend={stats.prodotti_settimana > 0 ? `+${stats.prodotti_settimana} questa settimana` : null}
        />
        <StatCard 
          icon={<Thermometer size={24} />}
          label="Frigoriferi"
          value={stats.frigoriferi_monitorati || 12}
          color="#f59e0b"
          subtext="monitorati"
        />
        <StatCard 
          icon={<Snowflake size={24} />}
          label="Congelatori"
          value={stats.congelatori_monitorati || 12}
          color="#0ea5e9"
          subtext="monitorati"
        />
        <StatCard 
          icon={<AlertCircle size={24} />}
          label="Anomalie"
          value={stats.anomalie_giorno || 0}
          color={stats.anomalie_giorno > 0 ? "#dc2626" : "#10b981"}
          subtext={stats.anomalie_giorno > 0 ? "oggi" : "tutto ok"}
        />
      </div>

      {/* Grid delle sezioni HACCP */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20
      }}>
        {HACCP_SECTIONS.map(section => (
          <SectionCard 
            key={section.id}
            section={section}
            stats={stats}
            onClick={() => navigate(section.route)}
          />
        ))}
      </div>

      {/* Attività recente */}
      {recentActivity.length > 0 && (
        <div style={{
          marginTop: 32,
          background: 'white',
          borderRadius: 16,
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e3a8a' }}>
              📦 Ultime Consegne Tracciate
            </h3>
            <button
              onClick={() => navigate('/haccp/tracciabilita')}
              style={{
                padding: '6px 12px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              Vedi tutti
            </button>
          </div>
          <div style={{ padding: 16 }}>
            {recentActivity.map((item, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: idx < recentActivity.length - 1 ? '1px solid #f1f5f9' : 'none'
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Package size={20} style={{ color: '#3b82f6' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: '#1e293b' }}>
                    {item.prodotto?.substring(0, 40)}{item.prodotto?.length > 40 && '...'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {item.fornitore} • {item.data_consegna}
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background: item.rischio === 'alto' ? '#fee2e2' : 
                             item.rischio === 'medio' ? '#fef3c7' : '#dcfce7',
                  color: item.rischio === 'alto' ? '#991b1b' : 
                        item.rischio === 'medio' ? '#92400e' : '#166534'
                }}>
                  {item.categoria_haccp?.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info box */}
      <div style={{
        marginTop: 24,
        padding: 20,
        background: '#eff6ff',
        borderRadius: 12,
        border: '1px solid #bfdbfe',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start'
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <CheckCircle size={24} style={{ color: 'white' }} />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px', color: '#1e40af', fontWeight: 600 }}>
            Tracciabilità Automatica Attiva
          </h4>
          <p style={{ margin: 0, fontSize: 14, color: '#3b82f6', lineHeight: 1.6 }}>
            Quando carichi fatture XML in <strong>Import/Export</strong>, gli articoli alimentari 
            (carni, pesce, latticini, uova, etc.) vengono automaticamente tracciati con fornitore, 
            lotto e data. Vai alla sezione <strong>Lotti di Produzione</strong> per visualizzarli.
          </p>
        </div>
      </div>
    </div>
  );
}

// Componente Card Statistica
function StatCard({ icon, label, value, color, trend, subtext }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: 20,
      borderLeft: `4px solid ${color}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
          {subtext && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{subtext}</div>}
          {trend && <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>{trend}</div>}
        </div>
        <div style={{ color, opacity: 0.7 }}>{icon}</div>
      </div>
    </div>
  );
}

// Componente Card Sezione HACCP
function SectionCard({ section, stats, onClick }) {
  const Icon = section.icon;
  
  return (
    <div
      onClick={onClick}
      style={{
        background: section.bgGradient,
        borderRadius: 16,
        padding: 24,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
      }}
    >
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)'
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16
        }}>
          <Icon size={28} style={{ color: 'white' }} />
        </div>
        
        <h3 style={{ 
          margin: '0 0 8px', 
          fontSize: 20, 
          fontWeight: 700, 
          color: 'white' 
        }}>
          {section.title}
        </h3>
        
        <p style={{ 
          margin: 0, 
          fontSize: 13, 
          color: 'rgba(255,255,255,0.8)',
          lineHeight: 1.4
        }}>
          {section.subtitle}
        </p>
        
        <div style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 20,
            fontSize: 12,
            color: 'white',
            fontWeight: 500
          }}>
            Apri sezione
          </span>
          <ChevronRight size={20} style={{ color: 'rgba(255,255,255,0.7)' }} />
        </div>
      </div>
    </div>
  );
}
