import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { disable2FA, has2FAEnabled, verify2FALogin } from '@/lib/security/two-factor-auth';
import { checkRateLimit, getClientIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limiter';
import { logAuthEvent } from '@/lib/security/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    const clientId = getClientIdentifier(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const rateLimit = checkRateLimit(`2fa-disable:${session.user.id}`, RATE_LIMIT_CONFIGS.authStrict);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { code } = body;

    // Check if 2FA is enabled
    const isEnabled = await has2FAEnabled(session.user.id);
    if (!isEnabled) {
      return NextResponse.json(
        { message: '2FA is not enabled on your account.' },
        { status: 400 }
      );
    }

    // Verify the code before disabling
    if (!code) {
      return NextResponse.json(
        { message: 'Please enter your 2FA code to disable.' },
        { status: 400 }
      );
    }

    const isValid = await verify2FALogin(session.user.id, code);
    if (!isValid) {
      await logAuthEvent('AUTH_2FA_DISABLED', {
        userId: session.user.id,
        email: session.user.email || undefined,
        ipAddress: clientId,
        userAgent,
        success: false,
        failureReason: 'Invalid code',
      });
      
      return NextResponse.json(
        { message: 'Invalid code. Please try again.' },
        { status: 400 }
      );
    }

    // Disable 2FA
    await disable2FA(session.user.id);

    // Log the action
    await logAuthEvent('AUTH_2FA_DISABLED', {
      userId: session.user.id,
      email: session.user.email || undefined,
      ipAddress: clientId,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      message: '2FA has been disabled.',
      enabled: false,
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { message: 'Failed to disable 2FA. Please try again.' },
      { status: 500 }
    );
  }
}
