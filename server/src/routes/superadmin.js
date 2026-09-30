const express = require('express');
const prisma = require('../db');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(requireSuperAdmin);

/**
 * GET /api/superadmin/stats
 * Global statistics across all tenants.
 */
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
    const totalCompanies = await prisma.company.count();
    const totalInvoices = await prisma.invoice.count();
    
    const invoices = await prisma.invoice.findMany({
      where: { status: 'ACEPTADO' },
      select: { montoTotal: true }
    });
    const totalBilled = invoices.reduce((sum, inv) => sum + inv.montoTotal, 0);

    const acceptedInvoices = await prisma.invoice.count({ where: { status: 'ACEPTADO' } });
    const rejectedInvoices = await prisma.invoice.count({ where: { status: 'RECHAZADO' } });
    const errorInvoices = await prisma.invoice.count({ where: { status: 'ERROR' } });

    res.json({
      totalUsers,
      totalCompanies,
      totalInvoices,
      totalBilled,
      acceptedInvoices,
      rejectedInvoices,
      errorInvoices
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas globales: ' + error.message });
  }
});

/**
 * GET /api/superadmin/users
 * Lists all registered users with their companies and invoice metrics.
 */
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        companies: {
          select: {
            id: true,
            ruc: true,
            razonSocial: true,
            isProduction: true,
            pfxCert: true,
            _count: {
              select: { invoices: true }
            }
          }
        }
      }
    });

    const userList = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      companiesCount: u.companies.length,
      invoicesCount: u.companies.reduce((sum, c) => sum + (c._count?.invoices || 0), 0),
      companies: u.companies.map(c => ({
        id: c.id,
        ruc: c.ruc,
        razonSocial: c.razonSocial,
        hasCert: !!c.pfxCert,
        isProduction: c.isProduction,
        invoicesCount: c._count?.invoices || 0
      }))
    }));

    res.json(userList);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar usuarios: ' + error.message });
  }
});

/**
 * PUT /api/superadmin/users/:id/status
 * Enables or suspends a tenant account.
 */
router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido. Use "ACTIVE" o "SUSPENDED".' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status }
    });

    res.json({
      success: true,
      message: `Cuenta de ${updated.name} (${updated.email}) ahora está: ${status === 'ACTIVE' ? 'Activa' : 'Suspendida'}.`,
      user: { id: updated.id, status: updated.status }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado del usuario: ' + error.message });
  }
});

/**
 * GET /api/superadmin/white-label
 * Gets global white-label settings.
 */
router.get('/white-label', async (req, res) => {
  try {
    let platform = await prisma.platformConfig.findFirst();
    if (!platform) {
      platform = await prisma.platformConfig.create({
        data: {
          platformName: 'APISUNAT PRO',
          platformSubtitle: 'Plataforma SaaS Multitenant de Facturación Electrónica SUNAT',
          primaryColor: '#2563eb',
          allowRegistration: true,
          telegramBotEnabled: true
        }
      });
    }
    res.json(platform);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener configuración de marca blanca: ' + error.message });
  }
});

/**
 * PUT /api/superadmin/white-label
 * Updates platform name, logo, primary color and global integration toggles.
 */
router.put('/white-label', async (req, res) => {
  try {
    const {
      platformName,
      platformSubtitle,
      logoUrl,
      primaryColor,
      allowRegistration,
      telegramBotEnabled,
      supportEmail,
      supportPhone
    } = req.body;

    const existing = await prisma.platformConfig.findFirst();
    const data = {
      platformName: platformName || 'APISUNAT PRO',
      platformSubtitle: platformSubtitle || '',
      logoUrl: logoUrl !== undefined ? logoUrl : existing?.logoUrl,
      primaryColor: primaryColor || '#2563eb',
      allowRegistration: allowRegistration !== undefined ? !!allowRegistration : true,
      telegramBotEnabled: telegramBotEnabled !== undefined ? !!telegramBotEnabled : true,
      supportEmail: supportEmail || '',
      supportPhone: supportPhone || ''
    };

    let updated;
    if (existing) {
      updated = await prisma.platformConfig.update({
        where: { id: existing.id },
        data
      });
    } else {
      updated = await prisma.platformConfig.create({ data });
    }

    res.json({
      success: true,
      message: 'Configuración de Marca Blanca actualizada correctamente.',
      platform: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar configuración de marca blanca: ' + error.message });
  }
});

/**
 * GET /api/superadmin/storage
 * Returns VPS file server storage metrics and periods.
 */
router.get('/storage', async (req, res) => {
  try {
    const { getStorageStats } = require('../services/storage-service');
    const stats = await getStorageStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener métricas de almacenamiento: ' + error.message });
  }
});

/**
 * PUT /api/superadmin/storage
 * Updates storage provider configuration (LOCAL, S3, HYBRID, SFTP) in PlatformConfig.
 */
router.put('/storage', async (req, res) => {
  try {
    const {
      storageProvider,
      localStoragePath,
      s3Endpoint,
      s3Region,
      s3Bucket,
      s3AccessKey,
      s3SecretKey,
      s3ForcePathStyle,
      s3PublicUrl,
      sftpHost,
      sftpPort,
      sftpUser,
      sftpPassword,
      sftpRemotePath
    } = req.body;

    const existing = await prisma.platformConfig.findFirst();

    const data = {
      storageProvider: storageProvider || 'LOCAL',
      localStoragePath: localStoragePath || 'storage/comprobantes',
      s3Endpoint: s3Endpoint || null,
      s3Region: s3Region || 'us-east-1',
      s3Bucket: s3Bucket || null,
      s3ForcePathStyle: !!s3ForcePathStyle,
      s3PublicUrl: s3PublicUrl || null,
      sftpHost: sftpHost || null,
      sftpPort: sftpPort ? parseInt(sftpPort, 10) : 22,
      sftpUser: sftpUser || null,
      sftpRemotePath: sftpRemotePath || '/var/storage/comprobantes'
    };

    // Only update sensitive keys if provided (prevent overwriting with empty)
    if (s3AccessKey) data.s3AccessKey = s3AccessKey;
    if (s3SecretKey) data.s3SecretKey = s3SecretKey;
    if (sftpPassword) data.sftpPassword = sftpPassword;

    let updated;
    if (existing) {
      updated = await prisma.platformConfig.update({
        where: { id: existing.id },
        data
      });
    } else {
      updated = await prisma.platformConfig.create({ data });
    }

    res.json({
      success: true,
      message: 'Configuración de almacenamiento guardada exitosamente.',
      platform: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar configuración de almacenamiento: ' + error.message });
  }
});

/**
 * POST /api/superadmin/storage/test
 * Tests live connection with configured S3 bucket.
 */
router.post('/storage/test', async (req, res) => {
  try {
    const { testS3Connection } = require('../services/storage-service');
    const result = await testS3Connection(req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al verificar conexión con S3: ' + error.message });
  }
});

module.exports = router;


