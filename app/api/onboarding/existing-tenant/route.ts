import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';
import { NotificationService } from '@/lib/services/notification-service';
import { sendBrandedEmail } from '@/lib/services/email-service';

// Roles that cannot be changed through onboarding - these are privileged system roles
const PROTECTED_ROLES = ['superAdmin', 'admin'];

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has a protected role that cannot be changed via onboarding
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true, email: true },
    });

    if (currentUser && PROTECTED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { error: `Cannot change role for ${currentUser.role} accounts through onboarding` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { inviteCode, landlordEmail, skip } = body;

    // Update user role and onboarding status
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role: 'tenant',
        onboardingCompleted: true,
        onboardingStep: null,
      },
    });

    let landlordId: string | null = null;
    let signupMethod: string | null = null;
    let usedCode: string | null = null;
    let propertySlug: string | null = null;

    // Check for invite code first
    if (inviteCode && !skip) {
      const inviteCodeRecord = await prisma.landlordInviteCode.findFirst({
        where: {
          code: inviteCode,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          landlord: true,
          property: { select: { slug: true } },
        },
      });

      if (inviteCodeRecord) {
        // Check if max uses reached
        if (inviteCodeRecord.maxUses === null || inviteCodeRecord.usageCount < inviteCodeRecord.maxUses) {
          landlordId = inviteCodeRecord.landlordId;
          signupMethod = 'invite_code';
          usedCode = inviteCode;
          propertySlug = inviteCodeRecord.property?.slug ?? null;

          // Increment usage count
          await prisma.landlordInviteCode.update({
            where: { id: inviteCodeRecord.id },
            data: { usageCount: { increment: 1 } }
          });
        }
      }
    }

    // Check for landlord email if no invite code
    if (!landlordId && landlordEmail && !skip) {
      const landlord = await prisma.landlord.findFirst({
        where: {
          owner: {
            email: landlordEmail
          }
        },
        include: { owner: true }
      });

      if (landlord) {
        landlordId = landlord.id;
        signupMethod = 'email';
      }
    }

    // Create TenantLandlordLink if we found a landlord
    if (landlordId) {
      // Check if link already exists
      const existingLink = await prisma.tenantLandlordLink.findUnique({
        where: {
          tenantId_landlordId: {
            tenantId: session.user.id,
            landlordId
          }
        }
      });

      if (!existingLink) {
        await prisma.tenantLandlordLink.create({
          data: {
            tenantId: session.user.id,
            landlordId,
            signupMethod,
            inviteCode: usedCode,
            status: 'pending'
          }
        });

        // Get landlord details for notifications
        const landlord = await prisma.landlord.findUnique({
          where: { id: landlordId },
          include: { owner: true }
        });

        if (landlord?.owner) {
          const tenantName = currentUser?.name || 'A new tenant';
          const tenantEmail = currentUser?.email || '';
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

          // Send in-app notification
          await NotificationService.createNotification({
            userId: landlord.owner.id,
            type: 'application',
            title: 'New Tenant Signup',
            message: `${tenantName} signed up using your ${signupMethod === 'invite_code' ? `invite code (${usedCode})` : 'email'}. Assign them to a property to get started.`,
            actionUrl: '/admin/tenants?filter=unassigned'
          });

          // Send email notification
          try {
            await sendBrandedEmail({
              to: landlord.owner.email,
              subject: 'New Tenant Signup - Action Required',
              template: 'notification',
              data: {
                title: 'New Tenant Signup',
                message: `${tenantName} (${tenantEmail}) has signed up using your ${signupMethod === 'invite_code' ? `invite code ${usedCode}` : 'email address'}.`,
                actionText: 'View Unassigned Tenants',
                actionUrl: `${baseUrl}/admin/tenants?filter=unassigned`,
                additionalInfo: 'To get them started, assign them to a property and unit, then generate their lease.'
              },
              landlordId
            });
          } catch (emailError) {
            console.error('Failed to send landlord notification email:', emailError);
            // Don't fail the request if email fails
          }
        }
      }
    }

    return NextResponse.json({ success: true, linkedToLandlord: !!landlordId, propertySlug });
  } catch (error) {
    console.error('Existing tenant onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
