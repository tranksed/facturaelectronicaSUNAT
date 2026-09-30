import React, { useState, useEffect } from 'react';
import {
  IconBuilding,
  IconCreditCard,
  IconShield,
  IconSettings,
  IconRefresh,
  IconTrash,
  IconPlus,
  IconZap,
  IconDownload,
  IconCheck
} from './Icons';

export default function CompanySettings({ activeCompany, API_URL, authToken, onCompanyUpdated }) {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [message, setMessage] = useState(null); // { text, type }

  // Empresa profile state
  const [companyId, setCompanyId] = useState('');
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [contacto, setContacto] = useState('');
  const [piePagina, setPiePagina] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [mostrarLogoTicket, setMostrarLogoTicket] = useState(true);

  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({
    bank: 'BCP',
    account: '',
    cci: '',
    currency: 'PEN'
  });

  // SUNAT credentials & cert
  const [usuarioSol, setUsuarioSol] = useState('');
  const [claveSol, setClaveSol] = useState('');
  const [pfxCertBase64, setPfxCertBase64] = useState('');
  const [pfxFileName, setPfxFileName] = useState('');
  const [pfxPassword, setPfxPassword] = useState('');
  const [hasCert, setHasCert] = useState(false);
  const [isProduction, setIsProduction] = useState(false);
  const [telegramToken, setTelegramToken] = useState('');

  // Preferencias para el Aplicativo (Matching reference screenshot)
  const [preferences, setPreferences] = useState({
    mostrarValor: 'PRECIO_UNITARIO', // PRECIO_UNITARIO | VALOR_UNITARIO
    formatoImpresion: 'TICKET',      // TICKET | A4 | A5
    entradaItems: 'RAPIDA',          // RAPIDA | CATALOGO
    monedaDefault: 'PEN',            // PEN | USD
    // Extra toggles
    horaEmision: true,
    observaciones: true,
    descuentosGlobales: false,
    guiasRemision: false,
    ordenCompra: false,
    envioTelegram: true
  });

  // Populate data when activeCompany changes
  useEffect(() => {
    if (activeCompany?.id) {
      loadCompanyDetails(activeCompany.id);
    }
  }, [activeCompany?.id]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 8000);
  };

  const loadCompanyDetails = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/companies/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCompanyId(data.id);
        setRuc(data.ruc || '');
        setRazonSocial(data.razonSocial || '');
        setNombreComercial(data.nombreComercial || '');
        setDireccion(data.direccion || '');
        setContacto(data.contacto || '');
        setPiePagina(data.piePagina || '');
        setLogoBase64(data.logoBase64 || '');
        setMostrarLogoTicket(data.mostrarLogoTicket !== false);
        setBankAccounts(Array.isArray(data.bankAccounts) ? data.bankAccounts : []);
        setUsuarioSol(data.usuarioSol || '');
        setHasCert(!!data.hasCert);
        setIsProduction(!!data.isProduction);
        setTelegramToken(data.telegramToken || '');

        if (data.preferences && typeof data.preferences === 'object') {
          setPreferences(prev => ({
            ...prev,
            ...data.preferences
          }));
        }
      }
    } catch (e) {
      showMsg('Error al cargar datos de la empresa: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoBase64(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // PFX Certificate upload
  const handleCertUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPfxFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result.split(',')[1];
      setPfxCertBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  // Lookup RUC in SUNAT
  const handleLookupRuc = async () => {
    const cleanRuc = ruc.trim();
    if (cleanRuc.length !== 11) {
      showMsg('Ingresa un RUC de 11 dígitos válido para consultar.', 'error');
      return;
    }
    setLookupLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/consultar/6/${cleanRuc}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setRazonSocial(data.nombre || razonSocial);
        setNombreComercial(data.nombre || nombreComercial);
        setDireccion(data.direccion || direccion);
        showMsg(`Datos oficiales de SUNAT actualizados: ${data.nombre}`, 'success');
      } else {
        showMsg(data.error || 'No se obtuvieron datos para este RUC.', 'error');
      }
    } catch (e) {
      showMsg('Error de red al consultar RUC: ' + e.message, 'error');
    } finally {
      setLookupLoading(false);
    }
  };

  // Bank accounts management
  const handleAddBankAccount = () => {
    if (!newAccount.account.trim()) {
      showMsg('Por favor ingresa el número de cuenta.', 'error');
      return;
    }
    setBankAccounts(prev => [...prev, { ...newAccount, id: Date.now() }]);
    setNewAccount({
      bank: 'BCP',
      account: '',
      cci: '',
      currency: 'PEN'
    });
  };

  const handleRemoveBankAccount = (index) => {
    setBankAccounts(prev => prev.filter((_, idx) => idx !== index));
  };

  // Toggle preference
  const handlePrefToggle = (field) => {
    setPreferences(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Save company configuration
  const handleSaveCompany = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        razonSocial,
        nombreComercial,
        direccion,
        contacto,
        piePagina,
        logoBase64,
        mostrarLogoTicket,
        bankAccounts,
        preferences,
        usuarioSol,
        claveSol: claveSol || undefined,
        pfxCertBase64: pfxCertBase64 || undefined,
        pfxPassword: pfxPassword || undefined,
        isProduction,
        telegramToken
      };

      const res = await fetch(`${API_URL}/api/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showMsg('Configuración de la empresa guardada exitosamente.', 'success');
        setClaveSol('');
        setPfxPassword('');
        setPfxCertBase64('');
        setPfxFileName('');
        if (onCompanyUpdated) {
          onCompanyUpdated(companyId);
        }
        loadCompanyDetails(companyId);
      } else {
        showMsg(data.error || 'Error al guardar la empresa.', 'error');
      }
    } catch (err) {
      showMsg('Error de red: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Live SUNAT Connection Test for this company
  const handleTestSunat = async () => {
    setTestLoading(true);
    try {
      const payload = {
        usuarioSol,
        claveSol: claveSol || undefined,
        pfxCertBase64: pfxCertBase64 || undefined,
        pfxPassword: pfxPassword || undefined,
        isProduction
      };

      const res = await fetch(`${API_URL}/api/companies/${companyId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showMsg(data.message, 'success');
      } else {
        showMsg('Falló la prueba SUNAT: ' + (data.error || 'Verifica credenciales SOL o Certificado'), 'error');
      }
    } catch (err) {
      showMsg('Error de red en prueba SUNAT: ' + err.message, 'error');
    } finally {
      setTestLoading(false);
    }
  };

  if (!activeCompany) {
    return (
      <div className="glass-card" style={{ padding: '30px', textAlign: 'center' }}>
        <h3>No hay empresa seleccionada</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Por favor selecciona o registra una empresa para configurarla.</p>
      </div>
    );
  }

  return (
    <div className="company-settings-container animate-fade-in">
      {/* Alert Message Banner */}
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

      {/* Main Header */}
      <div className="settings-page-header">
        <div>
          <h1 className="page-title">Configuración de la Empresa</h1>
          <p className="page-subtitle">
            Administra los datos fiscales, logotipo, cuentas bancarias y certificado digital para <strong>{razonSocial || ruc}</strong>
          </p>
        </div>
        <div>
          <span className={`status-pill ${isProduction ? 'prod' : 'beta'}`}>
            {isProduction ? 'Producción Real' : 'Beta / Pruebas'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSaveCompany}>
        {/* CARD 1: DATOS DE LA EMPRESA & CREDENCIALES */}
        <div className="glass-card">
          <h2 className="card-title">
            <IconBuilding size={18} />
            <span>Información Fiscal y Logotipo</span>
          </h2>

          {/* Logo Section */}
          <div className="logo-upload-section">
            <div className="logo-preview-box">
              {logoBase64 ? (
                <img src={logoBase64} alt="Logo Empresa" className="company-logo-preview" />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                  <IconBuilding size={24} />
                  <div>Sin Logo</div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  <IconDownload size={14} />
                  <span>Subir Logotipo</span>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={handleLogoUpload} 
                    style={{ display: 'none' }} 
                  />
                </label>
                {logoBase64 && (
                  <button 
                    type="button" 
                    className="btn btn-danger-outline btn-sm"
                    onClick={() => setLogoBase64('')}
                  >
                    Eliminar Logo
                  </button>
                )}
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={mostrarLogoTicket} 
                    onChange={(e) => setMostrarLogoTicket(e.target.checked)} 
                  />
                  <span>Mostrar en el formato Ticket (80mm)</span>
                </label>
              </div>
              <p className="field-hint">Recomendado: Imagen PNG transparente o JPG de alta resolución (300x120 px aprox).</p>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="settings-fields-grid">
            <div className="settings-field">
              <label className="apisunat-label">RUC (11 dígitos)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  className="apisunat-input" 
                  value={ruc} 
                  readOnly 
                  title="El RUC no puede modificarse una vez registrado." 
                />
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleLookupRuc}
                  disabled={lookupLoading}
                  title="Sincronizar con SUNAT"
                >
                  <IconRefresh size={14} />
                  <span>{lookupLoading ? '...' : 'Sincronizar'}</span>
                </button>
              </div>
            </div>

            <div className="settings-field">
              <label className="apisunat-label">Razón Social *</label>
              <input 
                type="text" 
                className="apisunat-input" 
                value={razonSocial} 
                onChange={(e) => setRazonSocial(e.target.value)} 
                required 
              />
            </div>

            <div className="settings-field">
              <label className="apisunat-label">Nombre Comercial</label>
              <input 
                type="text" 
                className="apisunat-input" 
                value={nombreComercial} 
                onChange={(e) => setNombreComercial(e.target.value)} 
                placeholder="Nombre para clientes" 
              />
            </div>

            <div className="settings-field">
              <label className="apisunat-label">Contacto (Teléfono / WhatsApp / Correo)</label>
              <input 
                type="text" 
                className="apisunat-input" 
                value={contacto} 
                onChange={(e) => setContacto(e.target.value)} 
                placeholder="WhatsApp: 999 888 777 / ventas@miempresa.com" 
              />
            </div>

            <div className="settings-field full-width">
              <label className="apisunat-label">Dirección Fiscal *</label>
              <input 
                type="text" 
                className="apisunat-input" 
                value={direccion} 
                onChange={(e) => setDireccion(e.target.value)} 
                required 
              />
            </div>

            <div className="settings-field full-width">
              <label className="apisunat-label">Pie de Página en Comprobantes (A4 y Ticket)</label>
              <textarea 
                className="apisunat-textarea" 
                rows="2" 
                value={piePagina} 
                onChange={(e) => setPiePagina(e.target.value)} 
                placeholder="Gracias por su compra. Los cambios se aceptan dentro de las 48 horas con comprobante original."
              />
            </div>
          </div>

          {/* CUENTAS BANCARIAS SECTION */}
          <div style={{ paddingTop: '18px', borderTop: '1px solid var(--border-color)', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconCreditCard size={18} />
              <span>Cuentas Bancarias</span>
            </h3>
            <p className="field-hint" style={{ marginBottom: '14px' }}>
              Se mostrarán en la parte inferior de los comprobantes impresos (A4 y Ticket) para que tus clientes efectúen transferencias.
            </p>

            {bankAccounts.length > 0 ? (
              <div className="table-responsive" style={{ marginBottom: '14px' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Banco</th>
                      <th>Moneda</th>
                      <th>N° de Cuenta</th>
                      <th>CCI (Interbancario)</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankAccounts.map((acc, idx) => (
                      <tr key={acc.id || idx}>
                        <td><strong>{acc.bank}</strong></td>
                        <td>
                          <span className={`currency-tag ${acc.currency === 'USD' ? 'usd' : 'pen'}`}>
                            {acc.currency}
                          </span>
                        </td>
                        <td><code>{acc.account}</code></td>
                        <td><code>{acc.cci || '-'}</code></td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button" 
                            style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '4px' }}
                            onClick={() => handleRemoveBankAccount(idx)}
                            title="Eliminar Cuenta"
                          >
                            <IconTrash size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '16px', background: 'var(--bg-card-subtle)', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                No hay cuentas bancarias registradas aún. Añade una abajo.
              </div>
            )}

            {/* Add Bank Account Row */}
            <div className="add-bank-row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="apisunat-label">Banco</label>
                <select 
                  className="apisunat-select"
                  value={newAccount.bank}
                  onChange={(e) => setNewAccount({ ...newAccount, bank: e.target.value })}
                >
                  <option value="BCP">BCP (Banco de Crédito)</option>
                  <option value="BBVA">BBVA Continental</option>
                  <option value="Interbank">Interbank</option>
                  <option value="Scotiabank">Scotiabank</option>
                  <option value="Banco de la Nación">Banco de la Nación</option>
                  <option value="BanBif">BanBif</option>
                  <option value="Banco Pichincha">Banco Pichincha</option>
                  <option value="Yape / Plin">Yape / Plin</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="apisunat-label">Moneda</label>
                <select 
                  className="apisunat-select"
                  value={newAccount.currency}
                  onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}
                >
                  <option value="PEN">Soles (PEN)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>

              <div className="flex-2" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="apisunat-label">N° de Cuenta</label>
                <input 
                  type="text" 
                  className="apisunat-input"
                  placeholder="Ej: 191-23456789-0-12"
                  value={newAccount.account}
                  onChange={(e) => setNewAccount({ ...newAccount, account: e.target.value })}
                />
              </div>

              <div className="flex-2" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="apisunat-label">CCI (Opcional)</label>
                <input 
                  type="text" 
                  className="apisunat-input"
                  placeholder="Ej: 00219100234567890123"
                  value={newAccount.cci}
                  onChange={(e) => setNewAccount({ ...newAccount, cci: e.target.value })}
                />
              </div>

              <div>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleAddBankAccount}
                  style={{ height: '38px' }}
                >
                  <IconPlus size={14} />
                  <span>Agregar</span>
                </button>
              </div>
            </div>
          </div>

          {/* SUNAT CREDENTIALS & CERTIFICATE */}
          <div style={{ paddingTop: '18px', borderTop: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconShield size={18} />
              <span>Credenciales SUNAT y Certificado Digital</span>
            </h3>
            <p className="field-hint" style={{ marginBottom: '14px' }}>
              Firma digital UBL 2.1 directa y conexión al Web Service de SUNAT sin intermediarios.
            </p>

            <div className="settings-fields-grid">
              <div className="settings-field">
                <label className="apisunat-label">Usuario Secundario SOL</label>
                <input 
                  type="text" 
                  className="apisunat-input" 
                  value={usuarioSol} 
                  onChange={(e) => setUsuarioSol(e.target.value)} 
                  placeholder="Ej: MODDATOS" 
                />
              </div>

              <div className="settings-field">
                <label className="apisunat-label">Clave SOL</label>
                <input 
                  type="password" 
                  className="apisunat-input" 
                  value={claveSol} 
                  onChange={(e) => setClaveSol(e.target.value)} 
                  placeholder="•••••••• (dejar vacío si no cambia)" 
                />
              </div>

              <div className="settings-field">
                <label className="apisunat-label">Certificado Digital (.pfx / .p12)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="file" 
                    accept=".pfx,.p12" 
                    id="company-cert-file"
                    onChange={handleCertUpload} 
                    style={{ display: 'none' }} 
                  />
                  <label htmlFor="company-cert-file" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    <IconDownload size={14} />
                    <span>{pfxFileName || (hasCert ? 'Cambiar Certificado' : 'Seleccionar .pfx')}</span>
                  </label>
                  {hasCert && <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>✓ Certificado cargado</span>}
                </div>
              </div>

              <div className="settings-field">
                <label className="apisunat-label">Contraseña del Certificado</label>
                <input 
                  type="password" 
                  className="apisunat-input" 
                  value={pfxPassword} 
                  onChange={(e) => setPfxPassword(e.target.value)} 
                  placeholder="Contraseña del .pfx" 
                />
              </div>

              <div className="settings-field">
                <label className="apisunat-label">Entorno de Facturación</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', height: '38px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="isProduction" 
                      checked={!isProduction} 
                      onChange={() => setIsProduction(false)} 
                    />
                    <span>Beta / Pruebas</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="isProduction" 
                      checked={isProduction} 
                      onChange={() => setIsProduction(true)} 
                    />
                    <span>Producción Real</span>
                  </label>
                </div>
              </div>

              <div className="settings-field">
                <label className="apisunat-label">Token de Bot de Telegram (Opcional)</label>
                <input 
                  type="text" 
                  className="apisunat-input" 
                  value={telegramToken} 
                  onChange={(e) => setTelegramToken(e.target.value)} 
                  placeholder="Ej: 1234567890:ABCdefGHIjklMNO..." 
                />
              </div>
            </div>

            {/* Test Connection Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '16px', padding: '14px', background: 'var(--cyan-subtle)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: '8px' }}>
              <button 
                type="button" 
                className="btn btn-outline-cyan"
                onClick={handleTestSunat}
                disabled={testLoading}
              >
                <IconZap size={15} />
                <span>{testLoading ? 'Probando conexión...' : 'Probar Conexión SUNAT'}</span>
              </button>
              <span className="field-hint">
                Verifica que el certificado desencripte y que el usuario SOL tenga acceso a los Web Services de SUNAT.
              </span>
            </div>
          </div>

          {/* Save Company Button */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              <IconCheck size={16} />
              <span>{loading ? 'Guardando...' : 'Guardar Datos de Empresa'}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: PREFERENCIAS PARA EL APLICATIVO */}
        <div className="glass-card" style={{ marginTop: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 className="card-title">
              <IconSettings size={18} />
              <span>Preferencias para el Aplicativo</span>
            </h2>
            <p className="page-subtitle">
              Ajusta las configuraciones predeterminadas para optimizar la emisión de tus comprobantes.
            </p>
          </div>

          {/* Section: Predeterminados */}
          <div className="preferences-subcard">
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Predeterminados</h3>

            <div className="preferences-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="apisunat-label">Mostrar Valor</label>
                <select 
                  className="apisunat-select full-width"
                  value={preferences.mostrarValor}
                  onChange={(e) => setPreferences({ ...preferences, mostrarValor: e.target.value })}
                >
                  <option value="PRECIO_UNITARIO">Precio Unitario (Inc. IGV)</option>
                  <option value="VALOR_UNITARIO">Valor Unitario (Sin IGV)</option>
                </select>
                <span className="field-hint">Cómo se ingresan los precios en emisión.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="apisunat-label">Formato de Impresión</label>
                <select 
                  className="apisunat-select full-width"
                  value={preferences.formatoImpresion}
                  onChange={(e) => setPreferences({ ...preferences, formatoImpresion: e.target.value })}
                >
                  <option value="TICKET">Ticket (80mm) Térmico</option>
                  <option value="A4">A4 Estándar</option>
                  <option value="A5">A5 Media Página</option>
                </select>
                <span className="field-hint">Formato PDF predeterminado.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="apisunat-label">Entrada de Ítems</label>
                <select 
                  className="apisunat-select full-width"
                  value={preferences.entradaItems}
                  onChange={(e) => setPreferences({ ...preferences, entradaItems: e.target.value })}
                >
                  <option value="RAPIDA">Edición Rápida</option>
                  <option value="CATALOGO">Catálogo Completo</option>
                </select>
                <span className="field-hint">Modalidad de captura de productos.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="apisunat-label">Moneda Predeterminada</label>
                <select 
                  className="apisunat-select full-width"
                  value={preferences.monedaDefault}
                  onChange={(e) => setPreferences({ ...preferences, monedaDefault: e.target.value })}
                >
                  <option value="PEN">PEN - Soles Peruanos (S/.)</option>
                  <option value="USD">USD - Dólares Americanos ($)</option>
                </select>
                <span className="field-hint">Moneda inicial al emitir.</span>
              </div>
            </div>
          </div>

          {/* Section: Opciones Extra */}
          <div className="preferences-subcard" style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Opciones Extra</h3>

            <div className="toggles-list">
              {/* Toggle 1: Hora de emisión */}
              <div className="toggle-row">
                <div>
                  <div className="toggle-title">Hora de emisión</div>
                  <div className="toggle-desc">Mostrar u ocultar la hora exacta en el comprobante impreso.</div>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={preferences.horaEmision} 
                    onChange={() => handlePrefToggle('horaEmision')} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* Toggle 2: Observaciones o Notas */}
              <div className="toggle-row">
                <div>
                  <div className="toggle-title">Observaciones o Notas</div>
                  <div className="toggle-desc">Habilitar campo de observaciones personalizadas al emitir comprobantes.</div>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={preferences.observaciones} 
                    onChange={() => handlePrefToggle('observaciones')} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* Toggle 3: Descuentos Globales */}
              <div className="toggle-row">
                <div>
                  <div className="toggle-title">Descuentos Globales</div>
                  <div className="toggle-desc">Permitir aplicar descuentos porcentuales o montos fijos al total de la venta.</div>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={preferences.descuentosGlobales} 
                    onChange={() => handlePrefToggle('descuentosGlobales')} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* Toggle 4: Guías de Remisión relacionadas */}
              <div className="toggle-row">
                <div>
                  <div className="toggle-title">Guías de Remisión relacionadas</div>
                  <div className="toggle-desc">Habilitar sección para vincular números de guía de remisión remitente o transportista.</div>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={preferences.guiasRemision} 
                    onChange={() => handlePrefToggle('guiasRemision')} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* Toggle 5: Orden de Compra */}
              <div className="toggle-row">
                <div>
                  <div className="toggle-title">Orden de Compra</div>
                  <div className="toggle-desc">Permitir ingresar el N° de orden de compra o pedido solicitado por tu cliente corporativo.</div>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={preferences.ordenCompra} 
                    onChange={() => handlePrefToggle('ordenCompra')} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* Toggle 6: Envio Telegram */}
              <div className="toggle-row">
                <div>
                  <div className="toggle-title">Envío Automático por Telegram</div>
                  <div className="toggle-desc">Notificar y enviar copia del comprobante en PDF automáticamente al canal de Telegram.</div>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={preferences.envioTelegram} 
                    onChange={() => handlePrefToggle('envioTelegram')} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Save Preferences Button */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              <IconCheck size={16} />
              <span>{loading ? 'Guardando...' : 'Guardar Todas las Configuraciones'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
