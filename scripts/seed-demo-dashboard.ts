/**
 * Seed demo data for a dashboard screenshot.
 * Run: npx tsx scripts/seed-demo-dashboard.ts
 * Cleanup: npx tsx scripts/seed-demo-dashboard.ts --cleanup
 */
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not set');
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const PREFIX = 'DEMO_SCREENSHOT_';
const EMAIL_DOMAIN = '@screenshot-demo.test';

async function cleanup() {
  console.log('🧹 Cleaning up demo data...');
  const demoTenants = await prisma.user.findMany({ where: { email: { endsWith: EMAIL_DOMAIN } }, select: { id: true } });
  const tenantIds = demoTenants.map(t => t.id);
  if (tenantIds.length > 0) {
    await prisma.rentPayment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.rentalApplication.deleteMany({ where: { fullName: { startsWith: PREFIX } } });
    await prisma.lease.deleteMany({ where: { tenantId: { in: tenantIds } } });
  }
  await prisma.maintenanceTicket.deleteMany({ where: { title: { startsWith: PREFIX } } });
  await prisma.unit.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.property.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });
  console.log('✅ Cleaned up!');
}

async function seed() {
  console.log('🌱 Seeding demo data...');
  const user = await prisma.user.findUnique({ where: { email: 'vegaswarrior888@gmail.com' } });
  if (!user) { console.error('❌ User vegaswarrior888@gmail.com not found'); return; }
  const landlord = await prisma.landlord.findFirst({ where: { ownerUserId: user.id } });
  if (!landlord) { console.error('❌ No landlord profile for this user'); return; }
  console.log(`Landlord: ${landlord.name} (${landlord.id})`);

  const now = new Date();
  const props = ['Sunset Blvd Apartments','Oceanview Towers','Downtown Lofts','Maple Street Residences','Harbor Point Condos','Riverside Commons','Park Avenue Suites','Cedar Heights','Lakeside Village','Metro Plaza','Elm Court','Highland Terrace'];
  const names = ['Sarah Johnson','Michael Chen','Emma Williams','James Rodriguez','Lisa Thompson','David Park','Anna Kowalski','Robert Kim','Jennifer Martinez','Thomas Brown','Maria Garcia','Kevin Lee','Rachel Adams','Daniel Wilson','Sophie Turner','Chris Evans','Amanda Foster','Brian Mitchell','Nicole Rivera','Jason Taylor'];
  const cities = ['Denver','Austin','Miami','Seattle','Portland','Nashville'];
  const states = ['CO','TX','FL','WA','OR','TN'];

  const allUnits: any[] = [];
  const allTenants: any[] = [];

  for (let i = 0; i < props.length; i++) {
    const p = await prisma.property.create({
      data: {
        name: `${PREFIX}${props[i]}`,
        slug: `demo-${props[i].toLowerCase().replace(/\s+/g,'-')}-${i}`,
        type: i < 4 ? 'apartment' : i < 8 ? 'house' : 'condo',
        landlordId: landlord.id,
        address: { street: `${100+i*50} Main St`, city: cities[i%6], state: states[i%6], zip: `${80000+i*100}` },
      },
    });
    const uc = 8 + Math.floor(Math.random() * 9);
    for (let u = 0; u < uc; u++) {
      const unit = await prisma.unit.create({
        data: {
          name: `${PREFIX}Unit ${String.fromCharCode(65+Math.floor(u/10))}${(u%10)+1}`,
          propertyId: p.id, type: 'apartment',
          bedrooms: 1+Math.floor(Math.random()*3), bathrooms: 1+Math.floor(Math.random()*2),
          rentAmount: 1200+Math.floor(Math.random()*1800),
          isAvailable: u >= uc - 1, images: [],
        },
      });
      allUnits.push(unit);
    }
  }
  console.log(`${props.length} properties, ${allUnits.length} units`);

  for (let i = 0; i < names.length; i++) {
    const t = await prisma.user.create({
      data: { name: `${PREFIX}${names[i]}`, email: `demo-tenant-${i}${EMAIL_DOMAIN}`, role: 'tenant' },
    });
    allTenants.push(t);
  }

  const occupied = allUnits.filter(u => !u.isAvailable);
  for (let i = 0; i < Math.min(occupied.length, allTenants.length); i++) {
    const unit = occupied[i];
    const tenant = allTenants[i % allTenants.length];
    const start = new Date(now.getFullYear(), now.getMonth()-6, 1);
    const ml = i < 3 ? 1 : i < 6 ? 2 : 12;
    const end = new Date(now.getFullYear(), now.getMonth()+ml, 1);

    const lease = await prisma.lease.create({
      data: {
        unitId: unit.id, tenantId: tenant.id, startDate: start, endDate: end,
        rentAmount: unit.rentAmount, status: 'active', billingDayOfMonth: 1,
        tenantSignedAt: start, landlordSignedAt: start,
      },
    });

    for (let m = 5; m >= 0; m--) {
      const due = new Date(now.getFullYear(), now.getMonth()-m, 1);
      const paid = m > 0 || Math.random() > 0.08;
      await prisma.rentPayment.create({
        data: {
          leaseId: lease.id, tenantId: tenant.id, amount: unit.rentAmount, dueDate: due,
          status: paid ? 'paid' : (m === 0 ? 'pending' : 'overdue'),
          paidAt: paid ? new Date(due.getTime() + Math.random()*5*86400000) : null,
        },
      });
    }
  }
  console.log(`${Math.min(occupied.length, allTenants.length)} leases with payments`);

  const tickets = ['Leaking faucet in kitchen','AC not cooling','Broken window latch','Garbage disposal jammed','Smoke detector beeping','Door lock sticking','Water heater noise','Ceiling fan wobbling'];
  for (let i = 0; i < tickets.length; i++) {
    await prisma.maintenanceTicket.create({
      data: {
        title: `${PREFIX}${tickets[i]}`, description: tickets[i],
        unitId: occupied[i%occupied.length].id, tenantId: allTenants[i%allTenants.length].id,
        status: i<2?'open':i<5?'in_progress':'completed', priority: i===0?'urgent':i<3?'high':'medium',
      },
    });
  }

  const apps = ['Alex Morgan','Taylor Reed','Jordan Baker','Casey Jones','Riley Cooper','Morgan Blake','Pat Quinn','Sam Rivera'];
  const avail = allUnits.filter(u => u.isAvailable);
  for (let i = 0; i < apps.length; i++) {
    await prisma.rentalApplication.create({
      data: {
        fullName: `${PREFIX}${apps[i]}`, email: `demo-app-${i}${EMAIL_DOMAIN}`,
        unitId: avail[i%avail.length]?.id || allUnits[0].id,
        status: i<5?'pending':i<7?'approved':'rejected',
        monthlyIncome: 4000+Math.floor(Math.random()*6000),
      },
    });
  }

  console.log('✅ Done! Take your screenshot, then run with --cleanup');
}

(process.argv.includes('--cleanup') ? cleanup() : seed())
  .catch(console.error)
  .finally(() => prisma.$disconnect());
