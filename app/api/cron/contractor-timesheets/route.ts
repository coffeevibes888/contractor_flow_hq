/**
 * GET /api/cron/contractor-timesheets
 *
 * Cron job that runs daily (e.g., midnight) and checks if any contractor
 * pay periods closed today. For those that did, it aggregates approved
 * time entries and notifies the contractor that timesheets are ready
 * for review and payroll processing.
 *
 * Should run once per day via Vercel Cron.
 */
import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/ops/cron-log';

export async function GET(req: NextRequest) {
  // Auth — Vercel Cron sets this header automatically
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return await withCronLog('contractor-timesheets', async () => {
      const { autoGenerateTimesheetSummaries } = await import(
        '@/lib/services/contractor-automation'
      );

      const result = await autoGenerateTimesheetSummaries();

      return NextResponse.json({
        success: true,
        ...result,
      });
    });
  } catch (error) {
    console.error('[contractor-timesheets] Cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
