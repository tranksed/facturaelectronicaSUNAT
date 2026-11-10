import React, { useState, useEffect } from 'react';
import AdminResetPasswordModal from './AdminResetPasswordModal';
import AdminEditUserModal from './AdminEditUserModal';
import AdminDeleteUserModal from './AdminDeleteUserModal';
import AdminPlanModal from './AdminPlanModal';
import AdminUserPlanModal from './AdminUserPlanModal';
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
  IconCode,
  IconKey,
  IconLock,
  IconEdit,
  IconTrash,
  IconCrown,
  IconCreditCard,
  IconPlus,
  IconPaypal,
  IconDollar,
  IconCopy,
  IconExternalLink,
  IconSearch,
  IconUsers,
  LoaderCircleIcon
} from './Icons';

export default function SuperAdminPanel({ API_URL, authToken, onBrandingUpdated }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [storageStats, setStorageStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedUserForPlan, setSelectedUserForPlan] = useState(null);
  const [isUserPlanModalOpen, setIsUserPlanModalOpen] = useState(false);

  // Search & Filters for Users
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'SUSPENDED'
  const [userRoleFilter, setUserRoleFilter] = useState('ALL'); // 'ALL' | 'TENANT' | 'SUPERADMIN'

  // Gateways configuration
  const [gatewaysForm, setGatewaysForm] = useState({
    izipayActive: false,
    izipayPublicKey: '',
    izipayClientAnswer: '',
    izipayShaKey: '',
    izipaySandbox: true,
    mercadopagoActive: false,
    mercadopagoPublicKey: '',
    mercadopagoAccessToken: '',
    mercadopagoSandbox: true,
    paypalActive: false,
    paypalClientId: '',
    paypalSecret: '',
    paypalMode: 'sandbox',
    culqiActive: false,
    culqiPublicKey: '',
    culqiSecretKey: '',
    bankTransferActive: true,
    bankTransferInfo: ''
  });
  const [savingGateways, setSavingGateways] = useState(false);
  const [activeGatewayTab, setActiveGatewayTab] = useState('mercadopago');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [paymentOrders, setPaymentOrders] = useState([]);
  const [approvingOrderId, setApprovingOrderId] = useState(null);
  
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
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState(null);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);

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

      // 5. Fetch Subscription Plans
      const plansRes = await fetch(`${API_URL}/api/superadmin/plans`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (plansRes.ok) {
        setPlans(await plansRes.json());
      }

      // 6. Fetch Gateways Configuration
      const gatewaysRes = await fetch(`${API_URL}/api/superadmin/gateways/config`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (gatewaysRes.ok) {
        const gData = await gatewaysRes.json();
        setGatewaysForm(prev => ({
          ...prev,
          ...gData
        }));
      }

      // 7. Fetch Payment Orders
      const ordersRes = await fetch(`${API_URL}/api/superadmin/gateways/orders`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (ordersRes.ok) {
        setPaymentOrders(await ordersRes.json());
      }
    } catch (e) {
      showMsg('Error al cargar datos de Super Admin: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGateways = async (e) => {
    e.preventDefault();
    setSavingGateways(true);
    try {
      const res = await fetch(`${API_URL}/api/superadmin/gateways/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(gatewaysForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMsg(data.message, 'success');
      } else {
        showMsg(data.error || 'Error al guardar pasarelas', 'error');
      }
    } catch (e) {
      showMsg('Error de conexión al guardar pasarelas: ' + e.message, 'error');
    } finally {
      setSavingGateways(false);
    }
  };

  const handleApproveOrder = async (orderId) => {
    if (!window.confirm('¿Aprobar esta orden de pago y activar inmediatamente el plan para el cliente?')) return;
    setApprovingOrderId(orderId);
    try {
      const res = await fetch(`${API_URL}/api/superadmin/gateways/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMsg(data.message, 'success');
        loadData();
      } else {
        showMsg(data.error || 'Error al aprobar orden', 'error');
      }
    } catch (e) {
      showMsg('Error al aprobar orden: ' + e.message, 'error');
    } finally {
      setApprovingOrderId(null);
    }
  };

  const handleDeletePlan = async (planId, planName) => {
    if (!window.confirm(`¿Estás seguro de eliminar el plan "${planName}"? Si tiene usuarios se desactivará automáticamente.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/superadmin/plans/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(data.message, 'success');
        loadData();
      } else {
        showMsg(data.error || 'Error al eliminar plan', 'error');
      }
    } catch (e) {
      showMsg('Error al eliminar plan: ' + e.message, 'error');
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

  const filteredUsers = (users || []).filter(u => {
    if (userStatusFilter !== 'ALL' && u.status !== userStatusFilter) return false;
    if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase().trim();
    const nameMatch = (u.name || '').toLowerCase().includes(q);
    const emailMatch = (u.email || '').toLowerCase().includes(q);
    const companyMatch = (u.companies || []).some(c => 
      (c.ruc || '').includes(q) || (c.razonSocial || '').toLowerCase().includes(q)
    );
    return nameMatch || emailMatch || companyMatch;
  });

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
            <div className="metric-card-header">
              <span className="metric-title">Clientes / Cuentas</span>
              <div className="metric-icon-box primary">
                <IconUsers size={22} />
              </div>
            </div>
            <span className="metric-value">{stats.totalUsers}</span>
            <span className="metric-desc">Inquilinos registrados en la plataforma</span>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-title">Total Empresas RUC</span>
              <div className="metric-icon-box" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4' }}>
                <IconBuilding size={22} />
              </div>
            </div>
            <span className="metric-value">{stats.totalCompanies}</span>
            <span className="metric-desc">Razón Social y certificados activos</span>
          </div>

          <div className="metric-card success">
            <div className="metric-card-header">
              <span className="metric-title">Comprobantes Aceptados</span>
              <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <IconCheck size={22} />
              </div>
            </div>
            <span className="metric-value">{stats.acceptedInvoices}</span>
            <span className="metric-desc">Validados por SUNAT (CDR Ok)</span>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-title">Volumen Total Facturado</span>
              <div className="metric-icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <IconDollar size={22} />
              </div>
            </div>
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
          <span>Gestión de Cuentas</span>
          <span className="admin-tab-badge">{users.length}</span>
        </button>
        <button 
          className={`admin-tab-btn ${activeAdminSubTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('plans')}
        >
          <IconCrown size={15} />
          <span>Planes y Paquetes</span>
          <span className="admin-tab-badge">{plans.length}</span>
        </button>
        <button 
          className={`admin-tab-btn ${activeAdminSubTab === 'gateways' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('gateways')}
        >
          <IconCreditCard size={15} />
          <span>Pasarelas & Cobros</span>
        </button>
        <button 
          className={`admin-tab-btn ${activeAdminSubTab === 'whitelabel' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('whitelabel')}
        >
          <IconSettings size={15} />
          <span>Marca Blanca</span>
        </button>
        <button 
          className={`admin-tab-btn ${activeAdminSubTab === 'storage' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('storage')}
        >
          <IconServer size={15} />
          <span>Almacenamiento (S3/VPS)</span>
        </button>
      </div>

      {/* TAB 1: GESTIÓN DE CUENTAS */}
      {activeAdminSubTab === 'users' && (
        <div className="glass-card animate-fade-in" style={{ marginTop: '20px', padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 className="card-title" style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconUsers size={20} style={{ color: 'var(--primary)' }} />
                <span>Cuentas de Usuarios y Empresas Vinculadas</span>
              </h2>
              <span className="field-hint">Administra el acceso, planes y visualiza las empresas asociadas a cada cliente.</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Mostrando: <strong>{filteredUsers.length}</strong> de {users.length} cuentas
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="admin-users-toolbar">
            <div className="admin-search-box">
              <span className="admin-search-icon">
                <IconSearch size={15} />
              </span>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Buscar por usuario, email, RUC o razón social..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
              {userSearchQuery && (
                <button
                  type="button"
                  onClick={() => setUserSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="admin-filter-chips">
              <button
                type="button"
                className={`admin-filter-chip ${userStatusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setUserStatusFilter('ALL')}
              >
                Todos ({users.length})
              </button>
              <button
                type="button"
                className={`admin-filter-chip ${userStatusFilter === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setUserStatusFilter('ACTIVE')}
              >
                Activos ({users.filter(u => u.status === 'ACTIVE').length})
              </button>
              <button
                type="button"
                className={`admin-filter-chip ${userStatusFilter === 'SUSPENDED' ? 'active' : ''}`}
                onClick={() => setUserStatusFilter('SUSPENDED')}
              >
                Suspendidos ({users.filter(u => u.status === 'SUSPENDED').length})
              </button>
            </div>
          </div>

          {/* DESKTOP TABLE VIEW (> 768px) */}
          <div className="admin-users-table-view">
            <div className="admin-table-wrapper">
              <table className="custom-table admin-users-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th style={{ textAlign: 'center' }}>Rol</th>
                    <th>Empresas Registradas (RUCs)</th>
                    <th>Plan Comercial</th>
                    <th style={{ textAlign: 'center' }}>Docs</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(u => {
                      const userInitial = (u.name || u.email || 'U').charAt(0).toUpperCase();
                      const docLimit = u.plan?.docLimit;
                      const docCount = u.docsIssuedCount || 0;
                      const isExpired = u.planExpiresAt && new Date() > new Date(u.planExpiresAt);

                      return (
                        <tr key={u.id} style={{ opacity: u.status === 'SUSPENDED' ? 0.65 : 1 }}>
                          <td>
                            <div className="admin-user-cell">
                              <div className="admin-user-avatar">{userInitial}</div>
                              <div className="admin-user-info">
                                <span className="admin-user-name">{u.name || 'Sin Nombre'}</span>
                                <span className="admin-user-email" title={u.email}>{u.email}</span>
                                <span className="admin-user-date">
                                  Registrado: {new Date(u.createdAt).toLocaleDateString('es-PE')}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`user-role-tag ${u.role === 'SUPERADMIN' ? 'superadmin' : 'tenant'}`}>
                              {u.role === 'SUPERADMIN' ? 'Super Admin' : 'Inquilino'}
                            </span>
                          </td>
                          <td>
                            {u.companies && u.companies.length > 0 ? (
                              <div className="admin-companies-list">
                                {u.companies.map(c => (
                                  <div key={c.id} className="admin-company-card">
                                    <div className="admin-company-header">
                                      <span className="admin-company-ruc">
                                        <IconBuilding size={12} /> {c.ruc}
                                      </span>
                                      {c.hasCert && (
                                        <span className={`status-pill ${c.isProduction ? 'prod' : 'beta'}`} style={{ fontSize: '9.5px', padding: '1px 6px' }}>
                                          {c.isProduction ? 'Prod' : 'Beta'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="admin-company-name" title={c.razonSocial}>
                                      {c.razonSocial}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="admin-empty-pill">Sin empresas aún</span>
                            )}
                          </td>
                          <td>
                            <div className="admin-plan-badge-box">
                              <span className={`admin-plan-tag ${u.plan && u.plan.price > 0 ? 'paid' : ''}`}>
                                <IconCrown size={12} />
                                <span>{u.plan ? u.plan.name : 'Plan Gratuito'}</span>
                              </span>
                              <div className="admin-plan-usage">
                                Docs: <strong>{docCount}</strong> / {docLimit === -1 ? '∞' : (docLimit ?? 30)}
                              </div>
                              {u.planExpiresAt && (
                                <div className={`admin-plan-expiry ${isExpired ? 'expired' : ''}`}>
                                  {isExpired ? '⚠️ Vencido: ' : 'Vence: '}
                                  {new Date(u.planExpiresAt).toLocaleDateString('es-PE')}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {u.invoicesCount || 0}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`status-pill ${u.status === 'ACTIVE' ? 'prod' : 'error'}`}>
                              {u.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="admin-actions-cell">
                              <button
                                type="button"
                                className="btn-admin-action plan"
                                onClick={() => {
                                  setSelectedUserForPlan(u);
                                  setIsUserPlanModalOpen(true);
                                }}
                                title="Asignar o editar plan comercial"
                              >
                                <IconCrown size={12} />
                                <span>Plan</span>
                              </button>

                              <button
                                type="button"
                                className="btn-admin-action edit"
                                onClick={() => {
                                  setSelectedUserForEdit(u);
                                  setIsEditUserModalOpen(true);
                                }}
                                title="Editar datos de usuario"
                              >
                                <IconEdit size={12} />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                className="btn-admin-action key"
                                onClick={() => {
                                  setSelectedUserForPassword(u);
                                  setIsResetPasswordModalOpen(true);
                                }}
                                title="Restablecer contraseña"
                              >
                                <IconKey size={12} />
                                <span>Clave</span>
                              </button>

                              {u.role !== 'SUPERADMIN' && (
                                <button
                                  type="button"
                                  className={`btn-admin-action ${u.status === 'ACTIVE' ? 'suspend' : 'reactivate'}`}
                                  onClick={() => handleToggleUserStatus(u)}
                                  title={u.status === 'ACTIVE' ? 'Suspender acceso a este usuario' : 'Reactivar acceso'}
                                >
                                  {u.status === 'ACTIVE' ? <IconLock size={12} /> : <IconCheck size={12} />}
                                  <span>{u.status === 'ACTIVE' ? 'Suspender' : 'Activar'}</span>
                                </button>
                              )}

                              {u.role !== 'SUPERADMIN' && (
                                <button
                                  type="button"
                                  className="btn-admin-action delete"
                                  onClick={() => {
                                    setSelectedUserForDelete(u);
                                    setIsDeleteUserModalOpen(true);
                                  }}
                                  title="Eliminar permanentemente este usuario y sus empresas"
                                >
                                  <IconTrash size={12} />
                                  <span>Borrar</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <IconUsers size={32} style={{ opacity: 0.4 }} />
                          <span>No se encontraron cuentas que coincidan con la búsqueda o filtro.</span>
                          {userSearchQuery && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => { setUserSearchQuery(''); setUserStatusFilter('ALL'); }}
                              style={{ marginTop: '6px' }}
                            >
                              Limpiar Filtros
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (<= 768px) */}
          <div className="admin-users-cards-view">
            {filteredUsers.length > 0 ? (
              filteredUsers.map(u => {
                const userInitial = (u.name || u.email || 'U').charAt(0).toUpperCase();
                const docLimit = u.plan?.docLimit;
                const docCount = u.docsIssuedCount || 0;
                const usagePct = docLimit === -1 ? 0 : Math.min(100, Math.round((docCount / (docLimit || 30)) * 100));
                const isExpired = u.planExpiresAt && new Date() > new Date(u.planExpiresAt);

                return (
                  <div className="admin-mobile-user-card" key={u.id} style={{ opacity: u.status === 'SUSPENDED' ? 0.7 : 1 }}>
                    {/* Header */}
                    <div className="admin-mobile-card-header">
                      <div className="admin-mobile-user-meta">
                        <div className="admin-user-avatar">{userInitial}</div>
                        <div className="admin-user-info">
                          <span className="admin-user-name">{u.name || 'Sin Nombre'}</span>
                          <span className="admin-user-email">{u.email}</span>
                          <span className="admin-user-date">
                            Reg: {new Date(u.createdAt).toLocaleDateString('es-PE')}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span className={`status-pill ${u.status === 'ACTIVE' ? 'prod' : 'error'}`}>
                          {u.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                        </span>
                        <span className={`user-role-tag ${u.role === 'SUPERADMIN' ? 'superadmin' : 'tenant'}`}>
                          {u.role === 'SUPERADMIN' ? 'Super Admin' : 'Inquilino'}
                        </span>
                      </div>
                    </div>

                    {/* Plan & Consumption */}
                    <div className="admin-mobile-card-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="admin-mobile-section-title">
                          <IconCrown size={13} style={{ color: '#f59e0b' }} />
                          <span>{u.plan ? u.plan.name : 'Plan Gratuito'}</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {docCount} / {docLimit === -1 ? '∞' : (docLimit ?? 30)} docs
                        </span>
                      </div>
                      {docLimit !== -1 && (
                        <div className="admin-usage-progress-bar">
                          <div
                            className={`admin-usage-progress-fill ${usagePct >= 85 ? 'warning' : ''}`}
                            style={{ width: `${usagePct}%` }}
                          />
                        </div>
                      )}
                      {u.planExpiresAt && (
                        <div style={{ fontSize: '11px', marginTop: '3px', color: isExpired ? '#ef4444' : 'var(--text-muted)' }}>
                          {isExpired ? '⚠️ Vencido: ' : 'Vence: '}
                          {new Date(u.planExpiresAt).toLocaleDateString('es-PE')}
                        </div>
                      )}
                    </div>

                    {/* Companies Section */}
                    <div className="admin-mobile-card-section">
                      <div className="admin-mobile-section-title">
                        <IconBuilding size={13} />
                        <span>Empresas Vinculadas ({u.companies ? u.companies.length : 0})</span>
                      </div>
                      {u.companies && u.companies.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                          {u.companies.map(c => (
                            <div key={c.id} className="admin-company-card">
                              <div className="admin-company-header">
                                <span className="admin-company-ruc">
                                  <IconBuilding size={11} /> {c.ruc}
                                </span>
                                {c.hasCert && (
                                  <span className={`status-pill ${c.isProduction ? 'prod' : 'beta'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                                    {c.isProduction ? 'PROD' : 'BETA'}
                                  </span>
                                )}
                              </div>
                              <div className="admin-company-name">{c.razonSocial}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Sin empresas registradas aún
                        </span>
                      )}
                    </div>

                    {/* Mobile Action Buttons Grid */}
                    <div className="admin-mobile-actions-grid">
                      <button
                        type="button"
                        className="btn-admin-action plan"
                        onClick={() => { setSelectedUserForPlan(u); setIsUserPlanModalOpen(true); }}
                      >
                        <IconCrown size={13} />
                        <span>Plan</span>
                      </button>
                      <button
                        type="button"
                        className="btn-admin-action edit"
                        onClick={() => { setSelectedUserForEdit(u); setIsEditUserModalOpen(true); }}
                      >
                        <IconEdit size={13} />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        className="btn-admin-action key"
                        onClick={() => { setSelectedUserForPassword(u); setIsResetPasswordModalOpen(true); }}
                      >
                        <IconKey size={13} />
                        <span>Clave</span>
                      </button>
                      {u.role !== 'SUPERADMIN' && (
                        <button
                          type="button"
                          className={`btn-admin-action ${u.status === 'ACTIVE' ? 'suspend' : 'reactivate'}`}
                          onClick={() => handleToggleUserStatus(u)}
                        >
                          {u.status === 'ACTIVE' ? <IconLock size={13} /> : <IconCheck size={13} />}
                          <span>{u.status === 'ACTIVE' ? 'Suspender' : 'Activar'}</span>
                        </button>
                      )}
                      {u.role !== 'SUPERADMIN' && (
                        <button
                          type="button"
                          className="btn-admin-action delete action-col-2"
                          onClick={() => { setSelectedUserForDelete(u); setIsDeleteUserModalOpen(true); }}
                        >
                          <IconTrash size={13} />
                          <span>Borrar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-secondary)' }}>
                No se encontraron cuentas con el filtro seleccionado.
              </div>
            )}
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

      {/* TAB: PLANES Y PAQUETES DE COBRO */}
      {activeAdminSubTab === 'plans' && (
        <div className="glass-card animate-fade-in" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
            <div>
              <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconCrown size={20} style={{ color: '#f59e0b' }} />
                <span>Planes y Paquetes de Cobro</span>
              </h2>
              <span className="field-hint">
                Configura los precios, límites de facturación mensual y cantidad de usuarios por suscripción comercial.
              </span>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSelectedPlanForEdit(null);
                setIsPlanModalOpen(true);
              }}
            >
              <IconPlus size={16} />
              <span>Crear Nuevo Plan</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {plans.map(p => (
              <div 
                key={p.id}
                className="glass-card"
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  border: p.isPopular ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {p.isPopular && (
                  <span style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '14px',
                    background: '#f59e0b',
                    color: '#fff',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    textTransform: 'uppercase'
                  }}>
                    Popular
                  </span>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>{p.name}</h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CÓDIGO: <code>{p.code}</code></span>
                    </div>
                    <span className={`status-pill ${p.isActive ? 'prod' : 'error'}`}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 12px 0', minHeight: '34px' }}>
                    {p.description || 'Sin descripción'}
                  </p>

                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>
                    {p.price === 0 ? 'GRATIS' : `S/. ${p.price}`}
                    <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}> / mes</span>
                  </div>

                  <div style={{ fontSize: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <IconFileText size={14} style={{ color: 'var(--primary)' }} />
                      <strong>{p.docLimit === -1 ? 'Comprobantes Ilimitados' : `${p.docLimit} docs/mes`}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <IconUser size={14} style={{ color: 'var(--primary)' }} />
                      <span>{p.userLimit} {p.userLimit === 1 ? 'Usuario' : 'Usuarios'} de equipo</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      <IconCheck size={14} style={{ color: '#10b981' }} />
                      <span>{p.usersCount || 0} inquilinos suscritos</span>
                    </div>

                    {/* Módulos Habilitados */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                      <span className="tailadmin-badge primary" style={{ fontSize: '10px', padding: '2px 6px' }}>
                        🌐 Web
                      </span>
                      {p.hasTelegramBot !== false && (
                        <span className="tailadmin-badge success" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          🤖 Telegram
                        </span>
                      )}
                      {p.hasExternalApi !== false && (
                        <span className="tailadmin-badge warning" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          🔌 API REST
                        </span>
                      )}
                      {p.hasBuzonSol !== false && (
                        <span className="tailadmin-badge info" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          📬 Buzón
                        </span>
                      )}
                      <span className="tailadmin-badge" style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--bg-subtle)' }}>
                        🏢 {p.companyLimit === -1 ? 'Multi-RUC ∞' : `${p.companyLimit || 1} RUC`}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    onClick={() => {
                      setSelectedPlanForEdit(p);
                      setIsPlanModalOpen(true);
                    }}
                  >
                    <IconEdit size={12} />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-sm"
                    onClick={() => handleDeletePlan(p.id, p.name)}
                    title="Eliminar o desactivar plan"
                  >
                    <IconTrash size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: PASARELAS DE PAGO & SUSCRIPCIONES */}
      {activeAdminSubTab === 'gateways' && (
        <div className="glass-card animate-fade-in" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconCreditCard size={20} />
                <span>Configuración de Pasarelas de Pago Oficiales</span>
              </h2>
              <span className="field-hint">
                Activa y administra las pasarelas de pago disponibles para los clientes al contratar o renovar planes.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pasarelas activas para clientes:</span>
              <strong style={{ color: 'var(--primary)', background: 'var(--bg-card-subtle)', padding: '3px 10px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                {[
                  gatewaysForm.mercadopagoActive,
                  gatewaysForm.izipayActive,
                  gatewaysForm.paypalActive,
                  gatewaysForm.culqiActive,
                  gatewaysForm.bankTransferActive
                ].filter(Boolean).length} de 5
              </strong>
            </div>
          </div>

          {/* Clean Gateway Selector Tabs Bar */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
            {[
              { id: 'mercadopago', name: 'Mercado Pago', icon: '⚡', color: '#009ee3', active: gatewaysForm.mercadopagoActive },
              { id: 'izipay', name: 'Izipay', icon: '💳', color: '#ff0055', active: gatewaysForm.izipayActive },
              { id: 'paypal', name: 'PayPal', icon: '🅿️', color: '#003087', active: gatewaysForm.paypalActive },
              { id: 'culqi', name: 'Culqi', icon: '📱', color: '#00c389', active: gatewaysForm.culqiActive },
              { id: 'bankTransfer', name: 'Transferencia Manual', icon: '🏦', color: '#10b981', active: gatewaysForm.bankTransferActive }
            ].map(gw => (
              <button
                key={gw.id}
                type="button"
                onClick={() => setActiveGatewayTab(gw.id)}
                style={{
                  padding: '9px 15px',
                  borderRadius: '10px',
                  border: activeGatewayTab === gw.id ? `2px solid ${gw.color}` : '1px solid var(--border-color)',
                  background: activeGatewayTab === gw.id ? `${gw.color}14` : 'var(--bg-card)',
                  color: activeGatewayTab === gw.id ? gw.color : 'var(--text-secondary)',
                  fontWeight: activeGatewayTab === gw.id ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{gw.icon}</span>
                <span style={{ fontSize: '13px' }}>{gw.name}</span>
                <span style={{
                  fontSize: '10px',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: gw.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(150, 150, 150, 0.15)',
                  color: gw.active ? '#10b981' : 'var(--text-muted)',
                  fontWeight: 700
                }}>
                  {gw.active ? 'Activo' : 'Inactivo'}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSaveGateways}>
            {/* 1. Mercado Pago Tab */}
            {activeGatewayTab === 'mercadopago' && (
              <div className="glass-card animate-fade-in" style={{ padding: '22px', borderRadius: '12px', border: '1px solid rgba(0, 158, 227, 0.3)', marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#009ee3', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⚡ Mercado Pago (Checkout Pro & Yape)</span>
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Recepción automática de pagos con Yape, Tarjetas de Débito/Crédito y saldo Mercado Pago con Webhooks IPN.
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: gatewaysForm.mercadopagoActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)', padding: '6px 14px', borderRadius: '20px', border: `1px solid ${gatewaysForm.mercadopagoActive ? '#10b981' : '#ef4444'}` }}>
                    <input 
                      type="checkbox" 
                      checked={gatewaysForm.mercadopagoActive} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, mercadopagoActive: e.target.checked })} 
                    />
                    <strong style={{ fontSize: '12.5px', color: gatewaysForm.mercadopagoActive ? '#10b981' : '#ef4444' }}>
                      {gatewaysForm.mercadopagoActive ? 'Pasarela Habilitada' : 'Pasarela Deshabilitada'}
                    </strong>
                  </label>
                </div>

                {!gatewaysForm.mercadopagoActive && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                    ℹ️ <strong>Pasarela Desactivada:</strong> Los clientes no verán la opción de Mercado Pago en su panel hasta que la habilites aquí.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group-field">
                    <label className="field-label" style={{ fontSize: '12px' }}>Public Key (Clave Pública)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="TEST-xxxx o APP_USR-xxxx" 
                      value={gatewaysForm.mercadopagoPublicKey || ''} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, mercadopagoPublicKey: e.target.value })} 
                    />
                  </div>

                  <div className="form-group-field">
                    <label className="field-label" style={{ fontSize: '12px' }}>Access Token (Clave Secreta)</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      placeholder="TEST-xxxx o APP_USR-xxxx" 
                      value={gatewaysForm.mercadopagoAccessToken || ''} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, mercadopagoAccessToken: e.target.value })} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-card-subtle)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={gatewaysForm.mercadopagoSandbox} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, mercadopagoSandbox: e.target.checked })} 
                    />
                    <span>Modo Sandbox (Pruebas con tarjetas de test)</span>
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>URL Webhook IPN:</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        const url = `${window.location.origin}/api/subscription/webhook/mercadopago`;
                        navigator.clipboard.writeText(url);
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 2000);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <IconCopy size={12} />
                      <span>{copiedWebhook ? '¡Copiado!' : 'Copiar URL'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Izipay Tab */}
            {activeGatewayTab === 'izipay' && (
              <div className="glass-card animate-fade-in" style={{ padding: '22px', borderRadius: '12px', border: '1px solid rgba(255, 0, 85, 0.3)', marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#ff0055', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>💳 Izipay Token (Visa & Mastercard Perú)</span>
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Pasarela peruana directa para procesamiento con tarjeta de crédito y débito.
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: gatewaysForm.izipayActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)', padding: '6px 14px', borderRadius: '20px', border: `1px solid ${gatewaysForm.izipayActive ? '#10b981' : '#ef4444'}` }}>
                    <input 
                      type="checkbox" 
                      checked={gatewaysForm.izipayActive} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, izipayActive: e.target.checked })} 
                    />
                    <strong style={{ fontSize: '12.5px', color: gatewaysForm.izipayActive ? '#10b981' : '#ef4444' }}>
                      {gatewaysForm.izipayActive ? 'Pasarela Habilitada' : 'Pasarela Deshabilitada'}
                    </strong>
                  </label>
                </div>

                {!gatewaysForm.izipayActive && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                    ℹ️ <strong>Pasarela Desactivada:</strong> No será visible para los clientes mientras esté deshabilitada.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group-field">
                    <label className="field-label" style={{ fontSize: '12px' }}>Public Key (Clave Pública)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Ej. 12345678:testpublickey_xxxx" 
                      value={gatewaysForm.izipayPublicKey || ''} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, izipayPublicKey: e.target.value })} 
                    />
                  </div>

                  <div className="form-group-field">
                    <label className="field-label" style={{ fontSize: '12px' }}>Clave HMAC-SHA256</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      placeholder="Firma secreta provista por Izipay" 
                      value={gatewaysForm.izipayShaKey || ''} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, izipayShaKey: e.target.value })} 
                    />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={gatewaysForm.izipaySandbox} 
                    onChange={(e) => setGatewaysForm({ ...gatewaysForm, izipaySandbox: e.target.checked })} 
                  />
                  <span>Modo Sandbox (Pruebas Izipay)</span>
                </label>
              </div>
            )}

            {/* 3. PayPal Tab */}
            {activeGatewayTab === 'paypal' && (
              <div className="glass-card animate-fade-in" style={{ padding: '22px', borderRadius: '12px', border: '1px solid rgba(0, 48, 135, 0.3)', marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#003087', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🅿️ PayPal Checkout (Cobros Internacionales)</span>
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Ideal para clientes internacionales o pagos en dólares (USD).
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: gatewaysForm.paypalActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)', padding: '6px 14px', borderRadius: '20px', border: `1px solid ${gatewaysForm.paypalActive ? '#10b981' : '#ef4444'}` }}>
                    <input 
                      type="checkbox" 
                      checked={gatewaysForm.paypalActive} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, paypalActive: e.target.checked })} 
                    />
                    <strong style={{ fontSize: '12.5px', color: gatewaysForm.paypalActive ? '#10b981' : '#ef4444' }}>
                      {gatewaysForm.paypalActive ? 'Pasarela Habilitada' : 'Pasarela Deshabilitada'}
                    </strong>
                  </label>
                </div>

                {!gatewaysForm.paypalActive && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                    ℹ️ <strong>Pasarela Desactivada:</strong> Oculta para los clientes en su modal de compra.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group-field">
                    <label className="field-label" style={{ fontSize: '12px' }}>Client ID</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="AZ_xxxx" 
                      value={gatewaysForm.paypalClientId || ''} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, paypalClientId: e.target.value })} 
                    />
                  </div>

                  <div className="form-group-field">
                    <label className="field-label" style={{ fontSize: '12px' }}>Secret Key</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      placeholder="E_xxxx" 
                      value={gatewaysForm.paypalSecret || ''} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, paypalSecret: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group-field" style={{ maxWidth: '280px' }}>
                  <label className="field-label" style={{ fontSize: '12px' }}>Entorno</label>
                  <select 
                    className="input-field"
                    value={gatewaysForm.paypalMode || 'sandbox'}
                    onChange={(e) => setGatewaysForm({ ...gatewaysForm, paypalMode: e.target.value })}
                  >
                    <option value="sandbox">Sandbox (Pruebas)</option>
                    <option value="live">Live (Producción)</option>
                  </select>
                </div>
              </div>
            )}

            {/* 4. Culqi Tab */}
            {activeGatewayTab === 'culqi' && (
              <div className="glass-card animate-fade-in" style={{ padding: '22px', borderRadius: '12px', border: '1px solid rgba(0, 195, 137, 0.3)', marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#00c389', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📱 Culqi (Tarjetas & Billeteras Perú)</span>
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Soporte para cobro online con tarjetas de débito/crédito y PagoEfectivo.
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: gatewaysForm.culqiActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)', padding: '6px 14px', borderRadius: '20px', border: `1px solid ${gatewaysForm.culqiActive ? '#10b981' : '#ef4444'}` }}>
                    <input 
                      type="checkbox" 
                      checked={gatewaysForm.culqiActive} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, culqiActive: e.target.checked })} 
                    />
                    <strong style={{ fontSize: '12.5px', color: gatewaysForm.culqiActive ? '#10b981' : '#ef4444' }}>
                      {gatewaysForm.culqiActive ? 'Pasarela Habilitada' : 'Pasarela Deshabilitada'}
                    </strong>
                  </label>
                </div>

                {!gatewaysForm.culqiActive && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                    ℹ️ <strong>Pasarela Desactivada:</strong> No aparecerá en el selector de medios de pago.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div className="form-group-field">
                    <label className="field-label" style={{ fontSize: '12px' }}>Public Key (pk_test_... o pk_live_...)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="pk_live_xxxx" 
                      value={gatewaysForm.culqiPublicKey || ''} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, culqiPublicKey: e.target.value })} 
                    />
                  </div>

                  <div className="form-group-field">
                    <label className="field-label" style={{ fontSize: '12px' }}>Secret Key (sk_test_... o sk_live_...)</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      placeholder="sk_live_xxxx" 
                      value={gatewaysForm.culqiSecretKey || ''} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, culqiSecretKey: e.target.value })} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. Transferencia Bancaria Manual Tab */}
            {activeGatewayTab === 'bankTransfer' && (
              <div className="glass-card animate-fade-in" style={{ padding: '22px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🏦 Transferencia Bancaria Manual & Yape / Plin</span>
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Los clientes depositan a tus cuentas bancarias y reportan su número de operación para aprobación manual.
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: gatewaysForm.bankTransferActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)', padding: '6px 14px', borderRadius: '20px', border: `1px solid ${gatewaysForm.bankTransferActive ? '#10b981' : '#ef4444'}` }}>
                    <input 
                      type="checkbox" 
                      checked={gatewaysForm.bankTransferActive} 
                      onChange={(e) => setGatewaysForm({ ...gatewaysForm, bankTransferActive: e.target.checked })} 
                    />
                    <strong style={{ fontSize: '12.5px', color: gatewaysForm.bankTransferActive ? '#10b981' : '#ef4444' }}>
                      {gatewaysForm.bankTransferActive ? 'Opción Habilitada' : 'Opción Deshabilitada'}
                    </strong>
                  </label>
                </div>

                {!gatewaysForm.bankTransferActive && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                    ℹ️ <strong>Opción Desactivada:</strong> Los clientes no podrán elegir pago manual por transferencia bancaria.
                  </div>
                )}

                <div className="form-group-field">
                  <label className="field-label" style={{ fontSize: '12px' }}>Cuentas Bancarias e Instrucciones de Abono</label>
                  <textarea 
                    className="input-field" 
                    rows={4}
                    value={gatewaysForm.bankTransferInfo || ''} 
                    onChange={(e) => setGatewaysForm({ ...gatewaysForm, bankTransferInfo: e.target.value })} 
                    placeholder="BCP Soles: 191-xxxx CCI: 002-xxxx&#10;BBVA Soles: 0011-xxxx&#10;Yape / Plin: 999 888 777 a nombre de Mi Empresa S.A.C."
                  />
                  <span className="field-hint">Esta información se mostrará al cliente que elija transferencia bancaria.</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
              <button 
                type="submit" 
                className="btn btn-primary btn-lg"
                disabled={savingGateways}
                style={{ padding: '12px 24px', fontWeight: 700 }}
              >
                <IconCheck size={16} />
                <span>{savingGateways ? 'Guardando Cambios...' : 'Guardar Configuración de Pasarelas'}</span>
              </button>
            </div>
          </form>

          {/* Table of Payment Orders */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
              Órdenes de Pago y Regularizaciones de Clientes
            </h3>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Cliente / Correo</th>
                    <th>Plan Solicitado</th>
                    <th>Monto</th>
                    <th>Pasarela</th>
                    <th>Referencia / Nota</th>
                    <th>Fecha</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentOrders.length > 0 ? (
                    paymentOrders.map(ord => (
                      <tr key={ord.id}>
                        <td>
                          <strong>{ord.user?.name || 'Cliente'}</strong>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{ord.user?.email}</div>
                        </td>
                        <td>
                          <span className="status-pill prod" style={{ fontSize: '11px' }}>
                            {ord.plan?.name || 'Plan'}
                          </span>
                        </td>
                        <td><strong>S/. {ord.amount}</strong></td>
                        <td><span className="status-badge">{ord.gateway}</span></td>
                        <td>
                          <span style={{ fontSize: '12px' }}>{ord.gatewayRef || ord.notes || 'Sin datos adicionales'}</span>
                        </td>
                        <td>{new Date(ord.createdAt).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`status-pill ${ord.status === 'APPROVED' ? 'prod' : (ord.status === 'PENDING' ? 'beta' : 'error')}`}>
                            {ord.status === 'APPROVED' ? 'Aprobado' : (ord.status === 'PENDING' ? 'Pendiente' : ord.status)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {ord.status === 'PENDING' ? (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '11.5px', padding: '3px 8px' }}
                              onClick={() => handleApproveOrder(ord.id)}
                              disabled={approvingOrderId === ord.id}
                            >
                              {approvingOrderId === ord.id ? 'Aprobando...' : 'Aprobar Pago'}
                            </button>
                          ) : (
                            <span style={{ color: '#10b981', fontSize: '12px' }}>✓ Activado</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                        No hay órdenes de pago registradas todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Admin Plan Modal */}
      <AdminPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setSelectedPlanForEdit(null);
        }}
        plan={selectedPlanForEdit}
        API_URL={API_URL}
        authToken={authToken}
        onSuccess={(msg) => {
          showMsg(msg, 'success');
          loadData();
        }}
      />

      {/* Admin User Plan Modal */}
      <AdminUserPlanModal
        isOpen={isUserPlanModalOpen}
        onClose={() => {
          setIsUserPlanModalOpen(false);
          setSelectedUserForPlan(null);
        }}
        user={selectedUserForPlan}
        plans={plans}
        API_URL={API_URL}
        authToken={authToken}
        onSuccess={(msg) => {
          showMsg(msg, 'success');
          loadData();
        }}
      />

      {/* Admin Reset Password Modal */}
      <AdminResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => {
          setIsResetPasswordModalOpen(false);
          setSelectedUserForPassword(null);
        }}
        user={selectedUserForPassword}
        API_URL={API_URL}
        authToken={authToken}
        onSuccess={(msg) => {
          showMsg(msg, 'success');
          loadData();
        }}
      />

      {/* Admin Edit User Modal */}
      <AdminEditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setSelectedUserForEdit(null);
        }}
        user={selectedUserForEdit}
        API_URL={API_URL}
        authToken={authToken}
        onSuccess={(msg) => {
          showMsg(msg, 'success');
          loadData();
        }}
      />

      {/* Admin Delete User Modal */}
      <AdminDeleteUserModal
        isOpen={isDeleteUserModalOpen}
        onClose={() => {
          setIsDeleteUserModalOpen(false);
          setSelectedUserForDelete(null);
        }}
        user={selectedUserForDelete}
        API_URL={API_URL}
        authToken={authToken}
        onSuccess={(msg) => {
          showMsg(msg, 'success');
          loadData();
        }}
      />
    </div>
  );
}
