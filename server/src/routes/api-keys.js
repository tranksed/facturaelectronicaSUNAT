const express = require('express');
const crypto = require('crypto');
const prisma = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

/**
 * GET /api/tenant/apikeys
 * Lists active API keys for tenant
 */
router.get('/', async (req, res) => {
  try {
    const effectiveUserId = req.user.parentId || req.user.id;

    const keys = await prisma.apiKey.findMany({
      where: { userId: effectiveUserId },
      orderBy: { createdAt: 'desc' }
    });

    const maskedKeys = keys.map(k => ({
      id: k.id,
      name: k.name,
      maskedKey: k.key.substring(0, 12) + '...' + k.key.substring(k.key.length - 4),
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt
    }));

    res.json(maskedKeys);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar API Keys: ' + error.message });
  }
});

/**
 * POST /api/tenant/apikeys
 * Generates a new API Key (sk_live_...)
 */
router.post('/', async (req, res) => {
  try {
    const effectiveUserId = req.user.parentId || req.user.id;
    const { name = 'Integración Externa' } = req.body;

    const rawKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: effectiveUserId,
        name: name.trim(),
        key: rawKey
      }
    });

    res.json({
      success: true,
      message: 'API Key generada exitosamente. Asegúrate de guardarla en un lugar seguro.',
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Shown only once upon generation
        createdAt: apiKey.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear API Key: ' + error.message });
  }
});

/**
 * DELETE /api/tenant/apikeys/:id
 * Revokes / deletes an API key
 */
router.delete('/:id', async (req, res) => {
  try {
    const effectiveUserId = req.user.parentId || req.user.id;
    const { id } = req.params;

    const key = await prisma.apiKey.findFirst({
      where: { id, userId: effectiveUserId }
    });

    if (!key) {
      return res.status(404).json({ error: 'API Key no encontrada' });
    }

    await prisma.apiKey.delete({ where: { id } });

    res.json({
      success: true,
      message: `API Key "${key.name}" revocada exitosamente.`
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar API Key: ' + error.message });
  }
});

module.exports = router;
