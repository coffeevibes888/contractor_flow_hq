import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

/**
 * GET /api/admin/accounting/properties?landlordId=...
 *
 * Lightweight property list for the owner-linking dialog. Returns
 * {id, name, unitCount, address, ownerships[]} so the UI can warn when an
 * owner assignment would push a property past 100% total ownership.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });
    }
    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    await assertAccountingLedger(landlordId);

    const properties = await prisma.property.findMany({
      where: { landlordId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        address: true,
        _count: { select: { units: true } },
        owners: {
          orderBy: { effectiveFrom: 'desc' },
          include: { owner: { select: { id: true, name: true, isActive: true } } },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: properties.map((p) => {
        const ownerMap = new Map<string, { ownerId: string; ownerName: string; ownershipPct: number; isActive: boolean }>();
        for (const po of p.owners) {
          if (!ownerMap.has(po.ownerId)) {
            ownerMap.set(po.ownerId, {
              ownerId: po.ownerId,
              ownerName: po.owner.name,
              ownershipPct: Number(po.ownershipPct),
              isActive: po.owner.isActive,
            });
          }
        }
        const currentOwnerships = Array.from(ownerMap.values());
        return {
          id: p.id,
          name: p.name,
          address: p.address,
          unitCount: p._count.units,
          ownerships: currentOwnerships,
          totalOwnershipPct: currentOwnerships.reduce((s, o) => s + o.ownershipPct, 0),
        };
      }),
    });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
