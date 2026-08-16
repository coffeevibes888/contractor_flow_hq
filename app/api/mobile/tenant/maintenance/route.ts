import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

// GET - List tenant's maintenance tickets
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const tickets = await prisma.maintenanceTicket.findMany({
      where: { tenantId: payload.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        assignedToName: true,
        unit: {
          select: {
            name: true,
            property: { select: { name: true } },
          },
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
        // Category + images aren't stored on MaintenanceTicket — keep
        // these fields in the response shape so older mobile builds
        // don't blow up, but always return safe defaults.
        category: null as string | null,
        images: [] as string[],
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        assignedTo: t.assignedToName ?? null,
        propertyName: t.unit?.property?.name ?? '',
        unitName: t.unit?.name ?? '',
      })),
    });
  } catch (error) {
    console.error('[mobile/tenant/maintenance GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Submit a new maintenance ticket
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { title, description, priority, category } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Get tenant's active lease to find unit
    const lease = await prisma.lease.findFirst({
      where: { tenantId: payload.userId, status: 'active' },
      select: {
        id: true,
        unit: {
          select: {
            id: true,
            propertyId: true,
            property: { select: { landlordId: true } },
          },
        },
      },
    });

    if (!lease?.unit) {
      return NextResponse.json({ error: 'No active lease found' }, { status: 400 });
    }

    // Fold the (optional) category into the description so the data
    // isn't silently dropped — the website shows it inline.
    const descWithCategory = category
      ? `[${category}] ${description ?? ''}`.trim()
      : description ?? '';

    const ticket = await prisma.maintenanceTicket.create({
      data: {
        tenantId: payload.userId,
        unitId: lease.unit.id,
        title,
        description: descWithCategory,
        priority: priority ?? 'medium',
        status: 'open',
      },
    });

    // Notify landlord
    try {
      const landlordId = lease.unit.property?.landlordId;
      if (landlordId) {
        const landlord = await prisma.landlord.findUnique({
          where: { id: landlordId },
          select: { ownerUserId: true },
        });
        if (landlord?.ownerUserId) {
          await prisma.notification.create({
            data: {
              userId: landlord.ownerUserId,
              type: 'maintenance',
              title: 'New Maintenance Request',
              message: `${title} — ${priority ?? 'medium'} priority`,
              actionUrl: `/admin/maintenance`,
            },
          });
        }
      }
    } catch {}

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (error) {
    console.error('[mobile/tenant/maintenance POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
