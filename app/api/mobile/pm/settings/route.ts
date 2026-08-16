import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        image: true,
        notificationPreferences: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const landlord = PM_ROLES.has(payload.role)
      ? await prisma.landlord.findFirst({
          where: { ownerUserId: payload.userId },
          select: {
            id: true,
            name: true,
            companyName: true,
            subdomain: true,
            useSubdomain: true,
            logoUrl: true,
            // Account-wide fee defaults that DO live on the landlord row
            applicationFeeAmount: true,
            applicationFeeEnabled: true,
            securityDepositMonths: true,
            lastMonthRentRequired: true,
            petDepositAmount: true,
            petDepositEnabled: true,
            petRentAmount: true,
            petRentEnabled: true,
            cleaningFeeAmount: true,
            cleaningFeeEnabled: true,
          },
        })
      : null;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phoneNumber,
        role: user.role,
        image: user.image,
        twoFactorEnabled: user.twoFactorEnabled,
        memberSince: user.createdAt.toISOString(),
        notificationPreferences:
          (user.notificationPreferences as { email?: boolean; sms?: boolean; both?: boolean } | null) ??
          { email: true, sms: false, both: false },
      },
      landlord: landlord
        ? {
            id: landlord.id,
            name: landlord.name,
            companyName: landlord.companyName,
            subdomain: landlord.subdomain,
            useSubdomain: landlord.useSubdomain,
            logoUrl: landlord.logoUrl,
            // Late-fee config is per-Property (model `PropertyFeeOverride`),
            // not per-Landlord. Surface placeholders here and direct edits
            // to the property settings screen.
            lateFeeAmount: null,
            lateFeeGraceDays: null,
            lateFeeType: null,
            applicationFeeAmount: landlord.applicationFeeAmount ? Number(landlord.applicationFeeAmount) : null,
            applicationFeeEnabled: landlord.applicationFeeEnabled,
            securityDepositMonths: Number(landlord.securityDepositMonths),
            lastMonthRentRequired: landlord.lastMonthRentRequired,
            petDepositAmount: landlord.petDepositAmount ? Number(landlord.petDepositAmount) : null,
            petDepositEnabled: landlord.petDepositEnabled,
            petRentAmount: landlord.petRentAmount ? Number(landlord.petRentAmount) : null,
            petRentEnabled: landlord.petRentEnabled,
            cleaningFeeAmount: landlord.cleaningFeeAmount ? Number(landlord.cleaningFeeAmount) : null,
            cleaningFeeEnabled: landlord.cleaningFeeEnabled,
          }
        : null,
    });
  } catch (error) {
    console.error('[mobile/pm/settings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update user settings
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { name, phone, notificationPreferences } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phoneNumber = phone;
    if (notificationPreferences !== undefined) updateData.notificationPreferences = notificationPreferences;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[mobile/pm/settings PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
