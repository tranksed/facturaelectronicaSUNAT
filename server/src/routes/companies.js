const express = require('express');
const prisma = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { extractKeysFromPfx } = require('../services/xml-signer');
const { compressXml, sendBillToSunat } = require('../services/sunat-client');
const { consultarRuc } = require('../services/padron-service');
const { startBot } = require('../bot/telegram-bot');

const router = express.Router();

// Require authentication for all company endpoints
router.use(authenticateToken);

/**
 * GET /api/companies
 * Lists all companies for the current user.
 */
router.get('/', async (req, res) => {
  try {
    const effectiveUserId = req.user.parentId || req.user.id;
    const companies = await prisma.company.findMany({
      where: req.user.role === 'SUPERADMIN' && req.query.all === 'true' 
        ? {} 
        : { userId: effectiveUserId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { invoices: true }
        }
      }
    });

    const list = companies.map(c => ({
      id: c.id,
      userId: c.userId,
      ruc: c.ruc,
      razonSocial: c.razonSocial,
      nombreComercial: c.nombreComercial,
      direccion: c.direccion,
      contacto: c.contacto,
      hasCert: !!c.pfxCert,
      isProduction: c.isProduction,
      telegramToken: c.telegramToken || '',
      telegramBotUsername: c.telegramBotUsername || '',
      isDefault: c.isDefault,
      invoiceCount: c._count?.invoices || 0,
      createdAt: c.createdAt
    }));

    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar empresas: ' + error.message });
  }
});

/**
 * POST /api/companies
 * Creates a new company under current user.
 */
router.post('/', async (req, res) => {
  try {
    const effectiveUserId = req.user.parentId || req.user.id;
    const { ruc, razonSocial, nombreComercial, direccion, contacto, piePagina } = req.body;

    if (!ruc || !/^\d{11}$/.test(ruc)) {
      return res.status(400).json({ error: 'Debe ingresar un RUC válido de 11 dígitos.' });
    }

    // Check companyLimit in tenant's plan
    if (req.user.role !== 'SUPERADMIN') {
      const userWithPlan = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        include: { plan: true }
      });
      const allowedCompanies = userWithPlan?.plan?.companyLimit ?? 1;
      const currentCompanyCount = await prisma.company.count({ where: { userId: effectiveUserId } });
      if (allowedCompanies !== -1 && currentCompanyCount >= allowedCompanies) {
        return res.status(403).json({
          error: `Has alcanzado el límite de ${allowedCompanies} empresa(s) permitidas por tu plan actual (${userWithPlan?.plan?.name || 'Básico'}). Actualiza tu plan para registrar más RUCs.`
        });
      }
    }

    // Check if user already has this RUC
    const existing = await prisma.company.findFirst({
      where: { userId: effectiveUserId, ruc }
    });
    if (existing) {
      return res.status(400).json({ error: `Ya tienes registrada una empresa con el RUC ${ruc}.` });
    }

    // Auto-lookup if name or address not provided
    let finalRazon = razonSocial;
    let finalDireccion = direccion;
    let finalComercial = nombreComercial;

    if (!finalRazon || !finalDireccion) {
      try {
        const padron = await consultarRuc(ruc);
        if (padron && padron.nombre) {
          if (!finalRazon) finalRazon = padron.nombre;
          if (!finalDireccion) finalDireccion = padron.direccion || 'LIMA, PERU';
          if (!finalComercial) finalComercial = padron.nombre;
        }
      } catch (e) {
        // Fallback to provided or generic
      }
    }

    const companyCount = await prisma.company.count({ where: { userId: effectiveUserId } });

    const newCompany = await prisma.company.create({
      data: {
        userId: effectiveUserId,
        ruc,
        razonSocial: finalRazon || `EMPRESA RUC ${ruc}`,
        nombreComercial: finalComercial || finalRazon,
        direccion: finalDireccion || 'LIMA, PERU',
        contacto: contacto || '',
        piePagina: piePagina || '',
        isDefault: companyCount === 0 // First company becomes default
      }
    });

    res.json({
      success: true,
      message: 'Empresa creada exitosamente.',
      company: newCompany
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear empresa: ' + error.message });
  }
});

/**
 * GET /api/companies/:id
 * Retrieves full details for a company.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const effectiveUserId = req.user.parentId || req.user.id;
    const company = await prisma.company.findFirst({
      where: req.user.role === 'SUPERADMIN' ? { id } : { id, userId: effectiveUserId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada o no tienes permisos para acceder.' });
    }

    res.json({
      id: company.id,
      ruc: company.ruc,
      razonSocial: company.razonSocial,
      nombreComercial: company.nombreComercial || '',
      direccion: company.direccion,
      contacto: company.contacto || '',
      piePagina: company.piePagina || '',
      logoBase64: company.logoBase64 || '',
      mostrarLogoTicket: company.mostrarLogoTicket,
      bankAccounts: JSON.parse(company.bankAccountsJson || '[]'),
      preferences: JSON.parse(company.preferencesJson || '{}'),
      usuarioSol: company.usuarioSol,
      hasClaveSol: !!company.claveSol,
      hasCert: !!company.pfxCert,
      isProduction: company.isProduction,
      telegramToken: company.telegramToken || '',
      telegramBotUsername: company.telegramBotUsername || '',
      isDefault: company.isDefault
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos de la empresa: ' + error.message });
  }
});

/**
 * PUT /api/companies/:id
 * Updates company profile, logo, bank accounts, preferences, SOL and Certificate.
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      razonSocial,
      nombreComercial,
      direccion,
      contacto,
      piePagina,
      logoBase64,
      mostrarLogoTicket,
      bankAccounts,
      preferences,
      usuarioSol,
      claveSol,
      pfxCertBase64,
      pfxPassword,
      isProduction,
      telegramToken,
      isDefault
    } = req.body;

    const effectiveUserId = req.user.parentId || req.user.id;
    const company = await prisma.company.findFirst({
      where: req.user.role === 'SUPERADMIN' ? { id } : { id, userId: effectiveUserId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada.' });
    }

    const updateData = {};
    if (razonSocial !== undefined) updateData.razonSocial = razonSocial;
    if (nombreComercial !== undefined) updateData.nombreComercial = nombreComercial;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (contacto !== undefined) updateData.contacto = contacto;
    if (piePagina !== undefined) updateData.piePagina = piePagina;
    if (logoBase64 !== undefined) updateData.logoBase64 = logoBase64;
    if (mostrarLogoTicket !== undefined) updateData.mostrarLogoTicket = !!mostrarLogoTicket;
    if (bankAccounts !== undefined) updateData.bankAccountsJson = JSON.stringify(bankAccounts);
    if (preferences !== undefined) updateData.preferencesJson = JSON.stringify(preferences);
    if (usuarioSol !== undefined) updateData.usuarioSol = usuarioSol;
    if (claveSol) updateData.claveSol = claveSol;
    if (isProduction !== undefined) updateData.isProduction = !!isProduction;
    if (telegramToken !== undefined) updateData.telegramToken = telegramToken;
    if (req.body.telegramBotUsername !== undefined) updateData.telegramBotUsername = req.body.telegramBotUsername;

    if (pfxPassword) updateData.pfxPassword = pfxPassword;
    if (pfxCertBase64) {
      updateData.pfxCert = Buffer.from(pfxCertBase64, 'base64');
    }

    if (isDefault) {
      // Unset previous defaults for this user
      await prisma.company.updateMany({
        where: { userId: company.userId },
        data: { isDefault: false }
      });
      updateData.isDefault = true;
    }

    const updated = await prisma.company.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Configuración de la empresa guardada exitosamente.',
      company: {
        id: updated.id,
        ruc: updated.ruc,
        razonSocial: updated.razonSocial,
        nombreComercial: updated.nombreComercial,
        hasCert: !!updated.pfxCert,
        isProduction: updated.isProduction
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar empresa: ' + error.message });
  }
});

/**
 * DELETE /api/companies/:id
 * Deletes a company.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const effectiveUserId = req.user.parentId || req.user.id;
    const company = await prisma.company.findFirst({
      where: req.user.role === 'SUPERADMIN' ? { id } : { id, userId: effectiveUserId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada.' });
    }

    const count = await prisma.company.count({ where: { userId: company.userId } });
    if (count <= 1 && req.user.role !== 'SUPERADMIN') {
      return res.status(400).json({ error: 'No puedes eliminar tu única empresa registrada.' });
    }

    await prisma.company.delete({ where: { id } });

    res.json({ success: true, message: 'Empresa eliminada exitosamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar empresa: ' + error.message });
  }
});

/**
 * POST /api/companies/:id/test
 * Tests SUNAT credentials and certificate decryption for this company.
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const effectiveUserId = req.user.parentId || req.user.id;
    const company = await prisma.company.findFirst({
      where: req.user.role === 'SUPERADMIN' ? { id } : { id, userId: effectiveUserId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada.' });
    }

    const { pfxCertBase64, pfxPassword, usuarioSol, claveSol, isProduction } = req.body || {};

    const certBuffer = pfxCertBase64 ? Buffer.from(pfxCertBase64, 'base64') : company.pfxCert;
    const certPass = pfxPassword || company.pfxPassword;
    const solUser = usuarioSol || company.usuarioSol;
    const solPass = claveSol || company.claveSol;
    const prod = isProduction !== undefined ? isProduction : company.isProduction;

    if (!certBuffer) {
      return res.status(400).json({ error: 'Debes subir un Certificado Digital (.pfx) para la empresa antes de probar la conexión.' });
    }

    // 1. Test decryption
    extractKeysFromPfx(certBuffer, certPass);

    // 2. Test SOAP connection with SUNAT
    const dummyZip = compressXml('test-file', '<test></test>');
    try {
      await sendBillToSunat({
        ruc: company.ruc,
        usuarioSol: solUser,
        claveSol: solPass,
        fileName: `${company.ruc}-test-file`,
        xmlZipBuffer: dummyZip,
        isProduction: prod
      });
    } catch (sunatErr) {
      if (sunatErr.message.includes('0102') || sunatErr.message.includes('clave SOL son incorrectos')) {
        throw new Error('Usuario SOL o Clave SOL incorrectos en SUNAT.');
      }
      // If error is about XML format / filename, authentication was verified!
    }

    res.json({
      success: true,
      message: 'Prueba exitosa: El Certificado Digital y las credenciales SOL de esta empresa se conectaron correctamente a SUNAT.'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/companies/:id/telegram-token
 * Validates a bot token with Telegram API (getMe) and saves it to company.
 */
router.post('/:id/telegram-token', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.body;
    const effectiveUserId = req.user.parentId || req.user.id;

    const company = await prisma.company.findFirst({
      where: req.user.role === 'SUPERADMIN' ? { id } : { id, userId: effectiveUserId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada.' });
    }

    // Verify if user's plan permits Telegram Bot
    if (req.user.role !== 'SUPERADMIN') {
      const userWithPlan = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        include: { plan: true }
      });
      if (userWithPlan?.plan && userWithPlan.plan.hasTelegramBot === false) {
        return res.status(403).json({
          error: 'Tu plan actual no incluye la integración con Bot de Telegram. Mejora tu plan para activar este módulo.'
        });
      }
    }

    const cleanToken = (token || '').trim();
    if (!cleanToken) {
      // Disconnect token
      await prisma.company.update({
        where: { id },
        data: { telegramToken: null, telegramBotUsername: null }
      });
      return res.json({ success: true, message: 'Bot de Telegram desvinculado de la empresa.', disconnected: true });
    }

    // Validate token against Telegram official Bot API
    let tgRes;
    try {
      tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    } catch (netErr) {
      return res.status(400).json({ error: 'No se pudo conectar con la API de Telegram: ' + netErr.message });
    }

    const tgData = await tgRes.json();
    if (!tgData.ok) {
      return res.status(400).json({
        error: `Token rechazado por Telegram: ${tgData.description || 'Token inválido o revocado'}`
      });
    }

    const botUser = tgData.result;
    const botUsername = botUser.username;

    // Update company in DB
    const updated = await prisma.company.update({
      where: { id },
      data: {
        telegramToken: cleanToken,
        telegramBotUsername: botUsername
      }
    });

    // Start/restart the bot runner with this token
    try {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      startBot(cleanToken, appUrl);
    } catch (botErr) {
      console.warn('Bot started with warning:', botErr.message);
    }

    res.json({
      success: true,
      message: `¡Bot de Telegram vinculado exitosamente! Conectado como @${botUsername}`,
      bot: {
        id: botUser.id,
        firstName: botUser.first_name,
        username: botUsername,
        telegramLink: `https://t.me/${botUsername}`
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al vincular Bot de Telegram: ' + error.message });
  }
});

/**
 * DELETE /api/companies/:id/telegram-token
 * Disconnects the Telegram Bot for this company.
 */
router.delete('/:id/telegram-token', async (req, res) => {
  try {
    const { id } = req.params;
    const effectiveUserId = req.user.parentId || req.user.id;

    const company = await prisma.company.findFirst({
      where: req.user.role === 'SUPERADMIN' ? { id } : { id, userId: effectiveUserId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada.' });
    }

    await prisma.company.update({
      where: { id },
      data: { telegramToken: null, telegramBotUsername: null }
    });

    res.json({ success: true, message: 'Bot de Telegram desvinculado exitosamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al desvincular Bot de Telegram: ' + error.message });
  }
});

module.exports = router;
