/**
 * GET /api/cron/work-order-auto-release
 *
 * Cron job that auto-releases escrow funds to contractors when the PM
 * approval deadline has passed without the PM approving or disputing.
 *
 * Logic:
 * 1. Find all work orders in `awaiting_approval` with `escrowStatus: 'funded'`
 *    and `pmApprovalDeadline <= now()`
 * 2. Exclude any with open (unresolved) disputes
 * 3. Call releaseFundsForWorkOrder() for each — this handles the Stripe
 *    transfer, lifecycle transition, and audit log
 *
 * Should run every hour via Vercel Cron.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { withCronLog } from '@/lib/ops/cron-log';

export async function GET(req: NextRequest) {
  // Auth — Vercel Cron sets this header automatically
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return await withCronLog('work-order-auto-release', async () => {
      const now = new Date();

      // Find work orders past their approval deadline
      const candidates = await prisma.workOrder.findMany({
        where: {
          lifecycleStatus: 'awaiting_approval',
          escrowStatus: 'funded',
          pmApprovalDeadline: { lte: now },
        },
        select: {
          id: true,
          title: true,
          pmApprovalDeadline: true,
          contractorId: true,
          landlordId: true,
        },
      });

      if (candidates.length === 0) {
        return NextResponse.json({
          success: true,
          processed: 0,
          released: 0,
          skipped: 0,
          failed: 0,
        });
      }

      // Fetch open disputes for these work orders to exclude them
      const openDisputes = await prisma.workOrderDispute.findMany({
        where: {
          workOrderId: { in: candidates.map((c) => c.id) },
          resolvedAt: null,
        },
        select: { workOrderId: true },
      });
      const disputedIds = new Set(openDisputes.map((d) => d.workOrderId));

      // Lazy-import releaseFundsForWorkOrder from the lifecycle service
      const { releaseFundsForWorkOrder } = await import(
        '@/lib/services/work-order-lifecycle'
      );

      let released = 0;
      let skipped = 0;
      let failed = 0;

      for (const wo of candidates) {
        // Skip work orders with open disputes
        if (disputedIds.has(wo.id)) {
          skipped++;
          continue;
        }

        try {
          await releaseFundsForWorkOrder({
            workOrderId: wo.id,
            actorUserId: null,
            actorRole: 'system',
            note: 'Auto-released — PM approval deadline passed without action.',
          });
          released++;
        } catch (error) {
          console.error(
            `[work-order-auto-release] Failed to release ${wo.id}:`,
            error instanceof Error ? error.message : error
          );
          failed++;
        }
      }

      return NextResponse.json({
        success: true,
        processed: candidates.length,
        released,
        skipped,
        failed,
      });
    });
  } catch (error) {
    console.error('[work-order-auto-release] Cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
