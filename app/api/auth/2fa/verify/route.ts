import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { verify2FASetup, has2FAEnabled } from '@/lib/security/two-factor-auth';
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

    // Rate limiting - strict for 2FA verification
    const clientId = getClientIdentifier(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const rateLimit = checkRateLimit(`2fa-verify:${session.user.id}`, RATE_LIMIT_CONFIGS.authStrict);
    
    if (!rateLimit.allowed) {
      await logAuthEvent('AUTH_2FA_VERIFIED', {
        userId: session.user.id,
        email: session.user.email || undefined,
        ipAddress: clientId,
        userAgent,
        success: false,
        failureReason: 'Rate limited',
      });
      
      return NextResponse.json(
        { message: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { message: 'Please enter a valid 6-digit code.' },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = await verify2FASetup(session.user.id, code);

    if (!isValid) {
      await logAuthEvent('AUTH_2FA_VERIFIED', {
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

    // Log successful 2FA setup
    await logAuthEvent('AUTH_2FA_ENABLED', {
      userId: session.user.id,
      email: session.user.email || undefined,
      ipAddress: clientId,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      message: '2FA has been enabled successfully!',
      enabled: true,
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { message: 'Failed to verify code. Please try again.' },
      { status: 500 }
    );
  }
}
