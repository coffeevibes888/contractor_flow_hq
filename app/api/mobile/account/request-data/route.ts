import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = payload.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // In production you'd email this — for now we return it and log the request
    console.log(`Data request from user ${userId} (${user.email})`);

    return NextResponse.json({
      success: true,
      message: `Your data export has been requested. We will email a full copy to ${user.email} within 30 days as required by law.`,
      summary: {
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phoneNumber,
        accountCreated: user.createdAt,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Request data error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
