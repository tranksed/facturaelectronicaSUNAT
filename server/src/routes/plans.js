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
    companyLimit: 1,
    durationDays: 30,
    hasTelegramBot: false,
    hasExternalApi: false,
    hasBuzonSol: false,
    featuresJson: JSON.stringify([
      'Hasta 30 comprobantes / mes',
      '1 Empresa emisora (1 RUC)',
      '1 Usuario de acceso',
      'Emisión de Facturas y Boletas electrónicas',
      'Notas de Crédito y Anulaciones UBL 2.1',
      'Descargas PDF A4 y Ticket 80mm'
    ]),
    isPopular: false,
    isActive: true,
    order: 1
  },
  {
    name: 'Plan Starter (Móvil & Chatbot)',
    code: 'STARTER',
    description: 'Para pequeños negocios con emisión mensual regular y ventas por Telegram.',
    price: 29.00,
    currency: 'PEN',
    billingPeriod: 'MONTHLY',
    docLimit: 100,
    userLimit: 2,
    companyLimit: 1,
    durationDays: 30,
    hasTelegramBot: true,
    hasExternalApi: false,
    hasBuzonSol: true,
    featuresJson: JSON.stringify([
      'Hasta 100 comprobantes / mes',
      '1 Empresa emisora (1 RUC)',
      '2 Usuarios (Admin + Contador)',
      'Emisión Facturas, Boletas y Notas UBL 2.1',
      '🤖 Bot y emisión guiada vía Telegram',
      'Formatos A4, Ticket 80mm y 58mm con logo',
      'Consulta Buzón SOL y Casilla SUNAFIL'
    ]),
    isPopular: false,
    isActive: true,
    order: 2
  },
  {
    name: 'Plan Emprendedor (API & POS)',
    code: 'EMPRENDEDOR',
    description: 'Para pymes con sistemas externos, punto de venta (POS) y Odoo ERP.',
    price: 59.00,
    currency: 'PEN',
    billingPeriod: 'MONTHLY',
    docLimit: 300,
    userLimit: 3,
    companyLimit: 3,
    durationDays: 30,
    hasTelegramBot: true,
    hasExternalApi: true,
    hasBuzonSol: true,
    featuresJson: JSON.stringify([
      'Hasta 300 comprobantes / mes',
      'Hasta 3 Empresas (Multi-RUC)',
      '3 Usuarios (Sub-admin, Contador, Operador)',
      '🔌 API Externa REST para POS, Odoo, WHMCS y Apps',
      '🤖 Bot de Telegram oficial y multi-dispositivo',
      'Descarga automática de XML y CDR firmados',
      'Módulo Buzón SOL y SUNAFIL prioritario',
      'Soporte prioritario por WhatsApp'
    ]),
    isPopular: true,
    isActive: true,
    order: 3
  },
  {
    name: 'Plan Corporativo (Ilimitado)',
    code: 'CORPORATIVO',
    description: 'Para empresas consolidadas, plataformas e-commerce y facturación a gran escala.',
    price: 149.00,
    currency: 'PEN',
    billingPeriod: 'MONTHLY',
    docLimit: -1, // Ilimitado
    userLimit: 8,
    companyLimit: -1, // Ilimitado
    durationDays: 30,
    hasTelegramBot: true,
    hasExternalApi: true,
    hasBuzonSol: true,
    featuresJson: JSON.stringify([
      'Comprobantes ILIMITADOS al mes',
      '🏢 Empresas emisoras ILIMITADAS (Multi-RUC)',
      'Hasta 8 Usuarios con roles y permisos avanzados',
      '🔌 API Externa Masiva de Alta Velocidad (Batch)',
      '🤖 Bot de Telegram exclusivo y multi-dispositivo',
      'Sincronización automatizada con WHMCS y Odoo',
      'Almacenamiento Cloud S3 / Cloudflare R2 / VPS',
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
    for (const p of DEFAULT_PLANS) {
      await prisma.plan.upsert({
        where: { code: p.code },
        update: {
          hasTelegramBot: p.hasTelegramBot,
          hasExternalApi: p.hasExternalApi,
          hasBuzonSol: p.hasBuzonSol,
          companyLimit: p.companyLimit,
          featuresJson: p.featuresJson,
          name: p.name,
          description: p.description
        },
        create: p
      });
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
