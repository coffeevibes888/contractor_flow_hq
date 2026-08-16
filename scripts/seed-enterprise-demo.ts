/**
 * Enterprise-Level Seed Script — SuperAdmin Account Only
 * ═══════════════════════════════════════════════════════
 * Seeds a realistic enterprise portfolio for testing high-level accounting
 * and workflow at scale.
 *
 * Portfolio overview
 * ------------------
 *  • 25 single-family houses
 *  • 20 duplexes        (2 units each  → 40 units)
 *  • 15 8-plexes        (8 units each  → 120 units)
 *  • 30 commercial/retail units
 *  • 9  residential apartment buildings (8-16 units each)
 *  • 1  large apartment complex — "Grand Central Towers" (250 units)
 *  ──────────────────────────────────────────────────────
 *  Total: ~100 properties  |  ~500+ units
 *
 * Accounting layer
 * ----------------
 *  • Full ChartOfAccounts (GL) for the landlord
 *  • 12 FiscalPeriods  (Jan – Dec of current year)
 *  • JournalEntry + JournalLines for every rent payment and expense
 *  • TenantLedgerEntry (charge + payment) for every occupied lease
 *
 * Data richness
 * -------------
 *  • ~350 tenants (mix occupied / vacant, ~15 % vacancy)
 *  • 12 months of rent payments per tenant (mix paid / late / overdue)
 *  • PropertyFinance for every property (purchase price, mortgage, taxes)
 *  • 800+ Expenses spread across all 12 months and all expense categories
 *  • 300+ MaintenanceTickets across all statuses and priorities
 *  • 80  TenantInvoices (late fees, repair charges, violations)
 *  • RentalApplications for every vacant unit
 *  • LeaseViolations (~30)
 *
 * Run:     npx tsx scripts/seed-enterprise-demo.ts
 * Cleanup: npx tsx scripts/seed-enterprise-demo.ts --cleanup
 */

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not set');
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── Constants ───────────────────────────────────────────────────────────────
const SUPER_ADMIN_EMAIL = 'propertyflowhq@gmail.com';
const PREFIX = 'ENT_DEMO_';
const EMAIL_DOMAIN = '@enterprise-demo.test';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const rng = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ─── Reference data ───────────────────────────────────────────────────────────
const CITIES = [
  { city: 'Las Vegas',    state: 'NV', zip: 89101 },
  { city: 'Henderson',    state: 'NV', zip: 89002 },
  { city: 'North Las Vegas', state: 'NV', zip: 89030 },
  { city: 'Reno',         state: 'NV', zip: 89501 },
  { city: 'Henderson',    state: 'NV', zip: 89014 },
  { city: 'Summerlin',    state: 'NV', zip: 89135 },
];

const FIRST_NAMES = [
  'James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles',
  'Mary','Patricia','Jennifer','Linda','Barbara','Elizabeth','Susan','Jessica','Sarah','Karen',
  'Daniel','Matthew','Anthony','Mark','Donald','Steven','Paul','Andrew','Joshua','Kenneth',
  'Michelle','Lisa','Emily','Amanda','Melissa','Deborah','Stephanie','Rebecca','Sharon','Laura',
  'Kevin','Brian','George','Timothy','Ronald','Edward','Jason','Jeffrey','Ryan','Jacob',
  'Cynthia','Dorothy','Kathleen','Amy','Angela','Shirley','Anna','Brenda','Pamela','Emma',
  'Alexander','Tyler','Nathan','Patrick','Scott','Raymond','Brandon','Zachary','Frank','Gregory',
  'Nicole','Helen','Samantha','Diane','Evelyn','Rachel','Virginia','Katherine','Joyce','Victoria',
  'Jerry','Dennis','Walter','Harold','Douglas','Henry','Carl','Arthur','Lawrence','Roger',
  'Crystal','Theresa','Beverly','Judith','Carol','Jean','Alice','Megan','Cheryl','Andrea',
];

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Wilson','Anderson','Taylor',
  'Thomas','Jackson','White','Harris','Martin','Thompson','Garcia','Martinez','Robinson','Clark',
  'Rodriguez','Lewis','Lee','Walker','Hall','Allen','Young','Hernandez','King','Wright',
  'Lopez','Hill','Scott','Green','Adams','Baker','Gonzalez','Nelson','Carter','Mitchell',
  'Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart',
  'Sanchez','Morris','Rogers','Reed','Cook','Morgan','Bell','Murphy','Bailey','Rivera',
  'Cooper','Richardson','Cox','Howard','Ward','Torres','Peterson','Gray','Ramirez','James',
  'Watson','Brooks','Kelly','Sanders','Price','Bennett','Wood','Barnes','Ross','Henderson',
];

const MAINTENANCE_ISSUES = [
  { title: 'AC unit not cooling properly',         cat: 'HVAC',       priority: 'high' },
  { title: 'Leaking faucet in kitchen',            cat: 'Plumbing',   priority: 'medium' },
  { title: 'Broken garbage disposal',              cat: 'Appliances', priority: 'medium' },
  { title: 'Smoke detector beeping',               cat: 'Safety',     priority: 'high' },
  { title: 'Cracked window pane',                  cat: 'Windows',    priority: 'medium' },
  { title: 'Water heater making loud noise',       cat: 'Plumbing',   priority: 'high' },
  { title: 'Door lock sticking',                   cat: 'Doors',      priority: 'low' },
  { title: 'Ceiling fan wobbling',                 cat: 'Electrical', priority: 'low' },
  { title: 'Mold in bathroom',                     cat: 'Structural', priority: 'urgent' },
  { title: 'Toilet running continuously',          cat: 'Plumbing',   priority: 'medium' },
  { title: 'Pest infestation reported',            cat: 'Pest',       priority: 'urgent' },
  { title: 'Dishwasher leaking',                   cat: 'Appliances', priority: 'medium' },
  { title: 'Electrical outlet not working',        cat: 'Electrical', priority: 'high' },
  { title: 'Heating not working',                  cat: 'HVAC',       priority: 'urgent' },
  { title: 'Paint peeling on walls',               cat: 'Cosmetic',   priority: 'low' },
  { title: 'Refrigerator not cooling',             cat: 'Appliances', priority: 'high' },
  { title: 'Dryer not heating',                    cat: 'Appliances', priority: 'medium' },
  { title: 'Sewage smell from drain',              cat: 'Plumbing',   priority: 'urgent' },
  { title: 'Roof leak detected',                   cat: 'Structural', priority: 'urgent' },
  { title: 'Parking lot light out',                cat: 'Exterior',   priority: 'low' },
  { title: 'Hallway carpet needs replacement',     cat: 'Flooring',   priority: 'low' },
  { title: 'Elevator out of service',              cat: 'Elevator',   priority: 'urgent' },
  { title: 'Pool pump malfunctioning',             cat: 'Amenities',  priority: 'high' },
  { title: 'Gate code not working',                cat: 'Security',   priority: 'high' },
  { title: 'Water pressure too low',               cat: 'Plumbing',   priority: 'medium' },
];

const EXPENSE_CATEGORIES = [
  { cat: 'repairs',       range: [200, 3500],   vendor: 'Maintenance Co.' },
  { cat: 'utilities',     range: [80,  800],    vendor: 'NV Energy' },
  { cat: 'insurance',     range: [1200, 4000],  vendor: 'State Farm Commercial' },
  { cat: 'property_tax',  range: [2000, 12000], vendor: 'Clark County Assessor' },
  { cat: 'landscaping',   range: [150, 600],    vendor: 'Green Thumb Landscaping' },
  { cat: 'pest_control',  range: [80,  350],    vendor: 'Bug Busters Inc.' },
  { cat: 'cleaning',      range: [150, 600],    vendor: 'SparkleClean Services' },
  { cat: 'management_fee',range: [500, 4000],   vendor: 'Property Management Fee' },
  { cat: 'mortgage',      range: [1500, 6000],  vendor: 'Wells Fargo Mortgage' },
  { cat: 'hoa',           range: [200, 800],    vendor: 'HOA Association' },
  { cat: 'advertising',   range: [50,  400],    vendor: 'Zillow / Apartments.com' },
  { cat: 'legal',         range: [300, 2000],   vendor: 'Goodman Law Group' },
  { cat: 'accounting',    range: [200, 800],    vendor: 'CPA Services' },
  { cat: 'plumbing',      range: [250, 1800],   vendor: 'Rapid Plumbing LLC' },
  { cat: 'electrical',    range: [300, 2500],   vendor: 'Desert Electric Co.' },
  { cat: 'hvac',          range: [400, 3200],   vendor: 'Cool Air Solutions' },
  { cat: 'appliance',     range: [200, 1500],   vendor: 'Sears Appliance Repair' },
];

// ─── GL Account codes we'll use for journal entries ──────────────────────────
const GL = {
  CASH:             '1100',
  AR_RENT:          '1200',
  SECURITY_DEPOSIT: '2100',
  RENTAL_INCOME:    '4100',
  LATE_FEE_INCOME:  '4200',
  REPAIR_EXPENSE:   '6100',
  UTILITY_EXPENSE:  '6200',
  INSURANCE_EXPENSE:'6300',
  TAX_EXPENSE:      '6400',
  MGMT_FEE_EXPENSE: '6500',
  MORTGAGE_EXPENSE: '6600',
  OTHER_EXPENSE:    '6900',
};

// ─── Cleanup ──────────────────────────────────────────────────────────────────
async function cleanup() {
  console.log('🧹  Cleaning up ENT_DEMO data…');

  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: EMAIL_DOMAIN } },
    select: { id: true },
  });
  const tenantIds = demoUsers.map(u => u.id);

  // Order matters — respect FK constraints
  if (tenantIds.length) {
    await prisma.tenantLedgerEntry.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenantInvoice.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.rentPayment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.rentalApplication.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });
    await prisma.lease.deleteMany({ where: { tenantId: { in: tenantIds } } });
  }

  await prisma.maintenanceTicket.deleteMany({ where: { title: { startsWith: PREFIX } } });
  await prisma.expense.deleteMany({ where: { description: { startsWith: PREFIX } } });
  await prisma.leaseViolation.deleteMany({ where: { description: { startsWith: PREFIX } } });

  // Journal lines → entries
  const demoProps = await prisma.property.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });
  const propIds = demoProps.map(p => p.id);

  if (propIds.length) {
    await prisma.journalLine.deleteMany({ where: { propertyId: { in: propIds } } });
  }

  const landlord = await getLandlord();
  if (landlord) {
    await prisma.journalEntry.deleteMany({ where: { landlordId: landlord.id, memo: { startsWith: PREFIX } } });
    await prisma.fiscalPeriod.deleteMany({ where: { landlordId: landlord.id } });
    await prisma.chartOfAccount.deleteMany({ where: { landlordId: landlord.id } });
    await prisma.owner.deleteMany({ where: { landlordId: landlord.id, name: { startsWith: PREFIX } } });
  }

  await prisma.propertyFinance.deleteMany({ where: { propertyId: { in: propIds } } });
  await prisma.unit.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.property.deleteMany({ where: { name: { startsWith: PREFIX } } });

  if (tenantIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: tenantIds } } });
  }

  console.log('✅  Cleanup complete.');
}

async function getLandlord() {
  const user = await prisma.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
  if (!user) return null;
  return prisma.landlord.findFirst({ where: { ownerUserId: user.id } });
}

// ─── Main seed ────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🏢  Seeding enterprise-level demo data…\n');

  const user = await prisma.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
  if (!user) { console.error(`❌  User ${SUPER_ADMIN_EMAIL} not found`); return; }

  const landlord = await prisma.landlord.findFirst({ where: { ownerUserId: user.id } });
  if (!landlord) { console.error('❌  No landlord profile found for this user'); return; }

  console.log(`✔  Landlord: ${landlord.name}  (${landlord.id})`);
  const landlordId = landlord.id;

  const now   = new Date();
  const YEAR  = now.getFullYear();

  // ── 1. Chart of Accounts ──────────────────────────────────────────────────
  console.log('\n📊  Building Chart of Accounts…');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coaData: Array<{ code: string; name: string; type: string; subType: string | null; taxLine?: string }> = [
    { code: GL.CASH,              name: 'Cash – Operating',           type: 'asset',     subType: 'current_asset' },
    { code: GL.AR_RENT,           name: 'Accounts Receivable – Rent', type: 'asset',     subType: 'current_asset' },
    { code: '1300',               name: 'Security Deposits Held',     type: 'asset',     subType: 'current_asset' },
    { code: '1500',               name: 'Property & Equipment',       type: 'asset',     subType: 'fixed_asset' },
    { code: GL.SECURITY_DEPOSIT,  name: 'Security Deposit Liability', type: 'liability', subType: 'current_liability' },
    { code: '2200',               name: 'Mortgage Payable',           type: 'liability', subType: 'long_term_liability' },
    { code: '3100',               name: "Owner's Equity",             type: 'equity',    subType: null },
    { code: GL.RENTAL_INCOME,     name: 'Rental Income',              type: 'income',    subType: null, taxLine: 'line_3' },
    { code: GL.LATE_FEE_INCOME,   name: 'Late Fee Income',            type: 'income',    subType: null, taxLine: 'line_3' },
    { code: '4300',               name: 'Other Income',               type: 'income',    subType: null },
    { code: GL.REPAIR_EXPENSE,    name: 'Repairs & Maintenance',      type: 'expense',   subType: null, taxLine: 'line_14' },
    { code: GL.UTILITY_EXPENSE,   name: 'Utilities',                  type: 'expense',   subType: null, taxLine: 'line_17' },
    { code: GL.INSURANCE_EXPENSE, name: 'Insurance',                  type: 'expense',   subType: null, taxLine: 'line_9' },
    { code: GL.TAX_EXPENSE,       name: 'Property Taxes',             type: 'expense',   subType: null, taxLine: 'line_16' },
    { code: GL.MGMT_FEE_EXPENSE,  name: 'Management Fees',            type: 'expense',   subType: null, taxLine: 'line_11' },
    { code: GL.MORTGAGE_EXPENSE,  name: 'Mortgage Interest',          type: 'expense',   subType: null, taxLine: 'line_12' },
    { code: '6700',               name: 'Landscaping & Grounds',      type: 'expense',   subType: null, taxLine: 'line_14' },
    { code: '6800',               name: 'Professional Services',      type: 'expense',   subType: null, taxLine: 'line_10' },
    { code: GL.OTHER_EXPENSE,     name: 'Other Expenses',             type: 'expense',   subType: null, taxLine: 'line_19' },
  ];

  const coaMap: Record<string, string> = {};   // code → id
  for (const acct of coaData) {
    const existing = await prisma.chartOfAccount.findUnique({
      where: { landlordId_code: { landlordId, code: acct.code } },
    });
    if (existing) {
      coaMap[acct.code] = existing.id;
    } else {
      const created = await (prisma.chartOfAccount.create as any)({
        data: {
          landlordId,
          code:     acct.code,
          name:     acct.name,
          type:     acct.type,
          subType:  acct.subType ?? null,
          taxLine:  acct.taxLine ?? null,
          isSystem: false,
          isActive: true,
        },
      });
      coaMap[acct.code] = created.id;
    }
  }
  console.log(`   ✔  ${Object.keys(coaMap).length} GL accounts`);

  // ── 2. Fiscal Periods (Jan – Dec current year) ────────────────────────────
  console.log('📅  Creating 12 fiscal periods…');
  const periodIds: string[] = [];
  for (let m = 0; m < 12; m++) {
    const start = new Date(YEAR, m, 1);
    const end   = new Date(YEAR, m + 1, 0, 23, 59, 59);
    const isPast = m < now.getMonth() || (m === now.getMonth() && now.getDate() > 25);
    const status = m < now.getMonth() - 1 ? 'closed' : isPast ? 'locked' : 'open';
    const fp = await prisma.fiscalPeriod.upsert({
      where: { landlordId_startDate: { landlordId, startDate: start } },
      create: { landlordId, startDate: start, endDate: end, status },
      update: {},
    });
    periodIds.push(fp.id);
  }
  console.log('   ✔  12 fiscal periods');

  // ── 3. Tenant name pool ───────────────────────────────────────────────────
  console.log('\n👥  Generating tenant pool…');
  const tenantNames: string[] = [];
  const seen = new Set<string>();
  while (tenantNames.length < 400) {
    const n = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    if (!seen.has(n)) { seen.add(n); tenantNames.push(n); }
  }
  const tenantUsers: Array<{ id: string; name: string }> = [];
  for (let i = 0; i < tenantNames.length; i++) {
    const u = await prisma.user.create({
      data: {
        name:  `${PREFIX}${tenantNames[i]}`,
        email: `ent-tenant-${i}${EMAIL_DOMAIN}`,
        role:  'tenant',
      },
    });
    tenantUsers.push(u);
  }
  console.log(`   ✔  ${tenantUsers.length} tenants created`);

  let tenantIdx = 0;

  // Counters for progress reporting
  let totalProperties = 0, totalUnits = 0, totalLeases = 0;
  let totalPayments = 0, totalExpenses = 0, totalTickets = 0;

  // ── Helper: build a lease + 12 months of payments + ledger ───────────────
  async function createLeaseWithHistory(
    unitId: string, propertyId: string, rentAmount: number,
    months = 12
  ) {
    if (tenantIdx >= tenantUsers.length) return;
    const tenant = tenantUsers[tenantIdx++];

    const leaseStart = new Date(YEAR, 0, 1);
    const leaseEnd   = new Date(YEAR + 1, 0, 1);

    const lease = await prisma.lease.create({
      data: {
        unitId, tenantId: tenant.id,
        startDate: leaseStart, endDate: leaseEnd,
        rentAmount, status: 'active', billingDayOfMonth: 1,
        tenantSignedAt: leaseStart, landlordSignedAt: leaseStart,
      },
    });
    totalLeases++;

    let runningBalance = 0;

    for (let m = 0; m < months; m++) {
      const dueDate = new Date(YEAR, m, 1);
      if (dueDate > now) break;   // don't generate future payments

      const monthPeriodId = periodIds[m];
      const isCurrentMonth = m === now.getMonth();

      // Realistic payment behaviour
      const rand = Math.random();
      let status: string;
      let paidAt: Date | null = null;
      if (isCurrentMonth) {
        status = rand < 0.70 ? 'paid' : rand < 0.85 ? 'pending' : 'overdue';
      } else {
        status = rand < 0.88 ? 'paid' : rand < 0.95 ? 'overdue' : 'paid';
      }
      if (status === 'paid') {
        paidAt = new Date(dueDate.getTime() + rng(0, 5) * 86400000);
      }

      const lateFee = status === 'overdue' ? rng(50, 150) : 0;
      const totalPaid = status === 'paid' ? rentAmount : 0;

      const payment = await prisma.rentPayment.create({
        data: {
          leaseId: lease.id, tenantId: tenant.id,
          amount: rentAmount, dueDate, status,
          paidAt, amountPaid: totalPaid,
          paymentMethod: pick(['card', 'us_bank_account', 'ach']),
        },
      });
      totalPayments++;

      // TenantLedger — charge
      await prisma.tenantLedgerEntry.create({
        data: {
          landlordId, tenantId: tenant.id, leaseId: lease.id,
          propertyId, unitId,
          type: 'charge', amount: rentAmount,
          runningBalance: runningBalance + rentAmount,
          effectiveDate: dueDate,
          description: `Rent charge — ${dueDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          rentPaymentId: payment.id,
        },
      });
      runningBalance += rentAmount;

      if (status === 'paid' && paidAt) {
        await prisma.tenantLedgerEntry.create({
          data: {
            landlordId, tenantId: tenant.id, leaseId: lease.id,
            propertyId, unitId,
            type: 'payment', amount: -rentAmount,
            runningBalance: runningBalance - rentAmount,
            effectiveDate: paidAt,
            description: `Rent payment received`,
            rentPaymentId: payment.id,
          },
        });
        runningBalance -= rentAmount;

        // Journal Entry — rent received
        const je = await prisma.journalEntry.create({
          data: {
            landlordId,
            periodId: monthPeriodId,
            effectiveDate: paidAt,
            memo: `${PREFIX}Rent — ${tenant.name} — ${dueDate.toLocaleString('default', { month: 'short', year: 'numeric' })}`,
            source: 'rent_payment',
            sourceId: payment.id,
          },
        });
        await prisma.journalLine.createMany({
          data: [
            { entryId: je.id, accountId: coaMap[GL.CASH],          debit: rentAmount, credit: 0, propertyId, tenantId: tenant.id },
            { entryId: je.id, accountId: coaMap[GL.RENTAL_INCOME],  debit: 0, credit: rentAmount, propertyId, tenantId: tenant.id },
          ],
        });
      }

      // Late fee if overdue
      if (lateFee > 0) {
        await prisma.tenantInvoice.create({
          data: {
            propertyId, tenantId: tenant.id, leaseId: lease.id,
            amount: lateFee,
            reason: 'Late Fee',
            description: `Late fee for ${dueDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
            dueDate: new Date(dueDate.getTime() + 10 * 86400000),
            status: Math.random() > 0.5 ? 'paid' : 'overdue',
            paidAt: Math.random() > 0.5 ? new Date(dueDate.getTime() + 15 * 86400000) : null,
          },
        });
      }
    }
  }

  // ── Helper: add expenses for a property ───────────────────────────────────
  async function addExpenses(propertyId: string, count: number) {
    for (let i = 0; i < count; i++) {
      const ec = pick(EXPENSE_CATEGORIES);
      const month = rng(0, Math.min(11, now.getMonth()));
      const day   = rng(1, 28);
      const incurredAt = new Date(YEAR, month, day);
      const amount = rng(ec.range[0], ec.range[1]);
      const glCode = expenseCatToGL(ec.cat);
      const expense = await prisma.expense.create({
        data: {
          landlordId, propertyId,
          amount, category: ec.cat,
          description: `${PREFIX}${ec.cat} — ${ec.vendor}`,
          vendor: ec.vendor,
          incurredAt,
          isRecurring: Math.random() < 0.2,
        },
      });
      totalExpenses++;

      const periodIdx = Math.min(month, periodIds.length - 1);
      const je = await prisma.journalEntry.create({
        data: {
          landlordId,
          periodId: periodIds[periodIdx],
          effectiveDate: incurredAt,
          memo: `${PREFIX}Expense: ${ec.cat} — ${ec.vendor}`,
          source: 'expense',
          sourceId: expense.id,
        },
      });
      await prisma.journalLine.createMany({
        data: [
          { entryId: je.id, accountId: coaMap[glCode],    debit: amount, credit: 0, propertyId },
          { entryId: je.id, accountId: coaMap[GL.CASH],   debit: 0, credit: amount, propertyId },
        ],
      });
    }
  }

  function expenseCatToGL(cat: string): string {
    const map: Record<string, string> = {
      repairs:        GL.REPAIR_EXPENSE,
      utilities:      GL.UTILITY_EXPENSE,
      insurance:      GL.INSURANCE_EXPENSE,
      property_tax:   GL.TAX_EXPENSE,
      management_fee: GL.MGMT_FEE_EXPENSE,
      mortgage:       GL.MORTGAGE_EXPENSE,
    };
    return map[cat] ?? GL.OTHER_EXPENSE;
  }

  // ── Helper: add maintenance tickets ───────────────────────────────────────
  async function addTickets(unitId: string, tenantId: string | null, count: number) {
    for (let i = 0; i < count; i++) {
      const issue = pick(MAINTENANCE_ISSUES);
      const daysAgo = rng(0, 180);
      const createdAt = new Date(now.getTime() - daysAgo * 86400000);
      const statusRoll = Math.random();
      const status = daysAgo > 90 ? 'completed' : statusRoll < 0.25 ? 'open' : statusRoll < 0.55 ? 'in_progress' : 'completed';
      await prisma.maintenanceTicket.create({
        data: {
          title: `${PREFIX}${issue.title}`,
          description: `${issue.cat} issue reported — ${issue.title}`,
          unitId,
          tenantId,
          status,
          priority: issue.priority as any,
          createdAt,
          resolvedAt: status === 'completed' ? new Date(createdAt.getTime() + rng(1, 14) * 86400000) : null,
          cost: status === 'completed' ? rng(50, 2500) : null,
          location: pick(['Kitchen', 'Bathroom', 'Bedroom', 'Living Room', 'Common Area', 'Exterior', 'Basement']),
        },
      });
      totalTickets++;
    }
  }

  // ── Helper: add PropertyFinance ───────────────────────────────────────────
  async function addPropertyFinance(propertyId: string, purchasePriceBase: number) {
    const purchase = purchasePriceBase + rng(-50000, 200000);
    await prisma.propertyFinance.upsert({
      where: { propertyId },
      create: {
        propertyId,
        purchasePrice:       purchase,
        downPayment:         Math.round(purchase * 0.2),
        loanBalance:         Math.round(purchase * 0.75),
        interestRatePercent: 5.5 + Math.random() * 2.5,
        loanTermMonths:      360,
        annualPropertyTax:   Math.round(purchase * 0.012),
        annualInsurance:     rng(1200, 6000),
        hoaMonthly:          Math.random() > 0.5 ? rng(150, 600) : null,
        managementFeePercent: 8 + Math.random() * 4,
        appreciationRatePercent: 3 + Math.random() * 2,
      },
      update: {},
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. PROPERTIES
  // ─────────────────────────────────────────────────────────────────────────

  // ── 4a. Single-Family Houses (25) ─────────────────────────────────────────
  console.log('\n🏠  Creating 25 single-family houses…');
  const sfhNames = [
    'Sunrise Valley Home','Desert Oasis House','Boulder Ridge Cottage','Summerlin Estate',
    'Green Valley Ranch','Mountain Shadow House','Canyon Creek Cottage','Spring Valley Home',
    'Red Rock Retreat','Silver Hills House','Meadow Brook Estate','Palm Court Home',
    'Lone Mountain House','Centennial Hills Home','Peccole Ranch Cottage','Craig Ranch House',
    'Providence Estate','Tule Springs Home','Aliante House','Skye Canyon Cottage',
    'The Crossing Home','Tuscany Hills Estate','La Madre Mountain House','Sun City Home',
    'Eldorado Heights Cottage',
  ];
  for (let i = 0; i < 25; i++) {
    const loc = pick(CITIES);
    const rent = rng(1400, 3200);
    const propName = `${PREFIX}${sfhNames[i]}`;
    const prop = await prisma.property.create({
      data: {
        name: propName,
        slug: `${slugify(propName)}-sfh-${i}-${Date.now()}`,
        type: 'house',
        landlordId,
        address: { street: `${rng(100, 9999)} ${pick(['Desert Dr', 'Canyon Rd', 'Sunset Blvd', 'Oak Ave', 'Pine St'])}`, city: loc.city, state: loc.state, zip: String(loc.zip + i) },
        amenities: ['parking', 'yard', 'garage'],
      },
    });
    totalProperties++;

    const unit = await prisma.unit.create({
      data: {
        name: `${PREFIX}Main Unit`,
        propertyId: prop.id,
        type: 'house',
        bedrooms: rng(2, 5),
        bathrooms: pick([1, 1.5, 2, 2.5, 3]),
        sizeSqFt: rng(1000, 3500),
        rentAmount: rent,
        isAvailable: Math.random() < 0.12,
        images: [],
      },
    });
    totalUnits++;

    await addPropertyFinance(prop.id, 320000);
    await addExpenses(prop.id, rng(6, 12));

    if (!unit.isAvailable) {
      await createLeaseWithHistory(unit.id, prop.id, rent);
      await addTickets(unit.id, tenantUsers[tenantIdx - 1]?.id ?? null, rng(1, 3));
    } else {
      await prisma.rentalApplication.create({
        data: {
          fullName: `${PREFIX}${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          email: `ent-app-sfh-${i}${EMAIL_DOMAIN}`,
          unitId: unit.id, status: pick(['pending', 'approved', 'pending']),
          monthlyIncome: rng(4000, 12000),
        },
      });
    }
  }
  console.log('   ✔  25 SFH properties');

  // ── 4b. Duplexes (20) ─────────────────────────────────────────────────────
  console.log('🏘  Creating 20 duplexes…');
  for (let i = 0; i < 20; i++) {
    const loc = pick(CITIES);
    const propName = `${PREFIX}Desert Duplex ${i + 1}`;
    const prop = await prisma.property.create({
      data: {
        name: propName,
        slug: `${slugify(propName)}-${Date.now()}-${i}`,
        type: 'duplex',
        landlordId,
        address: { street: `${rng(100, 9999)} Duplex Lane`, city: loc.city, state: loc.state, zip: String(loc.zip + i + 25) },
        amenities: ['parking', 'shared_laundry'],
      },
    });
    totalProperties++;
    await addPropertyFinance(prop.id, 280000);
    await addExpenses(prop.id, rng(5, 9));

    for (const side of ['A', 'B']) {
      const rent = rng(1100, 2400);
      const unit = await prisma.unit.create({
        data: {
          name: `${PREFIX}Unit ${side}`,
          propertyId: prop.id,
          type: 'apartment',
          bedrooms: rng(1, 3),
          bathrooms: pick([1, 1.5, 2]),
          sizeSqFt: rng(700, 1500),
          rentAmount: rent,
          isAvailable: Math.random() < 0.15,
          images: [],
        },
      });
      totalUnits++;
      if (!unit.isAvailable) {
        await createLeaseWithHistory(unit.id, prop.id, rent);
        await addTickets(unit.id, tenantUsers[tenantIdx - 1]?.id ?? null, rng(0, 2));
      }
    }
  }
  console.log('   ✔  20 duplexes');

  // ── 4c. 8-plexes (15) ─────────────────────────────────────────────────────
  console.log('🏢  Creating 15 eight-plexes…');
  for (let i = 0; i < 15; i++) {
    const loc = pick(CITIES);
    const propName = `${PREFIX}8-Plex Building ${i + 1}`;
    const prop = await prisma.property.create({
      data: {
        name: propName,
        slug: `${slugify(propName)}-${Date.now()}-${i}`,
        type: 'multi_family',
        landlordId,
        address: { street: `${rng(100, 9999)} 8-Plex Ave`, city: loc.city, state: loc.state, zip: String(loc.zip + i + 50) },
        amenities: ['parking', 'laundry_room', 'mailbox'],
      },
    });
    totalProperties++;
    await addPropertyFinance(prop.id, 600000);
    await addExpenses(prop.id, rng(8, 16));

    for (let u = 1; u <= 8; u++) {
      const rent = rng(900, 1800);
      const unit = await prisma.unit.create({
        data: {
          name: `${PREFIX}Unit ${u}`,
          propertyId: prop.id,
          type: 'apartment',
          bedrooms: rng(1, 2),
          bathrooms: pick([1, 1.5]),
          sizeSqFt: rng(650, 1200),
          rentAmount: rent,
          isAvailable: Math.random() < 0.15,
          images: [],
        },
      });
      totalUnits++;
      if (!unit.isAvailable) {
        await createLeaseWithHistory(unit.id, prop.id, rent);
        await addTickets(unit.id, tenantUsers[tenantIdx - 1]?.id ?? null, rng(0, 3));
      }
    }
  }
  console.log('   ✔  15 eight-plexes');

  // ── 4d. Commercial / Retail (30) ──────────────────────────────────────────
  console.log('🏪  Creating 30 commercial properties…');
  const commercialNames = [
    'Sunset Strip Retail','Boulder Hwy Plaza','Vegas Valley Office','North Town Centre',
    'Sahara Business Park','Spring Valley Commerce','Tropicana Trade Center','Flamingo Office Park',
    'Rainbow Business Hub','Eastern Ave Retail','Decatur Business Center','MLK Boulevard Office',
    'Nellis Business Plaza','Cheyenne Commerce Park','Craig Road Office','Warm Springs Retail',
    'Pecos Business Park','Sloan Business Center','Blue Diamond Commercial','Sky Pointe Office',
    'Centennial Plaza Retail','Stephanie Street Commerce','Green Valley Business Park',
    'Pebble Road Office','Anthem Commercial Center','Summerlin Business Hub','Seven Hills Plaza',
    'MacDonald Ranch Office','Silverado Ranch Retail','Whitney Ranch Commerce',
  ];
  for (let i = 0; i < 30; i++) {
    const loc = pick(CITIES);
    const propName = `${PREFIX}${commercialNames[i]}`;
    const prop = await prisma.property.create({
      data: {
        name: propName,
        slug: `${slugify(propName)}-${Date.now()}-${i}`,
        type: pick(['office', 'retail', 'mixed-use', 'warehouse']),
        landlordId,
        address: { street: `${rng(100, 9999)} Commercial Blvd`, city: loc.city, state: loc.state, zip: String(loc.zip + i + 70) },
        amenities: ['parking_lot', 'security', 'loading_dock'],
      },
    });
    totalProperties++;
    await addPropertyFinance(prop.id, 750000);
    await addExpenses(prop.id, rng(6, 14));

    const numUnits = rng(1, 4);
    for (let u = 0; u < numUnits; u++) {
      const rent = rng(2000, 8000);
      const unit = await prisma.unit.create({
        data: {
          name: `${PREFIX}Suite ${100 + u}`,
          propertyId: prop.id,
          type: 'office',
          sizeSqFt: rng(500, 5000),
          rentAmount: rent,
          isAvailable: Math.random() < 0.20,
          images: [],
        },
      });
      totalUnits++;
      if (!unit.isAvailable) {
        await createLeaseWithHistory(unit.id, prop.id, rent);
        await addTickets(unit.id, null, rng(0, 2));
      }
    }
  }
  console.log('   ✔  30 commercial properties');

  // ── 4e. Residential Apartment Buildings (9, 8–16 units each) ─────────────
  console.log('🏗  Creating 9 residential apartment buildings…');
  const apBuildings = [
    { name: 'Oasis Gardens',       units: 12 },
    { name: 'Desert Rose Apts',    units: 10 },
    { name: 'Palm Shadow Place',   units: 8  },
    { name: 'Canyon Crest Flats',  units: 16 },
    { name: 'Sunset Terrace',      units: 14 },
    { name: 'Horizon Walk Apts',   units: 12 },
    { name: 'Sierra Nevada Suites',units: 8  },
    { name: 'Valley View Flats',   units: 10 },
    { name: 'Rancho Park Apts',    units: 12 },
  ];
  for (let i = 0; i < apBuildings.length; i++) {
    const b = apBuildings[i];
    const loc = pick(CITIES);
    const propName = `${PREFIX}${b.name}`;
    const prop = await prisma.property.create({
      data: {
        name: propName,
        slug: `${slugify(propName)}-${Date.now()}-${i}`,
        type: 'apartment',
        landlordId,
        address: { street: `${rng(100, 9999)} Apartment Ln`, city: loc.city, state: loc.state, zip: String(loc.zip + i + 90) },
        amenities: ['pool', 'gym', 'parking', 'laundry'],
      },
    });
    totalProperties++;
    await addPropertyFinance(prop.id, 1200000);
    await addExpenses(prop.id, rng(10, 20));

    for (let u = 1; u <= b.units; u++) {
      const rent = rng(950, 2200);
      const unit = await prisma.unit.create({
        data: {
          name: `${PREFIX}Apt ${u}`,
          propertyId: prop.id,
          type: 'apartment',
          bedrooms: rng(1, 3),
          bathrooms: pick([1, 1.5, 2]),
          sizeSqFt: rng(650, 1400),
          rentAmount: rent,
          isAvailable: Math.random() < 0.15,
          images: [],
        },
      });
      totalUnits++;
      if (!unit.isAvailable) {
        await createLeaseWithHistory(unit.id, prop.id, rent);
        await addTickets(unit.id, tenantUsers[tenantIdx - 1]?.id ?? null, rng(0, 3));
      }
    }
  }
  console.log('   ✔  9 apartment buildings');

  // ── 4f. Grand Central Towers (1 complex, 250 units) ───────────────────────
  console.log('\n🏙  Creating Grand Central Towers (250-unit complex)…');
  const gtProp = await prisma.property.create({
    data: {
      name: `${PREFIX}Grand Central Towers`,
      slug: `ent-demo-grand-central-towers-${Date.now()}`,
      type: 'apartment_complex',
      landlordId,
      description: 'Flagship 250-unit luxury apartment complex in the heart of Las Vegas.',
      address: { street: '1 Grand Central Way', city: 'Las Vegas', state: 'NV', zip: '89101' },
      amenities: ['pool', 'gym', 'concierge', 'rooftop', 'parking_garage', 'ev_charging', 'dog_park', 'business_center', 'clubhouse'],
    },
  });
  totalProperties++;
  await addPropertyFinance(gtProp.id, 45000000);
  await addExpenses(gtProp.id, rng(40, 60));

  const unitTypes = [
    { label: 'Studio',  beds: 0, baths: 1,   rentMin: 950,  rentMax: 1200, count: 30 },
    { label: '1BR',     beds: 1, baths: 1,   rentMin: 1100, rentMax: 1600, count: 80 },
    { label: '1BR+Den', beds: 1, baths: 1.5, rentMin: 1250, rentMax: 1800, count: 40 },
    { label: '2BR',     beds: 2, baths: 2,   rentMin: 1600, rentMax: 2400, count: 70 },
    { label: '2BR+Den', beds: 2, baths: 2.5, rentMin: 1900, rentMax: 2800, count: 20 },
    { label: '3BR',     beds: 3, baths: 2,   rentMin: 2400, rentMax: 3500, count: 10 },
  ];
  let gtUnitNum = 100;
  let gtTotalUnits = 0;

  for (const ut of unitTypes) {
    for (let u = 0; u < ut.count; u++) {
      const floor = Math.ceil((gtTotalUnits + 1) / 25);
      const rent  = rng(ut.rentMin, ut.rentMax);
      const unit  = await prisma.unit.create({
        data: {
          name: `${PREFIX}${gtUnitNum}`,
          propertyId: gtProp.id,
          type: 'apartment',
          building: `Tower ${Math.ceil((u + 1) / 50) === 1 ? 'A' : 'B'}`,
          floor,
          bedrooms: ut.beds,
          bathrooms: ut.baths,
          sizeSqFt: rng(450 + ut.beds * 150, 900 + ut.beds * 300),
          rentAmount: rent,
          isAvailable: Math.random() < 0.10,   // 90 % occupied for the big complex
          amenities: ['in_unit_washer_dryer', 'balcony', 'dishwasher'],
          images: [],
        },
      });
      gtUnitNum++;
      gtTotalUnits++;
      totalUnits++;

      if (!unit.isAvailable) {
        await createLeaseWithHistory(unit.id, gtProp.id, rent);
        const lastTenant = tenantUsers[tenantIdx - 1];
        if (lastTenant && Math.random() < 0.35) {
          await addTickets(unit.id, lastTenant.id, rng(1, 2));
        }
      } else {
        await prisma.rentalApplication.create({
          data: {
            fullName: `${PREFIX}${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
            email: `ent-app-gct-${gtUnitNum}${EMAIL_DOMAIN}`,
            unitId: unit.id, status: pick(['pending', 'approved', 'pending', 'rejected']),
            monthlyIncome: rng(3000, 12000),
          },
        });
      }
    }
  }
  console.log(`   ✔  Grand Central Towers — ${gtTotalUnits} units created`);

  // ── 5. Lease Violations ───────────────────────────────────────────────────
  console.log('\n⚠  Seeding lease violations…');
  const activeLeases = await prisma.lease.findMany({
    where: { unit: { property: { landlordId, name: { startsWith: PREFIX } } }, status: 'active' },
    select: { id: true, tenantId: true, unitId: true },
    take: 30,
  });
  const violationTypes = ['noise', 'unauthorized_pet', 'late_payment', 'unauthorized_occupant', 'property_damage', 'parking_violation'];
  for (let i = 0; i < Math.min(30, activeLeases.length); i++) {
    const l = activeLeases[i];
    const daysAgo = rng(10, 200);
    const occurredAt = new Date(now.getTime() - daysAgo * 86400000);
    await prisma.leaseViolation.create({
      data: {
        landlordId, leaseId: l.id,
        tenantId: l.tenantId, unitId: l.unitId,
        type: pick(violationTypes),
        description: `${PREFIX}Lease violation reported — ${pick(violationTypes).replace('_', ' ')}`,
        occurredAt,
        resolvedAt: Math.random() > 0.5 ? new Date(occurredAt.getTime() + rng(1, 30) * 86400000) : null,
      },
    });
  }
  console.log('   ✔  Lease violations seeded');

  // ── 6. Summary ────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════╗
║            ENTERPRISE SEED COMPLETE  🎉                   ║
╠══════════════════════════════════════════════════════════╣
║  Properties  : ${String(totalProperties).padEnd(10)} (houses, duplexes, 8-plexes,   ║
║                           commercial, apt buildings,      ║
║                           + Grand Central Towers)         ║
║  Units       : ${String(totalUnits).padEnd(42)}║
║  Leases      : ${String(totalLeases).padEnd(42)}║
║  Rent Pmts   : ${String(totalPayments).padEnd(42)}║
║  Expenses    : ${String(totalExpenses).padEnd(42)}║
║  Maint Tix   : ${String(totalTickets).padEnd(42)}║
║  GL Accounts : ${String(Object.keys(coaMap).length).padEnd(42)}║
║  Fiscal Periods: 12 (Jan–Dec ${YEAR})${' '.repeat(12)}║
╠══════════════════════════════════════════════════════════╣
║  To clean up: npx tsx scripts/seed-enterprise-demo.ts    ║
║               --cleanup                                   ║
╚══════════════════════════════════════════════════════════╝
`);
}

// ─── Entry point ──────────────────────────────────────────────────────────────
(process.argv.includes('--cleanup') ? cleanup() : seed())
  .catch(console.error)
  .finally(() => prisma.$disconnect());
