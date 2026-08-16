import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';

const db = prisma as any;

/**
 * GET /api/contractor/hiring/applications
 * List all applications across all hiring posts for this contractor.
 * Query params: ?postId=xxx&status=submitted
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (!can(contractorAuth, 'team.view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    const status = searchParams.get('status');

    const applications = await db.contractorHiringApplication.findMany({
      where: {
        contractorId: contractorAuth.contractorId,
        ...(postId && { postId }),
        ...(status && { status }),
      },
      include: {
        post: { select: { id: true, title: true, employeeType: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('GET /api/contractor/hiring/applications', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}
