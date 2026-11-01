const express = require('express');
const prisma = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { syncCompanySunafil, syncMassiveSunafil } = require('../services/buzon-sunafil-service');

const router = express.Router();
router.use(authenticateToken);

/**
 * GET /api/sunafil/alerts
 * List SUNAFIL Casilla Electrónica notifications and labor inspect alerts.
 */
router.get('/alerts', async (req, res) => {
  try {
    const { companyId, estado, prioridad } = req.query;

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
        alerts: [],
        totalCount: 0,
        pendingCount: 0,
        highPriorityCount: 0,
        companies: []
      });
    }

    const where = {
      companyId: companyId && companyIds.includes(companyId) ? companyId : { in: companyIds }
    };

    if (estado && estado !== 'ALL') where.estado = estado;
    if (prioridad && prioridad !== 'ALL') where.prioridad = prioridad;

    const alerts = await prisma.sunafilAlert.findMany({
      where,
      include: {
        company: {
          select: { id: true, ruc: true, razonSocial: true }
        }
      },
      orderBy: { fechaDeposito: 'desc' }
    });

    const pendingCount = alerts.filter(a => a.estado === 'PENDIENTE').length;
    const highPriorityCount = alerts.filter(a => a.prioridad === 'ALTA').length;

    res.json({
      alerts,
      totalCount: alerts.length,
      pendingCount,
      highPriorityCount,
      companies: userCompanies
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar alertas de SUNAFIL: ' + error.message });
  }
});

/**
 * POST /api/sunafil/sync
 * Sincroniza Casilla Electrónica SUNAFIL (individual o masivo para todas las empresas con Clave SOL).
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

    const results = await syncMassiveSunafil(targetCompanyIds);
    const successfulCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Sincronización completada: ${successfulCount} de ${targetCompanyIds.length} empresa(s) sincronizada(s) con Casilla SUNAFIL.`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en sincronización con SUNAFIL: ' + error.message });
  }
});

/**
 * PUT /api/sunafil/alerts/:id
 * Actualiza estado (ej: PENDIENTE / ATENDIDO) o lectura.
 */
router.put('/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, leido } = req.body;

    const alert = await prisma.sunafilAlert.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada.' });

    if (req.user.role !== 'SUPERADMIN' && alert.company.userId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta alerta.' });
    }

    const dataToUpdate = {};
    if (estado) dataToUpdate.estado = estado;
    if (typeof leido === 'boolean') dataToUpdate.leido = leido;

    const updated = await prisma.sunafilAlert.update({
      where: { id },
      data: dataToUpdate
    });

    res.json({ success: true, alert: updated });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar alerta de SUNAFIL: ' + error.message });
  }
});

/**
 * DELETE /api/sunafil/alerts/:id
 */
router.delete('/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await prisma.sunafilAlert.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada.' });

    if (req.user.role !== 'SUPERADMIN' && alert.company.userId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta alerta.' });
    }

    await prisma.sunafilAlert.delete({ where: { id } });
    res.json({ success: true, message: 'Alerta eliminada.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar alerta: ' + error.message });
  }
});

module.exports = router;
