import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
      select: {
        id: true,
        petDepositAmount: true,
        petDepositEnabled: true,
        petRentAmount: true,
        petRentEnabled: true,
        cleaningFeeAmount: true,
        cleaningFeeEnabled: true,
        applicationFeeAmount: true,
        applicationFeeEnabled: true,
        securityDepositMonths: true,
        lastMonthRentRequired: true,
        feeApplyToAll: true,
        feeSelectedProperties: true,
      },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    // Get property-specific fee settings
    const propertyFeeSettings = await prisma.propertyFeeSettings.findMany({
      where: { landlordId: landlord.id },
    });

    // Transform property settings into a map for easy lookup
    const propertySettingsMap: Record<string, any> = {};
    for (const ps of propertyFeeSettings) {
      propertySettingsMap[ps.propertyId] = {
        securityDepositMonths: ps.securityDepositMonths ? Number(ps.securityDepositMonths) : null,
        noSecurityDeposit: ps.noSecurityDeposit,
        lastMonthRentRequired: ps.lastMonthRentRequired,
        petDepositEnabled: ps.petDepositEnabled,
        petDepositAmount: ps.petDepositAmount ? Number(ps.petDepositAmount) : null,
        petRentEnabled: ps.petRentEnabled,
        petRentAmount: ps.petRentAmount ? Number(ps.petRentAmount) : null,
        noPetFees: ps.noPetFees,
        cleaningFeeEnabled: ps.cleaningFeeEnabled,
        cleaningFeeAmount: ps.cleaningFeeAmount ? Number(ps.cleaningFeeAmount) : null,
        noCleaningFee: ps.noCleaningFee,
        applicationFeeEnabled: ps.applicationFeeEnabled,
        applicationFeeAmount: ps.applicationFeeAmount ? Number(ps.applicationFeeAmount) : null,
        noApplicationFee: ps.noApplicationFee,
        lateFeeEnabled: ps.lateFeeEnabled,
        gracePeriodDays: ps.gracePeriodDays,
        lateFeeType: ps.lateFeeType,
        lateFeeAmount: ps.lateFeeAmount ? Number(ps.lateFeeAmount) : null,
        lateFeeMaxFee: ps.lateFeeMaxFee ? Number(ps.lateFeeMaxFee) : null,
        noLateFees: ps.noLateFees,
      };
    }

    return NextResponse.json({
      settings: {
        petDeposit: {
          enabled: landlord.petDepositEnabled ?? false,
          amount: landlord.petDepositAmount ? Number(landlord.petDepositAmount) : 300,
          applyToAll: landlord.feeApplyToAll ?? true,
          selectedProperties: landlord.feeSelectedProperties ?? [],
        },
        petRent: {
          enabled: landlord.petRentEnabled ?? false,
          amount: landlord.petRentAmount ? Number(landlord.petRentAmount) : 50,
          applyToAll: landlord.feeApplyToAll ?? true,
          selectedProperties: landlord.feeSelectedProperties ?? [],
        },
        cleaningFee: {
          enabled: landlord.cleaningFeeEnabled ?? false,
          amount: landlord.cleaningFeeAmount ? Number(landlord.cleaningFeeAmount) : 150,
          applyToAll: landlord.feeApplyToAll ?? true,
          selectedProperties: landlord.feeSelectedProperties ?? [],
        },
        applicationFee: {
          enabled: landlord.applicationFeeEnabled ?? true,
          amount: landlord.applicationFeeAmount ? Number(landlord.applicationFeeAmount) : 50,
          applyToAll: landlord.feeApplyToAll ?? true,
          selectedProperties: landlord.feeSelectedProperties ?? [],
        },
        securityDeposit: {
          months: Number(landlord.securityDepositMonths ?? 1),
          applyToAll: landlord.feeApplyToAll ?? true,
          selectedProperties: landlord.feeSelectedProperties ?? [],
        },
        lastMonthRent: {
          required: landlord.lastMonthRentRequired ?? true,
          applyToAll: landlord.feeApplyToAll ?? true,
          selectedProperties: landlord.feeSelectedProperties ?? [],
        },
      },
      propertySettings: propertySettingsMap,
    });
  } catch (error) {
    console.error('Error fetching fee settings:', error);
    return NextResponse.json({ message: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    // Update landlord default settings
    await prisma.landlord.update({
      where: { id: landlord.id },
      data: {
        petDepositAmount: body.petDeposit?.amount,
        petDepositEnabled: body.petDeposit?.enabled,
        petRentAmount: body.petRent?.amount,
        petRentEnabled: body.petRent?.enabled,
        cleaningFeeAmount: body.cleaningFee?.amount,
        cleaningFeeEnabled: body.cleaningFee?.enabled,
        applicationFeeAmount: body.applicationFee?.amount,
        applicationFeeEnabled: body.applicationFee?.enabled,
        securityDepositMonths: body.securityDeposit?.months,
        lastMonthRentRequired: body.lastMonthRent?.required,
        feeApplyToAll: body.petDeposit?.applyToAll ?? true,
        feeSelectedProperties: body.petDeposit?.selectedProperties ?? [],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating fee settings:', error);
    return NextResponse.json({ message: 'Failed to update settings' }, { status: 500 });
  }
}
