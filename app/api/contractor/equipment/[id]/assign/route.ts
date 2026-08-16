import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// POST - Assign equipment to employee
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify equipment belongs to contractor
    const equipment = await prisma.contractorEquipment.findUnique({
      where: {
        id: params.id,
        contractorId: contractorProfile.id,
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const body = await request.json();
    const { employeeId } = body;

    // If employeeId is null, unassign the equipment
    if (employeeId === null) {
      const updated = await prisma.contractorEquipment.update({
        where: { id: params.id },
        data: {
          assignedToId: null,
          assignedToName: null,
          status: 'available',
        },
      });

      return NextResponse.json({ equipment: updated });
    }

    // Verify employee belongs to contractor
    const employee = await prisma.contractorEmployee.findUnique({
      where: {
        id: employeeId,
        contractorId: contractorProfile.id,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Assign equipment
    const updated = await prisma.contractorEquipment.update({
      where: { id: params.id },
      data: {
        assignedToId: employeeId,
        assignedToName: `${employee.firstName} ${employee.lastName}`,
        status: 'in_use',
      },
    });

    return NextResponse.json({ equipment: updated });
  } catch (error) {
    console.error('Error assigning equipment:', error);
    return NextResponse.json(
      { error: 'Failed to assign equipment' },
      { status: 500 }
    );
  }
}
