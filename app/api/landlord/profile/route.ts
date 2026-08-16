import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// Helper to serialize landlord object (converts Decimal to number)
function serializeLandlord(landlord: Record<string, unknown>) {
  const serialized = { ...landlord };
  if (serialized.securityDepositMonths !== undefined && serialized.securityDepositMonths !== null) {
    serialized.securityDepositMonths = Number(serialized.securityDepositMonths);
  }
  if (serialized.petDepositAmount !== undefined && serialized.petDepositAmount !== null) {
    serialized.petDepositAmount = Number(serialized.petDepositAmount);
  }
  if (serialized.petRentAmount !== undefined && serialized.petRentAmount !== null) {
    serialized.petRentAmount = Number(serialized.petRentAmount);
  }
  if (serialized.cleaningFeeAmount !== undefined && serialized.cleaningFeeAmount !== null) {
    serialized.cleaningFeeAmount = Number(serialized.cleaningFeeAmount);
  }
  if (serialized.applicationFeeAmount !== undefined && serialized.applicationFeeAmount !== null) {
    serialized.applicationFeeAmount = Number(serialized.applicationFeeAmount);
  }
  return serialized;
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, companyName, companyEmail, companyPhone, companyAddress, aboutPhoto } = body;

    // Find landlord by user ID
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    // Update landlord profile
    const updated = await prisma.landlord.update({
      where: { id: landlord.id },
      data: {
        name: name || landlord.name,
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        aboutPhoto,
      },
    });

    return NextResponse.json({ success: true, landlord: serializeLandlord(updated as unknown as Record<string, unknown>) });
  } catch (error) {
    console.error('Error updating landlord profile:', error);
    return NextResponse.json({ message: 'Failed to update profile' }, { status: 500 });
  }
}
