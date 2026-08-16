import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { enableEmail2FA, disableEmail2FA } from '@/lib/security/email-2fa';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { enabled } = await req.json();

    if (enabled) {
      await enableEmail2FA(session.user.id);
    } else {
      await disableEmail2FA(session.user.id);
    }

    return NextResponse.json({ 
      success: true, 
      message: enabled ? '2FA enabled' : '2FA disabled' 
    });
  } catch (error) {
    console.error('Failed to toggle 2FA:', error);
    return NextResponse.json({ success: false, message: 'Failed to update 2FA settings' }, { status: 500 });
  }
}
