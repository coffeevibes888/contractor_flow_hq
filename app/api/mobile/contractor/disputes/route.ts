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

    try {
      const db = prisma as any;
      if (!db.dispute) return NextResponse.json({ disputes: [] });

      const disputes = await db.dispute.findMany({
        where: {
          OR: [
            { filedByUserId: payload.userId },
            { respondentUserId: payload.userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return NextResponse.json({
        disputes: disputes.map((d: any) => ({
          id: d.id,
          title: d.title || d.subject || 'Dispute',
          description: d.description?.substring(0, 200) || null,
          status: d.status || 'open',
          amount: d.amount ? Number(d.amount) : null,
          createdAt: d.createdAt?.toISOString(),
        })),
      });
    } catch {
      return NextResponse.json({ disputes: [] });
    }
  } catch (error) {
    console.error('[mobile/contractor/disputes GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
