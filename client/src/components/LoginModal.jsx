import React, { useState } from 'react';

export default function LoginModal({ isOpen, onLoginSuccess, branding, API_URL }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [ruc, setRuc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister 
      ? { email, password, name, ruc: ruc.trim() || undefined }
      : { email, password };

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

  // Quick Demo Logins
  const handleQuickLogin = (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
    setIsRegister(false);
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card">
        {/* Branding Header */}
        <div className="login-brand-header">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="login-platform-logo" />
          ) : (
            <div className="login-logo-avatar">
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
            Crear Cuenta
          </button>
        </div>

        {error && (
          <div className="login-error-alert">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <>
              <div className="form-group-field">
                <label className="form-label">Nombre Completo o Empresa</label>
                <input 
                  type="text"
                  className="input-field"
                  placeholder="Ej. Juan Pérez o Inversiones SAC"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
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
                <small style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Si ingresas tu RUC ahora, obtendremos tu Razón Social directamente de SUNAT.
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
            />
          </div>

          <div className="form-group-field">
            <label className="form-label">Contraseña</label>
            <input 
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '10px', padding: '12px' }}
            disabled={loading}
          >
            {loading ? '⏳ Procesando...' : (isRegister ? 'Registrar Cuenta' : 'Entrar al Sistema')}
          </button>
        </form>

        {/* Demo Quick Logins */}
        <div className="login-demo-section">
          <div className="login-demo-title">Acceso Rápido de Prueba:</div>
          <div className="login-demo-btns">
            <button 
              type="button" 
              className="btn btn-secondary login-demo-btn"
              onClick={() => handleQuickLogin('cliente@codegames.com', 'Cliente123*')}
            >
              🏢 Cuenta Cliente (CodeGames)
            </button>
            <button 
              type="button" 
              className="btn btn-secondary login-demo-btn"
              onClick={() => handleQuickLogin('admin@facturador.com', 'Admin12345*')}
            >
              🛡️ Super Administrador
            </button>
          </div>
        </div>

        {branding?.supportEmail && (
          <div className="login-footer-support">
            Soporte: {branding.supportEmail} {branding.supportPhone ? `• ${branding.supportPhone}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
