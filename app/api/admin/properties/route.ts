import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const includeUnits = searchParams.get('includeUnits') === 'true';
    const includeDefaultLease = searchParams.get('includeDefaultLease') === 'true';

    // Get landlord for this user — ownerUserId is not @unique so use findFirst
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id }
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    // Build include object based on query params
    const include: any = {};
    if (includeUnits) {
      include.units = {
        orderBy: { name: 'asc' as const }
      };
    }
    if (includeDefaultLease) {
      include.defaultLeaseDocument = {
        select: {
          id: true,
          name: true   // LegalDocument.name (not title)
        }
      };
    }

    // Fetch properties — Property has no isActive field; use status instead
    const properties = await prisma.property.findMany({
      where: {
        landlordId: landlord.id,
        status: { not: 'deleted' }
      },
      include,
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ properties });
  } catch (error) {
    console.error('Get properties error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

// Made with Bob
