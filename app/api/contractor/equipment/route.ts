import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { canAccessFeature, checkLimit } from '@/lib/services/contractor-feature-gate';
import { incrementEquipmentCount, decrementEquipmentCount } from '@/lib/services/contractor-usage-tracker';

// GET - List equipment
// Feature Gate: Requires 'equipment' feature (Pro or Enterprise tier)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Check equipment feature access
    const featureAccess = await canAccessFeature(contractorProfile.id, 'equipment');
    if (!featureAccess.allowed) {
      return NextResponse.json(
        { 
          error: 'Feature locked',
          message: featureAccess.reason || 'Equipment management requires Pro plan or higher',
          requiredTier: 'pro',
          currentTier: featureAccess.tier,
          feature: 'equipment'
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');

    const where: any = {
      contractorId: contractorProfile.id,
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (assignedTo) {
      where.assignedToId = assignedTo;
    }

    const equipment = await prisma.contractorEquipment.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

// POST - Add equipment
// Feature Gate: Requires 'equipment' feature (Pro or Enterprise tier)
// Limit: Pro tier limited to 20 items, Enterprise unlimited
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Check equipment feature access
    const featureAccess = await canAccessFeature(contractorProfile.id, 'equipment');
    if (!featureAccess.allowed) {
      return NextResponse.json(
        { 
          error: 'Feature locked',
          message: featureAccess.reason || 'Equipment management requires Pro plan or higher',
          requiredTier: 'pro',
          currentTier: featureAccess.tier,
          feature: 'equipment'
        },
        { status: 403 }
      );
    }

    // Check equipment item limit
    const limitCheck = await checkLimit(contractorProfile.id, 'equipmentItems');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Limit reached',
          message: `Equipment limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade to Enterprise for unlimited equipment.`,
          current: limitCheck.current,
          limit: limitCheck.limit,
          requiredTier: 'enterprise',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      type,
      serialNumber,
      purchaseDate,
      purchasePrice,
      status,
      condition,
      location,
      assignedToId,
    } = body;

    if (!name || !type || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify employee if assigned
    if (assignedToId) {
      const employee = await prisma.contractorEmployee.findUnique({
        where: {
          id: assignedToId,
          contractorId: contractorProfile.id,
        },
      });

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
    }

    const equipment = await prisma.contractorEquipment.create({
      data: {
        contractorId: contractorProfile.id,
        name,
        type,
        serialNumber: serialNumber || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        status,
        condition: condition || null,
        location: location || null,
        assignedToId: assignedToId || null,
      },
    });

    // Increment equipment count for usage tracking
    await incrementEquipmentCount(contractorProfile.id);

    return NextResponse.json({ equipment }, { status: 201 });
  } catch (error) {
    console.error('Error creating equipment:', error);
    return NextResponse.json(
      { error: 'Failed to create equipment' },
      { status: 500 }
    );
  }
}
