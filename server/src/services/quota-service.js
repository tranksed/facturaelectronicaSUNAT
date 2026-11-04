const prisma = require('../db');

/**
 * Validates whether the tenant has remaining document quota and an active subscription.
 * @param {string} userId - ID of the tenant owner or sub-user
 * @returns {Promise<{allowed: boolean, error?: string, user?: object, docLimit?: number}>}
 */
async function checkTenantQuota(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true }
  });

  if (!user) {
    return { allowed: false, error: 'Usuario de tenant no encontrado.' };
  }

  // If sub-user, check the parent owner's subscription
  if (user.parentId) {
    return checkTenantQuota(user.parentId);
  }

  // If user has no plan assigned, default to FREE
  let plan = user.plan;
  if (!plan) {
    plan = await prisma.plan.findUnique({ where: { code: 'FREE' } });
  }

  const docLimit = plan ? plan.docLimit : 30;

  // 1. Check expiration date
  if (user.planExpiresAt && new Date() > new Date(user.planExpiresAt)) {
    return {
      allowed: false,
      error: `Su plan ha expirado el ${new Date(user.planExpiresAt).toLocaleDateString()}. Por favor regularice su pago para continuar emitiendo comprobantes.`
    };
  }

  // 2. Check doc limit (if not -1 unlimited)
  if (docLimit !== -1 && user.docsIssuedCount >= docLimit) {
    return {
      allowed: false,
      error: `Ha alcanzado el límite de ${docLimit} comprobantes mensuales permitido en su ${plan?.name || 'Plan Gratuito'}. Por favor actualice a un paquete superior para continuar emitiendo.`
    };
  }

  return {
    allowed: true,
    user,
    plan,
    docLimit,
    docsIssuedCount: user.docsIssuedCount
  };
}

/**
 * Increments the document counter for the tenant owner
 * @param {string} userId 
 */
async function incrementTenantDocCount(userId) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const targetId = user?.parentId || userId;
    await prisma.user.update({
      where: { id: targetId },
      data: { docsIssuedCount: { increment: 1 } }
    });
  } catch (err) {
    console.warn('Error incrementing tenant doc count:', err.message);
  }
}

module.exports = {
  checkTenantQuota,
  incrementTenantDocCount
};
