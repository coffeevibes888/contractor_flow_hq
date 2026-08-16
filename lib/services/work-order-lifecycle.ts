/**
 * WorkOrder Lifecycle Service
 *
 * Centralizes the state machine for the Uber-style job tracking experience:
 *
 *   pending  -> funded  -> scheduled  -> in_progress  -> awaiting_approval  -> released
 *      \                                                      \
 *       \--------------------- disputed ----------------------- /
 *                                  |
 *                          released | refunded | split
 *
 * Every transition is logged in WorkOrderStatusEvent so we can render an
 * audit timeline and so the cron auto-release job can find candidates.
 *
 * The actual Stripe calls (PaymentIntent capture, Transfer, Refund) are
 * delegated to StripeEscrowService which already handles auth, retries,
 * and error mapping.
 */

import { prisma, TransactionClient } from '@/db/prisma';
import { Prisma } from '@prisma/client';

export type LifecycleStatus =
  | 'pending'
  | 'funded'
  | 'scheduled'
  | 'in_progress'
  | 'awaiting_approval'
  | 'released'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export type ActorRole = 'landlord' | 'contractor' | 'system';

/**
 * Auto-approval window: number of days the PM has to approve completed work
 * before funds auto-release to the contractor. Mirrors Upwork (5d) and
 * Fiverr (3d). 5 days is a friendly default.
 */
export const PM_APPROVAL_WINDOW_DAYS = 5;

/**
 * Allowed transitions. Undocumented transitions throw.
 */
const ALLOWED: Record<LifecycleStatus, LifecycleStatus[]> = {
  pending: ['funded', 'cancelled'],
  funded: ['scheduled', 'in_progress', 'disputed', 'cancelled'],
  scheduled: ['in_progress', 'disputed', 'cancelled'],
  in_progress: ['awaiting_approval', 'disputed'],
  awaiting_approval: ['released', 'disputed'],
  released: [],
  disputed: ['released', 'refunded'],
  refunded: [],
  cancelled: [],
};

export function canTransition(from: LifecycleStatus, to: LifecycleStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

interface RecordTransitionArgs {
  workOrderId: string;
  to: LifecycleStatus;
  actorUserId?: string | null;
  actorRole?: ActorRole;
  note?: string;
  metadata?: Record<string, unknown>;
  /** Additional fields to update on the WorkOrder atomically */
  workOrderPatch?: Prisma.WorkOrderUpdateInput;
  /** Pass an existing transaction client to participate in a larger tx */
  tx?: TransactionClient;
}

/**
 * Atomically transition a work order's lifecycleStatus and write a
 * WorkOrderStatusEvent row. Validates the transition before applying.
 */
export async function recordTransition(args: RecordTransitionArgs) {
  const {
    workOrderId,
    to,
    actorUserId,
    actorRole = 'system',
    note,
    metadata,
    workOrderPatch,
    tx,
  } = args;

  const run = async (client: TransactionClient) => {
    const wo = await client.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, lifecycleStatus: true },
    });
    if (!wo) throw new Error('Work order not found');

    const from = wo.lifecycleStatus as LifecycleStatus;
    if (from === to) return wo; // idempotent
    if (!canTransition(from, to)) {
      throw new Error(`Invalid lifecycle transition: ${from} -> ${to}`);
    }

    await client.workOrder.update({
      where: { id: workOrderId },
      data: {
        lifecycleStatus: to,
        ...(workOrderPatch ?? {}),
      },
    });

    await client.workOrderStatusEvent.create({
      data: {
        workOrderId,
        fromStatus: from,
        toStatus: to,
        actorUserId: actorUserId ?? null,
        actorRole,
        note: note ?? null,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return wo;
  };

  if (tx) {
    const result = await run(tx);
    // Notifications run after the calling tx commits — fire-and-forget
    void notifyAfterTransition(workOrderId, to, actorUserId ?? null);
    return result;
  }
  const result = await prisma.$transaction(run);
  void notifyAfterTransition(workOrderId, to, actorUserId ?? null);
  return result;
}

// Lazy-loaded so the lifecycle service has zero cost when notifications fail
async function notifyAfterTransition(
  workOrderId: string,
  to: LifecycleStatus,
  actorUserId: string | null
) {
  try {
    const { notifyWorkOrderTransition } = await import('./work-order-notifications');
    await notifyWorkOrderTransition({ workOrderId, toStatus: to, actorUserId });
  } catch (e) {
    console.error('[lifecycle] notification dispatch failed:', e);
  }
}

/**
 * Compute the auto-approval deadline given a "completed" timestamp.
 */
export function computeApprovalDeadline(completedAt: Date = new Date()): Date {
  const d = new Date(completedAt);
  d.setDate(d.getDate() + PM_APPROVAL_WINDOW_DAYS);
  return d;
}

/**
 * Human-readable label + color hint for a lifecycle status.
 * Used in the UI so we have one source of truth.
 */
export const LIFECYCLE_META: Record<
  LifecycleStatus,
  { label: string; description: string; tone: string }
> = {
  pending: {
    label: 'Awaiting Quote Acceptance',
    description: 'Waiting for the property manager to accept a quote.',
    tone: 'slate',
  },
  funded: {
    label: 'Funded & Secured',
    description: 'Funds are held safely. Work can begin.',
    tone: 'emerald',
  },
  scheduled: {
    label: 'Scheduled',
    description: 'Start date confirmed. Contractor will arrive on time.',
    tone: 'blue',
  },
  in_progress: {
    label: 'In Progress',
    description: 'Contractor is actively working on this job.',
    tone: 'cyan',
  },
  awaiting_approval: {
    label: 'Awaiting Approval',
    description: 'Work marked complete. PM is reviewing.',
    tone: 'amber',
  },
  released: {
    label: 'Paid & Complete',
    description: 'Funds released to the contractor.',
    tone: 'emerald',
  },
  disputed: {
    label: 'Under Dispute',
    description: 'A concern was raised. Funds are temporarily frozen.',
    tone: 'red',
  },
  refunded: {
    label: 'Refunded',
    description: 'Funds were returned to the property manager.',
    tone: 'slate',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'This job was cancelled before work began.',
    tone: 'slate',
  },
};

/**
 * Steps shown on the Uber-style timeline ribbon. Disputed/refunded/cancelled
 * are off-path — the ribbon shows only the happy path with a separate
 * disputed indicator if present.
 */
export const TIMELINE_STEPS: { key: LifecycleStatus; label: string; short: string }[] = [
  { key: 'pending', label: 'Quote Sent', short: 'Quote' },
  { key: 'funded', label: 'Accepted & Funded', short: 'Funded' },
  { key: 'scheduled', label: 'Scheduled', short: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress', short: 'Working' },
  { key: 'awaiting_approval', label: 'Awaiting Approval', short: 'Review' },
  { key: 'released', label: 'Paid & Complete', short: 'Done' },
];
