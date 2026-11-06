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

  const getActiveGatewaysList = (data = subData) => {
    const list = [];
    const ag = data?.availableGateways;
    if (!ag) return list;

    if (ag.mercadopago) {
      list.push({
        id: 'MERCADOPAGO',
        name: 'Mercado Pago / Yape',
        subtitle: 'Paga al instante con Yape, Tarjetas Débito/Crédito o Saldo',
        badge: 'Recomendado',
        icon: '⚡',
        color: '#009ee3'
      });
    }
    if (ag.izipay) {
      list.push({
        id: 'IZIPAY',
        name: 'Izipay Perú',
        subtitle: 'Tarjetas de Crédito y Débito Visa/Mastercard',
        icon: '💳',
        color: '#ff0055'
      });
    }
    if (ag.paypal) {
      list.push({
        id: 'PAYPAL',
        name: 'PayPal',
        subtitle: 'Pago internacional seguro en USD / Tarjeta',
        icon: '🅿️',
        color: '#003087'
      });
    }
    if (ag.culqi) {
      list.push({
        id: 'CULQI',
        name: 'Culqi',
        subtitle: 'Tarjetas locales y billeteras digitales',
        icon: '📱',
        color: '#00c389'
      });
    }
    if (ag.bankTransfer) {
      list.push({
        id: 'MANUAL',
        name: 'Transferencia Bancaria',
        subtitle: 'Depósito a cuenta BCP, BBVA o Yape / Plin',
        icon: '🏦',
        color: '#10b981'
      });
    }

    return list;
  };

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

      if (subRes.ok) {
        setSubData(subJson);
        const activeList = getActiveGatewaysList(subJson);
        if (activeList.length > 0 && !activeList.some(g => g.id === selectedGateway)) {
          setSelectedGateway(activeList[0].id);
        }
      }
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
    setMessage(null);
    const activeList = getActiveGatewaysList(subData);
    if (activeList.length > 0 && !activeList.some(g => g.id === selectedGateway)) {
      setSelectedGateway(activeList[0].id);
    }
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
                <div style={{ marginBottom: '14px' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14.5px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    Selecciona tu Método de Pago:
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Elige la pasarela con la que deseas abonar tu suscripción comercial.
                  </span>
                </div>

                {getActiveGatewaysList().length === 0 ? (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '18px', marginBottom: '20px', textAlign: 'center' }}>
                    <IconAlertTriangle size={26} style={{ color: '#ef4444', margin: '0 auto 8px auto', display: 'block' }} />
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                      No hay pasarelas de pago habilitadas
                    </strong>
                    <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      El administrador aún no ha activado pasarelas de cobro para esta plataforma. Por favor comunícate con soporte para habilitar tu suscripción.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
                    {getActiveGatewaysList().map(gw => {
                      const isSelected = selectedGateway === gw.id;
                      return (
                        <div
                          key={gw.id}
                          onClick={() => setSelectedGateway(gw.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: isSelected ? `2px solid ${gw.color}` : '1px solid var(--border-color)',
                            background: isSelected ? `${gw.color}10` : 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                            boxShadow: isSelected ? `0 2px 10px ${gw.color}20` : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: `${gw.color}18`,
                              color: gw.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
                              fontWeight: 700,
                              flexShrink: 0
                            }}>
                              {gw.icon}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{gw.name}</strong>
                                {gw.badge && (
                                  <span style={{ fontSize: '10px', background: `${gw.color}22`, color: gw.color, padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                                    {gw.badge}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{gw.subtitle}</span>
                            </div>
                          </div>

                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? gw.color : 'var(--border-color)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isSelected ? gw.color : 'transparent',
                            flexShrink: 0
                          }}>
                            {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
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
                    disabled={processingCheckout || getActiveGatewaysList().length === 0}
                    onClick={handleExecutePayment}
                    style={{ padding: '10px 20px', fontWeight: 600 }}
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
              /* Mercado Pago Checkout Pro Panel - Clean & Minimalist */
              <div className="glass-card animate-fade-in" style={{ padding: '22px', borderRadius: '12px', border: '1px solid rgba(0, 158, 227, 0.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #009ee3 0%, #0081bb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '15px' }}>
                      MP
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
                        Mercado Pago Checkout Pro
                      </h4>
                      <span style={{ fontSize: '12px', color: '#009ee3', fontWeight: 500 }}>
                        Orden #{checkoutResult.orderId.substring(0, 8)} • Plan {checkoutResult.planName}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Monto a pagar</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {checkoutResult.currency} {Number(checkoutResult.amount).toFixed(2)}
                    </div>
                  </div>
                </div>

                {checkoutResult.isSandbox && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', fontSize: '11.5px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconAlertTriangle size={14} />
                    <span>Modo Sandbox (Pruebas con tarjetas de test activo).</span>
                  </div>
                )}

                {/* Accepted Payment badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(115, 13, 136, 0.12)', color: '#730d88', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>🟣 Yape (QR / Clave)</span>
                  <span style={{ fontSize: '11px', background: 'rgba(0, 158, 227, 0.12)', color: '#009ee3', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>💳 Tarjetas Visa / Master</span>
                  <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>🟢 Saldo Mercado Pago</span>
                  <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>🟠 PagoEfectivo</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <a 
                    href={checkoutResult.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-lg"
                    style={{
                      background: 'linear-gradient(135deg, #009ee3 0%, #0081bb 100%)',
                      borderColor: '#009ee3',
                      color: '#ffffff',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '13px 20px',
                      fontSize: '15px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      borderRadius: '10px',
                      boxShadow: '0 4px 14px rgba(0, 158, 227, 0.35)'
                    }}
                  >
                    <span>Ir a Pagar S/. {Number(checkoutResult.amount).toFixed(2)} en Mercado Pago</span>
                    <IconExternalLink size={16} />
                  </a>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={verifyingPay}
                    onClick={() => handleVerifyMercadoPago(checkoutResult.orderId)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}
                  >
                    {verifyingPay ? (
                      <>
                        <LoaderCircleIcon className="animate-spin" size={15} />
                        <span>Verificando pago en Mercado Pago...</span>
                      </>
                    ) : (
                      <>
                        <IconRefresh size={14} />
                        <span>Ya completé mi pago • Verificar Activación</span>
                      </>
                    )}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCheckoutResult(null)}
                    style={{ fontSize: '12px', padding: '5px 10px' }}
                  >
                    Elegir otro método
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    🔒 Pago seguro cifrado 256-bit SSL
                  </span>
                </div>
              </div>
            ) : (
              /* Manual / Bank Transfer Panel - Clean & Minimalist */
              <div className="glass-card animate-fade-in" style={{ padding: '22px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>
                      🏦
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
                        Transferencia Bancaria
                      </h4>
                      <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 500 }}>
                        Orden #{checkoutResult.orderId.substring(0, 8)} • Plan {checkoutResult.planName}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Total a abonar</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {checkoutResult.currency} {Number(checkoutResult.amount).toFixed(2)}
                    </div>
                  </div>
                </div>

                {checkoutResult.bankTransferInfo && (
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                    <strong style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                      Cuentas Bancarias Oficiales:
                    </strong>
                    <pre style={{ margin: 0, fontSize: '11.5px', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: '1.4' }}>
                      {checkoutResult.bankTransferInfo}
                    </pre>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label className="field-label" style={{ fontSize: '11.5px' }}>N° de Operación o Constancia</label>
                    <input 
                      type="text"
                      className="input-field"
                      placeholder="Ej. Yape 88491 o BCP 01928374"
                      value={manualRefCode}
                      onChange={(e) => setManualRefCode(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="field-label" style={{ fontSize: '11.5px' }}>Notas o Titular (Opcional)</label>
                    <input 
                      type="text"
                      className="input-field"
                      placeholder="Nombre del titular o banco"
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCheckoutResult(null)}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Volver a métodos
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    disabled={reportingPay || !manualRefCode.trim()}
                    onClick={handleReportManualPayment}
                    style={{ padding: '8px 16px', fontWeight: 600 }}
                  >
                    {reportingPay ? 'Notificando Pago...' : 'Confirmar & Notificar Pago'}
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
