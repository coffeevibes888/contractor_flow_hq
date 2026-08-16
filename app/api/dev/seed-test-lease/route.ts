import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { hash } from '@/lib/encrypt';

export async function POST(_req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    const suffix = Date.now().toString(36);
    const tenantEmail = `tenant+${suffix}@example.com`;
    const tenantPassword = `Test1234!-${suffix}`;

    const tenant = await prisma.user.create({
      data: {
        name: `Test Tenant ${suffix}`,
        email: tenantEmail,
        password: await hash(tenantPassword),
        role: 'tenant',
      },
    });

    const propertySlug = `test-property-${suffix}`;

    const property = await prisma.property.create({
      data: {
        landlordId: landlord.id,
        name: `Test Property ${suffix}`,
        slug: propertySlug,
        description: 'Test property for local DocuSign signing',
        address: {
          street: '123 Test St',
          unit: '1A',
          city: 'Las Vegas',
          state: 'NV',
          zip: '89101',
        },
        type: 'apartment',
      },
    });

    const unit = await prisma.unit.create({
      data: {
        propertyId: property.id,
        name: 'Unit 1',
        type: 'apartment',
        bedrooms: 2,
        bathrooms: 1,
        sizeSqFt: 850,
        rentAmount: 1500,
        isAvailable: false,
        images: [],
        amenities: [],
      },
    });

    const startDate = new Date();
    const lease = await prisma.lease.create({
      data: {
        unitId: unit.id,
        tenantId: tenant.id,
        startDate,
        endDate: null,
        rentAmount: 1500,
        billingDayOfMonth: Math.min(28, Math.max(1, startDate.getDate())),
        status: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        tenantEmail,
        tenantPassword,
        tenantId: tenant.id,
        leaseId: lease.id,
        userLeaseUrl: '/user/profile/lease',
        adminLeaseUrl: `/admin/leases/${lease.id}`,
      },
    });
  } catch (error) {
    console.error('Failed to seed test lease:', error);
    return NextResponse.json({ message: 'Failed to seed test lease' }, { status: 500 });
  }
}
