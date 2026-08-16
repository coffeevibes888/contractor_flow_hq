import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingManagement } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

interface RouteContext { params: Promise<{ id: string }> }

// PATCH — update name, description, taxLine, subType, isActive on a non-system account
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { landlordId, name, description, taxLine, subType, isActive } = body;

    if (!landlordId)
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await assertAccountingManagement(landlordId);

    const account = await prisma.chartOfAccount.findFirst({
      where: { id, landlordId },
    });
    if (!account)
      return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 });

    if (account.isSystem && isActive === false)
      return NextResponse.json({ success: false, message: 'System accounts cannot be deactivated' }, { status: 400 });

    const updated = await prisma.chartOfAccount.update({
      where: { id },
      data: {
        ...(name !== undefined && !account.isSystem ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(taxLine !== undefined ? { taxLine } : {}),
        ...(subType !== undefined && !account.isSystem ? { subType } : {}),
        ...(isActive !== undefined && !account.isSystem ? { isActive } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

// DELETE — soft-delete (deactivate) a non-system account with no journal lines
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

    const account = await prisma.chartOfAccount.findFirst({ where: { id, landlordId } });
    if (!account)
      return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 });

    if (account.isSystem)
      return NextResponse.json({ success: false, message: 'System accounts cannot be deleted' }, { status: 400 });

    const lineCount = await prisma.journalLine.count({ where: { accountId: id } });
    if (lineCount > 0)
      return NextResponse.json({ success: false, message: `Cannot delete account with ${lineCount} journal lines. Deactivate instead.` }, { status: 400 });

    await prisma.chartOfAccount.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
