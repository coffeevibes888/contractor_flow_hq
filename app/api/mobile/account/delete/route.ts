import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = payload.userId;

    // Cancel Stripe subscriptions before deleting
    const landlord = await prisma.landlord.findFirst({ where: { ownerUserId: userId }, select: { id: true } });
    const contractor = await prisma.contractorProfile.findFirst({ where: { userId }, select: { id: true } });

    // Delete related profiles first (cascades handle most, but explicit for safety)
    if (landlord) await prisma.landlord.update({ where: { id: landlord.id }, data: { subscriptionStatus: 'canceled' } });
    if (contractor) await prisma.contractorProfile.update({ where: { id: contractor.id }, data: { subscriptionStatus: 'canceled' } });

    // Delete the user (cascades in schema handle related records)
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
