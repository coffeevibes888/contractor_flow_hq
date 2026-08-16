/**
 * POST /api/mobile/auth/email-verify/verify
 *
 * Body: { code: '123456' }
 *
 * Marks the user's email as verified by setting `User.emailVerified` to now.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const record = await prisma.emailVerificationToken.findFirst({
      where: { email: user.email, token: `EMAIL:${code.trim()}` },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }
    if (new Date(record.expires) < new Date()) {
      return NextResponse.json({ error: 'Code expired. Send a new one.' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: auth.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);

    return NextResponse.json({ success: true, emailVerified: true });
  } catch (error) {
    console.error('[mobile/auth/email-verify/verify]', error);
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
  }
}
