import React, { useState, useEffect } from 'react';
import {
  IconShield,
  IconUser,
  IconSettings,
  IconRefresh,
  IconBuilding,
  IconCheck,
  IconDownload,
  IconServer,
  IconArchive,
  IconFileText,
  IconCode
} from './Icons';

export default function SuperAdminPanel({ API_URL, authToken, onBrandingUpdated }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [storageStats, setStorageStats] = useState(null);
  
  const [whiteLabel, setWhiteLabel] = useState({
    platformName: '',
    platformSubtitle: '',
    logoUrl: '',
    primaryColor: '#2563eb',
    allowRegistration: true,
    telegramBotEnabled: true,
    supportEmail: '',
    supportPhone: ''
  });

  // Storage Provider Form State
  const [storageForm, setStorageForm] = useState({
    storageProvider: 'LOCAL', // "LOCAL" | "S3" | "HYBRID" | "SFTP"
    localStoragePath: 'storage/comprobantes',
    s3Endpoint: '',
    s3Region: 'us-east-1',
    s3Bucket: '',
    s3AccessKey: '',
    s3SecretKey: '',
    s3ForcePathStyle: false,
    s3PublicUrl: '',
    sftpHost: '',
    sftpPort: 22,
    sftpUser: '',
    sftpPassword: '',
    sftpRemotePath: '/var/storage/comprobantes'
  });

  const [loading, setLoading] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingStorage, setSavingStorage] = useState(false);
  const [testingS3, setTestingS3] = useState(false);
  const [message, setMessage] = useState(null); // { text, type }
  const [activeAdminSubTab, setActiveAdminSubTab] = useState('users'); // 'users' | 'whitelabel' | 'storage'

  useEffect(() => {
    loadData();
  }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 7000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${API_URL}/api/superadmin/stats`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // 2. Fetch Users
      const usersRes = await fetch(`${API_URL}/api/superadmin/users`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }

      // 3. Fetch White-label settings
      const wlRes = await fetch(`${API_URL}/api/superadmin/white-label`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (wlRes.ok) {
        const wlData = await wlRes.json();
        setWhiteLabel({
          platformName: wlData.platformName || 'APISUNAT PRO',
          platformSubtitle: wlData.platformSubtitle || '',
          logoUrl: wlData.logoUrl || '',
          primaryColor: wlData.primaryColor || '#2563eb',
          allowRegistration: wlData.allowRegistration !== false,
          telegramBotEnabled: wlData.telegramBotEnabled !== false,
          supportEmail: wlData.supportEmail || '',
          supportPhone: wlData.supportPhone || ''
        });
      }

      // 4. Fetch Storage stats and configuration
      const storageRes = await fetch(`${API_URL}/api/superadmin/storage`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (storageRes.ok) {
        const sData = await storageRes.json();
        setStorageStats(sData);
        setStorageForm(prev => ({
          ...prev,
          storageProvider: sData.provider || 'LOCAL',
          localStoragePath: sData.baseDir || 'storage/comprobantes',
          s3Endpoint: sData.s3Config?.s3Endpoint || '',
          s3Region: sData.s3Config?.s3Region || 'us-east-1',
          s3Bucket: sData.s3Config?.s3Bucket || '',
          s3ForcePathStyle: !!sData.s3Config?.s3ForcePathStyle,
          s3PublicUrl: sData.s3Config?.s3PublicUrl || '',
          sftpHost: sData.sftpConfig?.sftpHost || '',
          sftpPort: sData.sftpConfig?.sftpPort || 22,
          sftpUser: sData.sftpConfig?.sftpUser || '',
          sftpRemotePath: sData.sftpConfig?.sftpRemotePath || '/var/storage/comprobantes'
        }));
      }
    } catch (e) {
      showMsg('Error al cargar datos de Super Admin: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle user status (ACTIVE / SUSPENDED)
  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmAction = window.confirm(
      `¿Estás seguro de ${newStatus === 'ACTIVE' ? 'REACTIVAR' : 'SUSPENDER'} la cuenta de ${user.name} (${user.email})?`
    );
    if (!confirmAction) return;

    try {
      const res = await fetch(`${API_URL}/api/superadmin/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(data.message, 'success');
        setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      } else {
        showMsg(data.error || 'Error al actualizar estado del usuario', 'error');
      }
    } catch (e) {
      showMsg('Error de red al actualizar estado del usuario', 'error');
    }
  };

  // Save White-label branding
  const handleSaveWhiteLabel = async (e) => {
    e.preventDefault();
    setSavingBrand(true);
    try {
      const res = await fetch(`${API_URL}/api/superadmin/white-label`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(whiteLabel)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMsg('Marca blanca actualizada correctamente.', 'success');
        if (onBrandingUpdated) {
          onBrandingUpdated(data.platform);
        }
      } else {
        showMsg(data.error || 'Error al guardar configuración de marca blanca.', 'error');
      }
    } catch (e) {
      showMsg('Error de red al guardar marca blanca: ' + e.message, 'error');
    } finally {
      setSavingBrand(false);
    }
  };

  // Save Storage Configuration
  const handleSaveStorage = async (e) => {
    if (e) e.preventDefault();
    setSavingStorage(true);
    try {
      const res = await fetch(`${API_URL}/api/superadmin/storage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(storageForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMsg('Configuración de almacenamiento guardada exitosamente.', 'success');
        loadData();
      } else {
        showMsg(data.error || 'Error al guardar configuración de almacenamiento.', 'error');
      }
    } catch (e) {
      showMsg('Error de red al guardar almacenamiento: ' + e.message, 'error');
    } finally {
      setSavingStorage(false);
    }
  };

  // Test S3 Connection in Live
  const handleTestS3 = async () => {
    setTestingS3(true);
    try {
      const res = await fetch(`${API_URL}/api/superadmin/storage/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(storageForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMsg(data.message, 'success');
      } else {
        showMsg(data.error || 'Error al probar conexión con S3.', 'error');
      }
    } catch (e) {
      showMsg('Error de red al probar conexión con S3: ' + e.message, 'error');
    } finally {
      setTestingS3(false);
    }
  };

  // Apply Provider Presets
  const applyPreset = (preset) => {
    if (preset === 'r2') {
      setStorageForm(prev => ({
        ...prev,
        storageProvider: 'S3',
        s3Endpoint: 'https://<tu_account_id>.r2.cloudflarestorage.com',
        s3Region: 'auto',
        s3ForcePathStyle: false
      }));
      showMsg('Plantilla de Cloudflare R2 aplicada. Reemplaza <tu_account_id> con tu ID de Cloudflare.', 'success');
    } else if (preset === 'aws') {
      setStorageForm(prev => ({
        ...prev,
        storageProvider: 'S3',
        s3Endpoint: '',
        s3Region: 'us-east-1',
        s3ForcePathStyle: false
      }));
      showMsg('Plantilla de Amazon AWS S3 aplicada.', 'success');
    } else if (preset === 'minio') {
      setStorageForm(prev => ({
        ...prev,
        storageProvider: 'S3',
        s3Endpoint: 'http://127.0.0.1:9000',
        s3Region: 'us-east-1',
        s3ForcePathStyle: true
      }));
      showMsg('Plantilla de MinIO local aplicada con Path-Style activado.', 'success');
    } else if (preset === 'spaces') {
      setStorageForm(prev => ({
        ...prev,
        storageProvider: 'S3',
        s3Endpoint: 'https://nyc3.digitaloceanspaces.com',
        s3Region: 'nyc3',
        s3ForcePathStyle: false
      }));
      showMsg('Plantilla de DigitalOcean Spaces aplicada.', 'success');
    }
  };

  return (
    <div className="superadmin-panel-container animate-fade-in">
      {/* Alert banner */}
      {message && (
        <div className={`glass-card animate-fade-in`} style={{
          borderLeft: `4px solid ${message.type === 'error' ? 'var(--error)' : 'var(--success)'}`,
          padding: '14px 18px',
          marginBottom: '20px',
          background: message.type === 'error' ? 'var(--error-subtle)' : 'var(--success-subtle)'
        }}>
          <div className="flex-between">
            <span style={{ fontWeight: 600, color: message.type === 'error' ? 'var(--error)' : 'var(--success)' }}>
              {message.text}
            </span>
            <button type="button" onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }}>✕</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="settings-page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconShield size={24} />
            <span>Super Panel de Administración</span>
          </h1>
          <p className="page-subtitle">
            Control multitenant global: supervisión de cuentas cliente, métricas de emisión, marca blanca y almacenamiento en File Server / S3.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
          <IconRefresh size={14} />
          <span>{loading ? 'Actualizando...' : 'Refrescar Datos'}</span>
        </button>
      </div>

      {/* Global Metrics Bar */}
      {stats && (
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-title">Clientes / Cuentas</span>
            <span className="metric-value">{stats.totalUsers}</span>
            <span className="metric-desc">Inquilinos registrados en la plataforma</span>
          </div>
          <div className="metric-card">
            <span className="metric-title">Total Empresas RUC</span>
            <span className="metric-value">{stats.totalCompanies}</span>
            <span className="metric-desc">Razón Social y certificados activos</span>
          </div>
          <div className="metric-card success">
            <span className="metric-title">Comprobantes Aceptados</span>
            <span className="metric-value">{stats.acceptedInvoices}</span>
            <span className="metric-desc">Validados por SUNAT (CDR Ok)</span>
          </div>
          <div className="metric-card">
            <span className="metric-title">Volumen Total Facturado</span>
            <span className="metric-value">S/. {Number(stats.totalBilled || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
            <span className="metric-desc">Total transaccionado en el sistema</span>
          </div>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="admin-nav-tabs">
        <button 
          className={`admin-tab-btn ${activeAdminSubTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('users')}
        >
          <IconUser size={15} />
          <span>Gestión de Cuentas y Empresas ({users.length})</span>
        </button>
        <button 
          className={`admin-tab-btn ${activeAdminSubTab === 'whitelabel' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('whitelabel')}
        >
          <IconSettings size={15} />
          <span>Personalización de Marca Blanca</span>
        </button>
        <button 
          className={`admin-tab-btn ${activeAdminSubTab === 'storage' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('storage')}
        >
          <IconServer size={15} />
          <span>Almacenamiento (File Server / S3 / VPS)</span>
        </button>
      </div>

      {/* TAB 1: GESTIÓN DE CUENTAS */}
      {activeAdminSubTab === 'users' && (
        <div className="glass-card animate-fade-in" style={{ marginTop: '20px', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Cuentas de Usuarios y Empresas Vinculadas</h2>
            <span className="field-hint">Administra el acceso y visualiza las empresas asociadas a cada cliente.</span>
          </div>

          <div className="table-responsive" style={{ border: 'none' }}>
            <table className="custom-table admin-users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Empresas Registradas (RUCs)</th>
                  <th style={{ textAlign: 'center' }}>Comprobantes</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ opacity: u.status === 'SUSPENDED' ? 0.6 : 1 }}>
                    <td>
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>{u.name || 'Sin Nombre'}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</div>
                        <small style={{ color: 'var(--text-muted)' }}>Registrado: {new Date(u.createdAt).toLocaleDateString()}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`user-role-tag ${u.role === 'SUPERADMIN' ? 'superadmin' : 'tenant'}`}>
                        {u.role === 'SUPERADMIN' ? 'Super Admin' : 'Inquilino (Cliente)'}
                      </span>
                    </td>
                    <td>
                      {u.companies && u.companies.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {u.companies.map(c => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                              <IconBuilding size={13} />
                              <strong>{c.ruc}</strong> - {c.razonSocial}
                              {c.hasCert && (
                                <span className={`status-pill ${c.isProduction ? 'prod' : 'beta'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                                  {c.isProduction ? 'Prod' : 'Beta'}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Sin empresas registradas aún</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {u.invoicesCount || 0}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-pill ${u.status === 'ACTIVE' ? 'prod' : 'error'}`}>
                        {u.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {u.role !== 'SUPERADMIN' ? (
                        <button
                          type="button"
                          className={`btn-sm ${u.status === 'ACTIVE' ? 'btn-danger-outline' : 'btn-outline-cyan'}`}
                          onClick={() => handleToggleUserStatus(u)}
                        >
                          {u.status === 'ACTIVE' ? 'Suspender' : 'Reactivar'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Inmutable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PERSONALIZACIÓN DE MARCA BLANCA */}
      {activeAdminSubTab === 'whitelabel' && (
        <div className="glass-card animate-fade-in" style={{ marginTop: '20px' }}>
          <form onSubmit={handleSaveWhiteLabel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0 }}>Identidad Visual y Marca Blanca</h2>
                <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>
                  Personaliza el nombre, logotipo, colores y apariencia general que verán todos tus clientes.
                </p>
              </div>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={savingBrand}
              >
                <IconCheck size={15} />
                <span>{savingBrand ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>

            <div className="company-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <label className="field-label">Nombre de la Plataforma</label>
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="Ej: FACTURA FACIL PRO"
                  value={whiteLabel.platformName}
                  onChange={(e) => setWhiteLabel({ ...whiteLabel, platformName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="field-label">Eslogan / Subtítulo</label>
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="Ej: Sistema Integrado de Facturación Electrónica SUNAT"
                  value={whiteLabel.platformSubtitle}
                  onChange={(e) => setWhiteLabel({ ...whiteLabel, platformSubtitle: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label">URL del Logotipo (PNG / SVG Transparente)</label>
                <input 
                  type="url" 
                  className="input-field"
                  placeholder="https://tudominio.com/logo.png"
                  value={whiteLabel.logoUrl}
                  onChange={(e) => setWhiteLabel({ ...whiteLabel, logoUrl: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label">Color Primario de la Marca</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={whiteLabel.primaryColor}
                    onChange={(e) => setWhiteLabel({ ...whiteLabel, primaryColor: e.target.value })}
                    style={{ width: '45px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                  />
                  <input 
                    type="text" 
                    className="input-field" 
                    value={whiteLabel.primaryColor}
                    onChange={(e) => setWhiteLabel({ ...whiteLabel, primaryColor: e.target.value })}
                    style={{ width: '120px' }}
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Correo de Soporte Técnico</label>
                <input 
                  type="email" 
                  className="input-field"
                  placeholder="soporte@tudominio.com"
                  value={whiteLabel.supportEmail}
                  onChange={(e) => setWhiteLabel({ ...whiteLabel, supportEmail: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label">WhatsApp o Teléfono de Contacto</label>
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="+51 999 888 777"
                  value={whiteLabel.supportPhone}
                  onChange={(e) => setWhiteLabel({ ...whiteLabel, supportPhone: e.target.value })}
                />
              </div>
            </div>

            {/* Global Toggles */}
            <div className="preferences-subcard" style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Habilitación de Módulos Globales</h3>

              <div className="toggles-list">
                <div className="toggle-row">
                  <div>
                    <div className="toggle-title">Registro Abierto de Clientes</div>
                    <div className="toggle-desc">Permitir que nuevos clientes se registren autónomamente desde la pantalla de inicio.</div>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={whiteLabel.allowRegistration}
                      onChange={(e) => setWhiteLabel({ ...whiteLabel, allowRegistration: e.target.checked })}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="toggle-row">
                  <div>
                    <div className="toggle-title">Integración con Telegram Bot</div>
                    <div className="toggle-desc">Permitir a los clientes vincular y emitir comprobantes directamente mediante Telegram.</div>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={whiteLabel.telegramBotEnabled}
                      onChange={(e) => setWhiteLabel({ ...whiteLabel, telegramBotEnabled: e.target.checked })}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                className="btn btn-primary btn-lg"
                disabled={savingBrand}
              >
                <IconCheck size={16} />
                <span>{savingBrand ? 'Guardando Marca...' : 'Guardar y Aplicar Marca Blanca'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: FILE SERVER & STORAGE (LOCAL, S3, HYBRID, SFTP) */}
      {activeAdminSubTab === 'storage' && (
        <div className="animate-fade-in" style={{ marginTop: '20px' }}>
          
          {/* Main Storage Provider Selector Card */}
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <div className="flex-between" style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0 }}>
                  <IconServer size={20} />
                  <span>Configuración de Almacenamiento Físico (File Server / Cloud S3)</span>
                </h2>
                <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>
                  Elige dónde se almacenarán permanentemente los archivos XML firmados, CDRs de SUNAT y representaciones impresas.
                </p>
              </div>
              <span className={`status-pill ${storageForm.storageProvider === 'S3' || storageForm.storageProvider === 'HYBRID' ? 'prod' : 'beta'}`} style={{ fontSize: '12px', padding: '5px 12px' }}>
                Proveedor Activo: {storageForm.storageProvider}
              </span>
            </div>

            {/* Provider Cards Selector (4 Options) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              
              {/* Option 1: LOCAL */}
              <div 
                onClick={() => setStorageForm({ ...storageForm, storageProvider: 'LOCAL' })}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: `2px solid ${storageForm.storageProvider === 'LOCAL' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: storageForm.storageProvider === 'LOCAL' ? 'var(--bg-card-subtle)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <input type="radio" checked={storageForm.storageProvider === 'LOCAL'} readOnly />
                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>🏢 Mismo VPS (Local)</strong>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Almacena en el disco del servidor VPS. Ideal para inicio rápido o bajo volumen.
                </p>
              </div>

              {/* Option 2: S3 (Cloudflare R2 / AWS / MinIO) */}
              <div 
                onClick={() => setStorageForm({ ...storageForm, storageProvider: 'S3' })}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: `2px solid ${storageForm.storageProvider === 'S3' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: storageForm.storageProvider === 'S3' ? 'var(--bg-card-subtle)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <input type="radio" checked={storageForm.storageProvider === 'S3'} readOnly />
                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>☁️ Amazon S3 / R2</strong>
                  <span className="status-pill prod" style={{ fontSize: '10px', padding: '1px 6px' }}>Recomendado</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Escalabilidad infinita en Cloudflare R2 ($0 egress), AWS S3 o MinIO on-premise.
                </p>
              </div>

              {/* Option 3: HYBRID */}
              <div 
                onClick={() => setStorageForm({ ...storageForm, storageProvider: 'HYBRID' })}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: `2px solid ${storageForm.storageProvider === 'HYBRID' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: storageForm.storageProvider === 'HYBRID' ? 'var(--bg-card-subtle)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <input type="radio" checked={storageForm.storageProvider === 'HYBRID'} readOnly />
                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>🔄 Híbrido (Dual Sync)</strong>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Guarda en el disco del VPS para respuesta ultra rápida y replica a S3 para respaldo.
                </p>
              </div>

              {/* Option 4: SFTP */}
              <div 
                onClick={() => setStorageForm({ ...storageForm, storageProvider: 'SFTP' })}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: `2px solid ${storageForm.storageProvider === 'SFTP' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: storageForm.storageProvider === 'SFTP' ? 'var(--bg-card-subtle)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <input type="radio" checked={storageForm.storageProvider === 'SFTP'} readOnly />
                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>🖥️ Servidor Remoto / SFTP</strong>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Envía a un File Server externo, NAS propio (Synology/TrueNAS) o servidor SSH dedicado.
                </p>
              </div>

            </div>

            {/* S3 Configuration Details (Visible if S3 or HYBRID) */}
            {(storageForm.storageProvider === 'S3' || storageForm.storageProvider === 'HYBRID') && (
              <div className="preferences-subcard animate-fade-in" style={{ marginBottom: '20px' }}>
                <div className="flex-between" style={{ marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Credenciales del Proveedor S3 / Cloudflare R2 / MinIO
                  </h3>
                  {/* Preset Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset('r2')}>
                      ⚡ Cloudflare R2 ($0 Egress)
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset('aws')}>
                      🟧 AWS S3
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset('minio')}>
                      🦩 MinIO Local
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset('spaces')}>
                      🌊 DO Spaces
                    </button>
                  </div>
                </div>

                <div className="company-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <div>
                    <label className="field-label">Nombre del Bucket</label>
                    <input 
                      type="text" 
                      className="input-field"
                      placeholder="ej: comprobantes-sunat-2026"
                      value={storageForm.s3Bucket}
                      onChange={(e) => setStorageForm({ ...storageForm, s3Bucket: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Región</label>
                    <input 
                      type="text" 
                      className="input-field"
                      placeholder="us-east-1 (o 'auto' para R2)"
                      value={storageForm.s3Region}
                      onChange={(e) => setStorageForm({ ...storageForm, s3Region: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="field-label">Access Key ID</label>
                    <input 
                      type="text" 
                      className="input-field"
                      placeholder="AKIAIOSFODNN7EXAMPLE o R2 Token"
                      value={storageForm.s3AccessKey}
                      onChange={(e) => setStorageForm({ ...storageForm, s3AccessKey: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="field-label">Secret Access Key</label>
                    <input 
                      type="password" 
                      className="input-field"
                      placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                      value={storageForm.s3SecretKey}
                      onChange={(e) => setStorageForm({ ...storageForm, s3SecretKey: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="field-label">
                      Endpoint Personalizado S3 (Obligatorio para Cloudflare R2 / MinIO / Spaces)
                    </label>
                    <input 
                      type="url" 
                      className="input-field"
                      placeholder="https://<account_id>.r2.cloudflarestorage.com o http://127.0.0.1:9000"
                      value={storageForm.s3Endpoint}
                      onChange={(e) => setStorageForm({ ...storageForm, s3Endpoint: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={storageForm.s3ForcePathStyle}
                        onChange={(e) => setStorageForm({ ...storageForm, s3ForcePathStyle: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      Forzar Path-Style (Activar solo para MinIO local o Ceph)
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleTestS3}
                    disabled={testingS3}
                  >
                    <span>{testingS3 ? '⏳ Verificando conexión...' : '🧪 Probar Conexión S3 en Vivo'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* SFTP Configuration (Visible if SFTP) */}
            {storageForm.storageProvider === 'SFTP' && (
              <div className="preferences-subcard animate-fade-in" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px 0', color: 'var(--text-primary)' }}>
                  Configuración del File Server Remoto (SFTP / SSH)
                </h3>
                <div className="company-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label className="field-label">Host / IP del File Server</label>
                    <input 
                      type="text" 
                      className="input-field"
                      placeholder="192.168.1.50 o storage.empresa.com"
                      value={storageForm.sftpHost}
                      onChange={(e) => setStorageForm({ ...storageForm, sftpHost: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Puerto</label>
                    <input 
                      type="number" 
                      className="input-field"
                      value={storageForm.sftpPort}
                      onChange={(e) => setStorageForm({ ...storageForm, sftpPort: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Usuario</label>
                    <input 
                      type="text" 
                      className="input-field"
                      placeholder="sunat_storage"
                      value={storageForm.sftpUser}
                      onChange={(e) => setStorageForm({ ...storageForm, sftpUser: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Contraseña</label>
                    <input 
                      type="password" 
                      className="input-field"
                      value={storageForm.sftpPassword}
                      onChange={(e) => setStorageForm({ ...storageForm, sftpPassword: e.target.value })}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="field-label">Ruta Remota en el Servidor</label>
                    <input 
                      type="text" 
                      className="input-field"
                      placeholder="/var/storage/comprobantes"
                      value={storageForm.sftpRemotePath}
                      onChange={(e) => setStorageForm({ ...storageForm, sftpRemotePath: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Local Storage Configuration */}
            {(storageForm.storageProvider === 'LOCAL' || storageForm.storageProvider === 'HYBRID') && (
              <div className="preferences-subcard" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
                  Ruta Física en el Servidor VPS
                </h3>
                <label className="field-label">Directorio de Almacenamiento Local</label>
                <input 
                  type="text" 
                  className="input-field"
                  value={storageForm.localStoragePath}
                  onChange={(e) => setStorageForm({ ...storageForm, localStoragePath: e.target.value })}
                />
                <span className="field-hint">
                  Ruta en el disco del VPS donde se organizarán las carpetas automáticamente por YYYY-MM y RUC.
                </span>
              </div>
            )}

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button 
                type="button" 
                className="btn btn-primary btn-lg" 
                onClick={handleSaveStorage}
                disabled={savingStorage}
              >
                <IconCheck size={16} />
                <span>{savingStorage ? 'Guardando Configuración...' : 'Guardar y Aplicar Configuración de Storage'}</span>
              </button>
            </div>
          </div>

          {/* Storage Metrics Cards */}
          <div className="metrics-grid" style={{ marginBottom: '24px' }}>
            <div className="metric-card">
              <span className="metric-title">Archivos Almacenados</span>
              <span className="metric-value">{storageStats?.totalFiles || 0}</span>
              <span className="metric-desc">XMLs, ZIPs, CDRs y HTMLs generados</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Espacio en Disco Local</span>
              <span className="metric-value">{storageStats?.sizeMb || '0.00'} MB</span>
              <span className="metric-desc">{(storageStats?.totalBytes || 0).toLocaleString()} bytes</span>
            </div>
            <div className="metric-card success">
              <span className="metric-title">Empresas Archivadas</span>
              <span className="metric-value">{storageStats?.totalCompanies || 0}</span>
              <span className="metric-desc">RUCs con comprobantes persistidos</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Periodos Mensuales</span>
              <span className="metric-value">{storageStats?.periods?.length || 0}</span>
              <span className="metric-desc">Directorios YYYY-MM encontrados</span>
            </div>
          </div>

          {/* Directory Hierarchy Box */}
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Estructura Jerárquica Automática por Fecha (Local & Cloud S3):
            </h4>
            <pre style={{ margin: 0, padding: '14px', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '12px', lineHeight: 1.6, color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontFamily: 'monospace' }}>
{`storage/comprobantes/  (o en tu Bucket S3: s3://bucket/comprobantes/)
 ├── {YYYY-MM}/                    (Ej: 2026-09)
 │    └── {RUC_EMISOR}/            (Ej: 20606636505)
 │         └── {YYYY-MM-DD}/       (Ej: 2026-09-30)
 │              ├── {RUC}-{TIPO}-{SERIE-CORRELATIVO}.xml        (XML UBL 2.1 Firmado)
 │              ├── {RUC}-{TIPO}-{SERIE-CORRELATIVO}.zip        (ZIP enviado a SUNAT)
 │              ├── R-{RUC}-{TIPO}-{SERIE-CORRELATIVO}.zip      (CDR Oficial comprimido de SUNAT)
 │              ├── R-{RUC}-{TIPO}-{SERIE-CORRELATIVO}.xml      (Constancia CDR XML extraída)
 │              ├── {RUC}-{TIPO}-{SERIE-CORRELATIVO}-A4.html    (Representación oficial en Formato A4)
 │              ├── {RUC}-{TIPO}-{SERIE-CORRELATIVO}-Ticket.html(Representación para Ticketera 80mm)
 │              └── {RUC}-{TIPO}-{SERIE-CORRELATIVO}-metadata.json (Auditoría JSON con Hash y estado)`}
            </pre>
          </div>

          {/* Periods discovered list */}
          <div className="glass-card">
            <h4 style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
              Periodos Mensuales en Archivo:
            </h4>
            {storageStats?.periods && storageStats.periods.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {storageStats.periods.map(period => (
                  <div key={period} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', padding: '8px 14px', borderRadius: '8px' }}>
                    <IconArchive size={15} />
                    <strong style={{ fontSize: '13px' }}>Periodo {period}</strong>
                    <span className="status-pill prod" style={{ fontSize: '11px', padding: '2px 8px' }}>Archivado</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                Aún no hay comprobantes archivados en el File Server. Se archivarán automáticamente al emitir facturas o boletas.
              </p>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
