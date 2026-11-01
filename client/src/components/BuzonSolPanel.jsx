import React, { useState, useEffect } from 'react';
import {
  IconMail,
  IconRefresh,
  IconAlertTriangle,
  IconBuilding,
  IconCheck,
  IconSearch,
  IconEye,
  IconTrash
} from './Icons';

export default function BuzonSolPanel({ API_URL, authToken, activeCompany, companies }) {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ totalCount: 0, unreadCount: 0, urgentCount: 0 });
  const [selectedCompanyId, setSelectedCompanyId] = useState(activeCompany?.id || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'READ'
  const [tipoFilter, setTipoFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (activeCompany?.id && selectedCompanyId !== 'ALL' && !companies.some(c => c.id === selectedCompanyId)) {
      setSelectedCompanyId(activeCompany.id);
    }
  }, [activeCompany]);

  useEffect(() => {
    loadNotifications();
  }, [selectedCompanyId, statusFilter, tipoFilter]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 7000);
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompanyId && selectedCompanyId !== 'ALL') {
        params.append('companyId', selectedCompanyId);
      }
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (tipoFilter !== 'ALL') params.append('tipo', tipoFilter);

      const res = await fetch(`${API_URL}/api/buzon-sol/notifications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setStats({
          totalCount: data.totalCount || 0,
          unreadCount: data.unreadCount || 0,
          urgentCount: data.urgentCount || 0
        });
      }
    } catch (e) {
      console.error(e);
      showMsg('Error al cargar notificaciones del Buzón SOL', 'error');
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

      const res = await fetch(`${API_URL}/api/buzon-sol/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMsg(data.message || 'Sincronización completada con éxito.');
        loadNotifications();
      } else {
        showMsg(data.error || 'Fallo en la sincronización con Buzón SOL', 'error');
      }
    } catch (e) {
      showMsg('Error de conexión: ' + e.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleRead = async (notif) => {
    try {
      const res = await fetch(`${API_URL}/api/buzon-sol/notifications/${notif.id}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ leido: !notif.leido })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, leido: !n.leido } : n));
        setStats(prev => ({
          ...prev,
          unreadCount: notif.leido ? prev.unreadCount + 1 : Math.max(0, prev.unreadCount - 1)
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNotif = async (id) => {
    if (!window.confirm('¿Deseas archivar/eliminar este aviso del buzón?')) return;
    try {
      const res = await fetch(`${API_URL}/api/buzon-sol/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        showMsg('Notificación archivada.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return n.asunto?.toLowerCase().includes(q) ||
      n.numNotificacion?.toLowerCase().includes(q) ||
      n.company?.razonSocial?.toLowerCase().includes(q) ||
      n.company?.ruc?.includes(q);
  });

  return (
    <div className="buzon-sol-container animate-fade-in">
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
            <IconMail size={24} />
            <span>Buzón Electrónico SOL (SUNAT)</span>
          </h1>
          <p className="page-subtitle">
            Monitoreo automatizado y masivo de notificaciones tributarias, resoluciones coactivas y esquelas de citación mediante Clave SOL.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => handleSync('SINGLE')}
            disabled={syncing}
            title="Consultar buzón para la empresa seleccionada"
          >
            <IconRefresh size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Consultando...' : 'Sincronizar Empresa'}</span>
          </button>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => handleSync('ALL')}
            disabled={syncing}
            title="Consultar masivamente todas las empresas registradas con Clave SOL"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <IconMail size={15} />
            <span>{syncing ? 'Sincronizando...' : '⚡ Sincronización Masiva (Multi-RUC)'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-title">Total Notificaciones</span>
          <span className="metric-value">{stats.totalCount}</span>
          <span className="metric-desc">Documentos depositados en Buzón SOL</span>
        </div>
        <div className="metric-card warning">
          <span className="metric-title">Pendientes / No Leídos</span>
          <span className="metric-value" style={{ color: stats.unreadCount > 0 ? 'var(--warning)' : 'inherit' }}>
            {stats.unreadCount}
          </span>
          <span className="metric-desc">Requieren revisión obligatoria</span>
        </div>
        <div className="metric-card error">
          <span className="metric-title">Esquelas y Plazos por Vencer</span>
          <span className="metric-value" style={{ color: stats.urgentCount > 0 ? 'var(--error)' : 'inherit' }}>
            {stats.urgentCount}
          </span>
          <span className="metric-desc">Plazo legal de descargo en curso</span>
        </div>
        <div className="metric-card success">
          <span className="metric-title">Empresas Monitoreadas</span>
          <span className="metric-value">{companies.length}</span>
          <span className="metric-desc">RUCs con Clave SOL activa</span>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'center' }}>
          {/* Company filter */}
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

          {/* Type filter */}
          <div>
            <label className="apisunat-label">Tipo de Notificación</label>
            <select 
              className="select-field"
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
            >
              <option value="ALL">Todos los tipos</option>
              <option value="ESQUELA">Esquelas de Citación</option>
              <option value="CARTA_INDUCTIVA">Cartas Inductivas</option>
              <option value="RESOLUCION">Resoluciones de Intendencia</option>
              <option value="COBRANZA_COACTIVA">Cobranza Coactiva</option>
              <option value="AVISO_INFORMATIVO">Avisos Informativos</option>
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="apisunat-label">Estado de Lectura</label>
            <select 
              className="select-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="UNREAD">Solo No Leídos</option>
              <option value="READ">Solo Leídos</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="apisunat-label">Búsqueda Rápida</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                className="input-field"
                placeholder="Buscar por asunto, N° o RUC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            Listado de Mensajes y Notificaciones Recibidas ({filteredNotifications.length})
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Actualizado en tiempo real mediante Clave SOL
          </span>
        </div>

        <div className="table-responsive" style={{ border: 'none' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>Estado</th>
                <th>Empresa (RUC)</th>
                <th>Tipo & Notificación</th>
                <th>Asunto</th>
                <th>Fecha Depósito</th>
                <th>Vencimiento / Plazo</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => (
                  <tr key={notif.id} style={{ background: !notif.leido ? 'rgba(37, 99, 235, 0.04)' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          background: notif.leido ? 'var(--text-muted)' : 'var(--primary)',
                          display: 'inline-block'
                        }}
                        title={notif.leido ? 'Leído' : 'No Leído (Pendiente)'}
                      />
                    </td>
                    <td>
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>{notif.company?.razonSocial}</strong>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>RUC: {notif.company?.ruc}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${
                        notif.tipoNotificacion === 'COBRANZA_COACTIVA' || notif.tipoNotificacion === 'ESQUELA' ? 'error' :
                        notif.tipoNotificacion === 'CARTA_INDUCTIVA' ? 'warning' : 'prod'
                      }`}>
                        {notif.tipoNotificacion.replace('_', ' ')}
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {notif.numNotificacion}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: !notif.leido ? 700 : 500, color: 'var(--text-primary)', maxWidth: '340px' }}>
                        {notif.asunto}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px' }}>
                        {notif.contenido}
                      </div>
                    </td>
                    <td style={{ fontSize: '12.5px' }}>
                      {notif.fechaDeposito}
                    </td>
                    <td>
                      {notif.fechaVencimiento ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <IconAlertTriangle size={13} style={{ color: 'var(--error)' }} />
                          <strong style={{ color: 'var(--error)', fontSize: '12px' }}>
                            {notif.fechaVencimiento}
                          </strong>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Sin plazo perentorio</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button 
                          type="button"
                          className="btn-sm btn-secondary"
                          onClick={() => {
                            setSelectedNotification(notif);
                            if (!notif.leido) handleToggleRead(notif);
                          }}
                          title="Ver detalle del mensaje y constancia"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <IconEye size={12} />
                          <span>Ver</span>
                        </button>

                        <button 
                          type="button"
                          className="btn-sm btn-secondary"
                          onClick={() => handleToggleRead(notif)}
                          title={notif.leido ? 'Marcar como no leído' : 'Marcar como leído'}
                        >
                          <IconCheck size={12} style={{ color: notif.leido ? 'var(--text-muted)' : 'var(--success)' }} />
                        </button>

                        <button 
                          type="button"
                          className="btn-sm btn-danger-outline"
                          onClick={() => handleDeleteNotif(notif.id)}
                          title="Archivar notificación"
                        >
                          <IconTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {loading ? 'Cargando notificaciones...' : 'No se encontraron avisos en el Buzón SOL con los filtros seleccionados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="login-modal-overlay">
          <div className="login-modal-card" style={{ maxWidth: '560px' }}>
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
                  <IconMail size={18} />
                </div>
                <div>
                  <h3 className="card-title" style={{ margin: 0, fontSize: '17px' }}>
                    Constancia de Notificación Electrónica
                  </h3>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Buzón SOL • {selectedNotification.numNotificacion}
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                className="apisunat-remove-btn" 
                onClick={() => setSelectedNotification(null)}
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
                <span style={{ color: 'var(--text-muted)' }}>Empresa / Contribuyente:</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedNotification.company?.razonSocial}</div>
                <div style={{ color: 'var(--text-secondary)' }}>RUC: {selectedNotification.company?.ruc}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Tipo de Documento:</span>
                <div>
                  <span className="status-pill prod" style={{ fontSize: '10px' }}>
                    {selectedNotification.tipoNotificacion}
                  </span>
                </div>
                <div style={{ marginTop: '4px' }}>
                  Fecha Depósito: <strong>{selectedNotification.fechaDeposito}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                {selectedNotification.asunto}
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
                {selectedNotification.contenido}
              </div>
            </div>

            {selectedNotification.fechaVencimiento && (
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
                  <strong>Plazo Perentorio de Descargo:</strong> Tienes hasta el <strong>{selectedNotification.fechaVencimiento}</strong> para presentar sustento en Mesa de Partes Virtual o Portal SOL.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setSelectedNotification(null)}
              >
                Cerrar
              </button>
              <a 
                href="https://e-menu.sunat.gob.pe" 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Acceder a SUNAT SOL →</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
