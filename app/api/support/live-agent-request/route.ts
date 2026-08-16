import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { notifyLiveAgentRequest } from '@/lib/services/admin-notifications';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source, message } = body;

    // Get user info if logged in
    const session = await auth();
    const user = session?.user;

    // Send notification to admin
    await notifyLiveAgentRequest({
      userName: user?.name || undefined,
      userEmail: user?.email || undefined,
      userId: user?.id || undefined,
      source: source || 'unknown',
      message: message || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process live agent request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
