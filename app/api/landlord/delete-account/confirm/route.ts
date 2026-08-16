import { NextRequest, NextResponse } from 'next/server';
import { auth, signOut } from '@/auth';
import { prisma } from '@/db/prisma';
import { Resend } from 'resend';
import { APP_NAME, SENDER_EMAIL } from '@/lib/constants';

const resend = new Resend(process.env.RESEND_API_KEY);
const DELETE_CODE_PREFIX = 'DELETE_ACCOUNT:';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, message: 'Verification code is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Look up the deletion code
    const record = await prisma.emailVerificationToken.findFirst({
      where: {
        email: user.email,
        token: `${DELETE_CODE_PREFIX}${code.trim()}`,
      },
    });

    if (!record) {
      return NextResponse.json({ success: false, message: 'Invalid code. Please try again.' }, { status: 400 });
    }

    if (new Date() > record.expires) {
      await prisma.emailVerificationToken.delete({ where: { id: record.id } });
      return NextResponse.json({ success: false, message: 'Code expired. Please request a new one.' }, { status: 400 });
    }

    // Code is valid — clean it up before deletion
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });

    // Send a goodbye confirmation email before wiping data
    try {
      await resend.emails.send({
        from: `${APP_NAME} <${SENDER_EMAIL}>`,
        to: user.email,
        subject: `Your ${APP_NAME} account has been deleted`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#1e293b;">Account Deleted</h2>
            <p>Hi ${user.name || 'there'},</p>
            <p>Your ${APP_NAME} account and all associated data have been permanently deleted as requested.</p>
            <p>We're sorry to see you go. If you ever want to start fresh, you're always welcome back.</p>
            <p style="color:#64748b;font-size:12px;margin-top:24px;">If you did not request this deletion, please contact our support team immediately at support@propertyflowhq.com.</p>
          </div>
        `,
      });
    } catch {
      // Best-effort — continue with deletion even if email fails
    }

    // Delete the User record — Cascade relationships (Lease, RentPayment, Landlord, etc.)
    // are handled by onDelete: Cascade in the Prisma schema.
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete account' }, { status: 500 });
  }
}
