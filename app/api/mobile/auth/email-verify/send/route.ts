/**
 * POST /api/mobile/auth/email-verify/send
 *
 * Sends a 6-digit verification code to the authenticated user's email.
 * The user proves ownership by submitting it via /verify.
 *
 * Reuses EmailVerificationToken with a unique 'EMAIL:' prefix so it
 * doesn't collide with the email-2FA codes that use the '2FA:' prefix
 * in the same table.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Resend } from 'resend';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { APP_NAME } from '@/lib/constants';

const resend = new Resend(process.env.RESEND_API_KEY);
const CODE_EXPIRY_MINUTES = 15;

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, name: true, emailVerified: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const code = generateCode();
    const expires = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.emailVerificationToken.deleteMany({
      where: { email: user.email, token: { startsWith: 'EMAIL:' } },
    });
    await prisma.emailVerificationToken.create({
      data: { email: user.email, token: `EMAIL:${code}`, expires },
    });

    let sent = false;
    let lastError: unknown = null;
    try {
      await resend.emails.send({
        from: `${APP_NAME} <${process.env.SENDER_EMAIL || 'onboarding@resend.dev'}>`,
        to: user.email,
        subject: 'Verify your email',
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">Verify your email</h2>
            <p>Hi ${user.name ?? 'there'},</p>
            <p>Enter this code in the app to verify your email address:</p>
            <div style="background:#f1f5f9; padding:24px; text-align:center; border-radius:12px; margin:20px 0;">
              <span style="font-size:36px; font-weight:800; letter-spacing:10px; color:#2563eb;">${code}</span>
            </div>
            <p style="color:#64748b; font-size:14px;">This code expires in ${CODE_EXPIRY_MINUTES} minutes.</p>
          </div>
        `,
      });
      sent = true;
    } catch (err) {
      lastError = err;
    }

    if (process.env.NODE_ENV !== 'production' || !sent) {
      // eslint-disable-next-line no-console
      console.log(`[EmailVerify DEV] Code for ${user.email}: ${code} (expires in ${CODE_EXPIRY_MINUTES}m)`);
      if (lastError) {
        // eslint-disable-next-line no-console
        console.log('[EmailVerify DEV] Resend error:', (lastError as Error)?.message ?? lastError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[mobile/auth/email-verify/send]', error);
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
  }
}
