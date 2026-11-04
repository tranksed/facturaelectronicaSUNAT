const express = require('express');
const prisma = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
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
    const currentUsersCount = 1 + user.subUsers.length;

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
        izipay: platform?.izipayActive && !!platform?.izipayPublicKey,
        mercadopago: platform?.mercadopagoActive && (!!platform?.mercadopagoPublicKey || !!platform?.mercadopagoAccessToken),
        paypal: platform?.paypalActive && !!platform?.paypalClientId,
        culqi: platform?.culqiActive && !!platform?.culqiPublicKey,
        bankTransfer: platform?.bankTransferActive ?? true
      },
      bankTransferInfo: platform?.bankTransferInfo || ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar suscripción: ' + error.message });
  }
});

/**
 * POST /api/subscription/checkout
 * Initiate payment order for a selected plan and gateway
 */
router.post('/checkout', async (req, res) => {
  try {
    const { planId, gateway = 'MANUAL', notes = '' } = req.body;
    const effectiveUserId = req.user.parentId || req.user.id;

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

    // Create PaymentOrder record
    const order = await prisma.paymentOrder.create({
      data: {
        userId: effectiveUserId,
        planId: plan.id,
        gateway: gateway.toUpperCase(),
        amount: plan.price,
        currency: plan.currency,
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
      checkoutData.publicKey = platform?.mercadopagoPublicKey || '';
      checkoutData.sandbox = platform?.mercadopagoSandbox ?? true;
      checkoutData.checkoutUrl = platform?.mercadopagoAccessToken 
        ? `https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=${order.id}`
        : null;
      checkoutData.instructions = 'Se generará la preferencia de pago segura de Mercado Pago.';
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
