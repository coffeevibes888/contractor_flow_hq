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

    const db = prisma as any;

    // Get homeowner profile
    const homeowner = await db.homeowner.findFirst({
      where: { userId: payload.userId },
      select: { id: true },
    });

    if (!homeowner) return NextResponse.json({ dashboard: null });

    // Get leads/jobs posted by this homeowner
    const leads = await db.contractorLead.findMany({
      where: { customerUserId: payload.userId },
      select: { id: true, status: true, stage: true, projectType: true, projectTitle: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get quotes received
    const quotes = await db.contractorQuote.findMany({
      where: { customerId: payload.userId },
      select: { id: true, status: true, title: true, totalPrice: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const activeJobs = leads.filter((l: any) => ['won', 'quoted', 'negotiating'].includes(l.stage)).length;
    const pendingQuotes = quotes.filter((q: any) => q.status === 'pending').length;
    const totalSpent = quotes.filter((q: any) => q.status === 'accepted').reduce((s: number, q: any) => s + Number(q.totalPrice), 0);

    return NextResponse.json({
      dashboard: {
        activeJobs,
        totalLeads: leads.length,
        pendingQuotes,
        totalSpent,
        recentLeads: leads.slice(0, 5).map((l: any) => ({
          id: l.id, status: l.status, stage: l.stage, projectType: l.projectType, title: l.projectTitle, createdAt: l.createdAt.toISOString(),
        })),
        recentQuotes: quotes.slice(0, 5).map((q: any) => ({
          id: q.id, status: q.status, title: q.title, totalPrice: Number(q.totalPrice), createdAt: q.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('[mobile/homeowner/dashboard]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
