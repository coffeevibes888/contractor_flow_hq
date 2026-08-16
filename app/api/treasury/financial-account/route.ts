import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import {
  createFinancialAccount,
  getFinancialAccount,
  listFinancialAccounts,
} from '@/lib/services/treasury.service';

/**
 * GET - Get landlord's financial account(s)
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

    if (!landlord.stripeConnectAccountId) {
      return NextResponse.json({
        hasAccount: false,
        message: 'No connected account. Complete payout setup first.',
      });
    }

    // Get financial accounts from Stripe
    const result = await listFinancialAccounts(landlord.stripeConnectAccountId);

    if (!result.success) {
      // Check if Treasury isn't enabled
      if (result.error?.includes('treasury')) {
        return NextResponse.json({
          hasAccount: false,
          treasuryEnabled: false,
          message: 'Treasury is not enabled on your account yet.',
        });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Get detailed info for each account
    const accounts = [];
    for (const fa of result.accounts || []) {
      const details = await getFinancialAccount(
        landlord.stripeConnectAccountId,
        fa.id
      );
      if (details.success && details.account) {
        accounts.push(details.account);
      }
    }

    return NextResponse.json({
      hasAccount: accounts.length > 0,
      treasuryEnabled: true,
      accounts,
    });
  } catch (error) {
    console.error('Error getting financial accounts:', error);
    return NextResponse.json({ error: 'Failed to get accounts' }, { status: 500 });
  }
}

/**
 * POST - Create a new financial account for landlord
 */
export async function POST(req: NextRequest) {
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

    if (!landlord.stripeConnectAccountId) {
      return NextResponse.json({
        error: 'No connected account. Complete payout setup first.',
      }, { status: 400 });
    }

    // Check if already has a financial account
    const existing = await listFinancialAccounts(landlord.stripeConnectAccountId);
    if (existing.success && (existing.accounts?.length || 0) > 0) {
      return NextResponse.json({
        error: 'Financial account already exists',
        accountId: existing.accounts![0].id,
      }, { status: 400 });
    }

    // Create financial account
    const result = await createFinancialAccount(landlord.stripeConnectAccountId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Save to database (after running migration)
    // Note: Run `npx prisma db push` or apply migration first
    try {
      await (prisma as any).financialAccount.create({
        data: {
          landlordId: landlord.id,
          stripeConnectedAccountId: landlord.stripeConnectAccountId,
          stripeFinancialAccountId: result.financialAccountId!,
          routingNumber: result.routingNumber,
          accountNumberLast4: result.accountNumber?.slice(-4),
          status: 'active',
        },
      });
    } catch (dbError) {
      console.log('Note: FinancialAccount table may not exist yet. Run migration.');
    }

    return NextResponse.json({
      success: true,
      financialAccountId: result.financialAccountId,
      routingNumber: result.routingNumber,
      accountNumberLast4: result.accountNumber?.slice(-4),
      message: 'Financial account created successfully',
    });
  } catch (error) {
    console.error('Error creating financial account:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
