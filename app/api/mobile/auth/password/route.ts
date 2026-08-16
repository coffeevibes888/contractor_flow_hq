/**
 * POST /api/mobile/auth/password
 *
 * Change password for the authenticated user. Requires the current
 * password as a soft re-auth so a stolen JWT alone can't change it.
 *
 * Body: { currentPassword, newPassword }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { compare, hash } from '@/lib/encrypt';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'currentPassword and newPassword are required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, password: true },
    });
    if (!user?.password) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const ok = await compare(currentPassword, user.password);
    if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

    const hashed = await hash(newPassword);
    await prisma.user.update({
      where: { id: auth.userId },
      data: { password: hashed, sessionVersion: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[mobile/auth/password]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to change password' }, { status: 500 });
  }
}
