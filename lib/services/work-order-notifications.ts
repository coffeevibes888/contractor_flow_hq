/**
 * Work Order Notification helper
 *
 * Centralizes the "who gets notified when" logic for the WorkOrder
 * lifecycle so we have a single place to tune copy. Each call writes
 * a Notification row (driving the in-app bell) and sends an email
 * via Resend, mirroring the existing MarketplaceNotifications pattern.
 *
 * Failures are caught and logged so they never break a state transition.
 */

import { prisma } from '@/db/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'Property Flow HQ';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type LifecycleStatus =
  | 'pending' | 'funded' | 'scheduled' | 'in_progress'
  | 'awaiting_approval' | 'released' | 'disputed' | 'refunded' | 'cancelled';

interface NotifyOpts {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

async function send(opts: NotifyOpts) {
  try {
    await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        message: opts.message,
        actionUrl: opts.actionUrl,
        metadata: opts.metadata as any,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { email: true, name: true },
    });
    if (!user?.email) return;

    await resend.emails.send({
      from: `${APP_NAME} <${SENDER_EMAIL}>`,
      to: user.email,
      subject: opts.title,
      html: emailTemplate({
        userName: user.name || 'there',
        title: opts.title,
        message: opts.message,
        actionUrl: opts.actionUrl,
      }),
    });
  } catch (e) {
    console.error('[work-order-notify] failed:', e);
  }
}

/**
 * Emit notifications appropriate for a lifecycle transition.
 * Call AFTER recordTransition has succeeded.
 */
export async function notifyWorkOrderTransition(args: {
  workOrderId: string;
  toStatus: LifecycleStatus;
  actorUserId: string | null;
}) {
  const { workOrderId, toStatus, actorUserId } = args;

  // Load minimal data needed for routing notifications
  const wo = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: {
      id: true,
      title: true,
      escrowAmount: true,
      pmApprovalDeadline: true,
      landlord: { select: { name: true, ownerUserId: true } },
      contractor: {
        select: {
          name: true,
          userId: true,
        },
      },
    },
  });
  if (!wo) return;

  const pmUserId = wo.landlord.ownerUserId;
  const contractorUserId = wo.contractor?.userId;
  const amount = wo.escrowAmount ? Number(wo.escrowAmount).toLocaleString() : '';
  const pmJobUrl = `${APP_URL}/admin/work-orders/${wo.id}/bids`;
  const contractorJobUrl = `${APP_URL}/contractors/jobs/${wo.id}`;

  // ─── route by status ───
  switch (toStatus) {
    case 'funded': {
      // Tell the contractor: "Your bid was accepted, money is held"
      if (contractorUserId) {
        await send({
          userId: contractorUserId,
          type: 'bid_accepted',
          title: '🎉 Your Quote Was Accepted!',
          message: `${wo.landlord.name} accepted your $${amount} quote on "${wo.title}". Funds are held securely. Get to work!`,
          actionUrl: contractorJobUrl,
          metadata: { workOrderId },
        });
      }
      break;
    }

    case 'scheduled': {
      // Tell the PM: contractor scheduled
      if (pmUserId) {
        await send({
          userId: pmUserId,
          type: 'job_scheduled',
          title: '📅 Job Scheduled',
          message: `${wo.contractor?.name || 'The contractor'} confirmed a start date for "${wo.title}".`,
          actionUrl: pmJobUrl,
          metadata: { workOrderId },
        });
      }
      break;
    }

    case 'in_progress': {
      if (pmUserId) {
        await send({
          userId: pmUserId,
          type: 'job_started',
          title: '🔧 Work Started',
          message: `${wo.contractor?.name || 'The contractor'} just started work on "${wo.title}".`,
          actionUrl: pmJobUrl,
          metadata: { workOrderId },
        });
      }
      break;
    }

    case 'awaiting_approval': {
      // PM has X days to approve
      if (pmUserId) {
        const deadline = wo.pmApprovalDeadline
          ? new Date(wo.pmApprovalDeadline).toLocaleDateString()
          : 'soon';
        await send({
          userId: pmUserId,
          type: 'job_completed',
          title: '✅ Job Complete — Action Required',
          message: `${wo.contractor?.name || 'The contractor'} marked "${wo.title}" complete. Review and approve to release funds. Auto-releases on ${deadline} if no action.`,
          actionUrl: pmJobUrl,
          metadata: { workOrderId },
        });
      }
      break;
    }

    case 'released': {
      // Both parties get a "paid" notification
      if (contractorUserId) {
        await send({
          userId: contractorUserId,
          type: 'payment_released',
          title: '💰 Funds Released!',
          message: `Payment of $${amount} for "${wo.title}" was released to your account. Standard payouts arrive in 1-2 business days.`,
          actionUrl: `${APP_URL}/contractor/payouts`,
          metadata: { workOrderId },
        });
      }
      if (pmUserId) {
        await send({
          userId: pmUserId,
          type: 'payment_released',
          title: '✅ Job Closed',
          message: `Funds released to ${wo.contractor?.name || 'contractor'} for "${wo.title}". Job is complete.`,
          actionUrl: pmJobUrl,
          metadata: { workOrderId },
        });
      }
      break;
    }

    case 'disputed': {
      // Notify the OTHER party (whoever didn't file)
      const targetId =
        actorUserId === pmUserId ? contractorUserId :
        actorUserId === contractorUserId ? pmUserId : null;
      if (targetId) {
        await send({
          userId: targetId,
          type: 'dispute_filed',
          title: '⚠️ Dispute Opened',
          message: `A concern was raised on "${wo.title}". Funds are temporarily frozen while we review.`,
          actionUrl: targetId === pmUserId ? pmJobUrl : contractorJobUrl,
          metadata: { workOrderId },
        });
      }
      break;
    }

    case 'refunded': {
      if (pmUserId) {
        await send({
          userId: pmUserId,
          type: 'refund_issued',
          title: '↩️ Funds Refunded',
          message: `Funds for "${wo.title}" were returned to your account. May take 5-10 business days to appear.`,
          actionUrl: pmJobUrl,
          metadata: { workOrderId },
        });
      }
      if (contractorUserId) {
        await send({
          userId: contractorUserId,
          type: 'job_cancelled',
          title: 'Job Cancelled',
          message: `"${wo.title}" was cancelled and funds returned to the property manager.`,
          actionUrl: contractorJobUrl,
          metadata: { workOrderId },
        });
      }
      break;
    }

    case 'cancelled': {
      if (contractorUserId) {
        await send({
          userId: contractorUserId,
          type: 'job_cancelled',
          title: 'Job Cancelled',
          message: `"${wo.title}" was cancelled before work started.`,
          actionUrl: contractorJobUrl,
          metadata: { workOrderId },
        });
      }
      break;
    }
  }
}

/* ─── shared email template ─── */
function emailTemplate(args: {
  userName: string;
  title: string;
  message: string;
  actionUrl?: string;
}) {
  const { userName, title, message, actionUrl } = args;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff">
    <div style="background:linear-gradient(135deg,#0ea5e9 0%,#06b6d4 100%);padding:24px;text-align:center">
      <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700">${APP_NAME}</h1>
    </div>
    <div style="padding:32px 24px">
      <h2 style="color:#0f172a;margin:0 0 16px 0;font-size:22px">${title}</h2>
      <p style="color:#334155;margin:0 0 8px 0">Hi ${userName},</p>
      <p style="color:#475569;line-height:1.6;margin:0 0 24px 0">${message}</p>
      ${
        actionUrl
          ? `<a href="${actionUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#0ea5e9,#06b6d4);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">View Details</a>`
          : ''
      }
    </div>
    <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px;text-align:center">
      You received this because you have a ${APP_NAME} account.
    </div>
  </div>
</body>
</html>
  `.trim();
}
