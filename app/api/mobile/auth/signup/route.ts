/**
 * POST /api/mobile/auth/signup
 *
 * Mobile native sign-up. Mirrors the web `signUpUser` server action but
 * returns a JWT for mobile session storage instead of using NextAuth cookies.
 *
 * Body:
 *   { name, email, phoneNumber, password }
 *
 * Returns 201 on success with `{ token, user, portals }` so the
 * mobile app can store the token in SecureStore and route the user straight
 * into their dashboard.
 */

import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

import { hash } from '@/lib/encrypt';
import { prisma } from '@/db/prisma';
import { logAuthEvent } from '@/lib/security/audit-logger';
import { requestContextFromRequest } from '@/lib/security/request-context';
import { sendVerificationEmailToken } from '@/lib/actions/auth.actions';

const PHONE_REGEX = /^(\+1|1)?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phoneNumber = String(body.phoneNumber ?? '').trim();
    const password = String(body.password ?? '');
    // NOTE: We intentionally IGNORE any `role` field from the client body.
    // Role must be determined server-side (via beta code or onboarding flow)
    // to prevent privilege escalation. The only exception is property
    // applicants where role is inferred from context, not from user input.

    if (name.length < 3) return bad('Name must be at least 3 characters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Invalid email');
    if (!PHONE_REGEX.test(phoneNumber)) return bad('Invalid phone number');
    if (password.length < 6) return bad('Password must be at least 6 characters');

    // Email collision check
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return bad('An account with that email already exists', 409);

    let role = 'user';

    const hashedPassword = await hash(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        role,
        // Beta testers + property applicants skip onboarding. Anyone else
        // — including users who declared a role — lands in their portal
        // (no subscription redirect for tenant / homeowner / agent;
        // landlord and contractor still see their respective subscription
        // pages from the navigator).
        onboardingCompleted: false,
      },
      select: {
        id: true, email: true, name: true, role: true, image: true,
      },
    });

    sendVerificationEmailToken(email).catch(console.error);
    {
      const ctx = requestContextFromRequest(req);
      logAuthEvent('AUTH_SIGNUP', {
        userId: user.id,
        email,
        role,
        success: true,
        ipAddress: ctx.ipAddress ?? undefined,
        userAgent: ctx.userAgent ?? undefined,
      }).catch(console.error);
    }

    // Mint a mobile JWT (same shape as the login route)
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'fallback-dev-secret',
    );
    const token = await new SignJWT({
      userId: user.id,
      role: user.role,
      email: user.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);

    // Build portals — for fresh signups it's just the one matching their role
    const portals: { role: string; label: string; reason: string }[] = [];
    if (role === 'landlord' || role === 'admin' || role === 'property_manager') {
      portals.push({ role: 'admin', label: 'Property Manager', reason: 'Manage properties' });
    } else if (role === 'contractor') {
      portals.push({ role: 'contractor', label: 'Contractor', reason: 'Manage jobs and crew' });
    } else if (role === 'tenant') {
      portals.push({ role: 'tenant', label: 'Tenant', reason: 'Pay rent, request maintenance' });
    } else if (role === 'homeowner') {
      portals.push({ role: 'homeowner', label: 'Homeowner', reason: 'Hire contractors' });
    } else if (role === 'agent') {
      portals.push({ role: 'agent', label: 'Real Estate Agent', reason: 'Manage listings' });
    } else {
      portals.push({ role: role || 'user', label: 'Account', reason: 'Your dashboard' });
    }

    return NextResponse.json(
      {
        token,
        user,
        portals,
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error('[mobile signup]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
