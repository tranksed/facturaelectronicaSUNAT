const express = require('express');
const prisma = require('../db');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(requireSuperAdmin);

/**
 * GET /api/superadmin/plans
 * List all plans including inactive ones
 */
router.get('/', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    const parsed = plans.map(p => ({
      ...p,
      features: p.featuresJson ? JSON.parse(p.featuresJson) : [],
      usersCount: p._count.users
    }));

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar planes: ' + error.message });
  }
});

/**
 * POST /api/superadmin/plans
 * Create a new subscription plan
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      price,
      currency = 'PEN',
      billingPeriod = 'MONTHLY',
      docLimit = 30,
      userLimit = 1,
      durationDays = 30,
      features = [],
      isPopular = false,
      isActive = true,
      order = 0
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'El nombre y código del plan son requeridos.' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    const existing = await prisma.plan.findUnique({ where: { code: cleanCode } });
    if (existing) {
      return res.status(400).json({ error: `Ya existe un plan con el código "${cleanCode}".` });
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        code: cleanCode,
        description,
        price: parseFloat(price) || 0,
        currency,
        billingPeriod,
        docLimit: parseInt(docLimit, 10),
        userLimit: parseInt(userLimit, 10),
        durationDays: parseInt(durationDays, 10) || 30,
        featuresJson: JSON.stringify(Array.isArray(features) ? features : []),
        isPopular: !!isPopular,
        isActive: !!isActive,
        order: parseInt(order, 10) || 0
      }
    });

    res.json({
      success: true,
      plan: {
        ...plan,
        features: JSON.parse(plan.featuresJson)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear plan: ' + error.message });
  }
});

/**
 * PUT /api/superadmin/plans/:id
 * Update an existing plan
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      currency,
      billingPeriod,
      docLimit,
      userLimit,
      durationDays,
      features,
      isPopular,
      isActive,
      order
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = parseFloat(price);
    if (currency !== undefined) data.currency = currency;
    if (billingPeriod !== undefined) data.billingPeriod = billingPeriod;
    if (docLimit !== undefined) data.docLimit = parseInt(docLimit, 10);
    if (userLimit !== undefined) data.userLimit = parseInt(userLimit, 10);
    if (durationDays !== undefined) data.durationDays = parseInt(durationDays, 10);
    if (features !== undefined) data.featuresJson = JSON.stringify(Array.isArray(features) ? features : []);
    if (isPopular !== undefined) data.isPopular = !!isPopular;
    if (isActive !== undefined) data.isActive = !!isActive;
    if (order !== undefined) data.order = parseInt(order, 10);

    const updated = await prisma.plan.update({
      where: { id },
      data
    });

    res.json({
      success: true,
      plan: {
        ...updated,
        features: JSON.parse(updated.featuresJson)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar plan: ' + error.message });
  }
});

/**
 * DELETE /api/superadmin/plans/:id
 * Delete or deactivate a plan
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const usersCount = await prisma.user.count({ where: { planId: id } });

    if (usersCount > 0) {
      // Cannot hard delete if users are assigned; deactivate instead
      await prisma.plan.update({
        where: { id },
        data: { isActive: false }
      });
      return res.json({
        success: true,
        message: `El plan tiene ${usersCount} usuarios asignados. Ha sido desactivado para no admitir nuevos registros.`
      });
    }

    await prisma.plan.delete({ where: { id } });
    res.json({ success: true, message: 'Plan eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar plan: ' + error.message });
  }
});

/**
 * PUT /api/superadmin/users/:userId/plan
 * Assign plan or adjust quota manually for a user
 */
router.put('/users/:userId/plan', async (req, res) => {
  try {
    const { userId } = req.params;
    const { planId, planExpiresAt, docsIssuedCount, resetCount } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const updateData = {};
    if (planId) {
      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      if (!plan) return res.status(400).json({ error: 'Plan seleccionado inválido' });
      updateData.planId = plan.id;
      if (!planExpiresAt) {
        updateData.planExpiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
      }
    }
    if (planExpiresAt !== undefined) {
      updateData.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null;
    }
    if (resetCount) {
      updateData.docsIssuedCount = 0;
    } else if (docsIssuedCount !== undefined) {
      updateData.docsIssuedCount = parseInt(docsIssuedCount, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { plan: true }
    });

    res.json({
      success: true,
      message: 'Plan de usuario actualizado exitosamente.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        plan: updatedUser.plan,
        planExpiresAt: updatedUser.planExpiresAt,
        docsIssuedCount: updatedUser.docsIssuedCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar plan a usuario: ' + error.message });
  }
});

/**
 * GET /api/superadmin/gateways
 * Retrieve payment gateways configuration
 */
router.get('/gateways/config', async (req, res) => {
  try {
    let platform = await prisma.platformConfig.findFirst();
    if (!platform) {
      platform = await prisma.platformConfig.create({ data: {} });
    }

    res.json({
      izipayActive: platform.izipayActive,
      izipayPublicKey: platform.izipayPublicKey || '',
      izipayClientAnswer: platform.izipayClientAnswer || '',
      izipayShaKey: platform.izipayShaKey || '',
      izipaySandbox: platform.izipaySandbox,

      mercadopagoActive: platform.mercadopagoActive,
      mercadopagoPublicKey: platform.mercadopagoPublicKey || '',
      mercadopagoAccessToken: platform.mercadopagoAccessToken || '',
      mercadopagoSandbox: platform.mercadopagoSandbox,

      paypalActive: platform.paypalActive,
      paypalClientId: platform.paypalClientId || '',
      paypalSecret: platform.paypalSecret || '',
      paypalMode: platform.paypalMode || 'sandbox',

      culqiActive: platform.culqiActive,
      culqiPublicKey: platform.culqiPublicKey || '',
      culqiSecretKey: platform.culqiSecretKey || '',

      bankTransferActive: platform.bankTransferActive,
      bankTransferInfo: platform.bankTransferInfo || ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener configuración de pasarelas: ' + error.message });
  }
});

/**
 * PUT /api/superadmin/gateways
 * Update payment gateways configuration
 */
router.put('/gateways/config', async (req, res) => {
  try {
    const {
      izipayActive,
      izipayPublicKey,
      izipayClientAnswer,
      izipayShaKey,
      izipaySandbox,

      mercadopagoActive,
      mercadopagoPublicKey,
      mercadopagoAccessToken,
      mercadopagoSandbox,

      paypalActive,
      paypalClientId,
      paypalSecret,
      paypalMode,

      culqiActive,
      culqiPublicKey,
      culqiSecretKey,

      bankTransferActive,
      bankTransferInfo
    } = req.body;

    let platform = await prisma.platformConfig.findFirst();
    const data = {
      izipayActive: !!izipayActive,
      izipayPublicKey: izipayPublicKey || null,
      izipayClientAnswer: izipayClientAnswer || null,
      izipayShaKey: izipayShaKey || null,
      izipaySandbox: izipaySandbox !== false,

      mercadopagoActive: !!mercadopagoActive,
      mercadopagoPublicKey: mercadopagoPublicKey || null,
      mercadopagoAccessToken: mercadopagoAccessToken || null,
      mercadopagoSandbox: mercadopagoSandbox !== false,

      paypalActive: !!paypalActive,
      paypalClientId: paypalClientId || null,
      paypalSecret: paypalSecret || null,
      paypalMode: paypalMode || 'sandbox',

      culqiActive: !!culqiActive,
      culqiPublicKey: culqiPublicKey || null,
      culqiSecretKey: culqiSecretKey || null,

      bankTransferActive: bankTransferActive !== false,
      bankTransferInfo: bankTransferInfo || null
    };

    if (platform) {
      platform = await prisma.platformConfig.update({
        where: { id: platform.id },
        data
      });
    } else {
      platform = await prisma.platformConfig.create({ data });
    }

    res.json({
      success: true,
      message: 'Configuración de pasarelas de pago guardada exitosamente.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar pasarelas: ' + error.message });
  }
});

/**
 * GET /api/superadmin/gateways/orders
 * List all payment orders across tenants
 */
router.get('/gateways/orders', async (req, res) => {
  try {
    const orders = await prisma.paymentOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        plan: {
          select: { id: true, name: true, code: true, docLimit: true, userLimit: true }
        }
      }
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar órdenes de pago: ' + error.message });
  }
});

/**
 * POST /api/superadmin/gateways/orders/:orderId/approve
 * SuperAdmin manual approval of payment order
 */
router.post('/gateways/orders/:orderId/approve', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await prisma.paymentOrder.findUnique({
      where: { id: orderId },
      include: { plan: true, user: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Orden de pago no encontrada' });
    }

    const durationDays = order.plan.durationDays || 30;
    const newExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // Update order
    await prisma.paymentOrder.update({
      where: { id: orderId },
      data: { status: 'APPROVED' }
    });

    // Update user's plan and reset doc quota
    await prisma.user.update({
      where: { id: order.userId },
      data: {
        planId: order.planId,
        planExpiresAt: newExpiresAt,
        docsIssuedCount: 0
      }
    });

    res.json({
      success: true,
      message: `Orden aprobada con éxito. Plan ${order.plan.name} activado para ${order.user.email} hasta el ${newExpiresAt.toLocaleDateString()}.`
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al aprobar orden: ' + error.message });
  }
});

module.exports = router;
