import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const body = await req.json();
    const { businessName, displayName, phone, bio, website, serviceRadius } = body;

    const updateData: any = {};
    if (businessName !== undefined) updateData.businessName = businessName;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (website !== undefined) updateData.website = website;
    if (serviceRadius !== undefined) updateData.serviceRadius = serviceRadius;

    await prisma.contractorProfile.update({
      where: { id: contractorProfile.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[mobile/contractor/profile PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    return NextResponse.json({
      profile: {
        id: profile.id,
        businessName: profile.businessName,
        displayName: profile.displayName,
        phone: profile.phone,
        bio: profile.bio,
        website: profile.website,
        serviceRadius: profile.serviceRadius,
        specialties: profile.specialties,
        avgRating: Number(profile.avgRating || 0),
        totalReviews: profile.totalReviews || 0,
        completedJobs: profile.completedJobs || 0,
        subscriptionTier: profile.subscriptionTier,
        profilePhoto: (profile as any).profilePhoto || null,
      },
    });
  } catch (error) {
    console.error('[mobile/contractor/profile GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
