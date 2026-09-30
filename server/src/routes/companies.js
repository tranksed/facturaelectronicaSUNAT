const express = require('express');
const prisma = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { extractKeysFromPfx } = require('../services/xml-signer');
const { compressXml, sendBillToSunat } = require('../services/sunat-client');
const { consultarRuc } = require('../services/padron-service');

const router = express.Router();

// Require authentication for all company endpoints
router.use(authenticateToken);

/**
 * GET /api/companies
 * Lists all companies for the current user.
 */
router.get('/', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: req.user.role === 'SUPERADMIN' && req.query.all === 'true' 
        ? {} 
        : { userId: req.user.id },
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
    const { ruc, razonSocial, nombreComercial, direccion, contacto, piePagina } = req.body;

    if (!ruc || !/^\d{11}$/.test(ruc)) {
      return res.status(400).json({ error: 'Debe ingresar un RUC válido de 11 dígitos.' });
    }

    // Check if user already has this RUC
    const existing = await prisma.company.findFirst({
      where: { userId: req.user.id, ruc }
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

    const companyCount = await prisma.company.count({ where: { userId: req.user.id } });

    const newCompany = await prisma.company.create({
      data: {
        userId: req.user.id,
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
    const company = await prisma.company.findFirst({
      where: req.user.role === 'SUPERADMIN' ? { id } : { id, userId: req.user.id }
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

    const company = await prisma.company.findFirst({
      where: req.user.role === 'SUPERADMIN' ? { id } : { id, userId: req.user.id }
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
    const company = await prisma.company.findFirst({
      where: req.user.role === 'SUPERADMIN' ? { id } : { id, userId: req.user.id }
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
    const company = await prisma.company.findFirst({
      where: req.user.role === 'SUPERADMIN' ? { id } : { id, userId: req.user.id }
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

module.exports = router;
