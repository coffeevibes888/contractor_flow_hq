import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';
import { DepartureType } from '@/types/tenant-lifecycle';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: propertyId } = await params;
    const { searchParams } = new URL(req.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const departureType = searchParams.get('departureType') as DepartureType | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const unitId = searchParams.get('unitId');

    // Verify property belongs to landlord
    const property = await prisma.property.findFirst({
      where: { id: propertyId, landlordId },
    });

    if (!property) {
      return NextResponse.json({ message: 'Property not found' }, { status: 404 });
    }

    // Build where clause
    const where: any = { propertyId };
    
    if (unitId) {
      where.unitId = unitId;
    }
    
    if (departureType) {
      where.departureType = departureType;
    }
    
    if (dateFrom || dateTo) {
      where.departureDate = {};
      if (dateFrom) {
        where.departureDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.departureDate.lte = new Date(dateTo);
      }
    }
    
    if (search) {
      where.OR = [
        { tenantName: { contains: search, mode: 'insensitive' } },
        { tenantEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.tenantHistory.count({ where });

    // Get paginated results
    const history = await prisma.tenantHistory.findMany({
      where,
      orderBy: { departureDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        unit: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get property tenant history error:', error);
    return NextResponse.json({ message: 'Failed to get tenant history' }, { status: 500 });
  }
}
