/**
 * GET /api/contractor/jobs/[id]/activity
 *
 * Unified, reverse-chronological activity feed for a job: notes, photos,
 * expenses, change orders, milestone completions, and creation. Read-only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

interface ActivityItem {
  id: string;
  type: 'note' | 'photo' | 'expense' | 'change_order' | 'milestone' | 'created';
  title: string;
  detail?: string;
  amount?: number;
  at: string;
  meta?: Record<string, unknown>;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { id } = await params;
    const db = prisma as any;

    const job = await db.contractorJob.findFirst({
      where: { id, contractorId: contractorAuth.contractorId },
      select: { id: true, createdAt: true, jobNumber: true, title: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const [notes, photos, expenses, changeOrders, milestones] = await Promise.all([
      db.contractorJobNote.findMany({
        where: { jobId: id, contractorId: contractorAuth.contractorId },
        orderBy: { createdAt: 'desc' },
      }),
      db.contractorJobPhoto.findMany({
        where: { jobId: id, contractorId: contractorAuth.contractorId },
        orderBy: { takenAt: 'desc' },
      }),
      db.contractorExpense.findMany({
        where: { jobId: id, contractorId: contractorAuth.contractorId },
        orderBy: { createdAt: 'desc' },
      }),
      db.contractorChangeOrder.findMany({
        where: { jobId: id, contractorId: contractorAuth.contractorId },
        orderBy: { createdAt: 'desc' },
      }),
      db.contractorJobMilestone.findMany({
        where: { jobId: id, contractorId: contractorAuth.contractorId, status: 'completed' },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    const items: ActivityItem[] = [];

    for (const n of notes) {
      items.push({
        id: `note-${n.id}`,
        type: 'note',
        title:
          n.type === 'status_change' ? 'Status update'
          : n.type === 'issue' ? 'Issue logged'
          : n.type === 'customer_communication' ? 'Customer communication'
          : n.type === 'update' ? 'Progress update'
          : 'Note added',
        detail: n.content,
        at: n.createdAt,
        meta: { noteType: n.type, isInternal: n.isInternal },
      });
    }

    for (const p of photos) {
      const isSignature = Array.isArray(p.tags) && p.tags.includes('signature');
      items.push({
        id: `photo-${p.id}`,
        type: 'photo',
        title: isSignature ? 'Customer sign-off captured' : `Photo added (${p.category})`,
        detail: p.caption ?? undefined,
        at: p.takenAt,
        meta: { category: p.category, url: p.url, isSignature },
      });
    }

    for (const e of expenses) {
      items.push({
        id: `expense-${e.id}`,
        type: 'expense',
        title: `Expense: ${e.description}`,
        detail: `${e.category}${e.vendor ? ` · ${e.vendor}` : ''}`,
        amount: Number(e.amount),
        at: e.createdAt,
      });
    }

    for (const c of changeOrders) {
      items.push({
        id: `co-${c.id}`,
        type: 'change_order',
        title: `Change order ${c.status}: ${c.title}`,
        detail: c.description,
        amount: Number(c.additionalCost),
        at: c.createdAt,
        meta: { status: c.status },
      });
    }

    for (const m of milestones) {
      items.push({
        id: `milestone-${m.id}`,
        type: 'milestone',
        title: `Completed: ${m.title}`,
        detail: m.description ?? undefined,
        at: m.completedAt ?? m.updatedAt,
      });
    }

    items.push({
      id: `created-${job.id}`,
      type: 'created',
      title: 'Job created',
      detail: job.title || `Job #${job.jobNumber}`,
      at: job.createdAt,
    });

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return NextResponse.json({ activity: items });
  } catch (error) {
    console.error('[GET activity]', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
