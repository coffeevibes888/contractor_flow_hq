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
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    try {
      const db = prisma as any;
      if (!db.contractorWarranty) return NextResponse.json({ warranties: [] });

      const warranties = await db.contractorWarranty.findMany({
        where: { contractorId: contractorProfile.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { job: { select: { title: true } }, customer: { select: { name: true } } },
      });

      return NextResponse.json({
        warranties: warranties.map((w: any) => ({
          id: w.id,
          title: w.title || w.job?.title || 'Warranty',
          customerName: w.customer?.name || null,
          jobTitle: w.job?.title || null,
          status: w.status || 'active',
          startDate: w.startDate?.toISOString() || w.createdAt?.toISOString(),
          expiresAt: w.expiresAt?.toISOString() || null,
          createdAt: w.createdAt?.toISOString(),
        })),
      });
    } catch {
      return NextResponse.json({ warranties: [] });
    }
  } catch (error) {
    console.error('[mobile/contractor/warranties GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
