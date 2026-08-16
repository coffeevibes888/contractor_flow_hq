import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

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
      select: { id: true, securityDepositMonths: true },
    });

    const landlordFilter = landlord ? { landlordId: landlord.id } : {};
    const depositMonths = landlord ? Number(landlord.securityDepositMonths) : 0;

    const leases = await prisma.lease.findMany({
      where: { unit: { property: landlordFilter } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        rentAmount: true,
        tenantSignedAt: true,
        landlordSignedAt: true,
        tenant: { select: { id: true, name: true, email: true } },
        unit: {
          select: {
            name: true,
            property: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      leases: leases.map((l) => {
        const rent = Number(l.rentAmount);
        // Lease has no per-record securityDeposit field on the Prisma model.
        // Approximate it from the landlord's default `securityDepositMonths`
        // setting so the mobile UI still has something to display.
        const securityDeposit = depositMonths > 0 ? rent * depositMonths : null;

        return {
          id: l.id,
          status: l.status,
          startDate: l.startDate?.toISOString() ?? null,
          endDate: l.endDate?.toISOString() ?? null,
          rentAmount: rent,
          securityDeposit,
          tenantSigned: !!l.tenantSignedAt,
          landlordSigned: !!l.landlordSignedAt,
          tenantName: l.tenant?.name ?? 'Unknown',
          tenantEmail: l.tenant?.email ?? '',
          propertyName: l.unit.property?.name ?? 'Property',
          unitName: l.unit.name,
        };
      }),
    });
  } catch (error) {
    console.error('[mobile/pm/leases]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
