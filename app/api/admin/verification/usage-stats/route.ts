import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma as db } from '@/db/prisma';
import { EmploymentVerificationUsageService } from '@/lib/services/employment-verification-usage.service';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin or landlord
    if (session.user.role !== 'admin' && session.user.role !== 'landlord') {
      return NextResponse.json(
        { error: 'Forbidden: Only landlords and admins can view usage statistics' },
        { status: 403 }
      );
    }

    // Get landlord
    const landlord = await db.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json(
        { error: 'Landlord profile not found' },
        { status: 404 }
      );
    }

    // Get usage statistics
    const stats = await EmploymentVerificationUsageService.getUsageStats(landlord.id);

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Get usage stats error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve usage statistics' },
      { status: 500 }
    );
  }
}
