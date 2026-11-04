const express = require('express');
const prisma = require('../db');

const router = express.Router();

const DEFAULT_PLANS = [
  {
    name: 'Plan Gratuito (Trial 30 Días)',
    code: 'FREE',
    description: 'Ideal para probar la plataforma y micro-emprendedores en etapa inicial.',
    price: 0,
    currency: 'PEN',
    billingPeriod: 'MONTHLY',
    docLimit: 30,
    userLimit: 1,
    durationDays: 30,
    featuresJson: JSON.stringify([
      'Hasta 30 comprobantes / mes',
      '1 Usuario de acceso',
      'Emisión de Facturas y Boletas electrónicas',
      'Notas de Crédito y Anulaciones UBL 2.1',
      'Consulta masiva Buzón SOL & SUNAFIL',
      'Descargas PDF A4 y Ticket 80mm'
    ]),
    isPopular: false,
    isActive: true,
    order: 1
  },
  {
    name: 'Plan Starter',
    code: 'STARTER',
    description: 'Para pequeños negocios y profesionales con emisión mensual regular.',
    price: 29.00,
    currency: 'PEN',
    billingPeriod: 'MONTHLY',
    docLimit: 100,
    userLimit: 2,
    durationDays: 30,
    featuresJson: JSON.stringify([
      'Hasta 100 comprobantes / mes',
      '2 Usuarios (Admin + Contador)',
      'Emisión Facturas, Boletas y Notas UBL 2.1',
      'Formatos A4, Ticket 80mm y 58mm con logo',
      'Bot y notificaciones automáticas Telegram',
      'Integración con API Externa REST',
      'Consulta Buzón SOL y Casilla SUNAFIL'
    ]),
    isPopular: false,
    isActive: true,
    order: 2
  },
  {
    name: 'Plan Emprendedor',
    code: 'EMPRENDEDOR',
    description: 'La opción más elegida para pymes y empresas en constante crecimiento.',
    price: 59.00,
    currency: 'PEN',
    billingPeriod: 'MONTHLY',
    docLimit: 300,
    userLimit: 3,
    durationDays: 30,
    featuresJson: JSON.stringify([
      'Hasta 300 comprobantes / mes',
      '3 Usuarios (Sub-admin, Contador, Operador)',
      'Múltiples series personalizadas',
      'API Externa para WHMCS y ERPs (Unitario y Masivo)',
      'Descarga automática de XML y CDR firmados',
      'Módulo Buzón SOL y SUNAFIL prioritario',
      'Soporte prioritario por WhatsApp'
    ]),
    isPopular: true,
    isActive: true,
    order: 3
  },
  {
    name: 'Plan Corporativo',
    code: 'CORPORATIVO',
    description: 'Para empresas consolidadas, plataformas e-commerce y facturación a gran escala.',
    price: 149.00,
    currency: 'PEN',
    billingPeriod: 'MONTHLY',
    docLimit: -1, // Ilimitado
    userLimit: 8,
    durationDays: 30,
    featuresJson: JSON.stringify([
      'Comprobantes ILIMITADOS al mes',
      'Hasta 8 Usuarios con roles y permisos avanzados',
      'API Externa Masiva de Alta Velocidad',
      'Sincronización automatizada con WHMCS',
      'Almacenamiento Cloud S3 / VPS File Server',
      'Personalización completa de comprobantes',
      'Soporte VIP 24/7'
    ]),
    isPopular: false,
    isActive: true,
    order: 4
  }
];

async function seedDefaultPlans() {
  try {
    const count = await prisma.plan.count();
    if (count === 0) {
      for (const p of DEFAULT_PLANS) {
        await prisma.plan.create({ data: p });
      }
      console.log('Seeded default plans successfully');
    }
  } catch (e) {
    console.error('Error seeding default plans:', e.message);
  }
}

/**
 * GET /api/plans
 * Public endpoint to list active plans for registration and public pricing
 */
router.get('/', async (req, res) => {
  try {
    await seedDefaultPlans();
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });

    const parsedPlans = plans.map(p => ({
      ...p,
      features: p.featuresJson ? JSON.parse(p.featuresJson) : []
    }));

    res.json(parsedPlans);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener planes: ' + error.message });
  }
});

module.exports = {
  router,
  seedDefaultPlans
};
