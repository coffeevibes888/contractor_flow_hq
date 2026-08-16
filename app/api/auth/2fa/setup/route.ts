import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { enable2FA, has2FAEnabled } from '@/lib/security/two-factor-auth';
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
    const rateLimit = checkRateLimit(`2fa-setup:${session.user.id}`, RATE_LIMIT_CONFIGS.authStrict);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if 2FA is already enabled
    const alreadyEnabled = await has2FAEnabled(session.user.id);
    if (alreadyEnabled) {
      return NextResponse.json(
        { message: '2FA is already enabled on your account.' },
        { status: 400 }
      );
    }

    // Generate 2FA setup
    const { secret, qrCodeUrl, backupCodes } = await enable2FA(session.user.id);

    return NextResponse.json({
      secret,
      qrCodeUrl,
      backupCodes,
      message: 'Scan the QR code with your authenticator app, then verify with a code.',
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { message: 'Failed to set up 2FA. Please try again.' },
      { status: 500 }
    );
  }
}
