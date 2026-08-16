/**
 * POST /api/integrations/quickbooks/sync
 * Runs a full sync of unsynced rent payments and expenses to QuickBooks.
 *
 * GET /api/integrations/quickbooks/sync
 * Returns connection status and pending item counts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { runFullPMQBSync, getPMQBSyncStatus } from '@/lib/services/quickbooks-pm-sync';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');

    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'landlordId required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const status = await getPMQBSyncStatus(landlordId);
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('[QB sync GET]', error);
    return NextResponse.json({ success: false, message: 'Failed to get sync status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { landlordId } = await request.json();
    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'landlordId required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    // Verify QB is connected
    const conn = await (prisma as any).quickBooksConnection.findUnique({
      where: { landlordId },
      select: { connectedAt: true, realmId: true },
    });

    if (!conn?.connectedAt || !conn?.realmId) {
      return NextResponse.json(
        {
          success: false,
          message: 'QuickBooks is not connected. Please connect QuickBooks first.',
          code: 'QUICKBOOKS_NOT_CONNECTED',
        },
        { status: 400 },
      );
    }

    const result = await runFullPMQBSync(landlordId);

    return NextResponse.json({
      success: true,
      message: `Synced ${result.rentPaymentsSynced} rent payments and ${result.expensesSynced} expenses to QuickBooks.`,
      ...result,
    });
  } catch (error: any) {
    console.error('[QB sync POST]', error);
    return NextResponse.json(
      { success: false, message: error.message ?? 'Sync failed' },
      { status: 500 },
    );
  }
}
