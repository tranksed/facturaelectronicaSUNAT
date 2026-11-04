import React, { useState, useEffect } from 'react';
import { 
  IconBuilding, 
  IconShield, 
  IconFileText, 
  IconCheck, 
  IconLock,
  IconSpark,
  IconUsers,
  ArrowRightIcon,
  PlusIcon,
  LoaderCircleIcon
} from './Icons';

export default function LoginModal({ isOpen, onLoginSuccess, branding, API_URL }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [ruc, setRuc] = useState('');
  const [selectedPlanCode, setSelectedPlanCode] = useState('FREE');
  const [plans, setPlans] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetch(`${API_URL}/api/plans`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setPlans(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, API_URL]);

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
      ? { 
          email: email.trim(), 
          password, 
          name: name.trim(), 
          ruc: ruc.trim() || undefined,
          planCode: selectedPlanCode
        }
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

  // Fallback default plans if API hasn't loaded yet
  const displayedPlans = plans.length > 0 ? plans : [
    { code: 'FREE', name: 'Plan Gratuito', price: 0, docLimit: 30, userLimit: 1, durationDays: 30 },
    { code: 'STARTER', name: 'Plan Starter', price: 29, docLimit: 100, userLimit: 2, durationDays: 30 },
    { code: 'EMPRENDEDOR', name: 'Plan Emprendedor', price: 59, docLimit: 300, userLimit: 3, durationDays: 30, isPopular: true },
    { code: 'CORPORATIVO', name: 'Plan Corporativo', price: 149, docLimit: -1, userLimit: 8, durationDays: 30 }
  ];

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card" style={{ maxWidth: isRegister ? '540px' : '440px' }}>
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

            {isRegister && (
              <div className="form-group-field" style={{ marginTop: '12px', marginBottom: '14px' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Elige tu Plan de Facturación</span>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>Prueba sin costo 30 días</span>
                </label>
                <div className="register-plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {displayedPlans.map(plan => {
                    const isSelected = selectedPlanCode === plan.code;
                    return (
                      <div 
                        key={plan.code}
                        onClick={() => setSelectedPlanCode(plan.code)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid var(--primary, #2563eb)' : '1px solid var(--border-color, #e2e8f0)',
                          background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card, #ffffff)',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {plan.isPopular && (
                          <span style={{
                            position: 'absolute',
                            top: '-7px',
                            right: '8px',
                            background: '#f59e0b',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            textTransform: 'uppercase'
                          }}>
                            Popular
                          </span>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>{plan.name}</strong>
                          <input 
                            type="radio" 
                            name="selectedPlan" 
                            checked={isSelected} 
                            onChange={() => setSelectedPlanCode(plan.code)} 
                          />
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary, #2563eb)', marginTop: '4px' }}>
                          {plan.price === 0 ? 'GRATIS' : `S/. ${plan.price}`}
                          <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-secondary)' }}>/mes</span>
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                          📄 {plan.docLimit === -1 ? 'Comprobantes Ilimitados' : `Hasta ${plan.docLimit} docs/mes`}
                          <br />
                          👥 {plan.userLimit} {plan.userLimit === 1 ? 'usuario' : 'usuarios'}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
              style={{ width: '100%', height: '42px', fontSize: '14px', fontWeight: 700 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircleIcon className="animate-spin" width={16} height={16} />
                  <span>Procesando...</span>
                </>
              ) : isRegister ? (
                <>
                  <PlusIcon width={16} height={16} />
                  <span>Crear Mi Cuenta de Cliente</span>
                </>
              ) : (
                <>
                  <ArrowRightIcon width={16} height={16} />
                  <span>Ingresar al Sistema</span>
                </>
              )}
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
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span>Crear Mi Cuenta de Cliente</span>
              <ArrowRightIcon width={14} height={14} />
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
