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
          PANEL IZQUIERDO: CloudPeru Hero con Ilustración Vectorial y Factura
          ========================================================================= */}
      <aside className="cp-hero">
        {/* Ilustración de fondo abstracta */}
        <div className="cp-art" aria-hidden="true">
          <svg viewBox="0 0 600 900" preserveAspectRatio="xMaxYMid slice">
            {/* Conexiones */}
            <path className="d" d="M470 330 C 560 400, 560 520, 470 590"/>
            <path className="d" d="M330 690 C 320 760, 260 800, 210 820"/>

            {/* Comprobante 1 */}
            <g transform="rotate(-8 300 210)">
              <rect className="s" x="170" y="60" width="260" height="320" rx="14"/>
              <line className="la" x1="200" y1="98" x2="290" y2="98"/>
              <line className="l" x1="200" y1="122" x2="340" y2="122"/>
              <line className="l" x1="200" y1="170" x2="400" y2="170"/>
              <line className="l" x1="200" y1="200" x2="370" y2="200"/>
              <line className="l" x1="200" y1="230" x2="390" y2="230"/>
              <line className="l" x1="200" y1="260" x2="340" y2="260"/>
              <line className="la" x1="320" y1="320" x2="400" y2="320"/>
              <rect className="q" x="200" y="300" width="10" height="10"/>
              <rect className="q" x="214" y="300" width="10" height="10"/>
              <rect className="q" x="228" y="314" width="10" height="10"/>
              <rect className="q" x="200" y="328" width="10" height="10"/>
              <rect className="q" x="228" y="328" width="10" height="10"/>
              <rect className="q" x="214" y="342" width="10" height="10"/>
            </g>

            {/* Comprobante 2 */}
            <g transform="rotate(5 360 560)">
              <rect className="s" x="230" y="420" width="260" height="300" rx="14"/>
              <line className="la" x1="260" y1="458" x2="350" y2="458"/>
              <line className="l" x1="260" y1="482" x2="400" y2="482"/>
              <line className="l" x1="260" y1="530" x2="460" y2="530"/>
              <line className="l" x1="260" y1="560" x2="430" y2="560"/>
              <line className="l" x1="260" y1="590" x2="450" y2="590"/>
              <line className="la" x1="380" y1="660" x2="460" y2="660"/>
            </g>

            {/* Nodo firma */}
            <circle className="n" cx="470" cy="330" r="26"/>
            <path className="ok" d="M470 318 l9 4 v7 c0 6-9 11-9 11 s-9-5-9-11 v-7z" style={{ stroke: 'rgba(167,139,250,.6)', strokeWidth: 1.8 }}/>

            {/* Nodo CDR */}
            <circle className="n" cx="200" cy="820" r="30" style={{ stroke: 'rgba(52,211,153,.55)' }}/>
            <path className="ok" d="M188 820 l8 8 l16 -16"/>
            <text className="t" x="245" y="825" style={{ fill: 'rgba(52,211,153,.6)' }}>CDR</text>
          </svg>
        </div>

        {/* Brand Header */}
        <div className="cp-brand">
          {branding?.logoUrl ? (
            <div className="cp-logo" style={{ background: 'transparent' }}>
              <img src={branding.logoUrl} alt="Logo" />
            </div>
          ) : (
            <div 
              className="cp-logo"
              style={{ background: branding?.primaryColor ? `linear-gradient(135deg, ${branding.primaryColor}, #6366f1)` : undefined }}
            >
              {(branding?.platformName || 'CLOUDPERU').substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="cp-name">
            {branding?.platformName || 'CLOUDPERU'} <span>{branding?.platformSubtitle || 'API SUNAT'}</span>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="cp-main">
          <div>
            <div className="cp-eyebrow">FACTURACIÓN ELECTRÓNICA · UBL 2.1</div>
            <h1 className="cp-h1">
              Gestión de tu facturación, <em>sin perder el hilo.</em>
            </h1>
            <p className="cp-sub">
              Clientes, comprobantes y cobranza en un solo lugar, hecho para empresas peruanas.
            </p>
          </div>

          {/* Tarjeta Factura */}
          <div className="cp-card">
            <div className="cp-card-h">
              <div className="cp-doc">
                <small>FACTURA ELECTRÓNICA</small>
                <code>F001-00014280</code>
              </div>
              <div className="cp-ok">
                <i></i>CDR aceptado
              </div>
            </div>
            <div className="cp-rows">
              <div className="cp-row">
                <span>Cliente</span>
                <span>Corporación Digital S.A.C.</span>
              </div>
              <div className="cp-row">
                <span>Suscripción Facturación Cloud</span>
                <span>S/ 127.12</span>
              </div>
              <div className="cp-row">
                <span>IGV (18%)</span>
                <span>S/ 22.88</span>
              </div>
            </div>
            <div className="cp-tot">
              <small>Total</small>
              <b>S/ 150.00</b>
            </div>
          </div>

          {/* Features */}
          <ul className="cp-feats">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              CDR SUNAT inmediato
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              Certificado digital CDT
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              Multiempresa y multi-RUC
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              API REST y WHMCS
            </li>
          </ul>
        </div>

        {/* Pie de Página */}
        <div className="cp-foot">
          <span>© {new Date().getFullYear()} {branding?.platformName || 'CLOUDPERU'} {branding?.platformSubtitle || 'API SUNAT'}</span>
          <span>Conexión cifrada SSL</span>
        </div>
      </aside>

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
              : 'Accede al panel de tu empresa.'}
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
                    <a 
                      href="#recuperar" 
                      className="auth-forgot-link"
                      onClick={(e) => {
                        e.preventDefault();
                        setError('Para restablecer tu contraseña, por favor contacta al administrador de tu empresa o a soporte técnico.');
                      }}
                    >
                      ¿Olvidaste tu contraseña?
                    </a>
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