const jwt = require('jsonwebtoken');
const prisma = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'sunat-facturador-secret-jwt-key-2026';

/**
 * Authentication middleware.
 * Verifies JWT token from Authorization header (Bearer <token>).
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: Token de autenticación no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado o sesión inválida.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Tu cuenta se encuentra suspendida. Contacta al administrador.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
}

/**
 * Super Admin check middleware.
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Acceso restringido: Se requieren privilegios de Super Administrador.' });
  }
  next();
}

/**
 * Resolves active company for the request.
 * Prioritizes header 'x-company-id', then query/body 'companyId', or user's default company.
 */
async function resolveActiveCompany(req, res, next) {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId || req.body.companyId;
    let company = null;

    if (companyId) {
      if (req.user.role === 'SUPERADMIN') {
        company = await prisma.company.findUnique({ where: { id: companyId } });
      } else {
        company = await prisma.company.findFirst({
          where: { id: companyId, userId: req.user.id }
        });
      }
    }

    if (!company) {
      // Find default or first company for user
      company = await prisma.company.findFirst({
        where: { userId: req.user.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
      });
    }

    req.activeCompany = company;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireSuperAdmin,
  resolveActiveCompany
};
