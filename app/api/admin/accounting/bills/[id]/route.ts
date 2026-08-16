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
    const { landlordId, vendor, amount, category, status, paidAt, dueDate, notes, propertyId } = body;

    if (!landlordId)
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await assertAccountingManagement(landlordId);

    const existing = await prisma.expense.findFirst({ where: { id, landlordId } });
    if (!existing)
      return NextResponse.json({ success: false, message: 'Bill not found' }, { status: 404 });

    // Parse existing meta
    const raw = existing.description ?? '';
    const withoutFlag = raw.replace(/^\[bill\]/, '').trim();
    let meta: Record<string, unknown> = {};
    try { meta = JSON.parse(withoutFlag); } catch { /* empty */ }

    // Merge in new values
    if (status !== undefined) meta.status = status;
    if (paidAt !== undefined) meta.paidAt = paidAt;
    if (dueDate !== undefined) meta.dueDate = dueDate;
    if (notes !== undefined) meta.notes = notes;
    if (vendor !== undefined) meta.vendor = vendor;

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(vendor !== undefined ? { vendor } : {}),
        ...(amount !== undefined ? { amount } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(propertyId !== undefined ? { propertyId } : {}),
        description: `[bill]${JSON.stringify(meta)}`,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    if (!landlordId)
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await assertAccountingManagement(landlordId);

    const existing = await prisma.expense.findFirst({ where: { id, landlordId } });
    if (!existing)
      return NextResponse.json({ success: false, message: 'Bill not found' }, { status: 404 });

    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
