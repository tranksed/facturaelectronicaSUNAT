import React, { useState, useEffect } from 'react';
import LoginModal from './components/LoginModal';
import CompanyModal from './components/CompanyModal';
import CompanySettings from './components/CompanySettings';
import SuperAdminPanel from './components/SuperAdminPanel';
import {
  IconDashboard,
  IconInvoice,
  IconFileText,
  IconBuilding,
  IconShield,
  IconSearch,
  IconPlus,
  IconSun,
  IconMoon,
  IconLogout,
  IconTelegram,
  IconServer,
  IconTrash,
  IconExternalLink,
  IconDownload,
  IconCreditCard,
  IconSettings,
  IconCode,
  IconArchive
} from './components/Icons';

// Setup API endpoint (points to Express server on Port 3000 in dev)
const API_URL = window.location.port === '5173' ? 'http://localhost:3000' : '';

export default function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { text, type: 'success' | 'error' }

  // Dark / Light Theme state (persisted)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Authentication & Multi-tenant State
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const u = localStorage.getItem('currentUser');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // Platform White-Label Branding
  const [branding, setBranding] = useState({
    platformName: 'APISUNAT PRO',
    platformSubtitle: 'Plataforma SaaS Multitenant de Facturación Electrónica SUNAT',
    logoUrl: '',
    primaryColor: '#2563eb',
    allowRegistration: true,
    telegramBotEnabled: true
  });

  // Invoices & Metrics
  const [invoices, setInvoices] = useState([]);

  // Form states for Emission (APISUNAT Style)
  const [tipoDoc, setTipoDoc] = useState('01'); // 01=Factura, 03=Boleta
  const [serie, setSerie] = useState('F001');
  const [correlativo, setCorrelativo] = useState('00000001');
  const [clienteTipoDoc, setClienteTipoDoc] = useState('6'); // 6=RUC, 1=DNI, 4=CE, 7=Pasaporte
  const [clienteDoc, setClienteDoc] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupInfo, setLookupInfo] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [fechaEmision, setFechaEmision] = useState(todayStr);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [tipoOperacion, setTipoOperacion] = useState('0101');
  const [moneda, setMoneda] = useState('PEN');

  // Dynamic Items list
  const [items, setItems] = useState([
    { id: 1, descripcion: '', cantidad: 1, precioUnitario: '' }
  ]);

  // Payment terms & Observations
  const [formaPago, setFormaPago] = useState('Contado');
  const [cuotaMonto, setCuotaMonto] = useState('');
  const [cuotaFecha, setCuotaFecha] = useState('');
  const [showObservaciones, setShowObservaciones] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  // Search/Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // 1. Theme application effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // 2. Initial Load: White-label branding & Verify auth
  useEffect(() => {
    fetchBranding();
    if (authToken) {
      verifyCurrentUser();
    }
  }, []);

  // 3. Dynamic Primary Color Theme
  useEffect(() => {
    if (branding?.primaryColor) {
      document.documentElement.style.setProperty('--primary', branding.primaryColor);
    }
  }, [branding?.primaryColor]);

  // 4. Whenever activeCompany changes, reload invoices and next ID
  useEffect(() => {
    if (activeCompany?.id) {
      fetchInvoices();
      fetchNextInvoiceId(tipoDoc, serie);
    }
  }, [activeCompany?.id]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 8000);
  };

  // Fetch White-Label Platform Branding
  const fetchBranding = async () => {
    try {
      const res = await fetch(`${API_URL}/api/public/branding`);
      if (res.ok) {
        const data = await res.json();
        setBranding(data);
      }
    } catch (e) {
      console.error('Error fetching branding:', e);
    }
  };

  // Verify current logged in user and fetch companies
  const verifyCurrentUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        await fetchCompanies();
      } else {
        handleLogout();
      }
    } catch (e) {
      console.error('Error verifying user:', e);
    }
  };

  // Fetch companies for the user
  const fetchCompanies = async (selectCompanyId = null) => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_URL}/api/companies`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const list = await res.json();
        setCompanies(list);
        if (list.length > 0) {
          if (selectCompanyId) {
            const found = list.find(c => c.id === selectCompanyId);
            setActiveCompany(found || list[0]);
          } else {
            const def = list.find(c => c.isDefault) || list[0];
            setActiveCompany(def);
          }
        } else {
          setActiveCompany(null);
        }
      }
    } catch (e) {
      console.error('Error fetching companies:', e);
    }
  };

  // Fetch invoices scoped to active company
  const fetchInvoices = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_URL}/api/documents`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-company-id': activeCompany?.id || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (e) {
      console.error('Error fetching invoices:', e);
    }
  };

  // Fetch next invoice ID (serie and correlativo)
  const fetchNextInvoiceId = async (docType, ser) => {
    if (!authToken || !activeCompany?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/documents/next-id/${docType}/${ser || ''}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-company-id': activeCompany.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nextId) {
          const parts = data.nextId.split('-');
          if (parts.length === 2) {
            setSerie(parts[0]);
            setCorrelativo(parts[1]);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching next id:', e);
    }
  };

  // Lookup customer in SUNAT / RENIEC
  const handleLookup = async (docType = clienteTipoDoc, docNum = clienteDoc) => {
    const num = (docNum || '').trim();
    if (!num || num.length < 8) {
      showMsg('Ingresa un número de documento válido (DNI 8 dígitos o RUC 11 dígitos).', 'error');
      return;
    }
    setLookupLoading(true);
    setLookupInfo(null);
    try {
      const res = await fetch(`${API_URL}/api/consultar/${docType}/${num}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setClienteNombre(data.nombre || '');
        if (data.direccion) {
          setClienteDireccion(data.direccion);
        }
        if (data.estado || data.condicion) {
          setLookupInfo({
            estado: data.estado,
            condicion: data.condicion
          });
        }
        showMsg(`Datos encontrados: ${data.nombre}`, 'success');
      } else {
        showMsg(data.error || 'No se encontraron datos oficiales para este documento.', 'error');
      }
    } catch (e) {
      showMsg('Error de red al consultar el documento.', 'error');
    } finally {
      setLookupLoading(false);
    }
  };

  // Dynamic Item handlers
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: Date.now(), descripcion: '', cantidad: 1, precioUnitario: '' }
    ]);
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) {
      setItems([{ id: Date.now(), descripcion: '', cantidad: 1, precioUnitario: '' }]);
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Financial calculations
  const calculateItemSubtotal = (item) => {
    const qty = parseFloat(item.cantidad) || 0;
    const price = parseFloat(item.precioUnitario) || 0;
    return qty * price;
  };

  const calculateTotals = () => {
    const total = items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
    const subtotal = total / 1.18;
    const igv = total - subtotal;
    return {
      subtotal: subtotal.toFixed(2),
      igv: igv.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const totals = calculateTotals();

  // Submit Invoice (APISUNAT Payload Format)
  const handleSubmitInvoice = async (e) => {
    e.preventDefault();
    if (!activeCompany?.id) {
      showMsg('Debes seleccionar o registrar una empresa emisora antes de facturar.', 'error');
      return;
    }

    if (items.some(it => !it.descripcion.trim() || !it.precioUnitario)) {
      showMsg('Completa la descripción y precio de todos los ítems agregados.', 'error');
      return;
    }

    if (!clienteDoc.trim()) {
      showMsg('Debes ingresar el número de documento (RUC o DNI) del cliente.', 'error');
      return;
    }

    if (!clienteNombre.trim()) {
      showMsg('Debes ingresar la razón social o nombre del cliente.', 'error');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        companyId: activeCompany.id,
        tipoDoc,
        serie,
        correlativo,
        fechaEmision,
        fechaVencimiento: fechaVencimiento || undefined,
        tipoOperacion,
        moneda,
        formaPago,
        cuotaMonto: formaPago === 'Credito' ? parseFloat(cuotaMonto) : undefined,
        cuotaFecha: formaPago === 'Credito' ? cuotaFecha : undefined,
        observaciones: observaciones.trim() || undefined,
        clienteTipoDoc,
        clienteDoc: clienteDoc.trim(),
        clienteNombre: clienteNombre.trim(),
        clienteDireccion: clienteDireccion.trim(),
        cliente: {
          tipoDoc: clienteTipoDoc,
          numDoc: clienteDoc.trim(),
          nroDoc: clienteDoc.trim(),
          rznSocial: clienteNombre.trim(),
          nombre: clienteNombre.trim(),
          direccion: clienteDireccion.trim() || undefined
        },
        items: items.map(it => ({
          descripcion: it.descripcion.trim(),
          cantidad: parseFloat(it.cantidad) || 1,
          precioUnitario: parseFloat(it.precioUnitario) || 0
        }))
      };

      const res = await fetch(`${API_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'x-company-id': activeCompany.id
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        if (data.success) {
          showMsg(`Comprobante ${data.id} emitido y ACEPTADO por SUNAT.`);
          // Reset form
          setClienteDoc('');
          setClienteNombre('');
          setClienteDireccion('');
          setLookupInfo(null);
          setItems([{ id: Date.now(), descripcion: '', cantidad: 1, precioUnitario: '' }]);
          setObservaciones('');
          fetchInvoices();
          setActiveTab('invoices');
        } else {
          showMsg(`Comprobante generado pero RECHAZADO por SUNAT: ${data.invoice?.sunatMessage || 'Rechazado'}`, 'error');
          fetchInvoices();
        }
      } else {
        showMsg(data.error || 'Error al emitir el comprobante', 'error');
      }
    } catch (err) {
      showMsg('Error de red al emitir comprobante: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel document
  const handleAnularDocument = async (docId) => {
    if (!window.confirm(`¿Estás seguro de anular el comprobante ${docId} mediante una Nota de Crédito electrónica?`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/documents/${docId}/anular`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'x-company-id': activeCompany?.id || ''
        },
        body: JSON.stringify({
          motivoCodigo: '01',
          motivoDescripcion: 'ANULACION DE LA OPERACION'
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.success) {
          showMsg(`Comprobante ${docId} anulado exitosamente mediante Nota de Crédito ${data.ncId}`);
        } else {
          showMsg(`Nota de crédito emitida con observación: ${data.message}`, 'error');
        }
        fetchInvoices();
      } else {
        showMsg(data.error || 'Error al anular comprobante', 'error');
      }
    } catch (e) {
      showMsg('Error de conexión al anular', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auth Handlers
  const handleLoginSuccess = async (loginData) => {
    setAuthToken(loginData.token);
    setCurrentUser(loginData.user);
    localStorage.setItem('token', loginData.token);
    localStorage.setItem('currentUser', JSON.stringify(loginData.user));
    showMsg(`Bienvenido, ${loginData.user.name || loginData.user.email}`);

    // Fetch user companies
    try {
      const res = await fetch(`${API_URL}/api/companies`, {
        headers: { Authorization: `Bearer ${loginData.token}` }
      });
      if (res.ok) {
        const list = await res.json();
        setCompanies(list);
        if (list.length > 0) {
          const def = list.find(c => c.isDefault) || list[0];
          setActiveCompany(def);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setAuthToken('');
    setCurrentUser(null);
    setCompanies([]);
    setActiveCompany(null);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    showMsg('Sesión cerrada correctamente.');
  };

  // Company Created Handler
  const handleCompanyCreated = (newComp) => {
    setIsCompanyModalOpen(false);
    showMsg(`Empresa ${newComp.razonSocial} (RUC ${newComp.ruc}) registrada exitosamente.`);
    fetchCompanies(newComp.id);
  };

  // Company Updated Handler
  const handleCompanyUpdated = (updatedId) => {
    fetchCompanies(updatedId);
  };

  // Filtered invoices calculations
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clienteNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clienteDoc.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalBilled = invoices
    .filter(inv => inv.status === 'ACEPTADO')
    .reduce((sum, inv) => sum + inv.montoTotal, 0);

  const acceptedCount = invoices.filter(inv => inv.status === 'ACEPTADO').length;
  const rejectedCount = invoices.filter(inv => inv.status === 'RECHAZADO').length;
  const errorCount = invoices.filter(inv => inv.status === 'ERROR').length;

  return (
    <div className="app-container">
      {/* 1. Login / Register Modal */}
      <LoginModal 
        isOpen={!authToken || !currentUser} 
        onLoginSuccess={handleLoginSuccess}
        branding={branding}
        API_URL={API_URL}
      />

      {/* 2. Create New Company Modal */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onCompanyCreated={handleCompanyCreated}
        API_URL={API_URL}
        authToken={authToken}
      />

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="logo-container" onClick={() => setActiveTab('dashboard')}>
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" style={{ maxHeight: '36px', maxWidth: '120px' }} />
            ) : (
              <div className="logo-icon" style={{ background: branding?.primaryColor || '#2563eb' }}>
                {(branding?.platformName || 'SUNAT').substring(0, 1)}
              </div>
            )}
            <div className="logo-text">{branding?.platformName || 'APISUNAT'}</div>
          </div>

          <nav>
            <ul className="nav-links">
              <li>
                <button 
                  className={`nav-item-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  <span className="nav-item-icon"><IconDashboard size={18} /></span>
                  <span>Dashboard</span>
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item-btn ${activeTab === 'emision' ? 'active' : ''}`}
                  onClick={() => setActiveTab('emision')}
                >
                  <span className="nav-item-icon"><IconInvoice size={18} /></span>
                  <span>Emitir Comprobante</span>
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item-btn ${activeTab === 'invoices' ? 'active' : ''}`}
                  onClick={() => setActiveTab('invoices')}
                >
                  <span className="nav-item-icon"><IconFileText size={18} /></span>
                  <span>Comprobantes</span>
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item-btn ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                >
                  <span className="nav-item-icon"><IconBuilding size={18} /></span>
                  <span>Mi Empresa</span>
                </button>
              </li>
              {currentUser?.role === 'SUPERADMIN' && (
                <li>
                  <button 
                    className={`nav-item-btn ${activeTab === 'superadmin' ? 'active' : ''}`}
                    onClick={() => setActiveTab('superadmin')}
                    style={{ borderLeft: '3px solid #f43f5e' }}
                  >
                    <span className="nav-item-icon"><IconShield size={18} /></span>
                    <span>Super Admin</span>
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-status-box">
            <div className="status-dot-wrap">
              <span className="status-dot"></span>
              <span style={{ fontWeight: 600 }}>SUNAT UBL 2.1</span>
            </div>
            <span style={{ color: 'var(--text-muted)' }}>Online</span>
          </div>
          <div className="sidebar-version">
            PLATAFORMA SAAS v2.5
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content-panel">
        {/* Top Header Bar */}
        <header className="top-header-bar">
          <div className="top-header-left">
            <div className="header-active-company-pill">
              <IconBuilding size={16} />
              <span>{activeCompany?.razonSocial || 'Sin Empresa Seleccionada'}</span>
            </div>
          </div>

          <div className="top-header-actions">
            {/* Multi-Company Dropdown Switcher */}
            {currentUser && (
              <div className="company-switcher-wrap">
                {companies.length > 0 ? (
                  <select 
                    className="company-select-dropdown"
                    value={activeCompany?.id || ''}
                    onChange={(e) => {
                      const selected = companies.find(c => c.id === e.target.value);
                      if (selected) setActiveCompany(selected);
                    }}
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.razonSocial} (RUC {c.ruc}) {c.isProduction ? '[PROD]' : '[BETA]'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sin Empresas</span>
                )}

                <button 
                  type="button" 
                  className="btn-add-company"
                  onClick={() => setIsCompanyModalOpen(true)}
                  title="Registrar una nueva empresa RUC"
                >
                  <IconPlus size={14} />
                  <span>Nueva Empresa</span>
                </button>
              </div>
            )}

            {/* Dark / Light Mode Switcher */}
            <button 
              type="button" 
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
              <span className="theme-toggle-label">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
            </button>

            {/* Current User & Logout */}
            {currentUser && (
              <div className="user-profile-badge">
                <div className="user-avatar-circle">
                  {(currentUser.name || currentUser.email).substring(0, 1).toUpperCase()}
                </div>
                <span className={`user-role-tag ${currentUser.role === 'SUPERADMIN' ? 'superadmin' : 'tenant'}`}>
                  {currentUser.role === 'SUPERADMIN' ? 'Admin' : 'Cliente'}
                </span>
                <span style={{ fontWeight: 600 }}>{currentUser.name || currentUser.email}</span>
                <button 
                  type="button" 
                  className="btn-logout" 
                  onClick={handleLogout}
                  title="Cerrar sesión"
                >
                  <IconLogout size={14} />
                  <span>Salir</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Global Notifications Message */}
        <div className="content-body">
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
                <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }}>✕</button>
              </div>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              <div className="page-header">
                <h1 className="page-title">Panel de Control</h1>
                <p className="page-subtitle">
                  Monitoreo de emisión y sincronización directa con SUNAT para: <strong>{activeCompany?.razonSocial || 'Ninguna empresa seleccionada'}</strong>
                </p>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-title">Facturado Aceptado</span>
                  <span className="metric-value">S/. {totalBilled.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  <span className="metric-desc">Ingreso validado por SUNAT</span>
                </div>
                <div className="metric-card success">
                  <span className="metric-title">Aceptados</span>
                  <span className="metric-value">{acceptedCount}</span>
                  <span className="metric-desc">Comprobantes con CDR Aprobado</span>
                </div>
                <div className="metric-card error">
                  <span className="metric-title">Rechazados</span>
                  <span className="metric-value">{rejectedCount}</span>
                  <span className="metric-desc">Rechazados por inconsistencia fiscal</span>
                </div>
                <div className="metric-card warning">
                  <span className="metric-title">Errores/Pendientes</span>
                  <span className="metric-value">{errorCount}</span>
                  <span className="metric-desc">Fallo de comunicación con SUNAT</span>
                </div>
              </div>

              {/* Quick Actions / Status Summary */}
              <div className="glass-card">
                <h2 className="card-title">
                  <IconServer size={18} />
                  <span>Sistemas Integrados</span>
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '18px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <div className="flex-gap" style={{ marginBottom: '8px' }}>
                      <IconTelegram size={22} />
                      <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Telegram Bot</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
                      Emite facturas y boletas directamente desde el chat en cualquier dispositivo móvil.
                    </p>
                    {activeCompany?.telegramToken ? (
                      <span className="status-pill aceptado">Activo / En línea</span>
                    ) : (
                      <span className="status-pill error">Desactivado (Configurar token)</span>
                    )}
                  </div>

                  <div style={{ padding: '18px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <div className="flex-gap" style={{ marginBottom: '8px' }}>
                      <IconServer size={22} />
                      <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Conexión Directa SUNAT</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
                      Web Service oficial UBL 2.1 con certificado digital X.509 de la empresa.
                    </p>
                    {activeCompany?.hasCert ? (
                      <span className={`status-pill ${activeCompany.isProduction ? 'prod' : 'beta'}`}>
                        Certificado Ok ({activeCompany.isProduction ? 'Producción' : 'Beta'})
                      </span>
                    ) : (
                      <span className="status-pill error">Sin Certificado Digital</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Recent Documents inside Dashboard */}
              <div className="glass-card">
                <div className="flex-between" style={{ marginBottom: '16px' }}>
                  <h2 className="card-title" style={{ margin: 0 }}>
                    <IconFileText size={18} />
                    <span>Últimos Comprobantes</span>
                  </h2>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('invoices')}>Ver todos</button>
                </div>
                <RecentInvoicesTable invoices={invoices.slice(0, 5)} />
              </div>
            </div>
          )}

          {/* TAB 2: EMISSION (APISUNAT-Style Interface) */}
          {activeTab === 'emision' && (
            <div className="animate-fade-in apisunat-container">
              {/* Top Navigation Bar with Back & Toggle */}
              <div className="apisunat-header-bar">
                <button type="button" className="apisunat-back-btn" onClick={() => setActiveTab('dashboard')}>
                  ← <span>Emitir {tipoDoc === '01' ? 'Factura' : 'Boleta'}</span>
                </button>
                
                <div className="apisunat-doc-toggle">
                  <button 
                    type="button" 
                    className={`apisunat-toggle-pill ${tipoDoc === '01' ? 'active' : ''}`}
                    onClick={() => {
                      setTipoDoc('01');
                      setClienteTipoDoc('6');
                      setSerie('F001');
                      fetchNextInvoiceId('01', 'F001');
                    }}
                  >
                    Factura
                  </button>
                  <button 
                    type="button" 
                    className={`apisunat-toggle-pill ${tipoDoc === '03' ? 'active' : ''}`}
                    onClick={() => {
                      setTipoDoc('03');
                      setClienteTipoDoc('1');
                      setSerie('B001');
                      fetchNextInvoiceId('03', 'B001');
                    }}
                  >
                    Boleta
                  </button>
                </div>
              </div>

              {/* Main Emission Card */}
              <div className="apisunat-main-card">
                <form onSubmit={handleSubmitInvoice}>
                  
                  {/* Header Row: Document Identification */}
                  <div className="apisunat-card-header">
                    <div className="apisunat-doc-badge">
                      <IconInvoice size={22} />
                      <span className="apisunat-badge-title">
                        {tipoDoc === '01' ? 'Factura Electrónica' : 'Boleta de Venta'}
                      </span>
                    </div>

                    <div className="apisunat-series-box">
                      <label className="apisunat-label">Serie y Correlativo</label>
                      <div className="apisunat-box-inputs">
                        <select 
                          className="apisunat-select-serie"
                          value={serie}
                          onChange={(e) => {
                            setSerie(e.target.value);
                            fetchNextInvoiceId(tipoDoc, e.target.value);
                          }}
                        >
                          {tipoDoc === '01' ? (
                            <>
                              <option value="F001">F001</option>
                              <option value="F002">F002</option>
                            </>
                          ) : (
                            <>
                              <option value="B001">B001</option>
                              <option value="B002">B002</option>
                            </>
                          )}
                        </select>
                        <span className="apisunat-box-hyphen">-</span>
                        <input 
                          type="text" 
                          className="apisunat-input-correlativo"
                          value={correlativo}
                          onChange={(e) => setCorrelativo(e.target.value)}
                          placeholder="00000001"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Customer Section */}
                  <div className="apisunat-customer-section">
                    <div className="apisunat-customer-row-1">
                      <div className="apisunat-input-icon-wrap flex-1">
                        <span className="apisunat-input-icon">👤</span>
                        <input 
                          type="text" 
                          className="apisunat-input"
                          placeholder="Cliente / Razón Social"
                          value={clienteNombre}
                          onChange={(e) => setClienteNombre(e.target.value)}
                          required
                        />
                      </div>

                      <div className="apisunat-doc-type-wrap">
                        <select 
                          className="apisunat-select"
                          value={clienteTipoDoc}
                          onChange={(e) => {
                            setClienteTipoDoc(e.target.value);
                            setClienteDoc('');
                            setLookupInfo(null);
                          }}
                        >
                          <option value="6">RUC</option>
                          <option value="1">DNI</option>
                          <option value="4">CE</option>
                          <option value="7">Pasaporte</option>
                        </select>
                      </div>

                      <div className="apisunat-doc-num-wrap">
                        <input 
                          type="text" 
                          className="apisunat-input"
                          placeholder="Número de documento"
                          value={clienteDoc}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setClienteDoc(val);
                            if ((clienteTipoDoc === '6' && val.length === 11) || (clienteTipoDoc === '1' && val.length === 8)) {
                              handleLookup(clienteTipoDoc, val);
                            }
                          }}
                          required
                        />
                        <button 
                          type="button" 
                          className="apisunat-search-btn"
                          onClick={() => handleLookup()}
                          title="Buscar en SUNAT / RENIEC"
                          disabled={lookupLoading}
                        >
                          {lookupLoading ? '⌛' : <IconSearch size={15} />}
                        </button>
                      </div>
                    </div>

                    {lookupInfo && (
                      <div className="apisunat-lookup-badge">
                        <span>Registrado en SUNAT:</span> <strong>{lookupInfo.condicion}</strong> ({lookupInfo.estado})
                      </div>
                    )}

                    <div className="apisunat-customer-row-2">
                      <div className="apisunat-input-icon-wrap full-width">
                        <span className="apisunat-input-icon">📍</span>
                        <input 
                          type="text" 
                          className="apisunat-input"
                          placeholder="Dirección fiscal (opcional)"
                          value={clienteDireccion}
                          onChange={(e) => setClienteDireccion(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dates Row */}
                  <div className="apisunat-dates-row">
                    <div className="apisunat-date-field">
                      <label className="apisunat-label">F. de Emisión</label>
                      <input 
                        type="date" 
                        className="apisunat-input"
                        value={fechaEmision}
                        onChange={(e) => setFechaEmision(e.target.value)}
                        required
                      />
                    </div>
                    <div className="apisunat-date-field">
                      <label className="apisunat-label">Vencimiento</label>
                      <input 
                        type="date" 
                        className="apisunat-input"
                        value={fechaVencimiento}
                        onChange={(e) => setFechaVencimiento(e.target.value)}
                        placeholder="(opcional)"
                      />
                    </div>
                  </div>

                  {/* Operation & Currency Row */}
                  <div className="apisunat-op-row">
                    <div className="apisunat-op-field flex-2">
                      <select 
                        className="apisunat-select full-width"
                        value={tipoOperacion}
                        onChange={(e) => setTipoOperacion(e.target.value)}
                      >
                        <option value="0101">Venta interna no sujeta a Detracción, Retención o Percepción</option>
                        <option value="0102">Exportación de bienes</option>
                        <option value="0103">No domiciliados</option>
                        <option value="0104">Venta interna sujeta a Detracción</option>
                      </select>
                    </div>
                    <div className="apisunat-currency-field flex-1">
                      <select 
                        className="apisunat-select full-width"
                        value={moneda}
                        onChange={(e) => setMoneda(e.target.value)}
                      >
                        <option value="PEN">PEN - Soles Peruanos (S/.)</option>
                        <option value="USD">USD - Dólares Americanos ($)</option>
                      </select>
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="apisunat-items-section">
                    <div className="apisunat-items-table-wrap">
                      <div className="apisunat-items-header">
                        <span>Descripción del Producto o Servicio</span>
                        <span className="text-center">Cant.</span>
                        <span className="text-right">Precio Unit.</span>
                        <span className="text-right">Subtotal</span>
                        <span></span>
                      </div>

                      {items.map((item) => {
                        const itemSub = calculateItemSubtotal(item);
                        return (
                          <div key={item.id} className="apisunat-item-row">
                            <input 
                              type="text" 
                              className="apisunat-input"
                              placeholder="Descripción del ítem"
                              value={item.descripcion}
                              onChange={(e) => handleItemChange(item.id, 'descripcion', e.target.value)}
                              required
                            />
                            <input 
                              type="number" 
                              step="1"
                              min="1"
                              className="apisunat-input text-center"
                              placeholder="1"
                              value={item.cantidad}
                              onChange={(e) => handleItemChange(item.id, 'cantidad', e.target.value)}
                              required
                            />
                            <input 
                              type="number" 
                              step="0.01"
                              min="0"
                              className="apisunat-input text-right"
                              placeholder="0.00"
                              value={item.precioUnitario}
                              onChange={(e) => handleItemChange(item.id, 'precioUnitario', e.target.value)}
                              required
                            />
                            <div className="apisunat-total-display">
                              {moneda === 'PEN' ? 'S/. ' : '$ '}
                              {itemSub.toFixed(2)}
                            </div>
                            <button 
                              type="button" 
                              className="apisunat-remove-btn"
                              onClick={() => handleRemoveItem(item.id)}
                              title="Eliminar ítem"
                            >
                              <IconTrash size={15} />
                            </button>
                          </div>
                        );
                      })}

                      <div style={{ marginTop: '12px' }}>
                        <button 
                          type="button" 
                          className="apisunat-dashed-add-btn"
                          onClick={handleAddItem}
                        >
                          <IconPlus size={14} />
                          <span>Agregar Ítem</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Payment Condition & Totals */}
                  <div className="apisunat-bottom-grid">
                    <div className="apisunat-payment-col">
                      <div className="apisunat-payment-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label className="apisunat-label" style={{ margin: 0, minWidth: '100px' }}>Forma de Pago</label>
                        <select 
                          className="apisunat-select"
                          value={formaPago}
                          onChange={(e) => setFormaPago(e.target.value)}
                        >
                          <option value="Contado">Contado</option>
                          <option value="Credito">Crédito</option>
                        </select>
                      </div>

                      {formaPago === 'Credito' && (
                        <div style={{ marginTop: '12px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label className="apisunat-label" style={{ margin: 0, minWidth: '140px' }}>Monto de la Cuota</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              className="apisunat-input"
                              value={cuotaMonto}
                              onChange={(e) => setCuotaMonto(e.target.value)}
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                            <label className="apisunat-label" style={{ margin: 0, minWidth: '140px' }}>Fecha de Cuota</label>
                            <input 
                              type="date" 
                              className="apisunat-input"
                              value={cuotaFecha}
                              onChange={(e) => setCuotaFecha(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Totals Summary */}
                    <div className="apisunat-totals-col">
                      <div className="apisunat-total-row">
                        <span className="apisunat-total-label">Op. Gravada</span>
                        <div className="apisunat-total-input-box">
                          {moneda === 'PEN' ? 'S/. ' : '$ '}
                          {totals.subtotal}
                        </div>
                      </div>
                      <div className="apisunat-total-row">
                        <span className="apisunat-total-label">IGV (18%)</span>
                        <div className="apisunat-total-input-box">
                          {moneda === 'PEN' ? 'S/. ' : '$ '}
                          {totals.igv}
                        </div>
                      </div>
                      <div className="apisunat-total-row highlight">
                        <span className="apisunat-total-label">Importe Total</span>
                        <div className="apisunat-total-input-box bold">
                          {moneda === 'PEN' ? 'S/. ' : '$ '}
                          {totals.total}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Observations Section */}
                  <div style={{ marginBottom: '20px' }}>
                    {!showObservaciones ? (
                      <button 
                        type="button" 
                        className="apisunat-dashed-add-btn"
                        onClick={() => setShowObservaciones(true)}
                      >
                        + Observaciones o Notas
                      </button>
                    ) : (
                      <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                        <div className="flex-between" style={{ marginBottom: '6px' }}>
                          <label className="apisunat-label" style={{ margin: 0 }}>Observaciones</label>
                          <button 
                            type="button" 
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                            onClick={() => {
                              setShowObservaciones(false);
                              setObservaciones('');
                            }}
                          >
                            ✕ Quitar
                          </button>
                        </div>
                        <textarea 
                          className="apisunat-textarea"
                          rows="2"
                          placeholder="Ingresa notas o indicaciones para el cliente..."
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Footer Submit Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                    <button 
                      type="submit" 
                      className="apisunat-submit-btn"
                      disabled={loading}
                    >
                      {loading ? 'Emitiendo y Firmando...' : `Emitir ${tipoDoc === '01' ? 'Factura' : 'Boleta'} a SUNAT`}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: LIST OF INVOICES */}
          {activeTab === 'invoices' && (
            <div className="animate-fade-in">
              <div className="flex-between page-header">
                <div>
                  <h1 className="page-title">Comprobantes Emitidos</h1>
                  <p className="page-subtitle">
                    Historial de Facturas, Boletas y Notas de Crédito para: <strong>{activeCompany?.razonSocial || 'Empresa Activa'}</strong>
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => setActiveTab('emision')}>
                  <IconPlus size={15} />
                  <span>Nuevo Comprobante</span>
                </button>
              </div>

              {/* Filter & Search Bar */}
              <div className="glass-card" style={{ marginBottom: '16px', padding: '14px 18px' }}>
                <div className="flex-gap" style={{ flexWrap: 'wrap' }}>
                  <div className="apisunat-input-icon-wrap" style={{ flex: 1, minWidth: '240px' }}>
                    <span className="apisunat-input-icon"><IconSearch size={16} /></span>
                    <input 
                      type="text" 
                      className="input-field apisunat-input" 
                      placeholder="Buscar por número, cliente o documento..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div style={{ width: '200px' }}>
                    <select 
                      className="select-field apisunat-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="ALL">Todos los Estados</option>
                      <option value="ACEPTADO">Aceptado por SUNAT</option>
                      <option value="RECHAZADO">Rechazado</option>
                      <option value="ANULADO">Anulado</option>
                      <option value="ERROR">Error de Envío</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Invoices Table */}
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container" style={{ border: 'none' }}>
                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th>Comprobante</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Estado SUNAT</th>
                        <th>Acciones / Descargas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.length > 0 ? (
                        filteredInvoices.map((inv) => (
                          <tr key={inv.id}>
                            <td>
                              <strong>
                                {inv.tipoDoc === '01' ? 'Factura' : inv.tipoDoc === '03' ? 'Boleta' : 'Nota Crédito'}{' '}
                                {inv.id}
                              </strong>
                            </td>
                            <td>{new Date(inv.fechaEmision).toLocaleDateString()}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{inv.clienteNombre}</div>
                              <small style={{ color: 'var(--text-muted)' }}>{inv.clienteDoc}</small>
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {inv.moneda === 'USD' ? '$ ' : 'S/. '}
                              {inv.montoTotal.toFixed(2)}
                            </td>
                            <td>
                              <span className={`status-pill ${inv.status.toLowerCase()}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {/* Formato A4 Oficial */}
                                <a 
                                  href={`${API_URL}/receipt/${inv.id}?format=a4`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="action-icon-btn"
                                  title="Ver e imprimir representación oficial en Formato A4"
                                  style={{ borderColor: 'rgba(37,99,235,0.4)', color: 'var(--primary)' }}
                                >
                                  <IconFileText size={13} />
                                  <span>A4</span>
                                </a>

                                {/* Formato Ticket 80mm */}
                                <a 
                                  href={`${API_URL}/receipt/${inv.id}?format=ticket`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="action-icon-btn"
                                  title="Ver representación para impresora térmica de Ticket (80mm)"
                                >
                                  <IconExternalLink size={13} />
                                  <span>Ticket</span>
                                </a>

                                {/* Descarga XML Firmado UBL 2.1 */}
                                <a 
                                  href={`${API_URL}/api/documents/${inv.id}/download/xml`}
                                  download
                                  className="action-icon-btn"
                                  title="Descargar XML firmado UBL 2.1"
                                >
                                  <IconCode size={13} />
                                  <span>XML</span>
                                </a>

                                {/* Descarga CDR Comprimido ZIP de SUNAT */}
                                {(inv.hasCdr || inv.status === 'ACEPTADO') && (
                                  <a 
                                    href={`${API_URL}/api/documents/${inv.id}/download/cdr`}
                                    download
                                    className="action-icon-btn"
                                    title="Descargar archivo CDR oficial (Zip de SUNAT)"
                                    style={{ borderColor: 'rgba(16,185,129,0.3)', color: 'var(--success)' }}
                                  >
                                    <IconArchive size={13} />
                                    <span>CDR (Zip)</span>
                                  </a>
                                )}

                                {/* Descarga CDR XML (Constancia Extraída) */}
                                {(inv.hasCdr || inv.status === 'ACEPTADO') && (
                                  <a 
                                    href={`${API_URL}/api/documents/${inv.id}/download/cdr-xml`}
                                    download
                                    className="action-icon-btn"
                                    title="Descargar Constancia de Recepción CDR (XML extraído)"
                                  >
                                    <IconDownload size={13} />
                                    <span>CDR (XML)</span>
                                  </a>
                                )}

                                {/* Anular Document */}
                                {inv.status === 'ACEPTADO' && inv.tipoDoc !== '07' && (
                                  <button 
                                    className="action-icon-btn danger"
                                    onClick={() => handleAnularDocument(inv.id)}
                                    title="Anular comprobante mediante Nota de Crédito"
                                  >
                                    <IconTrash size={13} />
                                    <span>Anular</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No se encontraron comprobantes emitidos.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MI EMPRESA / CONFIGURACIÓN (Component: CompanySettings) */}
          {activeTab === 'settings' && (
            <div className="animate-fade-in">
              <CompanySettings
                activeCompany={activeCompany}
                API_URL={API_URL}
                authToken={authToken}
                onCompanyUpdated={handleCompanyUpdated}
              />
            </div>
          )}

          {/* TAB 5: PANEL SUPER ADMIN (Component: SuperAdminPanel) */}
          {activeTab === 'superadmin' && currentUser?.role === 'SUPERADMIN' && (
            <div className="animate-fade-in">
              <SuperAdminPanel
                API_URL={API_URL}
                authToken={authToken}
                onBrandingUpdated={(newBrand) => setBranding(newBrand)}
              />
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

// Sub-component: Recent Invoices Table (used in dashboard)
function RecentInvoicesTable({ invoices }) {
  if (invoices.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
        No hay comprobantes recientes para mostrar.
      </div>
    );
  }

  return (
    <div className="table-container" style={{ border: 'none' }}>
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Comprobante</th>
            <th>Cliente</th>
            <th>Monto Total</th>
            <th>Estado SUNAT</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>
                <strong>
                  {inv.tipoDoc === '01' ? 'Factura' : 'Boleta'} {inv.id}
                </strong>
              </td>
              <td>
                <div style={{ fontWeight: 600 }}>{inv.clienteNombre}</div>
                <small style={{ color: 'var(--text-muted)' }}>{inv.clienteDoc}</small>
              </td>
              <td style={{ fontWeight: 700 }}>S/. {inv.montoTotal.toFixed(2)}</td>
              <td>
                <span className={`status-pill ${inv.status.toLowerCase()}`}>
                  {inv.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
