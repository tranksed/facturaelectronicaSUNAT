import React, { useState, useEffect } from 'react';
import {
  IconCrown,
  IconCheck,
  IconCreditCard,
  IconPaypal,
  IconDollar,
  IconShield,
  IconSpark,
  IconAlertTriangle,
  IconExternalLink,
  IconRefresh,
  ArrowRightIcon,
  LoaderCircleIcon
} from './Icons';

export default function TenantPlanModal({ isOpen, onClose, API_URL, authToken, currentUser, onPlanUpdated }) {
  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState(null);
  const [allPlans, setAllPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState('MERCADOPAGO');
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [manualRefCode, setManualRefCode] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [reportingPay, setReportingPay] = useState(false);
  const [verifyingPay, setVerifyingPay] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadPlanData();
    }
  }, [isOpen]);

  const loadPlanData = async () => {
    setLoading(true);
    try {
      const [subRes, plansRes] = await Promise.all([
        fetch(`${API_URL}/api/subscription/my-plan`, {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        fetch(`${API_URL}/api/plans`)
      ]);

      const subJson = await subRes.json();
      const plansJson = await plansRes.json();

      if (subRes.ok) setSubData(subJson);
      if (plansRes.ok && Array.isArray(plansJson)) setAllPlans(plansJson);
    } catch (e) {
      console.error('Error loading subscription:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleStartCheckout = async (plan) => {
    setSelectedPlan(plan);
    setCheckoutResult(null);
  };

  const handleExecutePayment = async () => {
    if (!selectedPlan) return;
    setProcessingCheckout(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          gateway: selectedGateway,
          returnUrl: window.location.href.split('?')[0]
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.isFree) {
          setMessage({ text: data.message, type: 'success' });
          loadPlanData();
          if (onPlanUpdated) onPlanUpdated();
          setTimeout(() => setSelectedPlan(null), 1500);
        } else {
          setCheckoutResult(data.order);
        }
      } else {
        setMessage({ text: data.error || 'Error al iniciar checkout', type: 'error' });
      }
    } catch (e) {
      setMessage({ text: 'Error de conexión: ' + e.message, type: 'error' });
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleVerifyMercadoPago = async (orderId) => {
    const targetId = orderId || checkoutResult?.orderId;
    if (!targetId) return;
    setVerifyingPay(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/subscription/orders/${targetId}/verify-mercadopago`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.approved) {
        setMessage({ text: data.message, type: 'success' });
        loadPlanData();
        if (onPlanUpdated) onPlanUpdated();
        setTimeout(() => {
          setSelectedPlan(null);
          setCheckoutResult(null);
        }, 2500);
      } else {
        setMessage({ text: data.message || 'El pago aún se encuentra pendiente de acreditación en Mercado Pago.', type: 'error' });
      }
    } catch (e) {
      setMessage({ text: 'Error al verificar pago: ' + e.message, type: 'error' });
    } finally {
      setVerifyingPay(false);
    }
  };

  const handleReportManualPayment = async () => {
    if (!checkoutResult?.orderId) return;
    setReportingPay(true);
    try {
      const res = await fetch(`${API_URL}/api/subscription/report-payment/${checkoutResult.orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          referenceNumber: manualRefCode,
          notes: manualNotes
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: data.message, type: 'success' });
        loadPlanData();
        if (onPlanUpdated) onPlanUpdated();
        setTimeout(() => {
          setSelectedPlan(null);
          setCheckoutResult(null);
        }, 3000);
      } else {
        setMessage({ text: data.error || 'Error al reportar pago', type: 'error' });
      }
    } catch (e) {
      setMessage({ text: 'Error de red: ' + e.message, type: 'error' });
    } finally {
      setReportingPay(false);
    }
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card" style={{ maxWidth: selectedPlan ? '640px' : '880px', width: '92%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconCrown size={22} style={{ color: '#f59e0b' }} />
              <span>Mi Plan & Suscripción Comercial</span>
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Gestiona tu paquete de emisión de comprobantes, usuarios del equipo y regulariza tus pagos.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {message && (
          <div className={`alert-banner ${message.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '14px' }}>
            {message.text}
          </div>
        )}

        {/* VIEW 1: Current Status & Upgrade Catalog */}
        {!selectedPlan ? (
          <div>
            {/* Active Subscription Box */}
            {subData && (
              <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px', borderLeft: `4px solid ${subData.isExpired ? '#ef4444' : 'var(--primary)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Plan Actual
                    </span>
                    <h3 style={{ margin: '2px 0 4px 0', fontSize: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{subData.plan?.name || 'Plan Gratuito'}</span>
                      {subData.isExpired ? (
                        <span className="status-badge status-rejected">EXPIRADO</span>
                      ) : (
                        <span className="status-badge status-accepted">ACTIVO</span>
                      )}
                    </h3>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      {subData.planExpiresAt ? (
                        <>Vence el: <strong>{new Date(subData.planExpiresAt).toLocaleDateString()}</strong> ({subData.daysRemaining} días restantes)</>
                      ) : (
                        <>Sin fecha de expiración límite</>
                      )}
                    </div>
                  </div>

                  {/* Quota Indicators */}
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DOCUMENTOS DEL MES</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: subData.isDocLimitReached ? '#ef4444' : 'var(--text-primary)' }}>
                        {subData.docsIssuedCount} / {subData.docLimit === -1 ? '∞' : subData.docLimit}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MIEMBROS DE EQUIPO</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {subData.currentUsersCount} / {subData.userLimit}
                      </div>
                    </div>
                  </div>
                </div>

                {subData.isExpired && (
                  <div style={{ marginTop: '12px', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '6px', color: '#b91c1c', fontSize: '12.5px' }}>
                    ⚠️ Tu plan ha expirado. Por favor renueva tu suscripción o selecciona un nuevo plan para continuar emitiendo comprobantes ante SUNAT.
                  </div>
                )}
              </div>
            )}

            {/* Plans Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              {allPlans.map(plan => {
                const isCurrent = subData?.plan?.code === plan.code;
                return (
                  <div 
                    key={plan.id}
                    className="glass-card"
                    style={{
                      padding: '18px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      border: plan.isPopular ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                      borderRadius: '12px',
                      background: plan.isPopular ? 'rgba(245, 158, 11, 0.03)' : 'var(--bg-card)'
                    }}
                  >
                    {plan.isPopular && (
                      <span style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#f59e0b',
                        color: '#fff',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        textTransform: 'uppercase'
                      }}>
                        Más Popular
                      </span>
                    )}

                    <div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--text-primary)' }}>{plan.name}</h4>
                      <p style={{ margin: '0 0 12px 0', fontSize: '11.5px', color: 'var(--text-secondary)', minHeight: '32px' }}>
                        {plan.description}
                      </p>

                      <div style={{ margin: '10px 0 16px 0' }}>
                        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
                          {plan.price === 0 ? 'S/. 0' : `S/. ${plan.price}`}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> / mes</span>
                      </div>

                      <div style={{ fontSize: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--text-primary)' }}>
                          <IconCheck size={14} style={{ color: '#10b981' }} />
                          <strong>{plan.docLimit === -1 ? 'Docs ILIMITADOS' : `${plan.docLimit} docs/mes`}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--text-primary)' }}>
                          <IconCheck size={14} style={{ color: '#10b981' }} />
                          <span>{plan.userLimit} {plan.userLimit === 1 ? 'Usuario' : 'Usuarios'}</span>
                        </div>
                        {Array.isArray(plan.features) && plan.features.slice(2, 5).map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                            <IconCheck size={12} style={{ color: '#10b981' }} />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`btn ${plan.isPopular ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ width: '100%', marginTop: '16px', fontSize: '12.5px', padding: '8px 12px' }}
                      onClick={() => handleStartCheckout(plan)}
                    >
                      {isCurrent ? (subData?.isExpired ? 'Renovar Este Plan' : 'Cambiar / Renovar') : 'Elegir Plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* VIEW 2: Interactive Checkout */
          <div className="animate-fade-in">
            <div style={{ background: 'rgba(37, 99, 235, 0.05)', padding: '14px 18px', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Plan a Suscribir:</span>
                <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-primary)' }}>{selectedPlan.name}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {selectedPlan.docLimit === -1 ? 'Comprobantes Ilimitados' : `Hasta ${selectedPlan.docLimit} comprobantes/mes`} • {selectedPlan.userLimit} usuarios
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
                  S/. {selectedPlan.price}
                </div>
                <button 
                  type="button" 
                  onClick={() => { setSelectedPlan(null); setCheckoutResult(null); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '11.5px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Cambiar de plan
                </button>
              </div>
            </div>

            {!checkoutResult ? (
              <>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-primary)' }}>
                  Selecciona la Pasarela de Pago:
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '18px' }}>
                  {/* Mercado Pago */}
                  <label 
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: selectedGateway === 'MERCADOPAGO' ? '2px solid #009ee3' : '1px solid var(--border-color)',
                      background: selectedGateway === 'MERCADOPAGO' ? 'rgba(0, 158, 227, 0.08)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      textAlign: 'center'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="gateway" 
                      checked={selectedGateway === 'MERCADOPAGO'} 
                      onChange={() => setSelectedGateway('MERCADOPAGO')} 
                    />
                    <strong style={{ fontSize: '13px', color: '#009ee3' }}>Mercado Pago</strong>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Tarjetas, QR & Saldo</span>
                  </label>

                  {/* Izipay */}
                  <label 
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: selectedGateway === 'IZIPAY' ? '2px solid #ff0055' : '1px solid var(--border-color)',
                      background: selectedGateway === 'IZIPAY' ? 'rgba(255, 0, 85, 0.08)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      textAlign: 'center'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="gateway" 
                      checked={selectedGateway === 'IZIPAY'} 
                      onChange={() => setSelectedGateway('IZIPAY')} 
                    />
                    <strong style={{ fontSize: '13px', color: '#ff0055' }}>Izipay</strong>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Visa / Mastercard PE</span>
                  </label>

                  {/* PayPal */}
                  <label 
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: selectedGateway === 'PAYPAL' ? '2px solid #003087' : '1px solid var(--border-color)',
                      background: selectedGateway === 'PAYPAL' ? 'rgba(0, 48, 135, 0.08)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      textAlign: 'center'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="gateway" 
                      checked={selectedGateway === 'PAYPAL'} 
                      onChange={() => setSelectedGateway('PAYPAL')} 
                    />
                    <strong style={{ fontSize: '13px', color: '#003087' }}>PayPal</strong>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Pago Internacional</span>
                  </label>

                  {/* Culqi */}
                  <label 
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: selectedGateway === 'CULQI' ? '2px solid #00c389' : '1px solid var(--border-color)',
                      background: selectedGateway === 'CULQI' ? 'rgba(0, 195, 137, 0.08)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      textAlign: 'center'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="gateway" 
                      checked={selectedGateway === 'CULQI'} 
                      onChange={() => setSelectedGateway('CULQI')} 
                    />
                    <strong style={{ fontSize: '13px', color: '#00c389' }}>Culqi</strong>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Tarjetas & Yape</span>
                  </label>

                  {/* Manual / Transferencia */}
                  <label 
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: selectedGateway === 'MANUAL' ? '2px solid #10b981' : '1px solid var(--border-color)',
                      background: selectedGateway === 'MANUAL' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      textAlign: 'center'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="gateway" 
                      checked={selectedGateway === 'MANUAL'} 
                      onChange={() => setSelectedGateway('MANUAL')} 
                    />
                    <strong style={{ fontSize: '13px', color: '#10b981' }}>Transferencia</strong>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>BCP, BBVA, Yape/Plin</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setSelectedPlan(null)}
                  >
                    Atrás
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    disabled={processingCheckout}
                    onClick={handleExecutePayment}
                  >
                    {processingCheckout ? (
                      <>
                        <LoaderCircleIcon className="animate-spin" size={16} />
                        <span>Iniciando Pasarela...</span>
                      </>
                    ) : (
                      <>
                        <span>Continuar con el Pago (S/. {selectedPlan.price})</span>
                        <ArrowRightIcon size={14} />
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : checkoutResult.gateway === 'MERCADOPAGO' ? (
              /* Mercado Pago Checkout Pro Panel */
              <div className="glass-card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid rgba(0, 158, 227, 0.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#009ee3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '18px', boxShadow: '0 2px 8px rgba(0, 158, 227, 0.4)' }}>
                      MP
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '17px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Mercado Pago Checkout Pro</span>
                      </h4>
                      <span style={{ fontSize: '12.5px', color: '#009ee3', fontWeight: 500 }}>
                        Orden #{checkoutResult.orderId.substring(0, 8)} • Plan {checkoutResult.planName}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total a abonar</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {checkoutResult.currency} {Number(checkoutResult.amount).toFixed(2)}
                    </div>
                  </div>
                </div>

                {checkoutResult.isSandbox && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconAlertTriangle size={16} />
                    <span><strong>Modo Sandbox (Pruebas) Activo:</strong> Puedes usar tarjetas de prueba de Mercado Pago para simular el pago.</span>
                  </div>
                )}

                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    💳 Métodos de Pago Disponibles en Checkout Pro:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-primary)', background: 'var(--bg-card-subtle)', padding: '6px 10px', borderRadius: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#730d88', display: 'inline-block' }}></span>
                      <span><strong>Yape</strong> (QR o Clave)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-primary)', background: 'var(--bg-card-subtle)', padding: '6px 10px', borderRadius: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#009ee3', display: 'inline-block' }}></span>
                      <span><strong>Tarjetas</strong> Visa/Master</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-primary)', background: 'var(--bg-card-subtle)', padding: '6px 10px', borderRadius: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                      <span><strong>Saldo</strong> Mercado Pago</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-primary)', background: 'var(--bg-card-subtle)', padding: '6px 10px', borderRadius: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                      <span><strong>PagoEfectivo</strong></span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                  <a 
                    href={checkoutResult.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      background: '#009ee3',
                      borderColor: '#009ee3',
                      color: '#ffffff',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      padding: '14px 20px',
                      fontSize: '15.5px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 14px rgba(0, 158, 227, 0.4)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <span>Ir a Pagar con Mercado Pago / Yape</span>
                    <IconExternalLink size={18} />
                  </a>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={verifyingPay}
                    onClick={() => handleVerifyMercadoPago(checkoutResult.orderId)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', borderRadius: '8px', fontWeight: 600 }}
                  >
                    {verifyingPay ? (
                      <>
                        <LoaderCircleIcon className="animate-spin" size={16} />
                        <span>Verificando acreditación en Mercado Pago...</span>
                      </>
                    ) : (
                      <>
                        <IconRefresh size={16} />
                        <span>Ya completé mi pago • Verificar Activación</span>
                      </>
                    )}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setCheckoutResult(null)}
                    style={{ fontSize: '12.5px', padding: '6px 12px' }}
                  >
                    Volver a métodos de pago
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    🔒 Transacción protegida por Mercado Pago y SSL
                  </span>
                </div>
              </div>
            ) : (
              /* Checkout Result / Manual or Other Gateway Action */
              <div className="glass-card" style={{ padding: '20px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <IconShield size={20} style={{ color: '#10b981' }} />
                  <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
                    Orden de Suscripción #{checkoutResult.orderId.substring(0, 8)}
                  </h4>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {checkoutResult.instructions}
                </p>

                {/* If Bank Transfer / MANUAL */}
                {checkoutResult.bankTransferInfo && (
                  <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px', border: '1px dashed var(--border-color)', marginBottom: '16px' }}>
                    <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                      Cuentas Bancarias Oficiales:
                    </strong>
                    <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {checkoutResult.bankTransferInfo}
                    </pre>
                  </div>
                )}

                {/* Manual Reference Form */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label">Número de Operación / Constancia de Pago</label>
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="Ej. Operación Yape 88491 o BCP 01928374"
                    value={manualRefCode}
                    onChange={(e) => setManualRefCode(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label">Notas Adicionales (Opcional)</label>
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="Nombre del titular o banco emisor"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setCheckoutResult(null)}
                  >
                    Volver a opciones
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    disabled={reportingPay}
                    onClick={handleReportManualPayment}
                  >
                    {reportingPay ? 'Informando Pago...' : 'Confirmar & Notificar Pago'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
