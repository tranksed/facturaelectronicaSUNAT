import React, { useState, useEffect } from 'react';
import { IconTelegram, IconCheck, IconZap, IconExternalLink, IconAlertTriangle, IconLock, LoaderCircleIcon } from './Icons';

export default function TelegramBotModal({
  isOpen,
  onClose,
  activeCompany,
  API_URL,
  authToken,
  subscriptionInfo,
  onOpenUpgradePlan,
  onSuccess
}) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (activeCompany) {
      setToken(activeCompany.telegramToken || '');
    }
    setStatusMsg(null);
    setErrorMsg(null);
  }, [activeCompany, isOpen]);

  if (!isOpen) return null;

  const isModuleLocked = subscriptionInfo?.plan && subscriptionInfo.plan.hasTelegramBot === false;

  const handleConnect = async (e) => {
    if (e) e.preventDefault();
    if (!token.trim()) {
      setErrorMsg('Ingresa un token de Bot válido antes de conectar.');
      return;
    }
    if (!activeCompany?.id) {
      setErrorMsg('No hay una empresa activa seleccionada.');
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/companies/${activeCompany.id}/telegram-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ token: token.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg(data.message || 'Bot conectado exitosamente.');
        if (onSuccess) onSuccess(data.bot);
      } else {
        setErrorMsg(data.error || 'No se pudo conectar el bot.');
      }
    } catch (err) {
      setErrorMsg('Error de red al conectar con el servidor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('¿Estás seguro de desvincular el Bot de Telegram de esta empresa?')) return;
    if (!activeCompany?.id) return;

    setDisconnecting(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/companies/${activeCompany.id}/telegram-token`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToken('');
        setStatusMsg('Bot desvinculado exitosamente.');
        if (onSuccess) onSuccess(null);
      } else {
        setErrorMsg(data.error || 'No se pudo desvincular el bot.');
      }
    } catch (err) {
      setErrorMsg('Error de conexión: ' + err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card" style={{ maxWidth: '640px', width: '92%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="metric-icon-box primary" style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(44, 165, 224, 0.15)', color: '#2CA5E0' }}>
              <IconTelegram size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Configuración de Bot de Telegram
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Emisión de Facturas y Boletas SUNAT oficiales desde cualquier chat móvil
              </span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Company Context Pill */}
        <div style={{
          background: 'var(--bg-subtle, #f8fafc)',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          fontSize: '12.5px'
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Empresa vinculada:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{activeCompany?.razonSocial || 'Mi Empresa'}</strong>
            <code style={{ marginLeft: '8px', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
              RUC: {activeCompany?.ruc}
            </code>
          </div>
          <span className={`status-pill ${activeCompany?.isProduction ? 'prod' : 'beta'}`} style={{ fontSize: '10px' }}>
            {activeCompany?.isProduction ? 'Producción' : 'Beta'}
          </span>
        </div>

        {/* Locked Feature Banner */}
        {isModuleLocked ? (
          <div style={{
            padding: '24px 20px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            <div style={{ width: '50px', height: '50px', margin: '0 auto 12px auto', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <IconLock size={26} />
            </div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
              Módulo de Telegram no incluido en tu Plan
            </h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '460px', marginInline: 'auto' }}>
              Tu plan actual (<strong>{subscriptionInfo?.plan?.name || 'Básico'}</strong>) no incluye la emisión móvil por Telegram. Actualiza al <strong>Plan Starter</strong> o superior para habilitar este asistente para tu equipo.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onClose();
                if (onOpenUpgradePlan) onOpenUpgradePlan();
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
            >
              <span>Ver Planes y Mejorar Suscripción</span>
            </button>
          </div>
        ) : (
          <>
            {/* Notifications */}
            {statusMsg && (
              <div className="alert-banner alert-success" style={{ marginBottom: '14px' }}>
                <IconCheck size={16} />
                <span>{statusMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="alert-banner alert-error" style={{ marginBottom: '14px' }}>
                <IconAlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Connection Status Card */}
            <div style={{
              padding: '16px',
              borderRadius: '10px',
              border: activeCompany?.telegramToken ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
              background: activeCompany?.telegramToken ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-subtle, #f8fafc)',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: activeCompany?.telegramToken ? '#10b981' : '#ef4444',
                    boxShadow: activeCompany?.telegramToken ? '0 0 8px #10b981' : 'none'
                  }} />
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>
                      {activeCompany?.telegramToken ? 'Bot Conectado y En Línea' : 'Sin Bot Vinculado'}
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {activeCompany?.telegramToken && activeCompany?.telegramBotUsername ? (
                        <>Usuario: <strong style={{ color: '#2CA5E0' }}>@{activeCompany.telegramBotUsername}</strong></>
                      ) : (
                        'Configura tu token para activar la emisión'
                      )}
                    </span>
                  </div>
                </div>

                {activeCompany?.telegramToken && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {activeCompany?.telegramBotUsername && (
                      <a
                        href={`https://t.me/${activeCompany.telegramBotUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                      >
                        <IconTelegram size={14} />
                        <span>Abrir en Telegram</span>
                        <IconExternalLink size={12} />
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger-outline btn-sm"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                    >
                      {disconnecting ? 'Desvinculando...' : 'Desvincular'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Token Form */}
            <form onSubmit={handleConnect}>
              <div className="form-group-field" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Token HTTP API de Telegram (BotFather)</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 400 }}>
                    Ejemplo: <code>7123456789:AAHk1_z49...</code>
                  </span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '13px' }}
                    placeholder="Pega aquí el token entregado por @BotFather"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    {loading ? (
                      <>
                        <LoaderCircleIcon className="animate-spin" size={15} />
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <>
                        <IconZap size={15} />
                        <span>Verificar & Conectar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Quick 3-Step Guide */}
            <div style={{
              background: 'var(--bg-subtle, #f8fafc)',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                📖 ¿Cómo crear tu Bot en 1 minuto? (Paso a Paso con @BotFather)
              </span>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <li>
                  Abre Telegram y busca al bot oficial <strong>@BotFather</strong> (tiene check azul de verificación).
                </li>
                <li>
                  Envía el comando <code>/newbot</code>. Escribe el nombre de tu empresa (ej. <em>Facturación Mi Empresa</em>) y un nombre de usuario que termine en <code>bot</code> (ej. <em>miempresafacturabot</em>).
                </li>
                <li>
                  BotFather te responderá con tu <strong>HTTP API Token</strong>. Cópialo y pégalo en el campo de arriba y pulsa <strong>Verificar & Conectar</strong>.
                </li>
              </ol>
            </div>

            {/* Commands summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '8px',
              fontSize: '11.5px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <code>/emitir</code>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Flujo interactivo Factura/Boleta</div>
              </div>
              <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <code>/config</code>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>RUC, estado SOL y certificado</div>
              </div>
              <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <code>/ayuda</code>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Comandos y soporte tributario</div>
              </div>
              <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <code>/cancelar</code>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Cancela emisión en curso</div>
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
