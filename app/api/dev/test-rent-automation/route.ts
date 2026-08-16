import { NextRequest, NextResponse } from 'next/server';
import { processRentReminders, processLateFees } from '@/lib/actions/rent-automation.actions';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint for rent automation
 * Only works in development or for admin users
 * 
 * Usage:
 * GET /api/dev/test-rent-automation?type=reminders
 * GET /api/dev/test-rent-automation?type=late-fees
 * GET /api/dev/test-rent-automation?type=both
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'superAdmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'both';

  const results: any = {
    timestamp: new Date().toISOString(),
    type,
  };

  try {
    if (type === 'reminders' || type === 'both') {
      console.log('Testing rent reminders...');
      const reminderResults = await processRentReminders();
      results.reminders = reminderResults;
    }

    if (type === 'late-fees' || type === 'both') {
      console.log('Testing late fees...');
      const lateFeeResults = await processLateFees();
      results.lateFees = lateFeeResults;
    }

    return NextResponse.json({
      success: true,
      message: 'Rent automation test completed',
      ...results,
    });
  } catch (error) {
    console.error('Rent automation test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...results,
    }, { status: 500 });
  }
}
