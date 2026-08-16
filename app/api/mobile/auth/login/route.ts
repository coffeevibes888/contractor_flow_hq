import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

import { compare } from '@/lib/encrypt';
import { prisma } from '@/db/prisma';
import { sendEmail2FACode } from '@/lib/security/email-2fa';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        image: true,
        twoFactorEnabled: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.role !== 'contractor' && user.role !== 'admin' && user.role !== 'superAdmin' && user.role !== 'tenant' && user.role !== 'homeowner' && user.role !== 'employee') {
      return NextResponse.json(
        { error: 'Access restricted' },
        { status: 403 }
      );
    }

    const isValid = await compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // ── 2FA gate ────────────────────────────────────────────────────────────
    // If the user has 2FA enabled, we don't issue a real JWT yet. Instead
    // we send a 6-digit email code and return a short-lived challenge
    // token. The client calls /auth/login/2fa with that challenge + the
    // emailed code to complete login.
    if (user.twoFactorEnabled) {
      await sendEmail2FACode(user.id);
      const secret = new TextEncoder().encode(
        process.env.MOBILE_JWT_SECRET || process.env.NEXTAUTH_SECRET || ''
      );
      const challenge = await new SignJWT({
        userId: user.id,
        email: user.email,
        purpose: 'login_2fa',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(secret);

      return NextResponse.json({
        requires2FA: true,
        challenge,
        message: 'A code was sent to your email',
      });
    }

    return await issueLoginResponse(user);
  } catch (error) {
    console.error('[mobile/auth/login]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function issueLoginResponse(user: {
  id: string; email: string; name: string | null; role: string; image: string | null;
}) {
    // Detect any extra portals the user has access to (multi-role users)
    const db = prisma as any;
    const [contractorProfile, agent, landlord, contractorEmployee, teamMember, tenantLease] = await Promise.all([
      db.contractorProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
      db.agent.findUnique({ where: { userId: user.id }, select: { id: true } }),
      db.landlord.findFirst({ where: { ownerUserId: user.id }, select: { id: true } }),
      db.contractorEmployee.findFirst({ where: { userId: user.id, status: { not: 'terminated' } }, select: { id: true } }),
      db.teamMember.findFirst({ where: { userId: user.id, status: { not: 'terminated' } }, select: { id: true } }),
      db.lease.findFirst({ where: { tenantId: user.id, status: { in: ['active', 'pending_signature'] } }, select: { id: true } }),
    ]);

    // Build portals array — order matters (most-specific first)
    const portals: { role: string; label: string; reason: string }[] = [];
    if (contractorProfile) portals.push({ role: 'contractor', label: 'Contractor', reason: 'Manage jobs, invoices, crew' });
    if (landlord || user.role === 'admin' || user.role === 'superAdmin') portals.push({ role: 'admin', label: 'Property Manager', reason: 'Manage properties and tenants' });
    if (agent) portals.push({ role: 'agent', label: 'Real Estate Agent', reason: 'Manage listings and leads' });
    if (contractorEmployee || teamMember) portals.push({ role: 'employee', label: 'Employee', reason: 'Clock in, view paystubs' });
    if (tenantLease || user.role === 'tenant') portals.push({ role: 'tenant', label: 'Tenant', reason: 'Pay rent, request maintenance' });
    if (user.role === 'homeowner' && portals.length === 0) portals.push({ role: 'homeowner', label: 'Homeowner', reason: 'Find contractors, manage projects' });

    if (portals.length === 0) {
      portals.push({ role: user.role, label: user.role, reason: 'Your account' });
    }

    const secret = new TextEncoder().encode(
      process.env.MOBILE_JWT_SECRET || process.env.NEXTAUTH_SECRET || ''
    );

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
}
