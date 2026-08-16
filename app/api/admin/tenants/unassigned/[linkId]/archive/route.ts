import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { linkId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { linkId } = params;

    // Verify the link belongs to this landlord
    const link = await prisma.tenantLandlordLink.findFirst({
      where: {
        id: linkId,
        landlord: {
          ownerUserId: session.user.id
        }
      }
    });

    if (!link) {
      return NextResponse.json({ message: 'Link not found' }, { status: 404 });
    }

    // Update the link status to archived
    await prisma.tenantLandlordLink.update({
      where: { id: linkId },
      data: {
        status: 'archived',
        archivedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Tenant archived successfully'
    });
  } catch (error) {
    console.error('Archive tenant error:', error);
    return NextResponse.json(
      { message: 'Failed to archive tenant' },
      { status: 500 }
    );
  }
}

// Made with Bob
