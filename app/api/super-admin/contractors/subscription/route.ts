import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { 
  getAllContractorsForSuperAdmin,
  updateContractorSubscription,
  grantLifetimeEnterprise,
  resetContractorUsage,
  getContractorSubscriptionStats,
} from '@/lib/actions/super-admin-contractor.actions';

/**
 * GET /api/super-admin/contractors/subscription
 * Get all contractors with subscription info
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractors = await getAllContractorsForSuperAdmin();
    return NextResponse.json({ success: true, contractors });
  } catch (error: any) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch contractors' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/contractors/subscription
 * Update contractor subscription
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, contractorId, tier, status, isLifetime } = body;

    if (!action || !contractorId) {
      return NextResponse.json(
        { success: false, message: 'Action and contractor ID are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'updateTier':
        if (!tier) {
          return NextResponse.json(
            { success: false, message: 'Tier is required' },
            { status: 400 }
          );
        }
        result = await updateContractorSubscription(
          contractorId,
          tier,
          status || 'active',
          isLifetime || false
        );
        break;

      case 'grantLifetime':
        result = await grantLifetimeEnterprise(contractorId);
        break;

      case 'resetUsage':
        result = await resetContractorUsage(contractorId);
        break;

      case 'getStats':
        result = await getContractorSubscriptionStats();
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error managing contractor subscription:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to manage subscription' },
      { status: 500 }
    );
  }
}
