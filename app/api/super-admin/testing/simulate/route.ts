import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'superAdmin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await req.json();

    switch (action) {
      case 'seed_test_data':
        return await seedTestData();
      case 'create_late_rent':
        return await createLateRent();
      case 'create_upcoming_rent':
        return await createUpcomingRent();
      case 'create_paid_rent':
        return await createPaidRent();
      case 'create_partial_payment':
        return await createPartialPayment();
      case 'create_urgent_ticket':
        return await createMaintenanceTicket('urgent');
      case 'create_normal_ticket':
        return await createMaintenanceTicket('normal');
      case 'create_completed_ticket':
        return await createMaintenanceTicket('completed');
      case 'create_maintenance_ticket':
        return await createMaintenanceTicket('normal');
      case 'create_expiring_lease':
        return await createExpiringLease();
      case 'create_new_application':
        return await createNewApplication();
      default:
        return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json({ success: false, message: 'Simulation failed' }, { status: 500 });
  }
}

async function getFirstActiveLease() {
  return prisma.lease.findFirst({
    where: { status: 'active' },
    include: {
      tenant: true,
      unit: { include: { property: true } },
    },
  });
}


async function seedTestData() {
  let landlord = await prisma.landlord.findFirst();
  
  if (!landlord) {
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!adminUser) {
      return NextResponse.json({ success: false, message: 'No admin user found' });
    }
    landlord = await prisma.landlord.create({
      data: {
        ownerUserId: adminUser.id,
        name: 'Test Landlord',
        subdomain: 'test-landlord',
      },
    });
  }

  const suffix = Date.now().toString(36);
  const property = await prisma.property.create({
    data: {
      landlordId: landlord.id,
      name: `Test Property ${suffix}`,
      slug: `test-property-${suffix}`,
      type: 'apartment',
      address: { street: '123 Test St', city: 'Las Vegas', state: 'NV', zip: '89101' },
    },
  });

  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      name: 'Unit 101',
      type: 'apartment',
      bedrooms: 2,
      bathrooms: 1,
      rentAmount: 1500,
      isAvailable: false,
    },
  });

  const tenant = await prisma.user.create({
    data: {
      name: `Test Tenant ${suffix}`,
      email: `tenant-${suffix}@test.com`,
      role: 'tenant',
    },
  });

  const startDate = new Date();
  await prisma.lease.create({
    data: {
      unitId: unit.id,
      tenantId: tenant.id,
      startDate,
      rentAmount: 1500,
      billingDayOfMonth: 1,
      status: 'active',
    },
  });

  return NextResponse.json({ success: true, message: 'Test data seeded successfully' });
}

async function createLateRent() {
  const lease = await getFirstActiveLease();
  if (!lease) {
    return NextResponse.json({ success: false, message: 'No active lease found. Seed test data first.' });
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() - 10);

  await prisma.rentPayment.create({
    data: {
      leaseId: lease.id,
      tenantId: lease.tenantId,
      amount: lease.rentAmount,
      dueDate,
      status: 'pending',
    },
  });

  return NextResponse.json({ success: true, message: 'Late rent payment created (10 days overdue)' });
}

async function createUpcomingRent() {
  const lease = await getFirstActiveLease();
  if (!lease) {
    return NextResponse.json({ success: false, message: 'No active lease found. Seed test data first.' });
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);

  await prisma.rentPayment.create({
    data: {
      leaseId: lease.id,
      tenantId: lease.tenantId,
      amount: lease.rentAmount,
      dueDate,
      status: 'pending',
    },
  });

  return NextResponse.json({ success: true, message: 'Upcoming rent payment created (due in 3 days)' });
}

async function createPaidRent() {
  const lease = await getFirstActiveLease();
  if (!lease) {
    return NextResponse.json({ success: false, message: 'No active lease found. Seed test data first.' });
  }

  const dueDate = new Date();
  dueDate.setDate(1);

  await prisma.rentPayment.create({
    data: {
      leaseId: lease.id,
      tenantId: lease.tenantId,
      amount: lease.rentAmount,
      dueDate,
      status: 'paid',
      paidAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, message: 'Paid rent payment created' });
}


async function createPartialPayment() {
  const lease = await getFirstActiveLease();
  if (!lease) {
    return NextResponse.json({ success: false, message: 'No active lease found. Seed test data first.' });
  }

  const dueDate = new Date();
  const partialAmount = Number(lease.rentAmount) * 0.5;

  await prisma.rentPayment.create({
    data: {
      leaseId: lease.id,
      tenantId: lease.tenantId,
      amount: partialAmount,
      dueDate,
      status: 'partial',
    },
  });

  return NextResponse.json({ success: true, message: `Partial payment created (${partialAmount})` });
}

async function createMaintenanceTicket(priority: 'urgent' | 'normal' | 'completed') {
  const lease = await getFirstActiveLease();
  if (!lease) {
    return NextResponse.json({ success: false, message: 'No active lease found. Seed test data first.' });
  }

  const titles = {
    urgent: 'URGENT: Water leak in bathroom',
    normal: 'AC not cooling properly',
    completed: 'Light bulb replacement',
  };

  const descriptions = {
    urgent: 'Water is leaking from under the bathroom sink. Need immediate attention!',
    normal: 'The air conditioning unit is running but not cooling the apartment effectively.',
    completed: 'The light bulb in the kitchen needs to be replaced.',
  };

  await prisma.maintenanceTicket.create({
    data: {
      unitId: lease.unitId,
      tenantId: lease.tenantId,
      title: titles[priority],
      description: descriptions[priority],
      priority: priority === 'urgent' ? 'urgent' : priority === 'completed' ? 'low' : 'medium',
      status: priority === 'completed' ? 'completed' : 'open',
    },
  });

  return NextResponse.json({ success: true, message: `${priority} maintenance ticket created` });
}

async function createExpiringLease() {
  const lease = await getFirstActiveLease();
  if (!lease) {
    return NextResponse.json({ success: false, message: 'No active lease found. Seed test data first.' });
  }

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  await prisma.lease.update({
    where: { id: lease.id },
    data: { endDate },
  });

  return NextResponse.json({ success: true, message: 'Lease updated to expire in 30 days' });
}

async function createNewApplication() {
  const unit = await prisma.unit.findFirst({
    where: { isAvailable: true },
    include: { property: true },
  });

  const suffix = Date.now().toString(36);
  const applicantName = `Test Applicant ${suffix}`;
  const applicantEmail = `applicant-${suffix}@test.com`;

  if (!unit) {
    const property = await prisma.property.findFirst();
    if (!property) {
      return NextResponse.json({ success: false, message: 'No property found. Seed test data first.' });
    }

    const newUnit = await prisma.unit.create({
      data: {
        propertyId: property.id,
        name: `Unit ${suffix}`,
        type: 'apartment',
        bedrooms: 1,
        bathrooms: 1,
        rentAmount: 1200,
        isAvailable: true,
      },
    });

    const applicant = await prisma.user.create({
      data: {
        name: applicantName,
        email: applicantEmail,
        role: 'tenant',
      },
    });

    await prisma.rentalApplication.create({
      data: {
        unitId: newUnit.id,
        applicantId: applicant.id,
        fullName: applicantName,
        email: applicantEmail,
        status: 'pending',
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        employmentStatus: 'employed',
        monthlyIncome: 5000,
      },
    });

    return NextResponse.json({ success: true, message: 'New rental application created' });
  }

  const applicant = await prisma.user.create({
    data: {
      name: applicantName,
      email: applicantEmail,
      role: 'tenant',
    },
  });

  await prisma.rentalApplication.create({
    data: {
      unitId: unit.id,
      applicantId: applicant.id,
      fullName: applicantName,
      email: applicantEmail,
      status: 'pending',
      moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      employmentStatus: 'employed',
      monthlyIncome: 5000,
    },
  });

  return NextResponse.json({ success: true, message: 'New rental application created' });
}
