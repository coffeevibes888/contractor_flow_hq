import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { sendEmail2FACode } from '@/lib/security/email-2fa';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email required' }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, twoFactorEnabled: true },
    });

    if (!user) {
      // Don't reveal if user exists - return generic response
      return NextResponse.json({ success: true, requires2FA: false });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ success: true, requires2FA: false });
    }

    const result = await sendEmail2FACode(user.id);
    
    return NextResponse.json({ 
      success: result.success, 
      requires2FA: true,
      message: result.message || 'Verification code sent to your email'
    });
  } catch (error) {
    console.error('Failed to send 2FA code:', error);
    return NextResponse.json({ success: false, message: 'Failed to send code' }, { status: 500 });
  }
}
