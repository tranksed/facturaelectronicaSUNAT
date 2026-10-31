import React, { useState } from 'react';
import { IconBuilding, IconShield, IconFileText, IconCheck, IconLock } from './Icons';

export default function LoginModal({ isOpen, onLoginSuccess, branding, API_URL }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [ruc, setRuc] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden. Por favor verifícalas.');
        return;
      }
    }

    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister 
      ? { email: email.trim(), password, name: name.trim(), ruc: ruc.trim() || undefined }
      : { email: email.trim(), password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data);
      } else {
        setError(data.error || 'Ocurrió un error. Intenta nuevamente.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isRegistrationAllowed = branding?.allowRegistration ?? true;

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card" style={{ maxWidth: isRegister ? '480px' : '440px' }}>
        {/* Branding Header */}
        <div className="login-brand-header">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="login-platform-logo" />
          ) : (
            <div className="login-logo-avatar" style={{ background: branding?.primaryColor || 'var(--primary)' }}>
              {(branding?.platformName || 'APISUNAT').substring(0, 2).toUpperCase()}
            </div>
          )}
          <h2 className="login-platform-title">{branding?.platformName || 'APISUNAT PRO'}</h2>
          <p className="login-platform-subtitle">
            {branding?.platformSubtitle || 'Plataforma SaaS Multitenant de Facturación Electrónica SUNAT'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="login-tab-switcher">
          <button 
            type="button"
            className={`login-tab-btn ${!isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(false); setError(null); }}
          >
            Iniciar Sesión
          </button>
          <button 
            type="button"
            className={`login-tab-btn ${isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(true); setError(null); }}
          >
            Crear Cuenta de Cliente
          </button>
        </div>

        {error && (
          <div className="login-error-alert animate-fade-in">
            ⚠️ {error}
          </div>
        )}

        {/* REGISTRATION CLOSED ALERT */}
        {isRegister && !isRegistrationAllowed ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '24px 18px', marginTop: '10px' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Registro Público Deshabilitado</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
              La creación autónoma de nuevas cuentas ha sido restringida por el administrador de la plataforma. Para solicitar una cuenta de cliente para tu empresa, por favor comunícate con soporte.
            </p>
            {branding?.supportEmail && (
              <div style={{ marginTop: '14px', fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                📧 {branding.supportEmail} {branding?.supportPhone ? `• 📞 ${branding.supportPhone}` : ''}
              </div>
            )}
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ marginTop: '16px' }}
              onClick={() => setIsRegister(false)}
            >
              Volver a Iniciar Sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {isRegister && (
              <>
                {/* Benefits Banner */}
                <div className="register-benefits-box">
                  <div className="register-benefit-item">
                    <span className="benefit-dot">🏢</span>
                    <div>
                      <strong>Multi-empresa RUC:</strong> Administra una o varias empresas bajo una sola cuenta.
                    </div>
                  </div>
                  <div className="register-benefit-item">
                    <span className="benefit-dot">🔒</span>
                    <div>
                      <strong>Certificado Digital CDT:</strong> Conexión oficial y directa con SUNAT UBL 2.1.
                    </div>
                  </div>
                  <div className="register-benefit-item">
                    <span className="benefit-dot">📄</span>
                    <div>
                      <strong>Formatos A4, Ticket & CDR:</strong> Facturas, Boletas y Notas de Crédito al instante.
                    </div>
                  </div>
                </div>

                <div className="form-group-field">
                  <label className="form-label">Nombre Completo o Empresa</label>
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="Ej. Juan Pérez o Inversiones SAC"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group-field">
                  <label className="form-label">RUC Inicial (Opcional - 11 dígitos)</label>
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="20600000000"
                    value={ruc}
                    onChange={(e) => setRuc(e.target.value.replace(/\D/g, '').substring(0, 11))}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Si ingresas tu RUC ahora, obtendremos tu Razón Social y dirección directamente de SUNAT.
                  </small>
                </div>
              </>
            )}

            <div className="form-group-field">
              <label className="form-label">Correo Electrónico</label>
              <input 
                type="email"
                className="input-field"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={!isRegister}
              />
            </div>

            <div className="form-group-field">
              <label className="form-label">Contraseña</label>
              <input 
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder={isRegister ? 'Mínimo 6 caracteres' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isRegister && (
              <div className="form-group-field">
                <label className="form-label">Confirmar Contraseña</label>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 12px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                Mostrar contraseña
              </label>

              {!isRegister && (
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Acceso Seguro SSL
                </span>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700 }}
              disabled={loading}
            >
              {loading ? '⏳ Procesando...' : (isRegister ? 'Crear Mi Cuenta de Cliente' : 'Ingresar al Sistema')}
            </button>
          </form>
        )}

        {/* Info card for new clients when in Login tab */}
        {!isRegister && (
          <div className="login-register-promo-card animate-fade-in">
            <div className="register-promo-header">
              <span className="promo-badge">¿Eres nuevo cliente?</span>
              <h3 className="promo-title">Comienza a Facturar con SUNAT</h3>
            </div>
            <p className="promo-desc">
              Crea tu cuenta de cliente para registrar tus empresas (RUC), cargar tu Certificado Digital Tributario (CDT) y emitir Facturas y Boletas electrónicas oficiales.
            </p>
            <button 
              type="button" 
              className="btn-promo-register"
              onClick={() => { setIsRegister(true); setError(null); }}
            >
              Crear Mi Cuenta de Cliente →
            </button>
          </div>
        )}

        {/* Switch back to Login when in Register tab */}
        {isRegister && isRegistrationAllowed && (
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            ¿Ya tienes una cuenta registrada?{' '}
            <button 
              type="button" 
              className="login-link-btn"
              onClick={() => { setIsRegister(false); setError(null); }}
            >
              Iniciar Sesión
            </button>
          </div>
        )}

        {branding?.supportEmail && (
          <div className="login-footer-support" style={{ marginTop: '18px' }}>
            Soporte técnico: {branding.supportEmail} {branding.supportPhone ? `• Tel: ${branding.supportPhone}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
