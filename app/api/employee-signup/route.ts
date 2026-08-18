/**
 * POST /api/employee-signup
 *
 * Combined signup + invite acceptance for contractor employees.
 * Creates the user account, links it to the ContractorEmployee record
 * via the invite token, and activates them.
 *
 * Body: { name, email, phoneNumber, password, confirmPassword, inviteToken }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { hash } from '@/lib/encrypt';
import { signUpFormSchema } from '@/lib/validators';
import { sendVerificationEmailToken } from '@/lib/actions/auth.actions';
import { logAuthEvent } from '@/lib/security/audit-logger';
import { requestContextFromHeaders } from '@/lib/security/request-context';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Validate invite token first
    const inviteToken = body.inviteToken?.trim();
    if (!inviteToken) {
      return NextResponse.json({ success: false, message: 'Invite code is required.' }, { status: 400 });
    }

    // Find the employee record by invite token
    const employee = await prisma.contractorEmployee.findFirst({
      where: {
        inviteToken,
        status: { in: ['invited', 'inactive'] },
      },
      include: {
        contractor: {
          select: { id: true, businessName: true },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Invite code not found or already used. Ask your employer to resend.' }, { status: 404 });
    }

    // Check expiry
    if (employee.inviteExpiry && new Date() > employee.inviteExpiry) {
      return NextResponse.json({ success: false, message: 'This invite has expired. Ask your employer to send a new one.' }, { status: 410 });
    }

    // Validate signup fields
    const parsed = signUpFormSchema.safeParse({
      name: body.name,
      email: body.email,
      phoneNumber: body.phoneNumber,
      password: body.password,
      confirmPassword: body.confirmPassword,
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || 'Invalid input';
      return NextResponse.json({ success: false, message: firstError }, { status: 400 });
    }

    const { name, phoneNumber, password } = parsed.data;
    const email = parsed.data.email.toLowerCase().trim();

    // Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists. Please sign in and then accept your invite from the dashboard.' },
        { status: 409 }
      );
    }

    // Email match guard — if the invite was sent to a specific email, enforce it
    if (employee.email) {
      const inviteEmail = employee.email.trim().toLowerCase();
      if (inviteEmail !== email) {
        return NextResponse.json(
          { success: false, message: `This invite was sent to ${employee.email}. Please sign up with that email address.` },
          { status: 403 }
        );
      }
    }

    // Normalize phone
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    const normalizedPhone = phoneDigits.length === 10 ? `+1${phoneDigits}` : phoneDigits.length === 11 && phoneDigits.startsWith('1') ? `+${phoneDigits}` : `+${phoneDigits}`;

    const hashedPassword = await hash(password);

    // Create user account
    const createdUser = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber: normalizedPhone,
        password: hashedPassword,
        role: 'contractor_employee',
        onboardingCompleted: true,
      },
    });

    // Link user to the ContractorEmployee record and activate
    await prisma.contractorEmployee.update({
      where: { id: employee.id },
      data: {
        userId: createdUser.id,
        status: 'active',
        inviteToken: null,
        inviteExpiry: null,
        onboardedAt: new Date(),
        firstName: name.split(' ')[0] || '',
        lastName: name.split(' ').slice(1).join(' ') || '',
        email,
        phone: normalizedPhone,
      },
    });

    // Notify the contractor that their employee has joined
    try {
      const contractorProfile = await prisma.contractorProfile.findUnique({
        where: { id: employee.contractorId },
        select: { userId: true },
      });

      if (contractorProfile?.userId) {
        await (prisma as any).notification.create({
          data: {
            userId: contractorProfile.userId,
            type: 'reminder',
            title: `${name} joined your team`,
            message: `${name} accepted your invite and is now active. You can assign them to jobs from the Team page.`,
            actionUrl: '/contractor-dashboard/team',
          },
        });
      }
    } catch (notifyErr) {
      console.error('Contractor notification failed (non-fatal):', notifyErr);
    }

    // Send verification email
    sendVerificationEmailToken(email).catch(console.error);

    // Audit log
    const ctx = await requestContextFromHeaders();
    logAuthEvent('AUTH_SIGNUP', {
      userId: createdUser.id,
      email,
      role: 'contractor_employee',
      success: true,
      ipAddress: ctx.ipAddress ?? undefined,
      userAgent: ctx.userAgent ?? undefined,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      companyName: employee.contractor.businessName || '',
      contractorId: employee.contractor.id,
    });
  } catch (error) {
    console.error('Employee signup error:', error);
    const msg = error instanceof Error && error.message.includes('Unique constraint')
      ? 'An account with this email already exists.'
      : 'Signup failed. Please try again.';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
