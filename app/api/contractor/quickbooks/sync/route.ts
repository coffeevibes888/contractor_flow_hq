/**
 * POST /api/contractor/quickbooks/sync
 * Runs a full sync of unsynced invoices and expenses to QuickBooks.
 * Returns counts of what was synced and any errors.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { runFullContractorQBSync } from '@/lib/services/quickbooks-contractor-sync';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, subscriptionTier: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // QuickBooks sync is a Pro+ feature
    const tier = profile.subscriptionTier ?? 'starter';
    if (tier === 'starter') {
      return NextResponse.json({ error: 'QuickBooks sync requires Pro or Enterprise plan' }, { status: 403 });
    }

    // Verify QB is connected
    const conn = await (prisma as any).contractorQBConnection.findUnique({
      where: { contractorId: profile.id },
      select: { connectedAt: true, realmId: true },
    });

    if (!conn?.connectedAt || !conn?.realmId) {
      return NextResponse.json({
        error: 'QuickBooks not connected',
        code: 'QB_NOT_CONNECTED',
      }, { status: 400 });
    }

    const result = await runFullContractorQBSync(profile.id);

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('[QB sync]', error);
    return NextResponse.json({ error: error.message ?? 'Sync failed' }, { status: 500 });
  }
}

/**
 * GET /api/contractor/quickbooks/sync
 * Returns QB connection status and last sync info.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const conn = await (prisma as any).contractorQBConnection.findUnique({
      where: { contractorId: profile.id },
      select: { connectedAt: true, realmId: true, lastSyncAt: true, companyName: true },
    });

    const db = prisma as any;
    const [unsyncedInvoices, unsyncedExpenses] = await Promise.all([
      db.contractorInvoice.count({
        where: {
          contractorId: profile.id,
          status: { in: ['sent', 'paid', 'partial', 'viewed'] },
          qbInvoiceId: null,
        },
      }),
      db.contractorExpense.count({
        where: {
          contractorId: profile.id,
          qbPurchaseId: null,
          status: { not: 'rejected' },
        },
      }),
    ]);

    return NextResponse.json({
      connected: Boolean(conn?.connectedAt && conn?.realmId),
      connectedAt: conn?.connectedAt ?? null,
      lastSyncAt: conn?.lastSyncAt ?? null,
      companyName: conn?.companyName ?? null,
      pendingSync: {
        invoices: unsyncedInvoices,
        expenses: unsyncedExpenses,
        total: unsyncedInvoices + unsyncedExpenses,
      },
    });
  } catch (error) {
    console.error('[QB status]', error);
    return NextResponse.json({ error: 'Failed to get QB status' }, { status: 500 });
  }
}
