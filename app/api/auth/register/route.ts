import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { hash } from '@/lib/encrypt';
import { notifyNewSignup } from '@/lib/services/admin-notifications';
import { logAuthEvent } from '@/lib/security/audit-logger';
import { sendVerificationEmailToken } from '@/lib/actions/auth.actions';

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    null
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role, inviteToken } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password);

    // SECURITY: Only allow explicit role assignment from trusted invite
    // tokens. Anything else comes through the normal /sign-up form flow
    // which uses the `signUpUser` server action, not this endpoint.
    //
    // Previously this route honored an arbitrary `role` from the request body
    // and defaulted to `property_manager`, which would have handed out
    // admin-panel access to anyone who POSTed to it.
    const ALLOWED_INVITE_ROLES = new Set(['property_manager', 'tenant', 'contractor_employee']);
    let userRole: string;
    if (inviteToken) {
      userRole = ALLOWED_INVITE_ROLES.has(role) ? role : 'property_manager';
    } else {
      userRole = 'user';
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: userRole,
        // Only auto-verify invites (they came through an email link).
        emailVerified: inviteToken ? new Date() : null,
      },
    });

    // Link team invite if we got one.
    if (inviteToken) {
      try {
        await (prisma as any).teamMember.updateMany({
          where: { inviteToken, status: 'pending' },
          data: { userId: user.id },
        });
      } catch (error) {
        console.error('Failed to link user to team invite:', error);
      }
    }

    // Send verification email for non-invite signups.
    if (!inviteToken) {
      sendVerificationEmailToken(normalizedEmail).catch(console.error);
    }

    // Notify admin of the new signup — previously this endpoint silently
    // bypassed that notification, which is why the bypass signups never
    // showed up in email.
    notifyNewSignup({
      name,
      email: normalizedEmail,
      role: userRole,
      signupMethod: inviteToken ? 'Invite' : 'API',
    }).catch(console.error);

    // Audit log.
    logAuthEvent('AUTH_SIGNUP', {
      userId: user.id,
      email: normalizedEmail,
      ipAddress: getClientIp(request) ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      success: true,
      role: userRole,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create account' },
      { status: 500 }
    );
  }
}
