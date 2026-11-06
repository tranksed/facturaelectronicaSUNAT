import React, { useState, useEffect } from 'react';
import { 
  IconEye,
  IconEyeOff,
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
    <div className="auth-split-wrapper animate-fade-in">
      {/* =========================================================================
          PANEL IZQUIERDO: Marca, Propuesta de Valor e Ilustración del Servicio SUNAT
          ========================================================================= */}
      <div className="auth-split-left">
        {/* Encabezado de Marca */}
        <div className="auth-left-brand">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="auth-left-logo-img" />
          ) : (
            <div 
              className="auth-left-logo-avatar" 
              style={{ background: branding?.primaryColor || 'var(--primary, #2563eb)' }}
            >
              {(branding?.platformName || 'SUNAT').substring(0, 2).toUpperCase()}
            </div>
          )}
          <span className="auth-left-brand-text">
            {branding?.platformName || 'APISUNAT PRO'}
          </span>
          <span className="auth-left-badge">
            SUNAT UBL 2.1
          </span>
        </div>

        {/* Contenido Central: Hero Text + Ilustración Real del Servicio */}
        <div className="auth-left-content">
          <h1 className="auth-left-title">
            Gestión de tu facturación electrónica, sin perder el hilo.
          </h1>
          <p className="auth-left-desc">
            Comprobantes UBL 2.1, CDR automático de SUNAT, facturación recurrente y multiempresa en un solo lugar — construido para empresas peruanas y desarrolladores.
          </p>

          {/* Tarjeta Visual Ilustrativa del Servicio de Facturación Electrónica */}
          <div className="auth-invoice-card">
            <div className="auth-card-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="auth-sunat-pill">SUNAT UBL 2.1</span>
                <div>
                  <div className="auth-doc-name">FACTURA ELECTRÓNICA</div>
                  <div className="auth-doc-folio">F001 - 00014280</div>
                </div>
              </div>
              <div className="auth-status-accepted">
                <span className="auth-pulse-dot"></span>
                <span>CDR ACEPTADO</span>
              </div>
            </div>

            <div className="auth-meta-grid">
              <div className="auth-meta-col">
                <div className="auth-meta-lbl">EMISOR</div>
                <div className="auth-meta-val">20608974512 • SAAS PERÚ S.A.C.</div>
              </div>
              <div className="auth-meta-col">
                <div className="auth-meta-lbl">CLIENTE</div>
                <div className="auth-meta-val">20554123891 • CORPORACIÓN DIGITAL</div>
              </div>
            </div>

            <div className="auth-item-box">
              <span>1x Suscripción Mensual Facturación Cloud</span>
              <span style={{ fontWeight: 700, color: '#38bdf8' }}>S/ 127.12</span>
            </div>

            <div className="auth-totals-row">
              <div>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>Subtotal: S/ 127.12</span>
                <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '10px' }}>IGV (18%): S/ 22.88</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '11px', marginRight: '6px' }}>TOTAL:</span>
                <span className="auth-total-val">S/ 150.00 PEN</span>
              </div>
            </div>

            <div className="auth-card-bottom">
              <div className="auth-qr-code">
                <svg viewBox="0 0 32 32" width="34" height="34" fill="currentColor">
                  <rect x="0" y="0" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect x="3" y="3" width="4" height="4" rx="0.5" />
                  <rect x="22" y="0" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect x="25" y="3" width="4" height="4" rx="0.5" />
                  <rect x="0" y="22" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect x="3" y="25" width="4" height="4" rx="0.5" />
                  <rect x="13" y="2" width="5" height="5" rx="0.5" />
                  <rect x="13" y="13" width="6" height="6" rx="0.5" />
                  <rect x="22" y="13" width="5" height="5" rx="0.5" />
                  <rect x="13" y="22" width="5" height="5" rx="0.5" />
                  <rect x="21" y="22" width="8" height="3" rx="0.5" />
                  <rect x="26" y="27" width="5" height="4" rx="0.5" />
                </svg>
              </div>
              <div className="auth-hash-info">
                <div>Firma Digital XML: <code>4k9JzM8qWv2n0...=</code></div>
                <div>Validez fiscal inmediata ante SUNAT • Certificado CDT</div>
              </div>
            </div>
          </div>

          {/* Chips de Características del Servicio */}
          <div className="auth-chips-grid">
            <div className="auth-chip-item">
              <span style={{ color: '#eab308' }}>⚡</span>
              <span>CDR SUNAT Inmediato</span>
            </div>
            <div className="auth-chip-item">
              <span style={{ color: '#38bdf8' }}>🔐</span>
              <span>Certificado Digital CDT</span>
            </div>
            <div className="auth-chip-item">
              <span style={{ color: '#a855f7' }}>🏢</span>
              <span>Multiempresa & Multi-RUC</span>
            </div>
            <div className="auth-chip-item">
              <span style={{ color: '#10b981' }}>🔌</span>
              <span>API REST & WHMCS</span>
            </div>
          </div>
        </div>

        {/* Pie de Página Izquierdo */}
        <div className="auth-left-footer">
          <span>© {new Date().getFullYear()} {branding?.platformName || 'Facturación SaaS'}. Validez Fiscal Oficial SUNAT.</span>
          <span>🔒 Conexión Cifrada SSL 256-bit</span>
        </div>
      </div>

      {/* =========================================================================
          PANEL DERECHO: Formulario Esterilizado de Inicio de Sesión y Registro
          ========================================================================= */}
      <div className="auth-split-right">
        <div className={`auth-form-card ${isRegister ? 'register-mode' : ''} animate-fade-in`}>
          {/* Switcher Segmentado: Iniciar Sesión / Registro */}
          <div className="auth-segmented-switch">
            <button 
              type="button"
              className={`auth-segmented-btn ${!isRegister ? 'active' : ''}`}
              onClick={() => { setIsRegister(false); setError(null); }}
            >
              Iniciar Sesión
            </button>
            <button 
              type="button"
              className={`auth-segmented-btn ${isRegister ? 'active' : ''}`}
              onClick={() => { setIsRegister(true); setError(null); }}
            >
              Crear Cuenta
            </button>
          </div>

          {/* Títulos Principales */}
          <h2 className="auth-card-title">
            {isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}
          </h2>
          <p className="auth-card-subtitle">
            {isRegister 
              ? 'Comienza tus 30 días de prueba gratuita sin compromiso.' 
              : 'Accede al panel de control de tu empresa.'}
          </p>

          {/* Alerta de Error */}
          {error && (
            <div className="login-error-alert animate-fade-in" style={{ marginBottom: '18px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Registro Público Deshabilitado */}
          {isRegister && !isRegistrationAllowed ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '24px 18px', marginTop: '10px' }}>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Registro Público Deshabilitado</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                La creación autónoma de nuevas cuentas ha sido restringida por el administrador. Para solicitar una cuenta de cliente para tu empresa, por favor comunícate con soporte.
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
            <form onSubmit={handleSubmit}>
              {/* Campos específicos de Registro */}
              {isRegister && (
                <>
                  <div className="auth-field-group">
                    <label className="auth-field-label">Nombre Completo o Empresa</label>
                    <input 
                      type="text"
                      className="auth-input"
                      placeholder="Ej. Juan Pérez o Inversiones SAC"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-field-label">
                      <span>RUC Inicial</span>
                      <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px' }}>Opcional (11 dígitos)</small>
                    </label>
                    <input 
                      type="text"
                      className="auth-input"
                      placeholder="20600000000"
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value.replace(/\D/g, '').substring(0, 11))}
                    />
                  </div>
                </>
              )}

              {/* Correo Electrónico */}
              <div className="auth-field-group">
                <label className="auth-field-label">Email</label>
                <input 
                  type="email"
                  className="auth-input"
                  placeholder="ejemplo@empresa.pe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus={!isRegister}
                />
              </div>

              {/* Contraseña */}
              <div className="auth-field-group">
                <label className="auth-field-label">
                  <span>Contraseña</span>
                  {!isRegister && (
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                      Acceso seguro SSL
                    </span>
                  )}
                </label>
                <div className="auth-input-wrapper">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder={isRegister ? 'Mínimo 6 caracteres' : '••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="auth-toggle-pwd-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Contraseña (Registro) */}
              {isRegister && (
                <div className="auth-field-group">
                  <label className="auth-field-label">Confirmar Contraseña</label>
                  <div className="auth-input-wrapper">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Repite tu contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      className="auth-toggle-pwd-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Selector de Plan (Registro) */}
              {isRegister && (
                <div className="auth-field-group" style={{ marginTop: '12px', marginBottom: '14px' }}>
                  <label className="auth-field-label">
                    <span>Elige tu Plan de Facturación</span>
                    <span style={{ fontSize: '11px', color: 'var(--primary, #2563eb)', fontWeight: 600 }}>Prueba sin costo 30 días</span>
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
                            borderRadius: '9px',
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
                            <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{plan.name}</strong>
                            <input 
                              type="radio" 
                              name="selectedPlan" 
                              checked={isSelected} 
                              onChange={() => setSelectedPlanCode(plan.code)} 
                            />
                          </div>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--primary, #2563eb)', marginTop: '3px' }}>
                            {plan.price === 0 ? 'GRATIS' : `S/. ${plan.price}`}
                            <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-secondary)' }}>/mes</span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                            📄 {plan.docLimit === -1 ? 'Ilimitados' : `Hasta ${plan.docLimit} docs`} • 👥 {plan.userLimit} {plan.userLimit === 1 ? 'usr' : 'usrs'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botón Principal de Envío */}
              <button 
                type="submit" 
                className="auth-submit-btn"
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
                    <span>Crear Mi Cuenta</span>
                  </>
                ) : (
                  <>
                    <ArrowRightIcon width={16} height={16} />
                    <span>Iniciar sesión</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Enlace alternativo debajo del botón */}
          {!isRegister ? (
            <div className="auth-switch-link-row">
              ¿Aún no tienes cuenta?{' '}
              <button 
                type="button" 
                className="auth-switch-link-btn"
                onClick={() => { setIsRegister(true); setError(null); }}
              >
                Crear una cuenta gratis
              </button>
            </div>
          ) : isRegistrationAllowed ? (
            <div className="auth-switch-link-row">
              ¿Ya tienes una cuenta registrada?{' '}
              <button 
                type="button" 
                className="auth-switch-link-btn"
                onClick={() => { setIsRegister(false); setError(null); }}
              >
                Inicia sesión
              </button>
            </div>
          ) : null}

          {/* Contacto de Soporte */}
          {branding?.supportEmail && (
            <div style={{ marginTop: '22px', fontSize: '11.5px', color: 'var(--text-muted, #64748b)', textAlign: 'center' }}>
              Soporte técnico: {branding.supportEmail} {branding?.supportPhone ? `• 📞 ${branding.supportPhone}` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}