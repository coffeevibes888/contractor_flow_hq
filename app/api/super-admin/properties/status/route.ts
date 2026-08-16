import { NextRequest, NextResponse } from 'next/server';
import { updatePropertyStatus } from '@/lib/actions/super-admin.actions';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { propertyId, status } = body;

    const result = await updatePropertyStatus(propertyId, status);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update status' },
      { status: 500 }
    );
  }
}
