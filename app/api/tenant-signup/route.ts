import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { hash } from '@/lib/encrypt';
import { signUpFormSchema } from '@/lib/validators';
import { sendVerificationEmailToken } from '@/lib/actions/auth.actions';
import { notifyNewSignup } from '@/lib/services/admin-notifications';
import { logAuthEvent } from '@/lib/security/audit-logger';
import { requestContextFromHeaders } from '@/lib/security/request-context';

/**
 * POST /api/tenant-signup
 *
 * Handles the tenant landing page sign-up flow. Creates the user, links them
 * to a landlord (via invite code, email, or phone), stores their rental
 * address as a preference, then returns a success/error JSON response.
 *
 * Unlike the form-action flow (/api/auth sign-in), this does not auto-sign-in
 * the user — the client redirects them to /sign-in after success so they can
 * verify their email first.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Validate core sign-up fields
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
    // signUpFormSchema already lowercases+trims via .transform(), but be
    // explicit here so this route is safe even if the schema ever changes.
    const email = parsed.data.email.toLowerCase().trim();

    // Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      );
    }

    // Normalize phone
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    const normalizedPhone =
      phoneDigits.length === 10
        ? `+1${phoneDigits}`
        : phoneDigits.length === 11 && phoneDigits.startsWith('1')
        ? `+${phoneDigits}`
        : `+${phoneDigits}`;

    const hashedPassword = await hash(password);

    // Create user as tenant
    const createdUser = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber: normalizedPhone,
        password: hashedPassword,
        role: 'tenant',
        onboardingCompleted: true,
        // Store rental address preference in address JSON field
        address: body.rentalAddress
          ? { rentalAddress: body.rentalAddress }
          : undefined,
      },
    });

    // ── Landlord linking ─────────────────────────────────────────────────────

    let landlordId: string | null = null;
    let signupMethod: string | null = null;
    let usedCode: string | null = null;
    let propertySlug: string | null = null;

    // 1. Invite code (highest priority)
    if (body.inviteCode) {
      const codeRecord = await prisma.landlordInviteCode.findFirst({
        where: {
          code: (body.inviteCode as string).toUpperCase(),
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: { property: { select: { slug: true } } },
      });

      if (codeRecord && (codeRecord.maxUses === null || codeRecord.usageCount < codeRecord.maxUses)) {
        landlordId = codeRecord.landlordId;
        signupMethod = 'invite_code';
        usedCode = body.inviteCode;
        propertySlug = codeRecord.property?.slug ?? null;

        await prisma.landlordInviteCode.update({
          where: { id: codeRecord.id },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    // 2. Landlord email
    if (!landlordId && body.landlordEmail) {
      const landlord = await prisma.landlord.findFirst({
        where: { owner: { email: { equals: body.landlordEmail, mode: 'insensitive' } } },
        select: { id: true },
      });
      if (landlord) {
        landlordId = landlord.id;
        signupMethod = 'email';
      }
    }

    // 3. Landlord phone
    if (!landlordId && body.landlordPhone) {
      const phoneD = (body.landlordPhone as string).replace(/\D/g, '');
      const e164 =
        phoneD.length === 10 ? `+1${phoneD}` : phoneD.startsWith('1') ? `+${phoneD}` : `+${phoneD}`;
      const landlord = await prisma.landlord.findFirst({
        where: { owner: { phoneNumber: { in: [phoneD, e164, body.landlordPhone] } } },
        select: { id: true },
      });
      if (landlord) {
        landlordId = landlord.id;
        signupMethod = 'phone';
      }
    }

    // Create TenantLandlordLink if we resolved a landlord
    if (landlordId) {
      const linkExists = await prisma.tenantLandlordLink.findUnique({
        where: { tenantId_landlordId: { tenantId: createdUser.id, landlordId } },
      });

      if (!linkExists) {
        await prisma.tenantLandlordLink.create({
          data: {
            tenantId: createdUser.id,
            landlordId,
            signupMethod,
            inviteCode: usedCode,
            status: 'pending',
          },
        });
      }

      // Notify landlord
      try {
        const { NotificationService } = await import('@/lib/services/notification-service');
        const { sendBrandedEmail } = await import('@/lib/services/email-service');
        const landlordRecord = await prisma.landlord.findUnique({
          where: { id: landlordId },
          include: { owner: true },
        });
        if (landlordRecord?.owner) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          await NotificationService.createNotification({
            userId: landlordRecord.owner.id,
            type: 'application',
            title: 'New Tenant Signup',
            message: `${name} signed up using your ${signupMethod === 'invite_code' ? `invite code (${usedCode})` : signupMethod}. Assign them to a property to get started.`,
            actionUrl: '/admin/tenants?filter=unassigned',
          });
          await sendBrandedEmail({
            to: landlordRecord.owner.email,
            subject: 'New Tenant Signup — Action Required',
            template: 'notification',
            data: {
              title: 'New Tenant Signup',
              message: `${name} (${email}) signed up via your ${signupMethod === 'invite_code' ? `invite code ${usedCode}` : signupMethod}.${body.rentalAddress ? ` Their rental address: ${body.rentalAddress}` : ''}`,
              actionText: 'View Unassigned Tenants',
              actionUrl: `${baseUrl}/admin/tenants?filter=unassigned`,
              additionalInfo: 'Assign them to a property and unit, then generate their lease.',
            },
            landlordId,
          }).catch(console.error);
        }
      } catch (notifyErr) {
        console.error('Landlord notification failed (non-fatal):', notifyErr);
      }
    }

    // ── Housekeeping ──────────────────────────────────────────────────────────

    notifyNewSignup({ name, email, role: 'tenant', signupMethod: 'Email' }).catch(console.error);
    sendVerificationEmailToken(email).catch(console.error);

    const ctx = await requestContextFromHeaders();
    logAuthEvent('AUTH_SIGNUP', {
      userId: createdUser.id,
      email,
      role: 'tenant',
      success: true,
      ipAddress: ctx.ipAddress ?? undefined,
      userAgent: ctx.userAgent ?? undefined,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      linkedToLandlord: !!landlordId,
      propertySlug,
    });
  } catch (error) {
    console.error('Tenant signup error:', error);
    const msg =
      error instanceof Error && error.message.includes('Unique constraint')
        ? 'An account with this email already exists.'
        : 'Signup failed. Please try again.';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
