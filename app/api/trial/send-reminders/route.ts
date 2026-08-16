import { NextResponse } from 'next/server';

/**
 * POST /api/trial/send-reminders — DISABLED
 *
 * Trials were removed in favor of pay-on-signup. This endpoint is left as a
 * stable export so any cron schedule or stale fetch() in client code keeps
 * compiling, but it now no-ops. Remove the early return below if you ever
 * bring trials back.
 */
export async function POST() {
  return NextResponse.json({
    success: true,
    skipped: true,
    reason: 'Trial system disabled — no reminders sent.',
  });
}
