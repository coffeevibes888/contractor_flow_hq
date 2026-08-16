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

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const matches = await (prisma as any).contractorLeadMatch.findMany({
      where: { contractorId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        lead: {
          select: {
            id: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            projectType: true,
            projectTitle: true,
            projectDescription: true,
            budgetMin: true,
            budgetMax: true,
            timeline: true,
            urgency: true,
            propertyCity: true,
            propertyState: true,
            leadScore: true,
            stage: true,
            priority: true,
            createdAt: true,
          },
        },
      },
    });

    const leads = matches.map((m: any) => ({
      matchId: m.id,
      leadId: m.lead.id,
      status: m.status,
      customerName: m.lead.customerName,
      customerEmail: m.lead.customerEmail,
      projectType: m.lead.projectType,
      projectTitle: m.lead.projectTitle,
      description: m.lead.projectDescription?.substring(0, 150) ?? '',
      budgetMin: m.lead.budgetMin ? Number(m.lead.budgetMin) : null,
      budgetMax: m.lead.budgetMax ? Number(m.lead.budgetMax) : null,
      urgency: m.lead.urgency,
      city: m.lead.propertyCity,
      state: m.lead.propertyState,
      leadScore: m.lead.leadScore,
      stage: m.lead.stage,
      priority: m.lead.priority,
      createdAt: m.lead.createdAt.toISOString(),
    }));

    const stageCounts: Record<string, number> = {};
    leads.forEach((l: any) => { stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1; });

    return NextResponse.json({ leads, stageCounts, total: leads.length });
  } catch (error) {
    console.error('[mobile/contractor/leads]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
