const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { consultarRuc } = require('../services/padron-service');

const router = express.Router();

/**
 * POST /api/auth/register
 * Allows new tenant registration (if enabled by Super Admin).
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, ruc } = req.body;

    // Check platform settings
    const platform = await prisma.platformConfig.findFirst();
    if (platform && !platform.allowRegistration) {
      return res.status(403).json({ error: 'El registro de nuevas cuentas está deshabilitado por el administrador.' });
    }

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Nombre, correo electrónico y contraseña son obligatorios.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'USER',
        status: 'ACTIVE'
      }
    });

    let initialCompany = null;
    if (ruc && /^\d{11}$/.test(ruc)) {
      try {
        const padron = await consultarRuc(ruc);
        initialCompany = await prisma.company.create({
          data: {
            userId: user.id,
            ruc,
            razonSocial: padron.nombre,
            nombreComercial: padron.nombre,
            direccion: padron.direccion || 'LIMA, PERU',
            isDefault: true
          }
        });
      } catch (e) {
        initialCompany = await prisma.company.create({
          data: {
            userId: user.id,
            ruc,
            razonSocial: name,
            direccion: 'LIMA, PERU',
            isDefault: true
          }
        });
      }
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      companies: initialCompany ? [initialCompany] : []
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario: ' + error.message });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user and returns JWT token and associated companies.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Ingresa tu correo y contraseña.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        companies: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo o contraseña.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. Contacta a soporte.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo o contraseña.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Filter sensitive fields from companies list
    const companies = user.companies.map(c => ({
      id: c.id,
      ruc: c.ruc,
      razonSocial: c.razonSocial,
      nombreComercial: c.nombreComercial,
      direccion: c.direccion,
      contacto: c.contacto,
      hasCert: !!c.pfxCert,
      isProduction: c.isProduction,
      isDefault: c.isDefault
    }));

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      companies
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión: ' + error.message });
  }
});

/**
 * GET /api/auth/me
 * Returns profile of current logged-in user and active companies.
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        companies: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
        }
      }
    });

    const platform = await prisma.platformConfig.findFirst();

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      companies: user.companies.map(c => ({
        id: c.id,
        ruc: c.ruc,
        razonSocial: c.razonSocial,
        nombreComercial: c.nombreComercial,
        direccion: c.direccion,
        contacto: c.contacto,
        hasCert: !!c.pfxCert,
        isProduction: c.isProduction,
        isDefault: c.isDefault
      })),
      branding: {
        platformName: platform?.platformName || 'APISUNAT PRO',
        platformSubtitle: platform?.platformSubtitle || '',
        logoUrl: platform?.logoUrl || '',
        primaryColor: platform?.primaryColor || '#2563eb',
        telegramBotEnabled: platform?.telegramBotEnabled ?? true
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
