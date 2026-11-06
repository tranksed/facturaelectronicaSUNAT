import React, { useState, useEffect, useRef } from 'react';
import {
  IconCrown,
  IconCheck,
  IconCreditCard,
  IconShield,
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
  const [showCatalog, setShowCatalog] = useState(false);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [isWaitingPayment, setIsWaitingPayment] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [manualRefCode, setManualRefCode] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [reportingPay, setReportingPay] = useState(false);
  const [verifyingPay, setVerifyingPay] = useState(false);
  const [message, setMessage] = useState(null);

  const pollTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsWaitingPayment(false);
  };

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
      setShowCatalog(false);
      setSelectedPlan(null);
      setCheckoutResult(null);
      setIsWaitingPayment(false);
      setPaymentSuccessData(null);
      setMessage(null);
      stopPolling();
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

  const handleStartCheckout = (plan) => {
    setSelectedPlan(plan);
    setCheckoutResult(null);
    setMessage(null);
    setIsWaitingPayment(false);
    setPaymentSuccessData(null);
    const activeList = getActiveGatewaysList(subData);
    if (activeList.length > 0 && !activeList.some(g => g.id === selectedGateway)) {
      setSelectedGateway(activeList[0].id);
    }
  };

  const handleExecutePayment = async () => {
    if (!selectedPlan) return;
    setProcessingCheckout(true);
    setMessage(null);
    setPaymentSuccessData(null);

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
          // Auto launch Mercado Pago checkout in new tab & start auto-verification
          if (data.order.gateway === 'MERCADOPAGO' && data.order.checkoutUrl) {
            window.open(data.order.checkoutUrl, '_blank');
            setIsWaitingPayment(true);
            startPollingPayment(data.order.orderId);
          }
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

  const startPollingPayment = (orderId) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    let attempts = 0;
    pollTimerRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 40) { // Timeout after ~2.5 mins
        stopPolling();
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/subscription/orders/${orderId}/verify-mercadopago`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          }
        });
        const data = await res.json();
        if (res.ok && data.approved) {
          stopPolling();
          setPaymentSuccessData(data);
          loadPlanData();
          if (onPlanUpdated) onPlanUpdated();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3500);
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
        stopPolling();
        setPaymentSuccessData(data);
        loadPlanData();
        if (onPlanUpdated) onPlanUpdated();
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

  // Subscription State Logic
  const isFreePlan = subData?.plan?.code === 'FREE' || subData?.plan?.price === 0;
  const isExpired = Boolean(subData?.isExpired);
  const isDocLimitReached = Boolean(subData?.isDocLimitReached);
  const isNearExpiry = subData?.daysRemaining !== null && subData?.daysRemaining !== undefined && subData.daysRemaining <= 5;
  const docLimit = subData?.docLimit;
  const docsCount = subData?.docsIssuedCount || 0;
  const docUsagePercent = (docLimit && docLimit > 0) ? Math.min(100, Math.round((docsCount / docLimit) * 100)) : 0;
  const isNearDocLimit = docLimit > 0 && docUsagePercent >= 80;

  // Active paid plan in good standing (vigente)
  const isPlanVigente = !isFreePlan && !isExpired && !isDocLimitReached && Boolean(subData?.plan);

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card" style={{ maxWidth: selectedPlan ? '560px' : (isPlanVigente && !showCatalog ? '620px' : '880px'), width: '92%', transition: 'all 0.25s ease' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '19px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconCrown size={22} style={{ color: '#f59e0b' }} />
              <span>{selectedPlan ? 'Finalizar Suscripción' : 'Mi Suscripción & Plan'}</span>
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              {selectedPlan ? 'Selecciona tu pasarela de pago para continuar' : 'Estado de emisión de comprobantes, usuarios y vigencia'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => { stopPolling(); onClose(); }}
            style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {message && (
          <div className={`alert-banner ${message.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '14px', fontSize: '13px' }}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <LoaderCircleIcon className="animate-spin" size={24} style={{ margin: '0 auto 10px auto' }} />
            <p style={{ margin: 0, fontSize: '13px' }}>Cargando información de tu suscripción...</p>
          </div>
        ) : selectedPlan ? (
          /* ================================================================= */
          /* VIEW B: CHECKOUT SIMPLE & ESTILIZADO                              */
          /* ================================================================= */
          paymentSuccessData ? (
            /* Celebration Screen */
            <div className="animate-fade-in" style={{ padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}>
                <IconCheck size={32} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--text-primary)' }}>
                ¡Pago Confirmado y Suscripción Activa!
              </h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                Tu plan <strong>{selectedPlan.name}</strong> ha sido activado con éxito. Tu cuota mensual de comprobantes ha sido renovada a 0 comprobantes emitidos.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSelectedPlan(null);
                  setCheckoutResult(null);
                  setPaymentSuccessData(null);
                  onClose();
                  if (onPlanUpdated) onPlanUpdated();
                }}
                style={{ padding: '10px 24px', fontWeight: 600 }}
              >
                Listo, Volver al Sistema
              </button>
            </div>
          ) : (
            <div className="animate-fade-in">
              {/* Order Summary Strip */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Plan a Adquirir</div>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{selectedPlan.name}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {selectedPlan.docLimit === -1 ? 'Comprobantes Ilimitados' : `${selectedPlan.docLimit} comprobantes/mes`} • {selectedPlan.userLimit} {selectedPlan.userLimit === 1 ? 'Usuario' : 'Usuarios'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>
                    S/. {Number(selectedPlan.price).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => { stopPolling(); setSelectedPlan(null); setCheckoutResult(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11.5px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Elegir otro plan
                  </button>
                </div>
              </div>

              {!checkoutResult ? (
                /* Step 1: Gateway Selection (Clean & Stylized) */
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                      Método de Pago:
                    </label>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Selecciona la pasarela disponible para realizar tu abono.
                    </span>
                  </div>

                  {getActiveGatewaysList().length === 0 ? (
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '16px', textAlign: 'center', marginBottom: '18px' }}>
                      <IconAlertTriangle size={24} style={{ color: '#ef4444', margin: '0 auto 6px auto', display: 'block' }} />
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>No hay pasarelas activadas</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        El administrador de la plataforma aún no ha habilitado métodos de pago. Por favor contacta a soporte.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
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
                              borderRadius: '10px',
                              border: isSelected ? `2px solid ${gw.color}` : '1px solid var(--border-color)',
                              background: isSelected ? `${gw.color}10` : 'var(--bg-card)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ fontSize: '18px' }}>{gw.icon}</div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{gw.name}</strong>
                                  {gw.badge && (
                                    <span style={{ fontSize: '9.5px', background: `${gw.color}20`, color: gw.color, padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>
                                      {gw.badge}
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{gw.subtitle}</span>
                              </div>
                            </div>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: `2px solid ${isSelected ? gw.color : 'var(--border-color)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? gw.color : 'transparent'
                            }}>
                              {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setSelectedPlan(null)}
                      style={{ fontSize: '12.5px', padding: '8px 14px' }}
                    >
                      Atrás
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      disabled={processingCheckout || getActiveGatewaysList().length === 0}
                      onClick={handleExecutePayment}
                      style={{ padding: '9px 20px', fontWeight: 600, fontSize: '13.5px' }}
                    >
                      {processingCheckout ? (
                        <>
                          <LoaderCircleIcon className="animate-spin" size={15} />
                          <span>Iniciando...</span>
                        </>
                      ) : (
                        <>
                          <span>Pagar S/. {Number(selectedPlan.price).toFixed(2)}</span>
                          <ArrowRightIcon size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : checkoutResult.gateway === 'MERCADOPAGO' ? (
                /* Mercado Pago Action Card */
                <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0, 158, 227, 0.35)', textAlign: 'center' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #009ee3 0%, #0081bb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: 800, margin: '0 auto 12px auto' }}>
                    MP
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
                    Mercado Pago Checkout Pro
                  </h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Abona con Yape, Tarjetas de Débito/Crédito o saldo disponible.
                  </p>

                  {isWaitingPayment ? (
                    <div style={{ background: 'rgba(0, 158, 227, 0.08)', border: '1px solid rgba(0, 158, 227, 0.25)', borderRadius: '10px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                      <LoaderCircleIcon className="animate-spin" size={20} style={{ color: '#009ee3', margin: '0 auto 8px auto' }} />
                      <strong style={{ fontSize: '13px', color: '#009ee3', display: 'block', marginBottom: '4px' }}>
                        Esperando confirmación de Mercado Pago...
                      </strong>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'block', lineHeight: '1.4' }}>
                        Completa tu pago en la pestaña abierta. Esta pantalla se actualizará automáticamente apenas se confirme.
                      </span>
                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={verifyingPay}
                          onClick={() => handleVerifyMercadoPago(checkoutResult.orderId)}
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                        >
                          <IconRefresh size={12} />
                          <span>{verifyingPay ? 'Verificando...' : 'Verificar Ahora'}</span>
                        </button>
                        <a
                          href={checkoutResult.checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', padding: '4px 10px', textDecoration: 'none' }}
                        >
                          Reabrir Pasarela ↗
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '16px' }}>
                      <a
                        href={checkoutResult.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          setIsWaitingPayment(true);
                          startPollingPayment(checkoutResult.orderId);
                        }}
                        className="btn btn-primary btn-lg"
                        style={{
                          background: 'linear-gradient(135deg, #009ee3 0%, #0081bb 100%)',
                          color: '#fff',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '12px 18px',
                          fontSize: '14.5px',
                          fontWeight: 700,
                          borderRadius: '10px',
                          textDecoration: 'none',
                          boxShadow: '0 4px 12px rgba(0, 158, 227, 0.35)'
                        }}
                      >
                        <span>Pagar con Mercado Pago / Yape</span>
                        <IconExternalLink size={16} />
                      </a>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => { stopPolling(); setCheckoutResult(null); }}
                      style={{ fontSize: '12px', padding: '5px 10px' }}
                    >
                      Elegir otro método
                    </button>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      🔒 Cifrado seguro SSL 256-bit
                    </span>
                  </div>
                </div>
              ) : (
                /* Bank Transfer Action Card */
                <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🏦 Transferencia Bancaria Manual</span>
                  </h4>
                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Realiza tu abono a las siguientes cuentas e ingresa el número de operación.
                  </p>

                  {checkoutResult.bankTransferInfo && (
                    <div style={{ background: 'var(--bg-card-subtle)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
                      <pre style={{ margin: 0, fontSize: '11.5px', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: '1.4' }}>
                        {checkoutResult.bankTransferInfo}
                      </pre>
                    </div>
                  )}

                  <div style={{ marginBottom: '12px' }}>
                    <label className="field-label" style={{ fontSize: '11.5px' }}>Número de Operación / Constancia</label>
                    <input 
                      type="text"
                      className="input-field"
                      placeholder="Ej. Yape 88491 o BCP 01928374"
                      value={manualRefCode}
                      onChange={(e) => setManualRefCode(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCheckoutResult(null)}
                      style={{ fontSize: '12px', padding: '5px 10px' }}
                    >
                      Volver
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary btn-sm"
                      disabled={reportingPay || !manualRefCode.trim()}
                      onClick={handleReportManualPayment}
                      style={{ padding: '8px 16px', fontWeight: 600 }}
                    >
                      {reportingPay ? 'Notificando...' : 'Confirmar y Notificar Pago'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        ) : isPlanVigente && !showCatalog ? (
          /* ================================================================= */
          /* VIEW A: SUSCRIPCIÓN ACTIVA & VIGENTE (LIMPIO, SIN CATÁLOGO)       */
          /* ================================================================= */
          <div className="animate-fade-in">
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700, marginBottom: '8px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                    <span>Suscripción Activa & Vigente</span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {subData.plan?.name}
                  </h3>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Vence el: <strong>{new Date(subData.planExpiresAt).toLocaleDateString()}</strong> ({subData.daysRemaining} días restantes de servicio)
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Costo mensual</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                    S/. {Number(subData.plan?.price).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Near Expiry / Near Quota Notice */}
              {(isNearExpiry || isNearDocLimit) && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#b45309' }}>
                    <IconAlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <span>
                      {isNearExpiry 
                        ? `Tu plan vence en ${subData.daysRemaining} días. Puedes renovarlo ahora para evitar pausas.`
                        : `Has consumido el ${docUsagePercent}% de tus comprobantes del mes.`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartCheckout(subData.plan)}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: '12px' }}
                  >
                    Renovar Periodo (S/. {subData.plan.price})
                  </button>
                </div>
              )}

              {/* Quota Progress Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px', background: 'var(--bg-card-subtle)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                {/* Documents Quota */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Comprobantes emitidos este mes:</span>
                    <strong style={{ color: isNearDocLimit ? '#ef4444' : 'var(--text-primary)' }}>
                      {docsCount} / {docLimit === -1 ? 'Ilimitados' : docLimit} {docLimit > 0 && `(${docUsagePercent}%)`}
                    </strong>
                  </div>
                  {docLimit > 0 && (
                    <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${docUsagePercent}%`,
                        height: '100%',
                        background: docUsagePercent >= 90 ? '#ef4444' : (docUsagePercent >= 75 ? '#f59e0b' : '#10b981'),
                        borderRadius: '10px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  )}
                </div>

                {/* Team Users Quota */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Miembros de equipo activos:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {subData.currentUsersCount} / {subData.userLimit}
                    </strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, Math.round((subData.currentUsersCount / subData.userLimit) * 100))}%`,
                      height: '100%',
                      background: 'var(--primary)',
                      borderRadius: '10px'
                    }} />
                  </div>
                </div>
              </div>

              {/* Included Benefits List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <IconCheck size={14} style={{ color: '#10b981' }} />
                  <span>Emisión electrónica SUNAT continua</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <IconCheck size={14} style={{ color: '#10b981' }} />
                  <span>Acceso a API externa & WHMCS</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <IconCheck size={14} style={{ color: '#10b981' }} />
                  <span>Soporte prioritario & backups</span>
                </div>
              </div>

              {/* Bottom Actions: Clean & Discreet */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  ¿Necesitas mayor volumen de comprobantes o más usuarios?
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCatalog(true)}
                  style={{ fontSize: '12px', padding: '6px 14px', fontWeight: 600 }}
                >
                  Ver otros paquetes / Upgrade ➔
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* VIEW C: CATÁLOGO DE PLANES (PARA VENCIDOS O QUIENES BUSCAN UPGRADE) */
          /* ================================================================= */
          <div className="animate-fade-in">
            {/* Top link if user navigated from their active plan */}
            {isPlanVigente && (
              <div style={{ marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowCatalog(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, padding: 0 }}
                >
                  ← Volver a mi suscripción actual ({subData?.plan?.name})
                </button>
              </div>
            )}

            {/* Alert banner for expired or limit reached */}
            {(!isPlanVigente) && (
              <div style={{
                background: isExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${isExpired ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <strong style={{ fontSize: '13px', color: isExpired ? '#b91c1c' : '#b45309', display: 'block' }}>
                    {isExpired 
                      ? '⚠️ Tu suscripción ha vencido' 
                      : (isDocLimitReached ? '⚠️ Has alcanzado el límite de comprobantes del mes' : 'ℹ️ Plan Gratuito (30 días de prueba)')}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {isExpired 
                      ? 'Para continuar emitiendo comprobantes ante SUNAT sin restricciones, renueva tu paquete.'
                      : (isDocLimitReached ? 'Actualiza tu paquete para habilitar más comprobantes.' : 'Elige un paquete comercial para obtener más volumen y usuarios.')}
                  </span>
                </div>

                {/* Quick 1-click renewal button for previously paid plan */}
                {!isFreePlan && subData?.plan && (
                  <button
                    type="button"
                    onClick={() => handleStartCheckout(subData.plan)}
                    className="btn btn-primary btn-sm"
                    style={{ fontWeight: 700, fontSize: '12.5px', padding: '7px 14px' }}
                  >
                    Renovar {subData.plan.name} (S/. {subData.plan.price})
                  </button>
                )}
              </div>
            )}

            {/* Plans Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
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
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-primary)' }}>{plan.name}</h4>
                      <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: 'var(--text-secondary)', minHeight: '28px' }}>
                        {plan.description}
                      </p>

                      <div style={{ margin: '8px 0 14px 0' }}>
                        <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>
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
                        {Array.isArray(plan.features) && plan.features.slice(2, 4).map((f, i) => (
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
                      style={{ width: '100%', marginTop: '14px', fontSize: '12px', padding: '8px 12px', fontWeight: 600 }}
                      onClick={() => handleStartCheckout(plan)}
                    >
                      {isCurrent ? (isExpired ? 'Renovar Este Plan' : 'Plan Actual') : 'Elegir Plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
