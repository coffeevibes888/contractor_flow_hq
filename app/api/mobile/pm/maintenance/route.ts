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

    const tickets = await prisma.maintenanceTicket.findMany({
      where: {
        unit: { property: landlordFilter },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        assignedToName: true,
        tenant: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      tickets: tickets.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description ?? '',
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt.toISOString(),
        assignedToName: t.assignedToName ?? null,
        tenant: t.tenant ? { name: t.tenant.name ?? 'Unknown', email: t.tenant.email ?? '' } : null,
      })),
    });
  } catch (error) {
    console.error('[mobile/pm/maintenance]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
