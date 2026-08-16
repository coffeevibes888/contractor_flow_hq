/**
 * GET    /api/work-orders/[id]/milestones — list milestones (both parties)
 * POST   /api/work-orders/[id]/milestones — PM creates milestones for a funded job
 *
 * Body for POST: {
 *   milestones: [{ title, description?, amount, releaseRule, order? }]
 * }
 *
 * Validates:
 * - caller is the PM owner
 * - sum of amounts equals escrowAmount (no over/under-funding)
 * - work order is funded (not yet in_progress or beyond)
 * - milestones don't already exist
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

const VALID_RULES = [
  'on_start',
  'on_receipts',
  'on_midpoint',
  'on_completion',
  'manual',
] as const;
type ReleaseRule = (typeof VALID_RULES)[number];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    const { id: workOrderId } = await params;

    const wo = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        landlord: { select: { ownerUserId: true } },
        contractor: { select: { userId: true } },
      },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const isOwner = wo.landlord.ownerUserId === session.user.id;
    const isContractor = !!wo.contractor && wo.contractor.userId === session.user.id;
    if (!isOwner && !isContractor) {
      return NextResponse.json({ success: false, error: 'Not a participant' }, { status: 403 });
    }

    const milestones = await prisma.workOrderMilestone.findMany({
      where: { workOrderId },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json({ success: true, milestones });
  } catch (e) {
    console.error('GET milestones error:', e);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    const { id: workOrderId } = await params;
    const body = (await req.json()) as {
      milestones: Array<{
        title: string;
        description?: string;
        amount: number;
        releaseRule: ReleaseRule;
        order?: number;
      }>;
    };

    const wo = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { landlord: { select: { ownerUserId: true } } },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (wo.landlord.ownerUserId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Only the PM can set milestones' }, { status: 403 });
    }
    if (wo.lifecycleStatus !== 'funded') {
      return NextResponse.json(
        { success: false, error: 'Milestones can only be set on a funded job before work begins' },
        { status: 400 }
      );
    }

    const existing = await prisma.workOrderMilestone.count({ where: { workOrderId } });
    if (existing > 0) {
      return NextResponse.json(
        { success: false, error: 'Milestones already exist for this job' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.milestones) || body.milestones.length < 1) {
      return NextResponse.json(
        { success: false, error: 'Provide at least 1 milestone' },
        { status: 400 }
      );
    }

    const escrow = Number(wo.escrowAmount ?? 0);
    let total = 0;
    for (const m of body.milestones) {
      if (!m.title?.trim()) {
        return NextResponse.json({ success: false, error: 'Each milestone needs a title' }, { status: 400 });
      }
      if (typeof m.amount !== 'number' || m.amount <= 0) {
        return NextResponse.json({ success: false, error: 'Each milestone needs a positive amount' }, { status: 400 });
      }
      if (!VALID_RULES.includes(m.releaseRule)) {
        return NextResponse.json(
          { success: false, error: `releaseRule must be one of ${VALID_RULES.join(', ')}` },
          { status: 400 }
        );
      }
      total += m.amount;
    }

    if (Math.abs(total - escrow) > 0.01) {
      return NextResponse.json(
        {
          success: false,
          error: `Milestone amounts ($${total.toLocaleString()}) must equal the escrow total ($${escrow.toLocaleString()})`,
        },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(
      body.milestones.map((m, idx) =>
        prisma.workOrderMilestone.create({
          data: {
            workOrderId,
            order: m.order ?? idx + 1,
            title: m.title.trim(),
            description: m.description?.trim() || null,
            amount: m.amount,
            releaseRule: m.releaseRule,
            status: 'pending',
          },
        })
      )
    );

    return NextResponse.json({ success: true, milestones: created });
  } catch (e) {
    console.error('POST milestones error:', e);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
