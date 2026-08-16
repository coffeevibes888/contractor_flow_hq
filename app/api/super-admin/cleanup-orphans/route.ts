import { NextResponse } from 'next/server';
import { cleanupOrphanedLandlords } from '@/lib/actions/super-admin.actions';
import { auth } from '@/auth';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await cleanupOrphanedLandlords();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to cleanup orphaned landlords:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to cleanup orphaned data' },
      { status: 500 }
    );
  }
}
