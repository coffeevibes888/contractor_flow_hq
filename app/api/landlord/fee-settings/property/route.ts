import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET property-specific fee settings
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    // If propertyId is provided, get settings for that property
    if (propertyId) {
      const settings = await prisma.propertyFeeSettings.findUnique({
        where: { propertyId },
      });

      return NextResponse.json({ settings: settings || null });
    }

    // Otherwise, get all property settings for this landlord
    const allSettings = await prisma.propertyFeeSettings.findMany({
      where: { landlordId: landlord.id },
    });

    return NextResponse.json({ settings: allSettings });
  } catch (error) {
    console.error('Error fetching property fee settings:', error);
    return NextResponse.json({ message: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT/POST property-specific fee settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { propertyId, ...settings } = body;

    if (!propertyId) {
      return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    // Verify property belongs to landlord
    const property = await prisma.property.findFirst({
      where: { id: propertyId, landlordId: landlord.id },
    });

    if (!property) {
      return NextResponse.json({ message: 'Property not found' }, { status: 404 });
    }

    // Prepare the data for upsert - only include fields that are explicitly set
    const updateData: Record<string, unknown> = {};
    
    // Security Deposit
    if (settings.securityDepositMonths !== undefined) {
      updateData.securityDepositMonths = settings.securityDepositMonths;
    }
    if (settings.noSecurityDeposit !== undefined) {
      updateData.noSecurityDeposit = settings.noSecurityDeposit;
    }
    
    // Last Month's Rent
    if (settings.lastMonthRentRequired !== undefined) {
      updateData.lastMonthRentRequired = settings.lastMonthRentRequired;
    }
    
    // Pet Fees
    if (settings.petDepositEnabled !== undefined) {
      updateData.petDepositEnabled = settings.petDepositEnabled;
    }
    if (settings.petDepositAmount !== undefined) {
      updateData.petDepositAmount = settings.petDepositAmount;
    }
    if (settings.petRentEnabled !== undefined) {
      updateData.petRentEnabled = settings.petRentEnabled;
    }
    if (settings.petRentAmount !== undefined) {
      updateData.petRentAmount = settings.petRentAmount;
    }
    if (settings.noPetFees !== undefined) {
      updateData.noPetFees = settings.noPetFees;
    }
    
    // Cleaning Fee
    if (settings.cleaningFeeEnabled !== undefined) {
      updateData.cleaningFeeEnabled = settings.cleaningFeeEnabled;
    }
    if (settings.cleaningFeeAmount !== undefined) {
      updateData.cleaningFeeAmount = settings.cleaningFeeAmount;
    }
    if (settings.noCleaningFee !== undefined) {
      updateData.noCleaningFee = settings.noCleaningFee;
    }
    
    // Application Fee
    if (settings.applicationFeeEnabled !== undefined) {
      updateData.applicationFeeEnabled = settings.applicationFeeEnabled;
    }
    if (settings.applicationFeeAmount !== undefined) {
      updateData.applicationFeeAmount = settings.applicationFeeAmount;
    }
    if (settings.noApplicationFee !== undefined) {
      updateData.noApplicationFee = settings.noApplicationFee;
    }
    
    // Late Fees
    if (settings.lateFeeEnabled !== undefined) {
      updateData.lateFeeEnabled = settings.lateFeeEnabled;
    }
    if (settings.gracePeriodDays !== undefined) {
      updateData.gracePeriodDays = settings.gracePeriodDays;
    }
    if (settings.lateFeeType !== undefined) {
      updateData.lateFeeType = settings.lateFeeType;
    }
    if (settings.lateFeeAmount !== undefined) {
      updateData.lateFeeAmount = settings.lateFeeAmount;
    }
    if (settings.lateFeeMaxFee !== undefined) {
      updateData.lateFeeMaxFee = settings.lateFeeMaxFee;
    }
    if (settings.noLateFees !== undefined) {
      updateData.noLateFees = settings.noLateFees;
    }

    // Upsert property fee settings
    const result = await prisma.propertyFeeSettings.upsert({
      where: { propertyId },
      create: {
        propertyId,
        landlordId: landlord.id,
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json({ success: true, settings: result });
  } catch (error) {
    console.error('Error updating property fee settings:', error);
    return NextResponse.json({ message: 'Failed to update settings' }, { status: 500 });
  }
}

// DELETE property-specific fee settings (revert to defaults)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    // Verify property belongs to landlord before deleting
    const existingSettings = await prisma.propertyFeeSettings.findFirst({
      where: { 
        propertyId,
        landlordId: landlord.id,
      },
    });

    if (existingSettings) {
      await prisma.propertyFeeSettings.delete({
        where: { propertyId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting property fee settings:', error);
    return NextResponse.json({ message: 'Failed to delete settings' }, { status: 500 });
  }
}
