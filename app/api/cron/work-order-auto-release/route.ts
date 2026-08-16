/**
 * GET /api/cron/work-order-auto-release
 *
 * DISABLED — The contractor work-order side of the platform is moving to a
 * separate domain. This cron slot has been freed up for landlord lifecycle
 * emails (send-landlord-lifecycle-emails). Re-enable when the contractor
 * domain is active by adding it back to vercel.json.
 *
 * Original logic: Finds all work orders `awaiting_approval` past their
 * `pmApprovalDeadline` with no open dispute and auto-releases funds.
 */
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    skipped: true,
    reason: 'Contractor work-order cron disabled — slot freed for landlord lifecycle emails.',
  });
}
