import React, { useState, useEffect } from 'react';
import {
  IconBriefcase,
  IconRefresh,
  IconAlertTriangle,
  IconCheck,
  IconEye,
  IconTrash
} from './Icons';

export default function SunafilPanel({ API_URL, authToken, activeCompany, companies }) {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ totalCount: 0, pendingCount: 0, highPriorityCount: 0 });
  const [selectedCompanyId, setSelectedCompanyId] = useState(activeCompany?.id || 'ALL');
  const [estadoFilter, setEstadoFilter] = useState('ALL'); // 'ALL' | 'PENDIENTE' | 'ATENDIDO'
  const [prioridadFilter, setPrioridadFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (activeCompany?.id && selectedCompanyId !== 'ALL' && !companies.some(c => c.id === selectedCompanyId)) {
      setSelectedCompanyId(activeCompany.id);
    }
  }, [activeCompany]);

  useEffect(() => {
    loadAlerts();
  }, [selectedCompanyId, estadoFilter, prioridadFilter]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 7000);
  };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompanyId && selectedCompanyId !== 'ALL') {
        params.append('companyId', selectedCompanyId);
      }
      if (estadoFilter !== 'ALL') params.append('estado', estadoFilter);
      if (prioridadFilter !== 'ALL') params.append('prioridad', prioridadFilter);

      const res = await fetch(`${API_URL}/api/sunafil/alerts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setStats({
          totalCount: data.totalCount || 0,
          pendingCount: data.pendingCount || 0,
          highPriorityCount: data.highPriorityCount || 0
        });
      }
    } catch (e) {
      console.error(e);
      showMsg('Error al cargar alertas de SUNAFIL', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (mode = 'SINGLE') => {
    setSyncing(true);
    try {
      const payload = {
        mode,
        companyId: mode === 'SINGLE' ? (selectedCompanyId !== 'ALL' ? selectedCompanyId : activeCompany?.id) : undefined
      };

      const res = await fetch(`${API_URL}/api/sunafil/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMsg(data.message || 'Sincronización con SUNAFIL completada.');
        loadAlerts();
      } else {
        showMsg(data.error || 'Fallo en la sincronización con SUNAFIL', 'error');
      }
    } catch (e) {
      showMsg('Error de conexión: ' + e.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async (alert) => {
    const newStatus = alert.estado === 'PENDIENTE' ? 'ATENDIDO' : 'PENDIENTE';
    try {
      const res = await fetch(`${API_URL}/api/sunafil/alerts/${alert.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ estado: newStatus, leido: true })
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, estado: newStatus, leido: true } : a));
        setStats(prev => ({
          ...prev,
          pendingCount: newStatus === 'ATENDIDO' ? Math.max(0, prev.pendingCount - 1) : prev.pendingCount + 1
        }));
        showMsg(`Expediente marcado como: ${newStatus}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAlert = async (id) => {
    if (!window.confirm('¿Deseas archivar esta alerta inspectiva?')) return;
    try {
      const res = await fetch(`${API_URL}/api/sunafil/alerts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== id));
        showMsg('Alerta de SUNAFIL archivada.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.asunto?.toLowerCase().includes(q) ||
      a.numExpediente?.toLowerCase().includes(q) ||
      a.materia?.toLowerCase().includes(q) ||
      a.company?.razonSocial?.toLowerCase().includes(q) ||
      a.company?.ruc?.includes(q);
  });

  return (
    <div className="sunafil-container animate-fade-in">
      {/* Alert banner */}
      {message && (
        <div className={`glass-card animate-fade-in`} style={{
          borderLeft: `4px solid ${message.type === 'error' ? 'var(--error)' : 'var(--success)'}`,
          padding: '12px 16px',
          marginBottom: '20px',
          background: message.type === 'error' ? 'var(--error-subtle)' : 'var(--success-subtle)'
        }}>
          <div className="flex-between">
            <span style={{ fontWeight: 600, color: message.type === 'error' ? 'var(--error)' : 'var(--success)' }}>
              {message.text}
            </span>
            <button type="button" onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="settings-page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconBriefcase size={24} />
            <span>Casilla Electrónica SUNAFIL</span>
          </h1>
          <p className="page-subtitle">
            Gestión y consulta masiva de requerimientos de información, fiscalizaciones laborales, actas de infracción y cartas inductivas mediante Clave SOL.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => handleSync('SINGLE')}
            disabled={syncing}
            title="Consultar casilla SUNAFIL para la empresa actual"
          >
            <IconRefresh size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Consultando...' : 'Sincronizar Empresa'}</span>
          </button>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => handleSync('ALL')}
            disabled={syncing}
            title="Consultar masivamente todas las empresas registradas mediante Clave SOL"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <IconBriefcase size={15} />
            <span>{syncing ? 'Sincronizando...' : '⚡ Sincronización Masiva SUNAFIL'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-title">Total Alertas SUNAFIL</span>
          <span className="metric-value">{stats.totalCount}</span>
          <span className="metric-desc">Expedientes en Casilla Electrónica</span>
        </div>
        <div className="metric-card warning">
          <span className="metric-title">Requerimientos Pendientes</span>
          <span className="metric-value" style={{ color: stats.pendingCount > 0 ? 'var(--warning)' : 'inherit' }}>
            {stats.pendingCount}
          </span>
          <span className="metric-desc">Pendientes de descargo documental</span>
        </div>
        <div className="metric-card error">
          <span className="metric-title">Fiscalización / Alta Prioridad</span>
          <span className="metric-value" style={{ color: stats.highPriorityCount > 0 ? 'var(--error)' : 'inherit' }}>
            {stats.highPriorityCount}
          </span>
          <span className="metric-desc">Riesgo inminente de infracción laboral</span>
        </div>
        <div className="metric-card success">
          <span className="metric-title">Empresas Conectadas</span>
          <span className="metric-value">{companies.length}</span>
          <span className="metric-desc">Autenticadas con Clave SOL</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'center' }}>
          <div>
            <label className="apisunat-label">Filtrar por Empresa</label>
            <select 
              className="select-field"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              <option value="ALL">🏢 Todas mis empresas ({companies.length} RUCs)</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.razonSocial} (RUC {c.ruc})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="apisunat-label">Estado del Requerimiento</label>
            <select 
              className="select-field"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="PENDIENTE">Pendientes de atención</option>
              <option value="ATENDIDO">Atendidos / Con descargo</option>
            </select>
          </div>

          <div>
            <label className="apisunat-label">Nivel de Prioridad</label>
            <select 
              className="select-field"
              value={prioridadFilter}
              onChange={(e) => setPrioridadFilter(e.target.value)}
            >
              <option value="ALL">Todas las prioridades</option>
              <option value="ALTA">Alta (Urgente)</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja / Informativa</option>
            </select>
          </div>

          <div>
            <label className="apisunat-label">Búsqueda Rápida</label>
            <input 
              type="text"
              className="input-field"
              placeholder="Buscar por expediente, materia, RUC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            Expedientes y Comunicaciones Inspectivas ({filteredAlerts.length})
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Autenticación unificada mediante Clave SOL
          </span>
        </div>

        <div className="table-responsive" style={{ border: 'none' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>Prioridad</th>
                <th>Empresa (RUC)</th>
                <th>Expediente & Materia</th>
                <th>Asunto / Requerimiento</th>
                <th>Depósito</th>
                <th>Plazo Descargo</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id} style={{ background: alert.estado === 'PENDIENTE' && alert.prioridad === 'ALTA' ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-pill ${
                        alert.prioridad === 'ALTA' ? 'error' : alert.prioridad === 'MEDIA' ? 'warning' : 'prod'
                      }`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                        {alert.prioridad}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>{alert.company?.razonSocial}</strong>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>RUC: {alert.company?.ruc}</div>
                      </div>
                    </td>
                    <td>
                      <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>{alert.numExpediente}</strong>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Materia: <strong>{alert.materia}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '320px' }}>
                        {alert.asunto}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '320px' }}>
                        {alert.descripcion}
                      </div>
                    </td>
                    <td style={{ fontSize: '12.5px' }}>
                      {alert.fechaDeposito}
                    </td>
                    <td>
                      {alert.fechaVencimiento ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <IconAlertTriangle size={13} style={{ color: alert.estado === 'PENDIENTE' ? 'var(--error)' : 'var(--text-muted)' }} />
                          <strong style={{ color: alert.estado === 'PENDIENTE' ? 'var(--error)' : 'var(--text-muted)', fontSize: '12px' }}>
                            {alert.fechaVencimiento}
                          </strong>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Informativo</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-pill ${alert.estado === 'ATENDIDO' ? 'prod' : 'warning'}`}>
                        {alert.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button 
                          type="button"
                          className="btn-sm btn-secondary"
                          onClick={() => setSelectedAlert(alert)}
                          title="Ver requerimiento completo"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <IconEye size={12} />
                          <span>Detalle</span>
                        </button>

                        <button 
                          type="button"
                          className={`btn-sm ${alert.estado === 'PENDIENTE' ? 'btn-outline-primary' : 'btn-secondary'}`}
                          onClick={() => handleToggleStatus(alert)}
                          title={alert.estado === 'PENDIENTE' ? 'Marcar como Atendido / Descargo presentado' : 'Marcar como Pendiente'}
                        >
                          <IconCheck size={12} />
                          <span>{alert.estado === 'PENDIENTE' ? 'Atender' : 'Reabrir'}</span>
                        </button>

                        <button 
                          type="button"
                          className="btn-sm btn-danger-outline"
                          onClick={() => handleDeleteAlert(alert.id)}
                          title="Archivar comunicación"
                        >
                          <IconTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {loading ? 'Consultando Casilla SUNAFIL...' : 'No se registran alertas o expedientes con los filtros seleccionados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAlert && (
        <div className="login-modal-overlay">
          <div className="login-modal-card" style={{ maxWidth: '580px' }}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'var(--primary-subtle)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconBriefcase size={18} />
                </div>
                <div>
                  <h3 className="card-title" style={{ margin: 0, fontSize: '17px' }}>
                    Expediente Inspectivo SUNAFIL
                  </h3>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {selectedAlert.numExpediente} • Prioridad: {selectedAlert.prioridad}
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                className="apisunat-remove-btn" 
                onClick={() => setSelectedAlert(null)}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Empresa Fiscalizada:</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedAlert.company?.razonSocial}</div>
                <div style={{ color: 'var(--text-secondary)' }}>RUC: {selectedAlert.company?.ruc}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Materia de Inspección:</span>
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{selectedAlert.materia}</div>
                <div style={{ marginTop: '4px' }}>
                  Fecha Depósito: <strong>{selectedAlert.fechaDeposito}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                {selectedAlert.asunto}
              </h4>
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedAlert.descripcion}
              </div>
            </div>

            {selectedAlert.fechaVencimiento && (
              <div style={{
                background: 'var(--error-subtle)',
                border: '1px solid var(--error-border)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--error)',
                fontSize: '12.5px'
              }}>
                <IconAlertTriangle size={16} />
                <span>
                  <strong>Plazo Improrrogable:</strong> Debes subir tus descargos a la Casilla Electrónica SUNAFIL antes del <strong>{selectedAlert.fechaVencimiento}</strong> para evitar multas de inspección laboral.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setSelectedAlert(null)}
              >
                Cerrar
              </button>
              <a 
                href="https://casillaelectronica.sunafil.gob.pe/" 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Abrir Casilla SUNAFIL (Clave SOL) →</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
