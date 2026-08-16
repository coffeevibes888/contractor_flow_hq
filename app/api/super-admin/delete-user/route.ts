'use server';

import { NextResponse } from 'next/server';
import { deleteUserBySuperAdmin } from '@/lib/actions/super-admin.actions';
import { auth } from '@/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 });
    }
    await deleteUserBySuperAdmin(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user', error);
    return NextResponse.json({ success: false, message: 'Failed to delete user' }, { status: 500 });
  }
}
