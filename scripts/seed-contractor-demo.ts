/**
 * Seed demo data for the Contractor dashboard screenshots.
 * Run: npx tsx scripts/seed-contractor-demo.ts
 * Cleanup: npx tsx scripts/seed-contractor-demo.ts --cleanup
 */
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not set');
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter }) as any;

const CONTRACTOR_EMAIL = 'earthangelallen888@outlook.com';
const PREFIX = 'DEMO_CTR_';
const CUSTOMER_EMAIL_DOMAIN = '@contractor-demo.test';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
function generateJobNumber(i: number) {
  return `JOB-2025-${String(i + 1).padStart(4, '0')}`;
}
function generateInvoiceNumber(i: number) {
  return `INV-2025-${String(i + 1).padStart(4, '0')}`;
}
function generateContractNumber(i: number) {
  return `CTR-2025-${String(i + 1).padStart(3, '0')}`;
}

// ─── Data Arrays ───────────────────────────────────────────────────────────────
const customerNames = [
  'Marcus Johnson', 'Sarah Williams', 'David Chen', 'Emily Rodriguez',
  'James Thompson', 'Lisa Park', 'Robert Kim', 'Jennifer Martinez',
  'Thomas Brown', 'Amanda Foster', 'Kevin Lee', 'Rachel Adams',
  'Daniel Wilson', 'Sophie Turner', 'Chris Evans', 'Maria Garcia',
  'Brian Mitchell', 'Nicole Rivera', 'Jason Taylor', 'Ashley Cooper',
  'Michael Davis', 'Laura White', 'Steven Harris', 'Megan Clark',
];

const jobTypes = [
  'Kitchen Remodel', 'Bathroom Renovation', 'Deck Construction', 'Roof Repair',
  'HVAC Installation', 'Plumbing Repair', 'Electrical Upgrade', 'Basement Finishing',
  'Fence Installation', 'Driveway Paving', 'Window Replacement', 'Siding Installation',
  'Flooring Installation', 'Painting - Interior', 'Painting - Exterior', 'Landscaping',
  'Garage Door Replacement', 'Water Heater Install', 'Gutter Installation', 'Concrete Work',
];

const jobDescriptions: Record<string, string> = {
  'Kitchen Remodel': 'Full kitchen renovation including cabinets, countertops, backsplash, and appliance installation.',
  'Bathroom Renovation': 'Complete bathroom remodel with new tile, vanity, fixtures, and shower enclosure.',
  'Deck Construction': 'Build new composite deck with railing, stairs, and built-in seating area.',
  'Roof Repair': 'Replace damaged shingles, repair flashing, and seal around vents and chimney.',
  'HVAC Installation': 'Install new central air conditioning system with ductwork modifications.',
  'Plumbing Repair': 'Fix leaking pipes, replace corroded fittings, and update shut-off valves.',
  'Electrical Upgrade': 'Upgrade electrical panel to 200A, add circuits for kitchen and garage.',
  'Basement Finishing': 'Frame, insulate, drywall, and finish basement with egress window.',
  'Fence Installation': 'Install 6ft cedar privacy fence with gate and post caps.',
  'Driveway Paving': 'Remove old concrete and pour new stamped concrete driveway.',
  'Window Replacement': 'Replace 12 single-pane windows with energy-efficient double-pane.',
  'Siding Installation': 'Remove old siding and install new vinyl siding with house wrap.',
  'Flooring Installation': 'Install luxury vinyl plank flooring throughout main level.',
  'Painting - Interior': 'Paint all interior walls, trim, and ceilings - 2 coats.',
  'Painting - Exterior': 'Pressure wash, prime, and paint exterior - 2 coats.',
  'Landscaping': 'Design and install front yard landscaping with irrigation system.',
  'Garage Door Replacement': 'Remove old door and install insulated steel garage door with opener.',
  'Water Heater Install': 'Replace 40-gallon tank with tankless water heater.',
  'Gutter Installation': 'Install seamless aluminum gutters with leaf guards.',
  'Concrete Work': 'Pour new concrete patio with expansion joints and broom finish.',
};

const streets = [
  '123 Oak Street', '456 Maple Avenue', '789 Pine Road', '321 Elm Drive',
  '654 Cedar Lane', '987 Birch Court', '147 Walnut Way', '258 Spruce Blvd',
  '369 Ash Circle', '741 Willow Path', '852 Cherry Lane', '963 Hickory Drive',
];
const cities = ['Denver', 'Aurora', 'Lakewood', 'Arvada', 'Westminster', 'Thornton', 'Centennial', 'Boulder'];
const states = ['CO'];

const expenseCategories = ['Materials', 'Tools', 'Fuel', 'Permits', 'Subcontractor', 'Equipment Rental', 'Supplies', 'Other'];
const expenseDescriptions: Record<string, string[]> = {
  'Materials': ['Lumber - 2x4 framing', 'PVC pipe and fittings', 'Drywall sheets', 'Concrete mix', 'Copper wire 12/2'],
  'Tools': ['Cordless drill set', 'Circular saw blade', 'Level - 4ft', 'Pipe wrench set', 'Multimeter'],
  'Fuel': ['Truck fuel - job site travel', 'Generator fuel', 'Equipment fuel'],
  'Permits': ['Building permit', 'Electrical permit', 'Plumbing permit', 'Mechanical permit'],
  'Subcontractor': ['Electrician - panel upgrade', 'Plumber - rough-in', 'HVAC tech - duct install'],
  'Equipment Rental': ['Mini excavator - 1 day', 'Scaffolding rental', 'Dumpster rental - 10yd'],
  'Supplies': ['Safety glasses', 'Work gloves', 'Dust masks', 'Drop cloths', 'Painters tape'],
  'Other': ['Parking fees', 'Toll charges', 'Client lunch meeting'],
};

const equipmentItems = [
  { name: 'DeWalt 20V Drill/Driver Kit', type: 'power_tool', manufacturer: 'DeWalt', model: 'DCD771C2' },
  { name: 'Milwaukee M18 Circular Saw', type: 'power_tool', manufacturer: 'Milwaukee', model: '2631-20' },
  { name: 'Bosch Rotary Hammer', type: 'power_tool', manufacturer: 'Bosch', model: 'GBH2-28L' },
  { name: 'Honda Generator EU2200i', type: 'machinery', manufacturer: 'Honda', model: 'EU2200i' },
  { name: 'Ford F-250 Super Duty', type: 'vehicle', manufacturer: 'Ford', model: 'F-250 2022' },
  { name: 'Chevy Express Cargo Van', type: 'vehicle', manufacturer: 'Chevrolet', model: 'Express 2500' },
  { name: 'Werner 28ft Extension Ladder', type: 'hand_tool', manufacturer: 'Werner', model: 'D6228-2' },
  { name: 'Ridgid Table Saw', type: 'power_tool', manufacturer: 'Ridgid', model: 'R4514' },
  { name: 'Makita Miter Saw', type: 'power_tool', manufacturer: 'Makita', model: 'LS1019L' },
  { name: 'CAT Mini Excavator', type: 'machinery', manufacturer: 'Caterpillar', model: '301.7 CR' },
  { name: 'Husqvarna Concrete Saw', type: 'power_tool', manufacturer: 'Husqvarna', model: 'K770' },
  { name: 'Hilti Laser Level', type: 'hand_tool', manufacturer: 'Hilti', model: 'PM 30-MG' },
];

const inventoryItems = [
  { name: '2x4x8 Lumber', sku: 'LBR-2x4-8', category: 'lumber', unit: 'each', unitCost: 4.50 },
  { name: '1/2" Copper Pipe (10ft)', sku: 'PLB-CU12-10', category: 'plumbing', unit: 'each', unitCost: 18.75 },
  { name: '12/2 Romex Wire (250ft)', sku: 'ELC-ROM-250', category: 'electrical', unit: 'roll', unitCost: 89.99 },
  { name: '4x8 Drywall Sheet', sku: 'DRY-48-REG', category: 'drywall', unit: 'sheet', unitCost: 12.50 },
  { name: 'PVC Cement (16oz)', sku: 'PLB-PVC-16', category: 'plumbing', unit: 'can', unitCost: 8.99 },
  { name: 'Deck Screws (5lb box)', sku: 'HDW-DSC-5LB', category: 'hardware', unit: 'box', unitCost: 24.99 },
  { name: 'Concrete Mix (80lb bag)', sku: 'CON-MIX-80', category: 'concrete', unit: 'bag', unitCost: 6.50 },
  { name: 'R-30 Insulation Batt', sku: 'INS-R30-BT', category: 'insulation', unit: 'each', unitCost: 15.00 },
  { name: 'Interior Latex Paint (5gal)', sku: 'PNT-INT-5G', category: 'paint', unit: 'bucket', unitCost: 125.00 },
  { name: 'Exterior Paint (5gal)', sku: 'PNT-EXT-5G', category: 'paint', unit: 'bucket', unitCost: 165.00 },
  { name: '3/4" Plywood Sheet', sku: 'LBR-PLY-34', category: 'lumber', unit: 'sheet', unitCost: 52.00 },
  { name: 'GFCI Outlet', sku: 'ELC-GFCI-15', category: 'electrical', unit: 'each', unitCost: 18.50 },
  { name: 'SharkBite Coupling 1/2"', sku: 'PLB-SB-12', category: 'plumbing', unit: 'each', unitCost: 7.25 },
  { name: 'Composite Deck Board (16ft)', sku: 'DEC-CMP-16', category: 'decking', unit: 'each', unitCost: 42.00 },
  { name: 'Roofing Shingles (bundle)', sku: 'ROF-SHG-BDL', category: 'roofing', unit: 'bundle', unitCost: 35.00 },
];

const vendorNames = [
  { name: 'Home Depot Pro', contact: 'Mike Stevens', email: 'pro-desk@homedepot-demo.test' },
  { name: 'Ferguson Plumbing Supply', contact: 'Sarah Chen', email: 'orders@ferguson-demo.test' },
  { name: 'Graybar Electric', contact: 'Tom Wilson', email: 'sales@graybar-demo.test' },
  { name: 'ABC Supply Co', contact: 'Lisa Park', email: 'orders@abcsupply-demo.test' },
  { name: 'Fastenal', contact: 'Dave Brown', email: 'branch42@fastenal-demo.test' },
  { name: 'Sherwin-Williams', contact: 'Amy Rodriguez', email: 'store@sherwin-demo.test' },
];

const employeeData = [
  { firstName: 'Marcus', lastName: 'Rivera', role: 'Lead Technician', skills: ['plumbing', 'HVAC'], payRate: 35 },
  { firstName: 'Jake', lastName: 'Thompson', role: 'Electrician', skills: ['electrical', 'low voltage'], payRate: 38 },
  { firstName: 'Carlos', lastName: 'Mendez', role: 'Carpenter', skills: ['framing', 'finish carpentry', 'decks'], payRate: 32 },
  { firstName: 'Tyler', lastName: 'Brooks', role: 'Helper', skills: ['general labor', 'demolition'], payRate: 22 },
  { firstName: 'Aiden', lastName: 'Patel', role: 'Apprentice', skills: ['plumbing', 'general labor'], payRate: 18 },
  { firstName: 'Derek', lastName: 'Washington', role: 'Foreman', skills: ['project management', 'concrete', 'framing'], payRate: 42 },
  { firstName: 'Ryan', lastName: 'O\'Connor', role: 'HVAC Technician', skills: ['HVAC', 'refrigeration'], payRate: 40 },
  { firstName: 'Miguel', lastName: 'Santos', role: 'Painter', skills: ['interior painting', 'exterior painting', 'drywall'], payRate: 28 },
];

const subcontractorData = [
  { businessName: 'Sparks Electric LLC', contactName: 'Tony Sparks', specialty: 'Electrical', rate: 85 },
  { businessName: 'FlowRight Plumbing', contactName: 'Maria Gonzalez', specialty: 'Plumbing', rate: 90 },
  { businessName: 'CoolAir HVAC Services', contactName: 'James Wright', specialty: 'HVAC', rate: 95 },
  { businessName: 'SolidBase Concrete', contactName: 'Pete Mason', specialty: 'Concrete', rate: 75 },
  { businessName: 'GreenScape Landscaping', contactName: 'Laura Green', specialty: 'Landscaping', rate: 55 },
];

// ─── Cleanup ───────────────────────────────────────────────────────────────────
async function cleanup() {
  console.log('🧹 Cleaning up contractor demo data...');

  const user = await prisma.user.findUnique({ where: { email: CONTRACTOR_EMAIL } });
  if (!user) { console.log('User not found, nothing to clean'); return; }

  const profile = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) { console.log('No contractor profile found, nothing to clean'); return; }

  const cId = profile.id;

  // Delete in dependency order
  try { await prisma.contractorInventoryUsage.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorInventoryReorder.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorTruckInventory.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorInventoryReceiving.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorInventoryItem.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorTruckLoad.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorTruck.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorJobMaterial.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorSafetyChecklistCompletion.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorSafetyChecklist.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorSubcontractorAssignment.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorWarranty.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorPurchaseOrder.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorJobPhoto.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorContractEvent.deleteMany({ where: { contract: { contractorId: cId } } }); } catch(e) {}
  try { await prisma.contractorContract.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorIncidentReport.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorCertification.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorTimeOff.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorChangeOrder.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorJobMilestone.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorJobNote.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorJobAssignment.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorExpense.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorTimeEntry.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorPaycheck.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorPayroll.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorInvoicePayment.deleteMany({ where: { invoice: { contractorId: cId } } }); } catch(e) {}
  try { await prisma.contractorInvoice.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorJob.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorCustomer.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorEmployee.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorEquipment.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorVendor.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorSubcontractor.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorRole.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorAvailability.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorBlockedDate.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorQuoteMessage.deleteMany({ where: { quote: { contractorId: cId } } }); } catch(e) {}
  try { await prisma.contractorQuoteCounter.deleteMany({ where: { originalQuote: { contractorId: cId } } }); } catch(e) {}
  try { await prisma.contractorQuote.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorLeadMatch.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorLead.deleteMany({ where: { customerEmail: { endsWith: CUSTOMER_EMAIL_DOMAIN } } }); } catch(e) {}
  try { await prisma.contractorMarketingCampaign.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorReferral.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorNotification.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorDispatchBoard.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorFinancialSummary.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorUsageTracking.deleteMany({ where: { contractorId: cId } }); } catch(e) {}
  try { await prisma.contractorLabelConfig.deleteMany({ where: { contractorId: cId } }); } catch(e) {}

  console.log('✅ Contractor demo data cleaned up!');
}

// ─── Seed ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Seeding contractor demo data...');

  // 1. Find user and contractor profile
  const user = await prisma.user.findUnique({ where: { email: CONTRACTOR_EMAIL } });
  if (!user) { console.error(`❌ User ${CONTRACTOR_EMAIL} not found. Please sign up first.`); return; }

  let profile = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    console.log('Creating contractor profile...');
    profile = await prisma.contractorProfile.create({
      data: {
        userId: user.id,
        slug: 'allen-home-services-demo',
        businessName: 'Allen Home Services',
        displayName: 'Allen Home Services',
        tagline: 'Licensed General Contractor - 12 Years Experience',
        bio: 'Full-service general contracting company specializing in residential remodeling, repairs, and new construction. Licensed, insured, and committed to quality craftsmanship.',
        email: CONTRACTOR_EMAIL,
        phone: '(720) 555-0188',
        website: 'https://allenhomeservices.com',
        serviceAreas: ['Denver', 'Aurora', 'Lakewood', 'Arvada', 'Westminster', 'Boulder'],
        serviceRadius: 30,
        baseCity: 'Denver',
        baseState: 'CO',
        specialties: ['General Contracting', 'Kitchen Remodel', 'Bathroom Renovation', 'Deck Construction', 'Roofing', 'Plumbing', 'Electrical'],
        yearsExperience: 12,
        licenseNumber: 'GC-2013-78542',
        licenseState: 'CO',
        insuranceVerified: true,
        backgroundChecked: true,
        isAvailable: true,
        isPublic: true,
        acceptingNewWork: true,
        hourlyRate: 85,
        minimumJobSize: 500,
        rankScore: 92,
        avgRating: 4.8,
        totalReviews: 147,
        completedJobs: 312,
        responseRate: 96,
        onTimeRate: 94,
        repeatClientRate: 68,
        identityVerified: true,
        instantBookingEnabled: true,
        depositRequired: true,
        depositPercent: 25,
        cancellationPolicy: 'moderate',
        cancellationHours: 48,
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        trialStatus: 'active',
      },
    });
  }

  const cId = profile.id;
  console.log(`Contractor Profile: ${profile.businessName} (${cId})`);

  // 2. Create Customers
  console.log('Creating customers...');
  const customers: any[] = [];
  for (let i = 0; i < customerNames.length; i++) {
    const name = customerNames[i];
    const status = i < 16 ? 'customer' : i < 20 ? 'prospect' : 'lead';
    const customer = await prisma.contractorCustomer.create({
      data: {
        contractorId: cId,
        name,
        email: `demo-customer-${i}${CUSTOMER_EMAIL_DOMAIN}`,
        phone: `(720) 555-${String(1000 + i).slice(1)}`,
        address: { street: streets[i % streets.length], city: cities[i % cities.length], state: 'CO', zip: `8020${i}` },
        status,
        source: randomFrom(['marketplace', 'referral', 'subdomain', 'referral']),
        tags: i < 8 ? ['VIP', 'repeat'] : i < 16 ? ['residential'] : ['new'],
        totalJobs: status === 'customer' ? randomBetween(1, 5) : 0,
        totalSpent: status === 'customer' ? randomBetween(2000, 45000) : 0,
        lastContactedAt: daysAgo(randomBetween(1, 30)),
        lastJobAt: status === 'customer' ? daysAgo(randomBetween(5, 90)) : null,
      },
    });
    customers.push(customer);
  }
  console.log(`  ✓ ${customers.length} customers`);

  // 3. Create Employees
  console.log('Creating employees...');
  const employees: any[] = [];
  for (const emp of employeeData) {
    const employee = await prisma.contractorEmployee.create({
      data: {
        contractorId: cId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}${CUSTOMER_EMAIL_DOMAIN}`,
        phone: `(720) 555-${String(2000 + employees.length).slice(1)}`,
        role: emp.role,
        employeeType: emp.role === 'Apprentice' ? '1099' : 'w2',
        status: 'active',
        hireDate: daysAgo(randomBetween(90, 730)),
        payRate: emp.payRate,
        payType: 'hourly',
        paySchedule: 'biweekly',
        skills: emp.skills,
        certifications: emp.skills.includes('electrical') ? ['Journeyman Electrician'] : emp.skills.includes('plumbing') ? ['Master Plumber'] : [],
        totalJobsCompleted: randomBetween(20, 150),
        avgRating: 3.5 + Math.random() * 1.5,
        onTimeRate: 85 + Math.random() * 15,
        canViewFinancials: emp.role === 'Foreman',
        canManageJobs: emp.role === 'Foreman' || emp.role === 'Lead Technician',
        canManageCustomers: emp.role === 'Foreman',
      },
    });
    employees.push(employee);
  }
  console.log(`  ✓ ${employees.length} employees`);

  // 4. Create Jobs (the core of the contractor dashboard)
  console.log('Creating jobs...');
  const jobs: any[] = [];
  const jobStatuses = ['quoted', 'approved', 'scheduled', 'in_progress', 'in_progress', 'in_progress', 'completed', 'completed', 'completed', 'completed', 'invoiced', 'paid', 'paid', 'paid'];

  for (let i = 0; i < 28; i++) {
    const jobType = jobTypes[i % jobTypes.length];
    const status = jobStatuses[i % jobStatuses.length];
    const customer = customers[i % customers.length];
    const estimatedCost = randomBetween(1500, 35000);
    const isCompleted = ['completed', 'invoiced', 'paid'].includes(status);
    const isActive = ['in_progress', 'scheduled', 'approved'].includes(status);

    const job = await prisma.contractorJob.create({
      data: {
        contractorId: cId,
        customerId: customer.id,
        jobNumber: generateJobNumber(i),
        title: `${PREFIX}${jobType} - ${customer.name}`,
        description: jobDescriptions[jobType] || `${jobType} project for ${customer.name}`,
        jobType,
        status,
        address: streets[i % streets.length],
        city: cities[i % cities.length],
        state: 'CO',
        zipCode: `8020${i % 10}`,
        estimatedCost,
        actualCost: isCompleted ? estimatedCost + randomBetween(-500, 2000) : null,
        laborCost: isCompleted ? Math.round(estimatedCost * 0.45) : null,
        materialCost: isCompleted ? Math.round(estimatedCost * 0.35) : null,
        profitMargin: isCompleted ? randomBetween(15, 35) : null,
        estimatedStartDate: isActive ? daysAgo(randomBetween(0, 14)) : daysAgo(randomBetween(30, 120)),
        estimatedEndDate: isActive ? daysFromNow(randomBetween(7, 45)) : daysAgo(randomBetween(1, 30)),
        actualStartDate: isCompleted || isActive ? daysAgo(randomBetween(14, 90)) : null,
        actualEndDate: isCompleted ? daysAgo(randomBetween(1, 30)) : null,
        estimatedHours: randomBetween(16, 200),
        actualHours: isCompleted ? randomBetween(16, 220) : null,
        customerRating: isCompleted && Math.random() > 0.3 ? randomBetween(4, 5) : null,
        customerReview: isCompleted && Math.random() > 0.5 ? 'Great work, very professional and on time!' : null,
        notes: `Job created for demo purposes.`,
        priority: i < 3 ? 'urgent' : i < 8 ? 'high' : 'normal',
        tags: [jobType.toLowerCase().replace(/\s+/g, '-')],
      },
    });
    jobs.push(job);
  }
  console.log(`  ✓ ${jobs.length} jobs`);

  // 5. Create Invoices
  console.log('Creating invoices...');
  const invoiceStatuses = ['draft', 'sent', 'sent', 'viewed', 'partial', 'paid', 'paid', 'paid', 'paid', 'overdue'];
  for (let i = 0; i < 20; i++) {
    const status = invoiceStatuses[i % invoiceStatuses.length];
    const customer = customers[i % customers.length];
    const total = randomBetween(800, 25000);
    const amountPaid = status === 'paid' ? total : status === 'partial' ? Math.round(total * 0.5) : 0;
    const amountDue = total - amountPaid;
    const dueDate = status === 'overdue' ? daysAgo(randomBetween(5, 30)) : daysFromNow(randomBetween(5, 30));

    await prisma.contractorInvoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(i),
        contractorId: cId,
        customerId: customer.id,
        lineItems: [
          { description: 'Labor', quantity: randomBetween(8, 80), unitPrice: 85, type: 'labor' },
          { description: 'Materials', quantity: 1, unitPrice: Math.round(total * 0.35), type: 'material' },
          { description: 'Permit fees', quantity: 1, unitPrice: randomBetween(50, 300), type: 'other' },
        ],
        subtotal: Math.round(total * 0.92),
        taxRate: 8.31,
        taxAmount: Math.round(total * 0.08),
        total,
        depositPaid: status !== 'draft' ? Math.round(total * 0.25) : 0,
        amountPaid,
        amountDue,
        status,
        sentAt: status !== 'draft' ? daysAgo(randomBetween(5, 45)) : null,
        viewedAt: ['viewed', 'partial', 'paid'].includes(status) ? daysAgo(randomBetween(3, 40)) : null,
        paidAt: status === 'paid' ? daysAgo(randomBetween(1, 30)) : null,
        dueDate,
        notes: `Invoice for ${jobTypes[i % jobTypes.length]} project.`,
        terms: 'Net 30. Late payments subject to 1.5% monthly interest.',
        jobId: jobs[i % jobs.length]?.id || null,
      },
    });
  }
  console.log(`  ✓ 20 invoices`);

  // 6. Create Expenses
  console.log('Creating expenses...');
  for (let i = 0; i < 35; i++) {
    const category = expenseCategories[i % expenseCategories.length];
    const descriptions = expenseDescriptions[category] || ['General expense'];
    const description = randomFrom(descriptions);
    const status = i < 25 ? 'approved' : i < 30 ? 'pending' : 'rejected';

    await prisma.contractorExpense.create({
      data: {
        contractorId: cId,
        jobId: jobs[i % jobs.length]?.id || null,
        category,
        description: `${PREFIX}${description}`,
        amount: randomBetween(25, 2500),
        vendor: randomFrom(vendorNames).name,
        expenseDate: daysAgo(randomBetween(1, 60)),
        billable: category !== 'Fuel',
        billed: status === 'approved' && Math.random() > 0.3,
        taxDeductible: true,
        paymentMethod: randomFrom(['credit_card', 'cash', 'check', 'credit_card']),
        status,
      },
    });
  }
  console.log(`  ✓ 35 expenses`);

  // 7. Create Equipment
  console.log('Creating equipment...');
  for (let i = 0; i < equipmentItems.length; i++) {
    const item = equipmentItems[i];
    const assignedEmployee = i < employees.length ? employees[i] : null;
    await prisma.contractorEquipment.create({
      data: {
        contractorId: cId,
        name: `${PREFIX}${item.name}`,
        type: item.type,
        manufacturer: item.manufacturer,
        model: item.model,
        serialNumber: `SN-${String(100000 + i * 7777).slice(0, 6)}`,
        purchaseDate: daysAgo(randomBetween(30, 1095)),
        purchasePrice: randomBetween(200, 45000),
        currentValue: randomBetween(100, 30000),
        warrantyExpiry: daysFromNow(randomBetween(30, 730)),
        assignedToId: assignedEmployee?.id || null,
        assignedToName: assignedEmployee ? `${assignedEmployee.firstName} ${assignedEmployee.lastName}` : null,
        status: i < 10 ? 'available' : i === 10 ? 'maintenance' : 'in_use',
        condition: randomFrom(['excellent', 'good', 'good', 'fair']),
        location: randomFrom(['Warehouse', 'Truck 1', 'Truck 2', 'Job Site']),
        maintenanceSchedule: item.type === 'vehicle' ? 'every_30_days' : 'every_100_hours',
        lastMaintenanceDate: daysAgo(randomBetween(10, 60)),
        nextMaintenanceDate: daysFromNow(randomBetween(10, 60)),
      },
    });
  }
  console.log(`  ✓ ${equipmentItems.length} equipment items`);

  // 8. Create Inventory
  console.log('Creating inventory...');
  for (let i = 0; i < inventoryItems.length; i++) {
    const item = inventoryItems[i];
    await prisma.contractorInventoryItem.create({
      data: {
        contractorId: cId,
        name: `${PREFIX}${item.name}`,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        unitCost: item.unitCost,
        costPerUnit: item.unitCost,
        quantity: randomBetween(5, 200),
        warehouseQuantity: randomBetween(3, 150),
        truckQuantity: randomBetween(2, 30),
        reservedQuantity: randomBetween(0, 10),
        reorderPoint: randomBetween(5, 20),
        reorderLevel: randomBetween(5, 20),
        reorderQty: randomBetween(20, 100),
        autoReorder: Math.random() > 0.5,
        location: 'Warehouse',
        warehouseZone: randomFrom(['Zone A', 'Zone B', 'Zone C']),
        warehouseAisle: `Aisle ${randomBetween(1, 5)}`,
        warehouseShelf: `Shelf ${String.fromCharCode(65 + randomBetween(0, 4))}`,
        averageMonthlyUsage: randomBetween(5, 50),
        isConsumable: true,
      },
    });
  }
  console.log(`  ✓ ${inventoryItems.length} inventory items`);

  // 9. Create Vendors
  console.log('Creating vendors...');
  const vendors: any[] = [];
  for (const v of vendorNames) {
    const vendor = await prisma.contractorVendor.create({
      data: {
        contractorId: cId,
        name: `${PREFIX}${v.name}`,
        contactName: v.contact,
        email: v.email,
        phone: `(303) 555-${String(3000 + vendors.length).slice(1)}`,
        address: streets[vendors.length % streets.length],
        city: cities[vendors.length % cities.length],
        state: 'CO',
        zipCode: `8020${vendors.length}`,
        category: randomFrom(['materials', 'equipment', 'service']),
        isActive: true,
        isPreferred: vendors.length < 3,
        rating: 3 + Math.random() * 2,
        totalOrders: randomBetween(5, 50),
        paymentTerms: randomFrom(['net_30', 'net_15', 'cod']),
        notes: `Reliable supplier for ${randomFrom(['materials', 'tools', 'supplies'])}.`,
      },
    });
    vendors.push(vendor);
  }
  console.log(`  ✓ ${vendors.length} vendors`);

  // 10. Create Subcontractors
  console.log('Creating subcontractors...');
  for (const sub of subcontractorData) {
    await prisma.contractorSubcontractor.create({
      data: {
        contractorId: cId,
        companyName: `${PREFIX}${sub.businessName}`,
        contactName: sub.contactName,
        email: `${sub.contactName.toLowerCase().replace(' ', '.')}${CUSTOMER_EMAIL_DOMAIN}`,
        phone: `(720) 555-${String(4000 + subcontractorData.indexOf(sub)).slice(1)}`,
        specialties: [sub.specialty],
        status: 'active',
        rating: 3.5 + Math.random() * 1.5,
        paymentTerms: 'net_30',
        preferredPayment: 'ach',
        notes: `Trusted ${sub.specialty.toLowerCase()} subcontractor.`,
      },
    });
  }
  console.log(`  ✓ ${subcontractorData.length} subcontractors`);

  // 11. Create Time Entries
  console.log('Creating time entries...');
  for (let i = 0; i < 40; i++) {
    const employee = employees[i % employees.length];
    const job = jobs[i % jobs.length];
    const clockIn = daysAgo(randomBetween(1, 30));
    clockIn.setHours(7 + randomBetween(0, 2), 0, 0);
    const duration = randomBetween(240, 600); // 4-10 hours in minutes
    const clockOut = new Date(clockIn.getTime() + duration * 60000);

    await prisma.contractorTimeEntry.create({
      data: {
        contractorId: cId,
        employeeId: employee.id,
        jobId: job.id,
        clockIn,
        clockOut,
        duration,
        breakMinutes: 30,
        hourlyRate: employee.payRate,
        totalAmount: Math.round((duration / 60) * employee.payRate * 100) / 100,
        billableHours: Math.round((duration - 30) / 60 * 100) / 100,
        status: i < 30 ? 'approved' : 'pending',
        notes: `Work on ${job.title?.replace(PREFIX, '')}`,
      },
    });
  }
  console.log(`  ✓ 40 time entries`);

  // 12. Create Leads
  console.log('Creating leads...');
  const leadStatuses = ['new', 'new', 'matching', 'sent', 'responded', 'booked', 'completed', 'expired'];
  const leadStages = ['new', 'contacted', 'qualified', 'site_visit', 'quoted', 'negotiating', 'won', 'lost'];
  for (let i = 0; i < 18; i++) {
    const status = leadStatuses[i % leadStatuses.length];
    const stage = leadStages[i % leadStages.length];
    const projectType = randomFrom(['plumbing', 'electrical', 'HVAC', 'remodeling', 'roofing', 'painting', 'concrete']);

    await prisma.contractorLead.create({
      data: {
        source: randomFrom(['marketplace', 'subdomain', 'referral']),
        customerName: `${PREFIX}${customerNames[i % customerNames.length]}`,
        customerEmail: `demo-lead-${i}${CUSTOMER_EMAIL_DOMAIN}`,
        customerPhone: `(720) 555-${String(5000 + i).slice(1)}`,
        projectType,
        projectTitle: `${projectType.charAt(0).toUpperCase() + projectType.slice(1)} Project`,
        projectDescription: `Need ${projectType} work done at my home. Looking for a reliable contractor.`,
        budgetMin: randomBetween(500, 5000),
        budgetMax: randomBetween(5000, 30000),
        timeline: randomFrom(['asap', 'this_week', 'this_month', 'flexible']),
        urgency: randomFrom(['emergency', 'urgent', 'normal', 'flexible']),
        propertyAddress: streets[i % streets.length],
        propertyCity: cities[i % cities.length],
        propertyState: 'CO',
        propertyZip: `8020${i % 10}`,
        propertyType: randomFrom(['residential', 'commercial']),
        leadScore: randomBetween(40, 95),
        isVerified: Math.random() > 0.3,
        isExclusive: Math.random() > 0.7,
        stage,
        priority: i < 4 ? 'hot' : i < 10 ? 'warm' : 'cold',
        lastContactDate: stage !== 'new' ? daysAgo(randomBetween(1, 14)) : null,
        nextFollowUpDate: ['contacted', 'qualified', 'site_visit', 'quoted'].includes(stage) ? daysFromNow(randomBetween(1, 7)) : null,
        status,
        expiresAt: daysFromNow(randomBetween(3, 14)),
      },
    });
  }
  console.log(`  ✓ 18 leads`);

  // 13. Create Contracts
  console.log('Creating contracts...');
  const contractStatuses = ['draft', 'sent', 'viewed', 'signed', 'signed', 'signed', 'declined'];
  for (let i = 0; i < 10; i++) {
    const status = contractStatuses[i % contractStatuses.length];
    const customer = customers[i % customers.length];
    const job = jobs[i % jobs.length];
    const contractAmount = randomBetween(3000, 40000);

    await prisma.contractorContract.create({
      data: {
        contractorId: cId,
        jobId: job.id,
        contractNumber: generateContractNumber(i),
        title: `${PREFIX}Service Agreement - ${customer.name}`,
        type: 'service_agreement',
        body: `SERVICE AGREEMENT\n\nThis agreement is between Allen Home Services and ${customer.name} for ${job.title?.replace(PREFIX, '')}.\n\nScope of Work:\n${jobDescriptions[jobTypes[i % jobTypes.length]] || 'General contracting services.'}\n\nPayment Terms: 25% deposit due upon signing. Balance due upon completion.\n\nWarranty: 1-year workmanship warranty on all labor performed.`,
        customerName: customer.name,
        customerEmail: customer.email,
        contractorName: 'Allen Home Services',
        contractorEmail: CONTRACTOR_EMAIL,
        contractorPhone: '(720) 555-0188',
        contractAmount,
        depositAmount: Math.round(contractAmount * 0.25),
        paymentTerms: 'net_30',
        status,
        sentAt: status !== 'draft' ? daysAgo(randomBetween(5, 30)) : null,
        viewedAt: ['viewed', 'signed', 'declined'].includes(status) ? daysAgo(randomBetween(3, 25)) : null,
        signedAt: status === 'signed' ? daysAgo(randomBetween(1, 20)) : null,
        declinedAt: status === 'declined' ? daysAgo(randomBetween(1, 10)) : null,
        expiresAt: daysFromNow(30),
      },
    });
  }
  console.log(`  ✓ 10 contracts`);

  // 14. Create Availability
  console.log('Creating availability...');
  try {
    await prisma.contractorAvailability.create({
      data: {
        contractorId: cId,
        mondayStart: '07:00', mondayEnd: '17:00', mondayEnabled: true,
        tuesdayStart: '07:00', tuesdayEnd: '17:00', tuesdayEnabled: true,
        wednesdayStart: '07:00', wednesdayEnd: '17:00', wednesdayEnabled: true,
        thursdayStart: '07:00', thursdayEnd: '17:00', thursdayEnabled: true,
        fridayStart: '07:00', fridayEnd: '16:00', fridayEnabled: true,
        saturdayStart: '08:00', saturdayEnd: '12:00', saturdayEnabled: true,
        sundayEnabled: false,
      },
    });
  } catch(e) { /* already exists */ }
  console.log(`  ✓ availability schedule`);

  // 15. Update profile stats
  console.log('Updating profile stats...');
  const completedJobs = jobs.filter(j => ['completed', 'invoiced', 'paid'].includes(j.status)).length;
  await prisma.contractorProfile.update({
    where: { id: cId },
    data: {
      completedJobs: 312 + completedJobs,
      totalReviews: 147,
      avgRating: 4.8,
      rankScore: 92,
      responseRate: 96,
      onTimeRate: 94,
      repeatClientRate: 68,
    },
  });

  console.log('\n✅ Contractor demo data seeded successfully!');
  console.log('─────────────────────────────────────────────');
  console.log(`  Business: Allen Home Services`);
  console.log(`  Email: ${CONTRACTOR_EMAIL}`);
  console.log(`  Customers: ${customers.length}`);
  console.log(`  Employees: ${employees.length}`);
  console.log(`  Jobs: ${jobs.length}`);
  console.log(`  Invoices: 20`);
  console.log(`  Expenses: 35`);
  console.log(`  Equipment: ${equipmentItems.length}`);
  console.log(`  Inventory: ${inventoryItems.length}`);
  console.log(`  Vendors: ${vendors.length}`);
  console.log(`  Subcontractors: ${subcontractorData.length}`);
  console.log(`  Time Entries: 40`);
  console.log(`  Leads: 18`);
  console.log(`  Contracts: 10`);
  console.log('─────────────────────────────────────────────');
  console.log('Take your screenshots, then run with --cleanup to remove demo data.');
}

// ─── Run ───────────────────────────────────────────────────────────────────────
(process.argv.includes('--cleanup') ? cleanup() : seed())
  .catch(console.error)
  .finally(() => prisma.$disconnect());
