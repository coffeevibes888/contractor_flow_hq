import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getTransactionHistory } from '@/lib/services/treasury.service';

/**
 * GET - Get financial account transaction history
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const landlord = landlordResult.landlord;

    // Get limit from query params
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get financial account from database or Stripe
    let financialAccount: any = null;
    
    try {
      financialAccount = await (prisma as any).financialAccount.findFirst({
        where: { landlordId: landlord.id, status: 'active' },
      });
    } catch {
      // Table may not exist yet
    }

    // If no DB record, try Stripe directly
    if (!financialAccount && landlord.stripeConnectAccountId) {
      const { listFinancialAccounts: listFAs } = await import('@/lib/services/treasury.service');
      const faList = await listFAs(landlord.stripeConnectAccountId);
      if (faList.success && faList.accounts?.length) {
        financialAccount = {
          stripeConnectedAccountId: landlord.stripeConnectAccountId,
          stripeFinancialAccountId: faList.accounts[0].id,
        };
      }
    }

    if (!financialAccount) {
      return NextResponse.json({
        hasAccount: false,
        transactions: [],
      });
    }

    // Get transactions from Stripe
    const result = await getTransactionHistory(
      financialAccount.stripeConnectedAccountId,
      financialAccount.stripeFinancialAccountId,
      limit
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      hasAccount: true,
      transactions: result.transactions,
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    return NextResponse.json({ error: 'Failed to get transactions' }, { status: 500 });
  }
}
