import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: {
        id: true,
        licenseNumber: true,
        licenseState: true,
        licenseVerified: true,
        insuranceVerified: true,
        backgroundCheckStatus: true,
      },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Build verification items based on profile fields
    const items: Array<{ key: string; type: string; status: string }> = [];

    items.push({
      key: 'license',
      type: 'license',
      status: contractorProfile.licenseVerified ? 'verified'
        : contractorProfile.licenseNumber ? 'pending'
        : 'missing',
    });

    items.push({
      key: 'insurance',
      type: 'insurance',
      status: contractorProfile.insuranceVerified ? 'verified' : 'missing',
    });

    items.push({
      key: 'identity',
      type: 'identity',
      status: contractorProfile.backgroundCheckStatus === 'passed' ? 'verified'
        : contractorProfile.backgroundCheckStatus === 'pending' ? 'pending'
        : 'missing',
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[mobile/contractor/verification GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
