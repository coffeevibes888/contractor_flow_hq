import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getFinancialAccount } from '@/lib/services/treasury.service';

/**
 * GET - Get financial account balance
 */
export async function GET() {
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

    // Get financial account from database (after migration)
    // For now, get directly from Stripe if table doesn't exist
    let financialAccount: any = null;
    
    try {
      financialAccount = await (prisma as any).financialAccount.findFirst({
        where: { landlordId: landlord.id, status: 'active' },
      });
    } catch {
      // Table may not exist yet - that's ok
    }

    // If no DB record, try to get from Stripe directly
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
        message: 'No financial account found',
      });
    }

    // Get live balance from Stripe
    const result = await getFinancialAccount(
      financialAccount.stripeConnectedAccountId,
      financialAccount.stripeFinancialAccountId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Update cached balance in database (if table exists)
    try {
      await (prisma as any).financialAccount.update({
        where: { id: financialAccount.id },
        data: {
          availableBalance: result.account!.balance.cash,
          pendingBalance: result.account!.balance.inboundPending,
        },
      });
    } catch {
      // Table may not exist yet
    }

    return NextResponse.json({
      hasAccount: true,
      balance: {
        available: result.account!.balance.cash,
        pending: result.account!.balance.inboundPending,
        outboundPending: result.account!.balance.outboundPending,
        total: result.account!.balance.cash + result.account!.balance.inboundPending,
      },
      accountInfo: {
        routingNumber: result.account!.routingNumber,
        accountNumberLast4: result.account!.accountNumberLast4,
        status: result.account!.status,
        features: result.account!.features,
      },
    });
  } catch (error) {
    console.error('Error getting balance:', error);
    return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 });
  }
}
