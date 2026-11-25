import 'dotenv/config';
import { PrismaClient, type NetworkProvider, type OperationalStatus } from '@prisma/client';
import { todayDateOnly } from '@san/shared';
import { hashPassword } from '../src/lib/password.js';

const prisma = new PrismaClient();

const ADMIN_PERMISSIONS = ['*'];

const MANAGER_PERMISSIONS = [
  'dashboard:read',
  'sims:read',
  'sims:write',
  'companies:read',
  'companies:write',
  'machines:read',
  'machines:write',
  'renewals:read',
  'renewals:write',
  'notifications:read',
  'notifications:manage',
  'reports:read',
  'activity:read',
];

const VIEWER_PERMISSIONS = [
  'dashboard:read',
  'sims:read',
  'companies:read',
  'machines:read',
  'renewals:read',
  'notifications:read',
  'reports:read',
];

function dateOffset(days: number): string {
  const base = Date.parse(`${todayDateOnly(new Date(), 'Asia/Kolkata')}T00:00:00.000Z`);
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

function timestampOffset(days: number, hours = 0): Date {
  return new Date(Date.now() + days * 86_400_000 + hours * 3_600_000);
}

const COMPANIES = [
  {
    name: 'Acme Manufacturing Pvt Ltd',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411057',
    phone: '+912067001200',
    email: 'operations@acme.example',
    website: 'https://acme.example',
    address: 'Plot 42, Hinjawadi Industrial Estate',
    contact: {
      fullName: 'Rajesh Menon',
      designation: 'Plant Operations Manager',
      email: 'rajesh.menon@acme.example',
      phone: '+919820011001',
    },
  },
  {
    name: 'Northwind Logistics India',
    city: 'Gurugram',
    state: 'Haryana',
    postalCode: '122002',
    phone: '+911244700800',
    email: 'fleet@northwind.example',
    website: 'https://northwind.example',
    address: 'Tower B, Udyog Vihar Phase IV',
    contact: {
      fullName: 'Priya Sharma',
      designation: 'Fleet Systems Lead',
      email: 'priya.sharma@northwind.example',
      phone: '+919810022002',
    },
  },
  {
    name: 'Vertex Energy Systems',
    city: 'Ahmedabad',
    state: 'Gujarat',
    postalCode: '380054',
    phone: '+917940005500',
    email: 'projects@vertexenergy.example',
    website: 'https://vertexenergy.example',
    address: 'Sarkhej-Gandhinagar Highway, Bodakdev',
    contact: {
      fullName: 'Amit Patel',
      designation: 'SCADA Engineer',
      email: 'amit.patel@vertexenergy.example',
      phone: '+919825033003',
    },
  },
  {
    name: 'BlueRiver Infrastructure',
    city: 'Hyderabad',
    state: 'Telangana',
    postalCode: '500081',
    phone: '+914040206600',
    email: 'siteops@blueriver.example',
    website: 'https://blueriver.example',
    address: 'Cyber Towers, HITEC City',
    contact: {
      fullName: 'Sneha Rao',
      designation: 'Project Coordinator',
      email: 'sneha.rao@blueriver.example',
      phone: '+919848044004',
    },
  },
  {
    name: 'Cobalt Retail Networks',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560103',
    phone: '+918041207700',
    email: 'storeops@cobaltretail.example',
    website: 'https://cobaltretail.example',
    address: 'Outer Ring Road, Bellandur',
    contact: {
      fullName: 'Karthik Iyer',
      designation: 'Retail IT Manager',
      email: 'karthik.iyer@cobaltretail.example',
      phone: '+919845055005',
    },
  },
  {
    name: 'Meridian Agrotech',
    city: 'Nashik',
    state: 'Maharashtra',
    postalCode: '422009',
    phone: '+912532099100',
    email: 'fieldops@meridianagro.example',
    website: 'https://meridianagro.example',
    address: 'MIDC Ambad, Phase II',
    contact: {
      fullName: 'Anjali Deshmukh',
      designation: 'Field Operations Head',
      email: 'anjali.deshmukh@meridianagro.example',
      phone: '+919822066006',
    },
  },
] as const;

const MACHINE_BLUEPRINTS = [
  { name: 'Assembly Line Telemetry Gateway', model: 'TG-4100', company: 0 },
  { name: 'Compressor Monitoring Unit', model: 'CMU-220', company: 0 },
  { name: 'Fleet Tracker Hub — North', model: 'FT-900', company: 1 },
  { name: 'Cold Chain Sensor Node', model: 'CC-310', company: 1 },
  { name: 'Solar Inverter Controller', model: 'SIC-77', company: 2 },
  { name: 'Grid Fault Monitor', model: 'GFM-15', company: 2 },
  { name: 'Site Pump Controller', model: 'SPC-32', company: 3 },
  { name: 'Crane Safety Terminal', model: 'CST-64', company: 3 },
  { name: 'Store Edge Router', model: 'SER-8', company: 4 },
  { name: 'POS Backup Gateway', model: 'PBG-12', company: 4 },
  { name: 'Irrigation Valve Controller', model: 'IVC-50', company: 5 },
  { name: 'Soil Probe Gateway', model: 'SPG-21', company: 5 },
] as const;

const PROVIDERS: NetworkProvider[] = ['AIRTEL', 'JIO', 'VI', 'BSNL'];
const EXPIRY_OFFSETS = [-45, -22, -8, 2, 6, 11, 17, 24, 29, 38, 55, 72, 96, 128, 160, 210, 300, 400];
const NOTES = [
  'Primary data SIM for remote telemetry.',
  'Backup connectivity for site equipment.',
  'Monthly plan; renewal handled by operations.',
  'Installed during commissioning; verify signal strength quarterly.',
  'Shared with maintenance team for diagnostics.',
];

async function main() {
  console.log('Seeding SAN SOLUTION SIM Management…');

  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: { permissions: ADMIN_PERMISSIONS },
    create: {
      name: 'Administrator',
      description: 'Full access to every module, including users and settings.',
      permissions: ADMIN_PERMISSIONS,
    },
  });
  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: { permissions: MANAGER_PERMISSIONS },
    create: {
      name: 'Manager',
      description: 'Manage SIMs, companies, machinery, renewals and reminders.',
      permissions: MANAGER_PERMISSIONS,
    },
  });
  await prisma.role.upsert({
    where: { name: 'Viewer' },
    update: { permissions: VIEWER_PERMISSIONS },
    create: {
      name: 'Viewer',
      description: 'Read-only access to operational data and reports.',
      permissions: VIEWER_PERMISSIONS,
    },
  });

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@sansolution.in').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? '';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    if (adminPassword.length < 10) {
      throw new Error(
        'SEED_ADMIN_PASSWORD must be at least 10 characters to create the initial administrator.',
      );
    }
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await hashPassword(adminPassword),
        firstName: process.env.SEED_ADMIN_FIRST_NAME ?? 'System',
        lastName: process.env.SEED_ADMIN_LAST_NAME ?? 'Administrator',
        roleId: adminRole.id,
        isActive: true,
      },
    });
    console.log(`  ✓ Administrator account created: ${adminEmail}`);
  } else {
    console.log(`  • Administrator account already exists: ${adminEmail}`);
  }

  await prisma.notificationSetting.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      enabled: true,
      reminderDaysBefore: [30, 15, 7],
      notifyOnExpiry: true,
      postExpiryWeekly: true,
      postExpiryIntervalDays: 7,
      recipients: [],
      ccEmails: [],
      sendHour: 9,
      timezone: 'Asia/Kolkata',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'organization' },
    update: {},
    create: {
      key: 'organization',
      value: {
        name: 'SAN SOLUTION',
        legalName: 'SAN SOLUTION',
        email: 'support@sansolution.in',
        phone: '+91 22 4000 1200',
        website: 'https://sansolution.in',
        addressLine1: '304, Trade Centre',
        addressLine2: 'Bandra Kurla Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400051',
        country: 'India',
        taxId: '',
      },
      description: 'SAN SOLUTION organization profile',
    },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'preferences' },
    update: {},
    create: {
      key: 'preferences',
      value: {
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD MMM YYYY',
        currency: 'INR',
        defaultPageSize: 20,
      },
      description: 'Application display and localization preferences',
    },
  });

  if (process.env.SEED_DEMO_DATA !== 'true') {
    console.log('  • SEED_DEMO_DATA is not true — skipping demo records.');
    return;
  }

  const marker = await prisma.systemSetting.findUnique({ where: { key: 'demo_seed' } });
  if (marker) {
    console.log('  • Demo data has already been seeded — skipping.');
    return;
  }

  const companies = [];
  for (const entry of COMPANIES) {
    const company = await prisma.company.create({
      data: {
        name: entry.name,
        address: entry.address,
        city: entry.city,
        state: entry.state,
        postalCode: entry.postalCode,
        country: 'India',
        phone: entry.phone,
        email: entry.email,
        website: entry.website,
        isActive: true,
        contacts: {
          create: {
            ...entry.contact,
            isPrimary: true,
          },
        },
      },
      include: { contacts: true },
    });
    companies.push(company);
  }
  console.log(`  ✓ ${companies.length} demo companies created`);

  const machines = [];
  for (let index = 0; index < MACHINE_BLUEPRINTS.length; index += 1) {
    const blueprint = MACHINE_BLUEPRINTS[index]!;
    const company = companies[blueprint.company]!;
    const machine = await prisma.machine.create({
      data: {
        name: blueprint.name,
        model: blueprint.model,
        serialNumber: `MC-${String(1001 + index)}`,
        companyId: company.id,
        installationDate: new Date(`${dateOffset(-200 + index * 7)}T00:00:00.000Z`),
        status: index === 8 ? 'UNDER_MAINTENANCE' : 'OPERATIONAL',
        notes: 'Commissioned as part of the client site rollout.',
      },
    });
    machines.push(machine);
  }
  console.log(`  ✓ ${machines.length} demo machines created`);

  const machinesByCompany = new Map<string, typeof machines>();
  for (const machine of machines) {
    const list = machinesByCompany.get(machine.companyId) ?? [];
    list.push(machine);
    machinesByCompany.set(machine.companyId, list);
  }
  const usedMachines = new Set<string>();

  const totalSims = 48;
  let renewalsCreated = 0;
  let assignmentsCreated = 0;
  const createdSims = [];

  for (let index = 0; index < totalSims; index += 1) {
    const provider = PROVIDERS[index % PROVIDERS.length]!;
    const company = companies[index % companies.length]!;
    const contact = company.contacts[0]!;
    const offset = EXPIRY_OFFSETS[index % EXPIRY_OFFSETS.length]!;
    const inStock = index % 11 === 0;
    const faulty = !inStock && index % 13 === 0;
    const suspended = !inStock && index % 17 === 0;

    let operationalStatus: OperationalStatus = 'ACTIVE';
    if (inStock) operationalStatus = 'IN_STOCK';
    else if (faulty) operationalStatus = 'FAULTY';
    else if (suspended) operationalStatus = 'SUSPENDED';

    const availableMachines = (machinesByCompany.get(company.id) ?? []).filter(
      (machine) => !usedMachines.has(machine.id),
    );
    const machine = !inStock && availableMachines.length > 0 ? availableMachines[0] : null;
    if (machine) usedMachines.add(machine.id);

    const internalId = `SIM-${String(index + 1).padStart(4, '0')}`;
    const expiryDate = dateOffset(offset);
    const activationDate = dateOffset(offset - 365);
    const renewalHistory = index % 7 === 2 && offset > 0;

    const sim = await prisma.sim.create({
      data: {
        internalId,
        mobileNumber: `+9198000${String(10000 + index)}`,
        iccid: `899100${String(1_000_000_000_000 + index)}`,
        imsi: `40401${String(100_000_000 + index)}`,
        provider,
        activationDate: new Date(`${activationDate}T00:00:00.000Z`),
        expiryDate: new Date(`${expiryDate}T00:00:00.000Z`),
        operationalStatus,
        companyId: inStock ? null : company.id,
        machineId: machine?.id ?? null,
        contactId: inStock ? null : contact.id,
        notes: NOTES[index % NOTES.length]!,
        lastRenewedAt: renewalHistory ? timestampOffset(-90) : null,
        createdById: admin.id,
        updatedById: admin.id,
        assignments: inStock
          ? undefined
          : {
              create: {
                companyId: company.id,
                machineId: machine?.id ?? null,
                contactId: contact.id,
                assignedById: admin.id,
                assignedAt: timestampOffset(-180 + (index % 30)),
                notes: 'Initial assignment during customer onboarding.',
              },
            },
        renewals: renewalHistory
          ? {
              create: {
                companyId: company.id,
                previousExpiryDate: new Date(`${dateOffset(offset - 365)}T00:00:00.000Z`),
                newExpiryDate: new Date(`${expiryDate}T00:00:00.000Z`),
                renewalDate: new Date(`${dateOffset(offset - 90)}T00:00:00.000Z`),
                referenceNumber: `REN-2026-${String(index + 1).padStart(4, '0')}`,
                cost: 1200 + (index % 5) * 250,
                notes: 'Annual plan renewal processed by operations.',
                renewedById: admin.id,
                createdAt: timestampOffset(-90),
              },
            }
          : undefined,
      },
    });
    assignmentsCreated += inStock ? 0 : 1;
    renewalsCreated += renewalHistory ? 1 : 0;
    createdSims.push(sim);
  }
  console.log(`  ✓ ${createdSims.length} demo SIMs created`);

  // Add a few closed assignment records to demonstrate permanent history.
  const historyCandidates = createdSims.filter((sim) => sim.companyId !== null).slice(0, 5);
  for (let index = 0; index < historyCandidates.length; index += 1) {
    const sim = historyCandidates[index]!;
    const previousCompany = companies[(index + 3) % companies.length]!;
    await prisma.simAssignment.create({
      data: {
        simId: sim.id,
        companyId: previousCompany.id,
        contactId: previousCompany.contacts[0]!.id,
        assignedById: admin.id,
        assignedAt: timestampOffset(-420 + index * 4),
        unassignedAt: timestampOffset(-200 + index * 3),
        unassignedById: admin.id,
        isActive: false,
        notes: 'Previous assignment retained for audit history.',
      },
    });
  }
  console.log('  ✓ Assignment history records created');

  await prisma.$executeRawUnsafe(
    `SELECT setval('sim_internal_id_seq', ${createdSims.length}, true)`,
  );

  // Demo notification log so the notifications page and dashboard have content.
  const notificationSims = createdSims.filter((sim) => sim.expiryDate && sim.companyId).slice(0, 8);
  for (let index = 0; index < notificationSims.length; index += 1) {
    const sim = notificationSims[index]!;
    const expiry = sim.expiryDate!.toISOString().slice(0, 10);
    const company = companies.find((entry) => entry.id === sim.companyId)!;
    const status = index % 4 === 0 ? 'FAILED' : index % 5 === 0 ? 'CANCELLED' : 'SENT';
    const reminderDays = [30, 15, 7][index % 3]!;
    await prisma.notification.create({
      data: {
        simId: sim.id,
        reminderType: 'BEFORE_EXPIRY',
        reminderDays,
        expiryCycle: sim.expiryDate!,
        idempotencyKey: `${sim.id}:${expiry}:BEFORE_EXPIRY:${reminderDays}:EMAIL`,
        recipientEmail: company.contacts[0]!.email ?? 'operations@sansolution.in',
        ccEmails: ['support@sansolution.in'],
        subject: `SIM expiry reminder — ${sim.internalId} expires on ${expiry}`,
        status,
        attempts: status === 'FAILED' ? 3 : 1,
        maxAttempts: 5,
        lastError: status === 'FAILED' ? 'SMTP connection timed out.' : null,
        nextRetryAt: null,
        scheduledFor: timestampOffset(-2, index),
        sentAt: status === 'SENT' ? timestampOffset(-2, index + 1) : null,
        createdAt: timestampOffset(-2, index),
      },
    });
  }
  console.log('  ✓ Demo notification history created');

  const recentActivities = [
    {
      action: 'SIM_RENEWED',
      description: `SIM ${createdSims[0]!.internalId} was renewed for another annual cycle.`,
      entityType: 'SIM',
      entityId: createdSims[0]!.id,
      simId: createdSims[0]!.id,
      companyId: createdSims[0]!.companyId,
      hours: -4,
    },
    {
      action: 'COMPANY_CREATED',
      description: `Company ${companies[5]!.name} was registered.`,
      entityType: 'COMPANY',
      entityId: companies[5]!.id,
      simId: null,
      companyId: companies[5]!.id,
      hours: -18,
    },
    {
      action: 'SIM_ASSIGNED',
      description: `SIM ${createdSims[1]!.internalId} was assigned to ${companies[1]!.name}.`,
      entityType: 'SIM',
      entityId: createdSims[1]!.id,
      simId: createdSims[1]!.id,
      companyId: companies[1]!.id,
      hours: -28,
    },
    {
      action: 'MACHINE_CREATED',
      description: `Machine ${machines[0]!.name} (${machines[0]!.serialNumber}) was registered.`,
      entityType: 'MACHINE',
      entityId: machines[0]!.id,
      simId: null,
      companyId: machines[0]!.companyId,
      hours: -40,
    },
    {
      action: 'NOTIFICATION_SCAN_COMPLETED',
      description: 'Expiry scan completed: reminders evaluated for all active SIMs.',
      entityType: 'SYSTEM',
      entityId: null,
      simId: null,
      companyId: null,
      hours: -50,
    },
  ];

  for (const activity of recentActivities) {
    await prisma.activityLog.create({
      data: {
        userId: admin.id,
        companyId: activity.companyId,
        simId: activity.simId,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        description: activity.description,
        metadata: { seeded: true },
        createdAt: timestampOffset(0, activity.hours),
      },
    });
  }

  await prisma.systemSetting.create({
    data: {
      key: 'demo_seed',
      value: {
        seededAt: new Date().toISOString(),
        companies: companies.length,
        machines: machines.length,
        sims: createdSims.length,
        assignments: assignmentsCreated,
        renewals: renewalsCreated,
      },
      description: 'Marker indicating that demo data was seeded.',
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
