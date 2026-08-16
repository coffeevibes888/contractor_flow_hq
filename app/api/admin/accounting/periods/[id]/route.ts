import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingManagement } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { landlordId, status } = body;

    if (!landlordId || !status)
      return NextResponse.json({ success: false, message: 'landlordId and status are required' }, { status: 400 });

    if (!['open', 'locked', 'closed'].includes(status))
      return NextResponse.json({ success: false, message: 'status must be open, locked, or closed' }, { status: 400 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await assertAccountingManagement(landlordId);

    const period = await prisma.fiscalPeriod.findFirst({ where: { id, landlordId } });
    if (!period)
      return NextResponse.json({ success: false, message: 'Period not found' }, { status: 404 });

    // Closed is permanent
    if (period.status === 'closed' && status !== 'closed')
      return NextResponse.json({ success: false, message: 'Closed periods cannot be reopened' }, { status: 400 });

    const updated = await prisma.fiscalPeriod.update({
      where: { id },
      data: {
        status,
        ...(status === 'closed' ? { closedAt: new Date(), closedBy: session.user.id } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
