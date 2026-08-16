import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import crypto from 'crypto';
import { Resend } from 'resend';
import { APP_NAME, SENDER_EMAIL } from '@/lib/constants';

const resend = new Resend(process.env.RESEND_API_KEY);
const CODE_EXPIRY_MINUTES = 15;
const DELETE_CODE_PREFIX = 'DELETE_ACCOUNT:';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    // Remove any previous deletion codes for this user
    await prisma.emailVerificationToken.deleteMany({
      where: { email: user.email, token: { startsWith: DELETE_CODE_PREFIX } },
    });

    await prisma.emailVerificationToken.create({
      data: { email: user.email, token: `${DELETE_CODE_PREFIX}${code}`, expires: expiresAt },
    });

    await resend.emails.send({
      from: `${APP_NAME} <${SENDER_EMAIL}>`,
      to: user.email,
      subject: '⚠️ Account Deletion Confirmation Code',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#dc2626;">Account Deletion Request</h2>
          <p>Hi ${user.name || 'there'},</p>
          <p>We received a request to <strong>permanently delete your ${APP_NAME} account</strong>. This action cannot be undone and all data not previously downloaded will be lost forever.</p>
          <p>If you requested this, enter the following code to confirm:</p>
          <div style="background:#fef2f2;border:2px solid #dc2626;padding:20px;text-align:center;border-radius:8px;margin:20px 0;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#dc2626;">${code}</span>
          </div>
          <p style="color:#64748b;font-size:14px;">This code expires in ${CODE_EXPIRY_MINUTES} minutes.</p>
          <p style="color:#dc2626;font-size:14px;font-weight:bold;">If you did NOT request this, please change your password immediately and contact support.</p>
        </div>
      `,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n[DELETE ACCOUNT DEV] Code for ${user.email}: ${code}\n`);
    }

    return NextResponse.json({ success: true, message: 'Confirmation code sent to your email.' });
  } catch (error) {
    console.error('Send delete code error:', error);
    return NextResponse.json({ success: false, message: 'Failed to send confirmation code' }, { status: 500 });
  }
}
