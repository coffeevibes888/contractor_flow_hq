import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ message: landlordResult.message }, { status: 400 });
    }
    const landlordId = landlordResult.landlord.id;

    const { leaseId } = await params;

    // Verify lease belongs to landlord
    const lease = await prisma.lease.findFirst({
      where: { id: leaseId },
      include: {
        unit: {
          select: {
            property: { select: { landlordId: true } },
          },
        },
      },
    });

    if (!lease) {
      return NextResponse.json({ message: 'Lease not found' }, { status: 404 });
    }
    if (lease.unit.property?.landlordId !== landlordId) {
      return NextResponse.json({ message: 'Unauthorized access to this lease' }, { status: 403 });
    }

    // Get all eviction notices for this lease
    const evictionNotices = await prisma.evictionNotice.findMany({
      where: { leaseId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      evictionNotices,
    });
  } catch (error) {
    console.error('Get eviction notices error:', error);
    return NextResponse.json({ message: 'Failed to get eviction notices' }, { status: 500 });
  }
}
