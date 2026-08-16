/**
 * POST /api/mobile/auth/login/2fa
 *
 * Body:
 *   { challenge: '...jwt...', code: '123456' }
 *
 * Completes the email-2FA challenge issued by /auth/login when the user
 * has 2FA enabled. Returns the real long-lived JWT + user/portals on
 * success.
 */
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from '@/db/prisma';
import { verifyEmail2FACode } from '@/lib/security/email-2fa';

export async function POST(req: NextRequest) {
  try {
    const { challenge, code } = await req.json();
    if (!challenge || !code) {
      return NextResponse.json({ error: 'challenge and code are required' }, { status: 400 });
    }

    const secret = new TextEncoder().encode(
      process.env.MOBILE_JWT_SECRET || process.env.NEXTAUTH_SECRET || ''
    );

    let payload: any;
    try {
      const result = await jwtVerify(challenge, secret);
      payload = result.payload;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired challenge. Sign in again.' }, { status: 401 });
    }
    if (payload.purpose !== 'login_2fa' || !payload.userId) {
      return NextResponse.json({ error: 'Invalid challenge' }, { status: 401 });
    }

    const verify = await verifyEmail2FACode(payload.userId, String(code).trim());
    if (!verify.success) {
      return NextResponse.json({ error: verify.message ?? 'Invalid code' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, image: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Build portals (same logic as the regular login response)
    const db = prisma as any;
    const [contractorProfile, agent, landlord, contractorEmployee, teamMember, tenantLease] = await Promise.all([
      db.contractorProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
      db.agent.findUnique({ where: { userId: user.id }, select: { id: true } }),
      db.landlord.findFirst({ where: { ownerUserId: user.id }, select: { id: true } }),
      db.contractorEmployee.findFirst({ where: { userId: user.id, status: { not: 'terminated' } }, select: { id: true } }),
      db.teamMember.findFirst({ where: { userId: user.id, status: { not: 'terminated' } }, select: { id: true } }),
      db.lease.findFirst({ where: { tenantId: user.id, status: { in: ['active', 'pending_signature'] } }, select: { id: true } }),
    ]);

    const portals: { role: string; label: string; reason: string }[] = [];
    if (contractorProfile) portals.push({ role: 'contractor', label: 'Contractor', reason: 'Manage jobs, invoices, crew' });
    if (landlord || user.role === 'admin' || user.role === 'superAdmin') portals.push({ role: 'admin', label: 'Property Manager', reason: 'Manage properties and tenants' });
    if (agent) portals.push({ role: 'agent', label: 'Real Estate Agent', reason: 'Manage listings and leads' });
    if (contractorEmployee || teamMember) portals.push({ role: 'employee', label: 'Employee', reason: 'Clock in, view paystubs' });
    if (tenantLease || user.role === 'tenant') portals.push({ role: 'tenant', label: 'Tenant', reason: 'Pay rent, request maintenance' });
    if (user.role === 'homeowner' && portals.length === 0) portals.push({ role: 'homeowner', label: 'Homeowner', reason: 'Find contractors, manage projects' });
    if (portals.length === 0) portals.push({ role: user.role, label: user.role, reason: 'Your account' });

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
      },
      portals,
    });
  } catch (error) {
    console.error('[mobile/auth/login/2fa]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
