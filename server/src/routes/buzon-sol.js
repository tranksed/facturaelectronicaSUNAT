const express = require('express');
const prisma = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { syncCompanyBuzonSol, syncMassiveBuzonSol } = require('../services/buzon-sunafil-service');

const router = express.Router();
router.use(authenticateToken);

/**
 * GET /api/buzon-sol/notifications
 * List Buzón SOL notifications for the user's companies.
 */
router.get('/notifications', async (req, res) => {
  try {
    const { companyId, status, tipo } = req.query;

    // Get list of company IDs accessible to this user
    let userCompanies;
    if (req.user.role === 'SUPERADMIN') {
      userCompanies = await prisma.company.findMany({
        select: { id: true, ruc: true, razonSocial: true }
      });
    } else {
      userCompanies = await prisma.company.findMany({
        where: { userId: req.user.id },
        select: { id: true, ruc: true, razonSocial: true }
      });
    }

    const companyIds = userCompanies.map(c => c.id);

    if (companyIds.length === 0) {
      return res.json({
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        urgentCount: 0,
        companies: []
      });
    }

    const where = {
      companyId: companyId && companyIds.includes(companyId) ? companyId : { in: companyIds }
    };

    if (status === 'UNREAD') where.leido = false;
    if (status === 'READ') where.leido = true;
    if (tipo && tipo !== 'ALL') where.tipoNotificacion = tipo;

    const notifications = await prisma.buzonSolNotification.findMany({
      where,
      include: {
        company: {
          select: { id: true, ruc: true, razonSocial: true }
        }
      },
      orderBy: { fechaDeposito: 'desc' }
    });

    const unreadCount = notifications.filter(n => !n.leido).length;
    const urgentCount = notifications.filter(n => n.etiqueta === 'URGENTE' || n.etiqueta === 'PLAZO_VENCE').length;

    res.json({
      notifications,
      totalCount: notifications.length,
      unreadCount,
      urgentCount,
      companies: userCompanies
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar notificaciones del Buzón SOL: ' + error.message });
  }
});

/**
 * POST /api/buzon-sol/sync
 * Sincroniza Buzón SOL (individual o masivo para todas las empresas con Clave SOL).
 */
router.post('/sync', async (req, res) => {
  try {
    const { companyId, mode } = req.body;

    let targetCompanyIds = [];
    if (mode === 'ALL' || !companyId) {
      const companies = req.user.role === 'SUPERADMIN'
        ? await prisma.company.findMany({ select: { id: true } })
        : await prisma.company.findMany({ where: { userId: req.user.id }, select: { id: true } });
      targetCompanyIds = companies.map(c => c.id);
    } else {
      targetCompanyIds = [companyId];
    }

    if (targetCompanyIds.length === 0) {
      return res.status(400).json({ error: 'No se encontraron empresas para sincronizar.' });
    }

    const results = await syncMassiveBuzonSol(targetCompanyIds);
    const successfulCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Sincronización completada: ${successfulCount} de ${targetCompanyIds.length} empresa(s) sincronizada(s) con Buzón SOL.`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en sincronización con Buzón SOL: ' + error.message });
  }
});

/**
 * PUT /api/buzon-sol/notifications/:id/read
 * Alterna estado leído/no leído de una notificación.
 */
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { leido } = req.body;

    const notif = await prisma.buzonSolNotification.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada.' });

    // Validate ownership
    if (req.user.role !== 'SUPERADMIN' && notif.company.userId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta notificación.' });
    }

    const updated = await prisma.buzonSolNotification.update({
      where: { id },
      data: { leido: typeof leido === 'boolean' ? leido : !notif.leido }
    });

    res.json({ success: true, notification: updated });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar notificación: ' + error.message });
  }
});

/**
 * DELETE /api/buzon-sol/notifications/:id
 */
router.delete('/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await prisma.buzonSolNotification.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada.' });

    if (req.user.role !== 'SUPERADMIN' && notif.company.userId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta notificación.' });
    }

    await prisma.buzonSolNotification.delete({ where: { id } });
    res.json({ success: true, message: 'Notificación eliminada.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar notificación: ' + error.message });
  }
});

module.exports = router;
