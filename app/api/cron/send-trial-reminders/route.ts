import { NextResponse } from 'next/server';
import { sendAllLandlordTrialReminders } from '@/lib/services/trial-reminder.service';

/**
 * Vercel cron — runs daily at 14:00 UTC (see vercel.json).
 *
 * Scans all landlords still on a no-card free trial and sends
 * reminder emails + in-app notifications at:
 *   - 2 days remaining  (day 12 of a 14-day trial)
 *   - 1 day remaining   (day 13)
 *   - 0 days remaining  (day 14 — trial expired)
 *
 * Protected by CRON_SECRET so it can't be triggered by random traffic.
 */
export async function GET(req: Request) {
  // Verify cron secret — Vercel sets this automatically as the
  // `Authorization: Bearer <CRON_SECRET>` header.
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendAllLandlordTrialReminders();

    console.log('[cron/send-trial-reminders]', result);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[cron/send-trial-reminders] fatal error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
