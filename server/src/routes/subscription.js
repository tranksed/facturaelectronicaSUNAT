const express = require('express');
const prisma = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Helper to activate subscription plan and reset quotas for an approved order
 */
async function activateOrderAndSubscription(order, paymentRef = null, paymentMeta = null) {
  const durationDays = order.plan?.durationDays || 30;
  const now = new Date();
  
  // Extend from current plan expiration date if still in the future, or from now
  const currentExp = order.user?.planExpiresAt ? new Date(order.user.planExpiresAt) : null;
  const baseDate = (currentExp && currentExp > now) ? currentExp : now;
  const newExpiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Update order status
  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: {
      status: 'APPROVED',
      gatewayRef: paymentRef ? String(paymentRef) : order.gatewayRef,
      metaJson: paymentMeta ? JSON.stringify(paymentMeta) : order.metaJson
    }
  });

  // Update user's plan and reset doc quota for the new billing cycle
  await prisma.user.update({
    where: { id: order.userId },
    data: {
      planId: order.planId,
      planExpiresAt: newExpiresAt,
      docsIssuedCount: 0
    }
  });

  return { newExpiresAt };
}

// =========================================================================
// 1. PUBLIC WEBHOOKS (Unauthenticated - Called asynchronously by Gateways)
// =========================================================================

/**
 * POST / GET /api/subscription/webhook/mercadopago
 * Instant Payment Notification (IPN) & Webhook from Mercado Pago
 */
async function handleMercadoPagoWebhook(req, res) {
  try {
    const body = req.body || {};
    const query = req.query || {};

    const type = body.type || query.type || query.topic;
    const action = body.action || '';
    const paymentId = body.data?.id || body.id || query.id || query['data.id'];

    console.log(`[MercadoPago Webhook] Notificación recibida: type=${type}, action=${action}, paymentId=${paymentId}`);

    if (paymentId && (type === 'payment' || action?.startsWith('payment.') || !type)) {
      const platform = await prisma.platformConfig.findFirst();
      if (!platform?.mercadopagoAccessToken) {
        console.warn('[MercadoPago Webhook] No hay Access Token configurado en PlatformConfig');
        return res.status(200).send('OK');
      }

      // Query Mercado Pago Payment status
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${platform.mercadopagoAccessToken.trim()}`
        }
      });

      if (mpRes.ok) {
        const paymentData = await mpRes.json();
        console.log(`[MercadoPago Webhook] Pago #${paymentId} estado: ${paymentData.status}, referencia externa: ${paymentData.external_reference}`);

        if (paymentData.status === 'approved' && paymentData.external_reference) {
          const order = await prisma.paymentOrder.findUnique({
            where: { id: paymentData.external_reference },
            include: { plan: true, user: true }
          });

          if (order && order.status !== 'APPROVED') {
            await activateOrderAndSubscription(order, paymentData.id, paymentData);
            console.log(`[MercadoPago Webhook] ✅ Orden ${order.id} aprobada automáticamente y plan activado para ${order.user?.email}`);
          }
        }
      } else {
        console.error(`[MercadoPago Webhook] Error al consultar pago ${paymentId}: Status ${mpRes.status}`);
      }
    }

    // Acknowledge receipt to Mercado Pago
    return res.status(200).send('OK');
  } catch (error) {
    console.error('[MercadoPago Webhook] Error procesando notificación:', error);
    return res.status(200).send('OK');
  }
}

router.post('/webhook/mercadopago', handleMercadoPagoWebhook);
router.get('/webhook/mercadopago', handleMercadoPagoWebhook);

// =========================================================================
// 2. AUTHENTICATED TENANT SUBSCRIPTION ENDPOINTS
// =========================================================================
router.use(authenticateToken);

/**
 * GET /api/subscription/my-plan
 * Returns current tenant's active plan, expiration date, quota usage, and sub-user counts.
 */
router.get('/my-plan', async (req, res) => {
  try {
    const effectiveUserId = req.user.parentId || req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      include: {
        plan: true,
        subUsers: {
          select: { id: true, name: true, email: true, tenantRole: true, status: true, createdAt: true }
        },
        companies: {
          select: { id: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Default to FREE plan if none assigned yet
    let activePlan = user.plan;
    if (!activePlan) {
      activePlan = await prisma.plan.findUnique({ where: { code: 'FREE' } });
      if (!activePlan) {
        activePlan = await prisma.plan.findFirst({ where: { isActive: true }, orderBy: { order: 'asc' } });
      }
    }

    const now = new Date();
    const isExpired = user.planExpiresAt ? now > new Date(user.planExpiresAt) : false;
    const daysRemaining = user.planExpiresAt 
      ? Math.max(0, Math.ceil((new Date(user.planExpiresAt) - now) / (1000 * 60 * 60 * 24)))
      : null;

    // Check if docLimit reached
    const docLimit = activePlan ? activePlan.docLimit : 30;
    const isDocLimitReached = docLimit !== -1 && user.docsIssuedCount >= docLimit;

    // Sub-users count (includes the owner + subUsers)
    const userLimit = activePlan ? activePlan.userLimit : 1;
    const currentUsersCount = 1 + (user.subUsers ? user.subUsers.length : 0);

    // Get active payment methods from platformConfig
    const platform = await prisma.platformConfig.findFirst();

    res.json({
      plan: activePlan ? {
        ...activePlan,
        features: activePlan.featuresJson ? JSON.parse(activePlan.featuresJson) : []
      } : null,
      planExpiresAt: user.planExpiresAt,
      isExpired,
      daysRemaining,
      docsIssuedCount: user.docsIssuedCount,
      docLimit,
      isDocLimitReached,
      currentUsersCount,
      userLimit,
      isUserLimitReached: currentUsersCount >= userLimit,
      availableGateways: {
        mercadopago: Boolean(platform?.mercadopagoActive && platform?.mercadopagoAccessToken),
        izipay: Boolean(platform?.izipayActive && platform?.izipayPublicKey),
        paypal: Boolean(platform?.paypalActive && platform?.paypalClientId),
        culqi: Boolean(platform?.culqiActive && platform?.culqiPublicKey),
        bankTransfer: Boolean(platform ? platform.bankTransferActive !== false : true)
      },
      bankTransferInfo: platform?.bankTransferInfo || ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar suscripción: ' + error.message });
  }
});

/**
 * POST /api/subscription/checkout
 * Initiate payment order for a selected plan and gateway (Mercado Pago Checkout Pro, etc.)
 */
router.post('/checkout', async (req, res) => {
  try {
    const { planId, gateway = 'MANUAL', notes = '', returnUrl } = req.body;
    const effectiveUserId = req.user.parentId || req.user.id;

    const user = await prisma.user.findUnique({ where: { id: effectiveUserId } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return res.status(400).json({ error: 'Plan seleccionado no válido o no disponible.' });
    }

    const platform = await prisma.platformConfig.findFirst();

    // Check if the plan is free trial
    if (plan.price === 0) {
      const newExpiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: effectiveUserId },
        data: {
          planId: plan.id,
          planExpiresAt: newExpiresAt,
          docsIssuedCount: 0
        }
      });

      return res.json({
        success: true,
        isFree: true,
        message: `Plan Gratuito activado exitosamente por ${plan.durationDays} días.`
      });
    }

    // Verify chosen gateway is enabled on platform
    const gw = (gateway || 'MANUAL').toUpperCase();
    if (gw === 'MERCADOPAGO' && (!platform?.mercadopagoActive || !platform?.mercadopagoAccessToken)) {
      return res.status(400).json({ error: 'La pasarela Mercado Pago no está habilitada o le falta configuración de Access Token.' });
    }
    if (gw === 'IZIPAY' && (!platform?.izipayActive || !platform?.izipayPublicKey)) {
      return res.status(400).json({ error: 'La pasarela Izipay no está habilitada en la plataforma.' });
    }
    if (gw === 'PAYPAL' && (!platform?.paypalActive || !platform?.paypalClientId)) {
      return res.status(400).json({ error: 'La pasarela PayPal no está habilitada en la plataforma.' });
    }
    if (gw === 'CULQI' && (!platform?.culqiActive || !platform?.culqiPublicKey)) {
      return res.status(400).json({ error: 'La pasarela Culqi no está habilitada en la plataforma.' });
    }
    if (gw === 'MANUAL' && platform && platform.bankTransferActive === false) {
      return res.status(400).json({ error: 'La opción de transferencia bancaria ha sido deshabilitada por el administrador.' });
    }

    // Create PaymentOrder record
    const order = await prisma.paymentOrder.create({
      data: {
        userId: effectiveUserId,
        planId: plan.id,
        gateway: gw,
        amount: plan.price,
        currency: plan.currency || 'PEN',
        status: 'PENDING',
        notes: notes || null
      }
    });

    let checkoutData = {
      orderId: order.id,
      amount: plan.price,
      currency: plan.currency,
      planName: plan.name,
      gateway: gateway.toUpperCase()
    };

    // Specific gateway response details
    if (gateway.toUpperCase() === 'MERCADOPAGO') {
      const accessToken = platform?.mercadopagoAccessToken?.trim();
      const isSandbox = platform?.mercadopagoSandbox !== false;

      if (!accessToken) {
        return res.status(400).json({
          error: 'Mercado Pago no está configurado aún. Solicite al SuperAdmin que agregue el Access Token en el panel.'
        });
      }

      // Compute return back URLs
      const origin = returnUrl || req.get('origin') || req.get('referer')?.replace(/\/$/, '') || APP_URL;
      const cleanOrigin = origin.split('?')[0].replace(/\/$/, '');
      const successUrl = `${cleanOrigin}?payment=approved&order_id=${order.id}`;
      const failureUrl = `${cleanOrigin}?payment=failure&order_id=${order.id}`;
      const pendingUrl = `${cleanOrigin}?payment=pending&order_id=${order.id}`;
      const notificationUrl = `${process.env.APP_URL || cleanOrigin}/api/subscription/webhook/mercadopago`;

      const unitPrice = parseFloat(Number(plan.price).toFixed(2));

      // Build Checkout Pro preference payload
      const preferencePayload = {
        items: [
          {
            id: plan.code,
            title: `Plan ${plan.name} - ${platform.platformName || 'APISUNAT PRO'}`,
            description: plan.description || `Suscripción mensual (${plan.docLimit === -1 ? 'Ilimitado' : plan.docLimit + ' comprobantes'})`,
            quantity: 1,
            currency_id: plan.currency === 'USD' ? 'USD' : 'PEN',
            unit_price: unitPrice
          }
        ],
        payer: {
          name: user.name || 'Cliente SaaS',
          email: user.email
        },
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl
        },
        auto_return: 'approved',
        external_reference: order.id,
        statement_descriptor: (platform.platformName || 'APISUNAT').substring(0, 15),
        notification_url: notificationUrl,
        metadata: {
          order_id: order.id,
          user_id: effectiveUserId,
          plan_id: plan.id,
          plan_code: plan.code
        }
      };

      try {
        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(preferencePayload)
        });

        const prefData = await mpRes.json();

        if (!mpRes.ok) {
          console.error('[MercadoPago Checkout] Error al crear preferencia:', prefData);
          return res.status(400).json({
            error: `Error de Mercado Pago: ${prefData.message || prefData.error || 'Credenciales no válidas'}`
          });
        }

        const checkoutUrl = isSandbox && prefData.sandbox_init_point
          ? prefData.sandbox_init_point
          : prefData.init_point;

        // Store preference ID in order
        await prisma.paymentOrder.update({
          where: { id: order.id },
          data: {
            gatewayRef: prefData.id,
            metaJson: JSON.stringify({
              preferenceId: prefData.id,
              initPoint: prefData.init_point,
              sandboxInitPoint: prefData.sandbox_init_point,
              isSandbox
            })
          }
        });

        checkoutData.preferenceId = prefData.id;
        checkoutData.checkoutUrl = checkoutUrl;
        checkoutData.initPoint = prefData.init_point;
        checkoutData.sandboxInitPoint = prefData.sandbox_init_point;
        checkoutData.publicKey = platform?.mercadopagoPublicKey || '';
        checkoutData.isSandbox = isSandbox;
        checkoutData.instructions = 'Haz clic en el botón de Mercado Pago para pagar con Yape, Tarjeta de Crédito/Débito o saldo disponible de forma 100% segura.';
      } catch (mpErr) {
        console.error('[MercadoPago Checkout] Falló conexión a MP:', mpErr);
        return res.status(500).json({ error: 'Error al conectar con la API de Mercado Pago: ' + mpErr.message });
      }

    } else if (gateway.toUpperCase() === 'IZIPAY') {
      checkoutData.publicKey = platform?.izipayPublicKey || '';
      checkoutData.sandbox = platform?.izipaySandbox ?? true;
      checkoutData.instructions = 'Procesamiento de tarjeta de débito/crédito con tecnología Izipay Token.';
    } else if (gateway.toUpperCase() === 'PAYPAL') {
      checkoutData.clientId = platform?.paypalClientId || '';
      checkoutData.mode = platform?.paypalMode || 'sandbox';
      checkoutData.instructions = 'Pago internacional seguro mediante PayPal Express Checkout.';
    } else if (gateway.toUpperCase() === 'CULQI') {
      checkoutData.publicKey = platform?.culqiPublicKey || '';
      checkoutData.instructions = 'Pasarela de pago Culqi con soporte para tarjetas y billeteras móviles.';
    } else {
      // MANUAL / Bank transfer
      checkoutData.bankTransferInfo = platform?.bankTransferInfo || 'Comuníquese con soporte para los datos de abono.';
      checkoutData.instructions = 'Realice la transferencia bancaria o Yape/Plin e ingrese el número de constancia o contacte al administrador.';
    }

    res.json({
      success: true,
      order: checkoutData
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar checkout: ' + error.message });
  }
});

/**
 * POST /api/subscription/orders/:orderId/verify-mercadopago
 * Instant payment verification triggered by frontend after return from Checkout Pro
 */
router.post('/orders/:orderId/verify-mercadopago', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentId } = req.body;
    const effectiveUserId = req.user.parentId || req.user.id;

    const order = await prisma.paymentOrder.findFirst({
      where: { id: orderId, userId: effectiveUserId },
      include: { plan: true, user: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (order.status === 'APPROVED') {
      return res.json({
        success: true,
        approved: true,
        message: `Plan ${order.plan.name} ya se encuentra activo.`
      });
    }

    const platform = await prisma.platformConfig.findFirst();
    if (!platform?.mercadopagoAccessToken) {
      return res.status(400).json({ error: 'Mercado Pago no configurado en la plataforma' });
    }

    const token = platform.mercadopagoAccessToken.trim();
    let approvedPayment = null;

    // 1. Direct payment lookup if paymentId was supplied in callback
    if (paymentId) {
      const pRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.status === 'approved' && (!pData.external_reference || pData.external_reference === order.id)) {
          approvedPayment = pData;
        }
      }
    }

    // 2. Search payments by external_reference if not found by ID
    if (!approvedPayment) {
      const searchRes = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(order.id)}&sort=date_created&criteria=desc`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const found = searchData.results?.find(p => p.status === 'approved');
        if (found) {
          approvedPayment = found;
        }
      }
    }

    if (approvedPayment) {
      await activateOrderAndSubscription(order, approvedPayment.id, approvedPayment);
      return res.json({
        success: true,
        approved: true,
        message: `¡Pago confirmado con Mercado Pago! El plan ${order.plan.name} ha sido activado con éxito.`
      });
    }

    res.json({
      success: true,
      approved: false,
      message: 'El pago aún se encuentra pendiente de acreditación en Mercado Pago.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar pago: ' + error.message });
  }
});

/**
 * GET /api/subscription/orders
 * Returns payment order history for current tenant
 */
router.get('/orders', async (req, res) => {
  try {
    const effectiveUserId = req.user.parentId || req.user.id;
    const orders = await prisma.paymentOrder.findMany({
      where: { userId: effectiveUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: {
          select: { id: true, name: true, code: true, docLimit: true, userLimit: true }
        }
      }
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar pagos: ' + error.message });
  }
});

/**
 * POST /api/subscription/report-payment/:orderId
 * Tenant reports payment reference (e.g. Operation Number from Yape or BCP)
 */
router.post('/report-payment/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { referenceNumber, notes } = req.body;
    const effectiveUserId = req.user.parentId || req.user.id;

    const order = await prisma.paymentOrder.findFirst({
      where: { id: orderId, userId: effectiveUserId }
    });

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    await prisma.paymentOrder.update({
      where: { id: orderId },
      data: {
        gatewayRef: referenceNumber || order.gatewayRef,
        notes: notes ? `${order.notes ? order.notes + ' | ' : ''}${notes}` : order.notes
      }
    });

    res.json({
      success: true,
      message: 'Comprobante de pago informado correctamente. Será revisado y activado por el administrador.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al reportar pago: ' + error.message });
  }
});

module.exports = router;
