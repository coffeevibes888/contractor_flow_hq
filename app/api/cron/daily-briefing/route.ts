/**
 * POST /api/cron/daily-briefing
 *
 * Runs every morning at 7am (configure in vercel.json or your cron provider).
 * For each active contractor:
 *   1. Sends a daily briefing email with today's jobs, crew status, alerts
 *   2. Sweeps overdue invoices and sends reminders (7-day cooldown)
 *
 * Protected by CRON_SECRET header.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import {
  sendDailyBriefingEmail,
  sweepOverdueInvoiceReminders,
} from '@/lib/services/contractor-automation';

export async function POST(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all active contractors who have jobs today or in the next 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const activeContractors = await (prisma as any).contractorProfile.findMany({
      where: {
        subscriptionTier: { not: null },
        email: { not: null },
        // Only send to contractors with upcoming jobs (avoid spamming inactive accounts)
        jobs: {
          some: {
            estimatedStartDate: { gte: today, lte: nextWeek },
            status: { in: ['scheduled', 'in_progress', 'approved'] },
          },
        },
      },
      select: { id: true, email: true, businessName: true },
    });

    let briefingsSent = 0;
    let briefingsFailed = 0;

    // Send briefings in parallel batches of 10
    const batchSize = 10;
    for (let i = 0; i < activeContractors.length; i += batchSize) {
      const batch = activeContractors.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (contractor: any) => {
          try {
            await sendDailyBriefingEmail(contractor.id);
            briefingsSent++;
          } catch {
            briefingsFailed++;
          }
        })
      );
    }

    // Sweep overdue invoices across all contractors
    const { processed, sent: remindersSent } = await sweepOverdueInvoiceReminders();

    return NextResponse.json({
      success: true,
      briefingsSent,
      briefingsFailed,
      overdueInvoicesProcessed: processed,
      overdueRemindersSent: remindersSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[daily-briefing cron]', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
