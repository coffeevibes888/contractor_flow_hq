/**
 * GET /api/mobile/agent/leads
 *
 * Buyer / seller pipeline.
 */
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
    const agent = await db.agent.findFirst({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!agent) return NextResponse.json({ leads: [], counts: {} });

    const leads = await db.agentLead.findMany({
      where: { agentId: agent.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        type: true,
        source: true,
        status: true,
        budget: true,
        preApproved: true,
        preApprovalAmount: true,
        preferredAreas: true,
        timeline: true,
        notes: true,
        lastContactAt: true,
        nextFollowUp: true,
        createdAt: true,
        listing: { select: { id: true, title: true } },
      },
    });

    const counts: Record<string, number> = {};
    leads.forEach((l: any) => { counts[l.status] = (counts[l.status] || 0) + 1; });

    return NextResponse.json({
      leads: leads.map((l: any) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        type: l.type,
        source: l.source,
        status: l.status,
        budget: l.budget ? Number(l.budget) : null,
        preApproved: l.preApproved,
        preApprovalAmount: l.preApprovalAmount ? Number(l.preApprovalAmount) : null,
        preferredAreas: l.preferredAreas,
        timeline: l.timeline,
        notes: l.notes,
        lastContactAt: l.lastContactAt?.toISOString() ?? null,
        nextFollowUp: l.nextFollowUp?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
        listingTitle: l.listing?.title ?? null,
      })),
      counts: { ...counts, all: leads.length },
    });
  } catch (error) {
    console.error('[mobile/agent/leads]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
