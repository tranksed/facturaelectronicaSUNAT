const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

/**
 * Middleware to ensure only tenant owner or SUBADMIN can manage team members
 */
function requireTenantAdmin(req, res, next) {
  if (req.user.role === 'SUPERADMIN') return next();
  if (req.user.parentId && req.user.tenantRole !== 'SUBADMIN') {
    return res.status(403).json({ error: 'Permisos insuficientes: Solo el Administrador o Sub-administrador del tenant pueden gestionar el equipo.' });
  }
  next();
}

/**
 * GET /api/tenant/users
 * Lists team members under the current tenant and plan quota
 */
router.get('/', requireTenantAdmin, async (req, res) => {
  try {
    const ownerId = req.user.parentId || req.user.id;

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      include: {
        plan: true,
        subUsers: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            tenantRole: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!owner) {
      return res.status(404).json({ error: 'Tenant principal no encontrado' });
    }

    const plan = owner.plan || { name: 'Plan Gratuito', userLimit: 1 };
    const maxUsers = plan.userLimit || 1;
    const currentUsersCount = 1 + owner.subUsers.length; // Owner + sub-users

    res.json({
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        tenantRole: 'ADMIN'
      },
      subUsers: owner.subUsers,
      totalUsers: currentUsersCount,
      userLimit: maxUsers,
      isLimitReached: currentUsersCount >= maxUsers,
      planName: plan.name
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar usuarios del equipo: ' + error.message });
  }
});

/**
 * POST /api/tenant/users
 * Create a new team sub-user under current tenant
 */
router.post('/', requireTenantAdmin, async (req, res) => {
  try {
    const ownerId = req.user.parentId || req.user.id;
    const { name, email, password, tenantRole = 'CONTADOR' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo electrónico y contraseña son requeridos.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const validRoles = ['SUBADMIN', 'CONTADOR', 'OPERADOR'];
    if (!validRoles.includes(tenantRole)) {
      return res.status(400).json({ error: 'Rol inválido. Roles disponibles: SUBADMIN, CONTADOR, OPERADOR.' });
    }

    // Check plan limits
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      include: {
        plan: true,
        subUsers: true
      }
    });

    const userLimit = owner.plan?.userLimit || 1;
    const currentCount = 1 + owner.subUsers.length;

    if (currentCount >= userLimit) {
      return res.status(403).json({
        error: `Has alcanzado el límite de ${userLimit} usuarios permitido en tu ${owner.plan?.name || 'Plan Actual'}. Por favor actualiza tu plan para añadir más usuarios.`
      });
    }

    // Check if email already registered globally
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un usuario registrado con este correo electrónico.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const subUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        parentId: ownerId,
        tenantRole
      },
      select: {
        id: true,
        name: true,
        email: true,
        tenantRole: true,
        status: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      message: `Usuario ${subUser.name} creado exitosamente con rol ${subUser.tenantRole}.`,
      user: subUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario de equipo: ' + error.message });
  }
});

/**
 * PUT /api/tenant/users/:id
 * Update sub-user role, status or password
 */
router.put('/:id', requireTenantAdmin, async (req, res) => {
  try {
    const ownerId = req.user.parentId || req.user.id;
    const { id } = req.params;
    const { name, tenantRole, status, newPassword } = req.body;

    const subUser = await prisma.user.findFirst({
      where: { id, parentId: ownerId }
    });

    if (!subUser) {
      return res.status(404).json({ error: 'Usuario no encontrado en tu equipo.' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (tenantRole) {
      const validRoles = ['SUBADMIN', 'CONTADOR', 'OPERADOR'];
      if (!validRoles.includes(tenantRole)) {
        return res.status(400).json({ error: 'Rol inválido.' });
      }
      updateData.tenantRole = tenantRole;
    }
    if (status) {
      updateData.status = status; // 'ACTIVE' | 'SUSPENDED'
    }
    if (newPassword && newPassword.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        tenantRole: true,
        status: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente.',
      user: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario: ' + error.message });
  }
});

/**
 * DELETE /api/tenant/users/:id
 * Delete a sub-user from tenant
 */
router.delete('/:id', requireTenantAdmin, async (req, res) => {
  try {
    const ownerId = req.user.parentId || req.user.id;
    const { id } = req.params;

    const subUser = await prisma.user.findFirst({
      where: { id, parentId: ownerId }
    });

    if (!subUser) {
      return res.status(404).json({ error: 'Usuario no encontrado en tu equipo.' });
    }

    await prisma.user.delete({ where: { id } });

    res.json({
      success: true,
      message: `Usuario ${subUser.name} eliminado del equipo.`
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario: ' + error.message });
  }
});

module.exports = router;
