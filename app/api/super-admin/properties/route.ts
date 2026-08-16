import { NextResponse } from 'next/server';
import { getAllPropertiesForSuperAdmin } from '@/lib/actions/super-admin.actions';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const properties = await getAllPropertiesForSuperAdmin();
    return NextResponse.json(properties);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}
