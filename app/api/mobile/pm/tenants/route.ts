import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });

    const landlordFilter = landlord ? { landlordId: landlord.id } : {};

    const leases = await prisma.lease.findMany({
      where: {
        unit: { property: landlordFilter },
      },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        status: true,
        startDate: true,
        rentAmount: true,
        tenant: {
          select: { id: true, name: true, email: true },
        },
        unit: {
          select: {
            name: true,
            property: { select: { name: true } },
          },
        },
      },
    });

    const tenants = leases.map((lease) => ({
      id: lease.tenant?.id ?? lease.id,
      name: lease.tenant?.name ?? 'Unknown',
      email: lease.tenant?.email ?? '',
      leaseId: lease.id,
      leaseStatus: lease.status,
      propertyName: lease.unit.property?.name ?? 'Property',
      unitName: lease.unit.name,
      rentAmount: Number(lease.rentAmount),
      startDate: lease.startDate.toISOString(),
    }));

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('[mobile/pm/tenants]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
