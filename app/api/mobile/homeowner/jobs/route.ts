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
    const leads = await db.contractorLead.findMany({
      where: { customerUserId: payload.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, projectType: true, projectTitle: true, projectDescription: true,
        status: true, stage: true, urgency: true, budgetMin: true, budgetMax: true,
        propertyCity: true, propertyState: true, createdAt: true,
        matches: { select: { id: true, status: true, contractorId: true }, take: 5 },
      },
    });

    return NextResponse.json({
      jobs: leads.map((l: any) => ({
        id: l.id, projectType: l.projectType, title: l.projectTitle ?? l.projectType,
        description: l.projectDescription?.substring(0, 150) ?? '',
        status: l.status, stage: l.stage, urgency: l.urgency,
        budgetMin: l.budgetMin ? Number(l.budgetMin) : null,
        budgetMax: l.budgetMax ? Number(l.budgetMax) : null,
        city: l.propertyCity, state: l.propertyState,
        createdAt: l.createdAt.toISOString(),
        matchCount: l.matches?.length ?? 0,
      })),
    });
  } catch (error) {
    console.error('[mobile/homeowner/jobs]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
