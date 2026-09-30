const bcrypt = require('bcryptjs');
const prisma = require('./db');

async function seed() {
  console.log('--- Iniciando Seed Multitenant y Marca Blanca ---');

  // 1. Initialize Platform Config (White-Label)
  let platform = await prisma.platformConfig.findFirst();
  if (!platform) {
    platform = await prisma.platformConfig.create({
      data: {
        platformName: 'APISUNAT PRO',
        platformSubtitle: 'Plataforma SaaS Multitenant de Facturación Electrónica SUNAT',
        primaryColor: '#2563eb',
        allowRegistration: true,
        telegramBotEnabled: true,
        supportEmail: 'soporte@apisunat.com',
        supportPhone: '+51 999 888 777'
      }
    });
    console.log('✅ Configuración de Marca Blanca inicializada.');
  }

  // 2. Create Super Admin User
  const adminEmail = 'admin@facturador.com';
  let superAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!superAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin12345*', salt);
    superAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Super Administrador',
        role: 'SUPERADMIN',
        status: 'ACTIVE'
      }
    });
    console.log('✅ Usuario Super Admin creado: admin@facturador.com (clave: Admin12345*)');
  }

  // 3. Create Default Client User
  const clientEmail = 'cliente@codegames.com';
  let defaultClient = await prisma.user.findUnique({ where: { email: clientEmail } });
  if (!defaultClient) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Cliente123*', salt);
    defaultClient = await prisma.user.create({
      data: {
        email: clientEmail,
        passwordHash,
        name: 'CodeGames Admin',
        role: 'USER',
        status: 'ACTIVE'
      }
    });
    console.log('✅ Usuario Cliente creado: cliente@codegames.com (clave: Cliente123*)');
  }

  // 4. Migrate existing Config to Company
  const existingConfig = await prisma.config.findFirst();
  let defaultCompany = await prisma.company.findFirst({
    where: { userId: defaultClient.id, ruc: existingConfig?.ruc || '20606636505' }
  });

  const defaultPreferences = {
    predeterminados: {
      mostrarValor: 'PRECIO',
      formatoImpresion: 'TODOS',
      entradaItems: 'Manual (Teclado)',
      moneda: 'PEN'
    },
    opcionesExtra: {
      emisionMasiva: false,
      plantillas: false,
      horaEmision: true,
      ordenCompra: false,
      redondeo: false,
      anticipos: false,
      retencionIgv: false,
      selectorEntrada: false,
      observacionesNotas: true,
      documentosRelacionados: false,
      guiasRelacionadas: false,
      cargosDescuentos: false,
      fise: false,
      recargoConsumo: false,
      fechaEmisionDocModifica: false
    }
  };

  const defaultBanks = [
    {
      cuenta: '191-12345678-0-12',
      cci: '00219100123456780012',
      banco: 'BCP',
      moneda: 'PEN'
    },
    {
      cuenta: '0011-0123-0100012345',
      cci: '01112300010001234567',
      banco: 'BBVA',
      moneda: 'USD'
    }
  ];

  if (!defaultCompany) {
    defaultCompany = await prisma.company.create({
      data: {
        userId: defaultClient.id,
        ruc: existingConfig?.ruc || '20606636505',
        razonSocial: existingConfig?.razonSocial || 'ESPORTS GAMES SAC',
        nombreComercial: existingConfig?.nombreComercial || 'CODEGAMES',
        direccion: existingConfig?.direccion || 'ARES 123 OLIMPO ATE',
        contacto: 'contacto@esg.la - 997592981',
        piePagina: 'Gracias por su preferencia. Depósitos a nombre de ESPORTS GAMES SAC.',
        mostrarLogoTicket: true,
        bankAccountsJson: JSON.stringify(defaultBanks),
        preferencesJson: JSON.stringify(defaultPreferences),
        usuarioSol: existingConfig?.usuarioSol || 'MODDATOS',
        claveSol: existingConfig?.claveSol || 'moddatos',
        pfxCert: existingConfig?.pfxCert || null,
        pfxPassword: existingConfig?.pfxPassword || null,
        isProduction: existingConfig?.isProduction || false,
        telegramToken: existingConfig?.telegramToken || null,
        isDefault: true
      }
    });
    console.log(`✅ Empresa principal vinculada a ${defaultClient.email}: ${defaultCompany.razonSocial} (${defaultCompany.ruc})`);
  }

  // 5. Link unassigned invoices to this default company
  const updatedInvoices = await prisma.invoice.updateMany({
    where: { companyId: null },
    data: { companyId: defaultCompany.id }
  });
  if (updatedInvoices.count > 0) {
    console.log(`✅ ${updatedInvoices.count} comprobantes vinculados a la empresa.`);
  }

  console.log('--- Seed completado exitosamente ---');
}

seed()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
