'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { formatError } from '../utils';
import { getOrCreateCurrentLandlord } from './landlord.actions';
import { checkFeatureAccess } from './subscription.actions';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { APP_NAME } from '@/lib/constants';
import {
  TeamMemberRole,
  TeamPermission,
  LEGACY_ROLE_MAP,
  PERMISSION_DEFINITIONS,
  ROLE_DEFINITIONS,
  DEFAULT_PERMISSIONS,
} from '@/lib/types/team.types';

// Re-export types for consumers that import from this file
export type { TeamMemberRole, TeamPermission } from '@/lib/types/team.types';

/**
 * Get roles available for a subscription tier
 */
export async function getRolesForTier(tier: 'starter' | 'pro' | 'enterprise'): Promise<TeamMemberRole[]> {
  if (tier === 'starter') return []; // No team management on starter
  
  const proRoles: TeamMemberRole[] = ['admin', 'property_manager', 'leasing_agent', 'showing_agent'];
  const enterpriseRoles: TeamMemberRole[] = ['maintenance_tech', 'accountant', 'employee'];
  
  if (tier === 'enterprise') {
    return [...proRoles, ...enterpriseRoles];
  }
  
  return proRoles;
}

/**
 * Get default permissions for a role
 */
export async function getDefaultPermissionsForRole(role: TeamMemberRole): Promise<TeamPermission[]> {
  return [...DEFAULT_PERMISSIONS[role]];
}

/**
 * Normalize legacy role names to current role names
 */
export async function normalizeRole(role: string): Promise<TeamMemberRole> {
  if (LEGACY_ROLE_MAP[role]) {
    return LEGACY_ROLE_MAP[role];
  }
  if (Object.keys(ROLE_DEFINITIONS).includes(role)) {
    return role as TeamMemberRole;
  }
  return 'employee'; // Default fallback
}

// Type-safe prisma access for models that may not exist yet
const teamMemberModel = () => (prisma as any).teamMember;

// Get invite details by token (for showing invite info before accepting)
export async function getTeamInviteByToken(token: string) {
  try {
    const member = await teamMemberModel()?.findUnique?.({
      where: { inviteToken: token },
    });

    if (!member) {
      return { success: false, message: 'Invalid invitation' };
    }

    if (member.status !== 'pending') {
      return { success: false, message: 'This invitation has already been used' };
    }

    if (member.inviteExpires && member.inviteExpires < new Date()) {
      return { success: false, message: 'This invitation has expired' };
    }

    // Get landlord info
    const landlord = await prisma.landlord.findUnique({
      where: { id: member.landlordId },
      select: { id: true, name: true, companyName: true },
    });

    return {
      success: true,
      invite: {
        id: member.id,
        email: member.invitedEmail,
        role: member.role,
        landlordId: member.landlordId,
        landlordName: landlord?.companyName || landlord?.name || 'Property Management Company',
        expiresAt: member.inviteExpires,
      },
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

async function sendTeamInviteSMS(params: {
  phone: string;
  inviteToken: string;
  landlordName: string;
  role: string;
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) {
    throw new Error('Twilio credentials not configured.');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SERVER_URL || 'http://localhost:3000';
  const acceptUrl = `${baseUrl}/team/invite?token=${encodeURIComponent(params.inviteToken)}`;

  const twilio = require('twilio')(accountSid, authToken);
  await twilio.messages.create({
    body: `${params.landlordName} has invited you to join their property management team as ${params.role}. Accept here: ${acceptUrl}`,
    from: fromPhone,
    to: params.phone,
  });
}

async function sendTeamInviteEmail(params: {
  email: string;
  inviteToken: string;
  landlordName: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const resend = new Resend(resendApiKey);
  const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SERVER_URL || 'http://localhost:3000';
  const acceptUrl = `${baseUrl}/team/invite?token=${encodeURIComponent(params.inviteToken)}`;

  const subject = `${params.landlordName} invited you to join their team`;

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="margin-bottom: 0.5rem; color: #1e293b;">You have been invited to join a team</h2>
      <p style="color: #475569;">${params.landlordName} is using ${APP_NAME} to manage properties and wants you to join their team.</p>
      <p style="margin: 1.5rem 0;">
        <a
          href="${acceptUrl}"
          style="display: inline-block; padding: 0.75rem 1.5rem; background: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 600;"
        >
          Accept Invite
        </a>
      </p>
      <p style="color: #64748b;">If the button does not work, copy and paste this link into your browser:</p>
      <p style="font-size: 12px; color: #4b5563; word-break: break-all;">${acceptUrl}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
      <p style="font-size: 12px; color: #94a3b8;">This invite expires in 7 days.</p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: `${APP_NAME} <${senderEmail}>`,
    to: params.email,
    subject,
    html,
  });

  if (error) {
    console.error('Resend email error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function getTeamMembers() {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    // Check if team management is available
    const featureCheck = await checkFeatureAccess(landlordResult.landlord.id, 'teamManagement');
    if (!featureCheck.allowed) {
      return { 
        success: false, 
        message: featureCheck.reason,
        featureLocked: true,
        upgradeTier: featureCheck.upgradeTier,
      };
    }

    // Note: TeamMember model needs to be created via Prisma migration
    let members: any[] = [];
    try {
      members = await teamMemberModel()?.findMany?.({
        where: { landlordId: landlordResult.landlord.id },
        orderBy: { createdAt: 'asc' },
      }) || [];
    } catch {
      // Model doesn't exist yet
      return { success: true, members: [] };
    }

    // Get user details for active members
    const userIds = members.filter((m: any) => m.status === 'active').map((m: any) => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, image: true },
    });

    const membersWithUsers = members.map((member: any) => {
      const user = users.find(u => u.id === member.userId);
      return {
        ...member,
        user: user || null,
      };
    });

    return { success: true, members: membersWithUsers };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function inviteTeamMember(
  email: string,
  role: TeamMemberRole = 'employee',
  phone?: string,
  options?: { sendEmail?: boolean },
) {
  // Default to sending email — keeps backwards compatibility with callers
  // that don't pass an options object. Pass `{ sendEmail: false }` from the
  // dialog when the PM only wants the QR / link.
  const sendEmail = options?.sendEmail ?? true;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    // Check if team management is available
    const featureCheck = await checkFeatureAccess(landlordResult.landlord.id, 'teamManagement');
    if (!featureCheck.allowed) {
      return { 
        success: false, 
        message: featureCheck.reason,
        featureLocked: true,
        upgradeTier: featureCheck.upgradeTier,
      };
    }

    // Check if user already exists in the system
    const existingUser = await prisma.user.findUnique({ where: { email } });

    // Check team member limit based on subscription tier
    const landlord = await prisma.landlord.findUnique({
      where: { id: landlordResult.landlord.id },
      select: { subscriptionTier: true },
    });
    
    const isEnterprise = landlord?.subscriptionTier === 'enterprise';
    const isPro = landlord?.subscriptionTier === 'pro' || landlord?.subscriptionTier === 'professional';
    const currentTier = isEnterprise ? 'enterprise' : isPro ? 'pro' : 'starter';
    
    // Validate role is available for this tier
    const availableRoles = await getRolesForTier(currentTier);
    const normalizedRole = await normalizeRole(role);
    
    if (normalizedRole !== 'owner' && !availableRoles.includes(normalizedRole)) {
      const roleDefinition = ROLE_DEFINITIONS[normalizedRole];
      return {
        success: false,
        message: `The ${roleDefinition.label} role requires an ${roleDefinition.tier === 'enterprise' ? 'Enterprise' : 'Pro'} subscription.`,
        featureLocked: true,
        upgradeTier: roleDefinition.tier,
      };
    }
    
    // Pro: 5 team members + owner (6 total), Enterprise: unlimited
    const maxMembers = isEnterprise ? Infinity : 6;

    try {
      const activeCount =
        (await teamMemberModel()?.count?.({
          where: { landlordId: landlordResult.landlord.id, status: 'active' },
        })) || 0;
      if (activeCount >= maxMembers) {
        return { 
          success: false, 
          message: isEnterprise 
            ? 'Unable to add more team members at this time.' 
            : `Team limit reached. Pro plan allows up to 5 team members plus the owner (${maxMembers} total). Upgrade to Enterprise for unlimited team members.` 
        };
      }
    } catch {
      // If model missing, invite flow already fails later.
    }
    
    // Check if already a team member (by email, not just userId)
    try {
      // First check by invited email (for pending invites)
      const existingByEmail = await teamMemberModel()?.findFirst?.({
        where: {
          landlordId: landlordResult.landlord.id,
          invitedEmail: email,
        },
      });

      if (existingByEmail) {
        if (existingByEmail.status === 'pending') {
          return { success: false, message: 'An invitation has already been sent to this email address' };
        }
        if (existingByEmail.status === 'active') {
          return { success: false, message: 'This user is already an active team member' };
        }
      }

      // Also check by userId if user exists
      if (existingUser) {
        const existingByUserId = await teamMemberModel()?.findFirst?.({
          where: {
            landlordId: landlordResult.landlord.id,
            userId: existingUser.id,
            status: 'active',
          },
        });

        if (existingByUserId) {
          return { success: false, message: 'This user is already an active team member' };
        }
      }
    } catch {
      // Model doesn't exist yet, continue
    }

    // Generate invite token
    const inviteToken = randomUUID();
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Get default permissions for the role
    const defaultPermissions = await getDefaultPermissionsForRole(normalizedRole);

    // Create pending team member
    // userId is null for users not in the system yet
    let member;
    try {
      member = await teamMemberModel()?.create?.({
        data: {
          landlordId: landlordResult.landlord.id,
          userId: existingUser?.id ?? null,
          role: normalizedRole,
          permissions: defaultPermissions,
          invitedEmail: email,
          inviteToken,
          inviteExpires,
          status: 'pending',
        },
      });
    } catch (createError: any) {
      // Handle unique constraint violation (user already exists as team member)
      if (createError?.code === 'P2002') {
        return { success: false, message: 'This user is already a team member or has a pending invite' };
      }
      console.error('Team member create error:', createError);
      return { success: false, message: 'Failed to create team invite. Please try again.' };
    }

    // If user exists in the system, create internal notification
    let notificationSent = false;
    if (existingUser) {
      try {
        // Import notification service dynamically to avoid circular deps
        const { NotificationService } = await import('@/lib/services/notification-service');
        
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SERVER_URL || 'http://localhost:3000';
        const acceptUrl = `${baseUrl}/team/invite?token=${encodeURIComponent(inviteToken)}`;
        
        await NotificationService.createNotification({
          userId: existingUser.id,
          type: 'message',
          title: 'Team Invitation',
          message: `${landlordResult.landlord.name || 'Your landlord'} has invited you to join their property management team as a ${role}.`,
          actionUrl: acceptUrl,
          landlordId: landlordResult.landlord.id,
        });
        notificationSent = true;
      } catch (notifError) {
        console.error('Failed to create internal notification:', notifError);
      }
    }

    // Try to send email (required for new users, optional for existing users)
    let emailSent = false;
    let emailError = null;
    if (sendEmail) {
      try {
        await sendTeamInviteEmail({
          email,
          inviteToken,
          landlordName: landlordResult.landlord.name || 'Property Manager',
        });
        emailSent = true;
      } catch (error: any) {
        emailError = error.message || 'Failed to send email';
        console.error('Email send error:', emailError);
      }
    }

    // SMS invite — uncomment when Twilio account is active
    // let smsSent = false;
    // if (phone) {
    //   try {
    //     await sendTeamInviteSMS({
    //       phone,
    //       inviteToken,
    //       landlordName: landlordResult.landlord.name || 'Property Manager',
    //       role: normalizedRole,
    //     });
    //     smsSent = true;
    //   } catch (smsError: any) {
    //     console.error('SMS send error:', smsError.message);
    //   }
    // }
    const smsSent = false;

    // If user doesn't exist and neither email nor SMS succeeded, fail the
    // invite — unless the PM explicitly opted out of email, in which case
    // we trust them to share the QR/link manually.
    if (!existingUser && !emailSent && !smsSent && sendEmail) {
      // Delete the pending member since we can't notify them
      try {
        await teamMemberModel()?.delete?.({ where: { id: member.id } });
      } catch {}
      return { 
        success: false, 
        message: `Could not send invitation: ${emailError}. The user doesn't have an account, so email or SMS is required.` 
      };
    }

    // Build success message
    let successMessage = 'Invitation sent successfully';
    if (!sendEmail) {
      successMessage = 'Invite link ready — share the QR code or link with your invitee.';
    } else if (existingUser) {
      if (notificationSent && emailSent) {
        successMessage = 'Invitation sent via email and in-app notification';
      } else if (notificationSent) {
        successMessage = 'In-app notification sent (email delivery failed, but user can accept via their notifications)';
      } else if (emailSent) {
        successMessage = 'Email invitation sent';
      }
    }

    return { 
      success: true, 
      message: successMessage,
      member,
      emailSent,
      notificationSent,
      inviteToken,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/**
 * Generate an open team invite (no email required) for job-site QR code use.
 * Anyone who scans can join with the specified role.
 */
export async function generateOpenTeamInvite(role: TeamMemberRole) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    const featureCheck = await checkFeatureAccess(landlordResult.landlord.id, 'teamManagement');
    if (!featureCheck.allowed) {
      return { success: false, message: featureCheck.reason, featureLocked: true };
    }

    const normalizedRole = await normalizeRole(role);
    const defaultPermissions = await getDefaultPermissionsForRole(normalizedRole);
    const inviteToken = randomUUID();
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    let member;
    try {
      member = await teamMemberModel()?.create?.({
        data: {
          landlordId: landlordResult.landlord.id,
          userId: null,
          role: normalizedRole,
          permissions: defaultPermissions,
          invitedEmail: null,
          inviteToken,
          inviteExpires,
          status: 'pending',
        },
      });
    } catch (err: any) {
      console.error('Open invite create error:', err);
      return { success: false, message: 'Failed to generate invite. Please try again.' };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SERVER_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/team/invite?token=${encodeURIComponent(inviteToken)}`;

    return {
      success: true,
      inviteToken,
      inviteUrl,
      role: normalizedRole,
      expiresAt: inviteExpires,
      member,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function acceptTeamInvite(inviteToken: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    let member;
    try {
      member = await teamMemberModel()?.findUnique?.({
        where: { inviteToken },
      });
    } catch {
      return { success: false, message: 'Team management requires database migration' };
    }

    if (!member) {
      return { success: false, message: 'Invalid invitation' };
    }

    if (member.status !== 'pending') {
      return { success: false, message: 'This invitation has already been used' };
    }

    if (member.inviteExpires && member.inviteExpires < new Date()) {
      return { success: false, message: 'This invitation has expired' };
    }

    if (member.invitedEmail && session.user.email) {
      const invitedEmail = member.invitedEmail.trim().toLowerCase();
      const userEmail = session.user.email.trim().toLowerCase();
      
      if (invitedEmail !== userEmail) {
        return { success: false, message: `This invite was sent to ${member.invitedEmail}. Please sign in with that email address to accept.` };
      }
    }

    // Check if user already has an active membership on this team
    const existingMembership = await teamMemberModel()?.findFirst?.({
      where: {
        landlordId: member.landlordId,
        userId: session.user.id,
        status: 'active',
      },
    });

    if (existingMembership) {
      return { success: true, message: 'You are already on this team' };
    }

    // Check team member limit based on subscription tier
    const landlord = await prisma.landlord.findUnique({
      where: { id: member.landlordId },
      select: { subscriptionTier: true },
    });
    
    const isEnterprise = landlord?.subscriptionTier === 'enterprise';
    const isPro = landlord?.subscriptionTier === 'pro' || landlord?.subscriptionTier === 'professional';
    
    if (!isEnterprise) {
      const activeCount =
        (await teamMemberModel()?.count?.({
          where: { landlordId: member.landlordId, status: 'active' },
        })) || 0;
      const maxMembers = 6; // Pro: 5 members + owner
      if (activeCount >= maxMembers) {
        return { success: false, message: `This team is already at the ${maxMembers}-member limit (5 team members + owner). The team owner needs to upgrade to Enterprise for unlimited members.` };
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, email: true },
    });

    // Defensive: the JWT could be carrying a `sub` for a user that no
    // longer exists in the DB (deleted account, environment switch, etc.).
    // Without this guard, the `teamMember.update` below would crash with a
    // TeamMember_userId_fkey foreign-key violation, which is exactly the
    // error users were seeing when they scanned the QR while signed in
    // with a stale session.
    if (!currentUser) {
      return {
        success: false,
        message: 'Your account could not be found. Please sign out and sign in again, then re-scan the invite.',
      };
    }

    const allowedRoles = ['admin', 'superAdmin', 'landlord', 'property_manager'];
    if (currentUser.role && !allowedRoles.includes(currentUser.role)) {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { role: 'property_manager' },
      });
    }

    await teamMemberModel()?.update?.({
      where: { id: member.id },
      data: {
        userId: currentUser.id,
        status: 'active',
        joinedAt: new Date(),
        inviteToken: null,
        inviteExpires: null,
      },
    });

    return { success: true, message: 'You have joined the team' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateTeamMemberRole(memberId: string, role: TeamMemberRole, keepCustomPermissions: boolean = false) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    // Check if current user is the landlord owner (account creator)
    const isLandlordOwner = landlordResult.landlord.ownerUserId === session.user.id;

    // Check if current user has permission to manage team via team membership
    const currentUserMember = await teamMemberModel()?.findFirst?.({
      where: {
        userId: session.user.id,
        landlordId: landlordResult.landlord.id,
        status: 'active',
      },
    });

    // Only landlord owner, team owner, admin, or property_manager can manage team roles
    const canManageRoles = isLandlordOwner ||
                          currentUserMember?.role === 'owner' || 
                          currentUserMember?.role === 'admin' ||
                          (currentUserMember?.role === 'property_manager' && currentUserMember?.permissions?.includes('manage_team'));

    if (!canManageRoles) {
      return { success: false, message: 'You do not have permission to manage team roles' };
    }

    // Check subscription tier for role availability
    const landlord = await prisma.landlord.findUnique({
      where: { id: landlordResult.landlord.id },
      select: { subscriptionTier: true },
    });
    
    const isEnterprise = landlord?.subscriptionTier === 'enterprise';
    const isPro = landlord?.subscriptionTier === 'pro' || landlord?.subscriptionTier === 'professional';
    const currentTier = isEnterprise ? 'enterprise' : isPro ? 'pro' : 'starter';
    
    // Validate role is available for this tier
    const normalizedRole = await normalizeRole(role);
    const availableRoles = await getRolesForTier(currentTier);
    
    if (normalizedRole !== 'owner' && !availableRoles.includes(normalizedRole)) {
      const roleDefinition = ROLE_DEFINITIONS[normalizedRole];
      return {
        success: false,
        message: `The ${roleDefinition.label} role requires an ${roleDefinition.tier === 'enterprise' ? 'Enterprise' : 'Pro'} subscription.`,
        featureLocked: true,
        upgradeTier: roleDefinition.tier,
      };
    }

    let member;
    try {
      member = await teamMemberModel()?.findFirst?.({
        where: { id: memberId, landlordId: landlordResult.landlord.id },
      });
    } catch {
      return { success: false, message: 'Team management requires database migration' };
    }

    if (!member) {
      return { success: false, message: 'Team member not found' };
    }

    if (member.role === 'owner') {
      return { success: false, message: 'Cannot change the owner role' };
    }

    // Determine new permissions
    let newPermissions: TeamPermission[];
    if (keepCustomPermissions && member.permissions?.length > 0) {
      // Keep existing custom permissions but ensure they're valid
      const validPermissions = Object.keys(PERMISSION_DEFINITIONS) as TeamPermission[];
      newPermissions = member.permissions.filter((p: string) => validPermissions.includes(p as TeamPermission));
    } else {
      // Reset to default permissions for the new role
      newPermissions = await getDefaultPermissionsForRole(normalizedRole);
    }

    await teamMemberModel()?.update?.({
      where: { id: memberId },
      data: {
        role: normalizedRole,
        permissions: newPermissions,
      },
    });

    return { 
      success: true, 
      message: 'Role updated successfully',
      newRole: normalizedRole,
      newPermissions,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function removeTeamMember(memberId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    // Check if current user is the landlord owner (account creator)
    const isLandlordOwner = landlordResult.landlord.ownerUserId === session.user.id;

    // Check if current user is the owner or has manage_team permission
    const currentUserMember = await teamMemberModel()?.findFirst?.({
      where: {
        userId: session.user.id,
        landlordId: landlordResult.landlord.id,
        status: 'active',
      },
    });

    const canRemoveMembers = isLandlordOwner ||
                             currentUserMember?.role === 'owner' ||
                             currentUserMember?.permissions?.includes('manage_team');

    if (!canRemoveMembers) {
      return { success: false, message: 'Only the account owner can remove team members' };
    }

    let member;
    try {
      member = await teamMemberModel()?.findFirst?.({
        where: { id: memberId, landlordId: landlordResult.landlord.id },
      });
    } catch {
      return { success: false, message: 'Team management requires database migration' };
    }

    if (!member) {
      return { success: false, message: 'Team member not found' };
    }

    if (member.role === 'owner') {
      return { success: false, message: 'Cannot remove the owner' };
    }

    await teamMemberModel()?.delete?.({ where: { id: memberId } });

    return { success: true, message: 'Team member removed' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}


export async function clearPendingInvites() {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    try {
      const result = await teamMemberModel()?.deleteMany?.({
        where: {
          landlordId: landlordResult.landlord.id,
          status: 'pending',
        },
      });

      const count = result?.count || 0;
      return { 
        success: true, 
        message: count > 0 
          ? `Cleared ${count} pending invite${count > 1 ? 's' : ''}` 
          : 'No pending invites to clear'
      };
    } catch {
      return { success: false, message: 'Team management requires database migration' };
    }
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateTeamMemberPermissions(memberId: string, permissions: TeamPermission[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    // Check if current user is the landlord owner (account creator)
    const isLandlordOwner = landlordResult.landlord.ownerUserId === session.user.id;

    // Check if current user has permission to manage team
    const currentUserMember = await teamMemberModel()?.findFirst?.({
      where: {
        userId: session.user.id,
        landlordId: landlordResult.landlord.id,
        status: 'active',
      },
    });

    // Only landlord owner, team owner, admin, or property_manager with manage_team permission can customize permissions
    const canManagePermissions = isLandlordOwner ||
                                 currentUserMember?.role === 'owner' || 
                                 currentUserMember?.role === 'admin' ||
                                 (currentUserMember?.role === 'property_manager' && currentUserMember?.permissions?.includes('manage_team'));

    if (!canManagePermissions) {
      return { success: false, message: 'You do not have permission to manage team permissions' };
    }

    let member;
    try {
      member = await teamMemberModel()?.findFirst?.({
        where: { id: memberId, landlordId: landlordResult.landlord.id },
      });
    } catch {
      return { success: false, message: 'Team management requires database migration' };
    }

    if (!member) {
      return { success: false, message: 'Team member not found' };
    }

    if (member.role === 'owner') {
      return { success: false, message: 'Cannot change owner permissions - owner always has full access' };
    }

    // Check if this role allows permission customization
    const roleDefinition = ROLE_DEFINITIONS[member.role as TeamMemberRole];
    if (!roleDefinition?.canCustomizePermissions) {
      return { success: false, message: `Permissions cannot be customized for the ${roleDefinition?.label || member.role} role` };
    }

    // Validate permissions - only allow valid permission keys
    const validPermissions = Object.keys(PERMISSION_DEFINITIONS) as TeamPermission[];
    const filteredPermissions = permissions.filter(p => validPermissions.includes(p));

    // Ensure at least view_properties is always granted (minimum access)
    if (!filteredPermissions.includes('view_properties')) {
      filteredPermissions.unshift('view_properties');
    }

    await teamMemberModel()?.update?.({
      where: { id: memberId },
      data: { permissions: filteredPermissions },
    });

    return { 
      success: true, 
      message: 'Permissions updated successfully', 
      permissions: filteredPermissions,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/**
 * Reset a team member's permissions to the default for their role
 */
export async function resetTeamMemberPermissions(memberId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    // Check if current user is the landlord owner (account creator)
    const isLandlordOwner = landlordResult.landlord.ownerUserId === session.user.id;

    // Check if current user has permission to manage team
    const currentUserMember = await teamMemberModel()?.findFirst?.({
      where: {
        userId: session.user.id,
        landlordId: landlordResult.landlord.id,
        status: 'active',
      },
    });

    const canManagePermissions = isLandlordOwner ||
                                 currentUserMember?.role === 'owner' || 
                                 currentUserMember?.role === 'admin' ||
                                 (currentUserMember?.role === 'property_manager' && currentUserMember?.permissions?.includes('manage_team'));

    if (!canManagePermissions) {
      return { success: false, message: 'You do not have permission to manage team permissions' };
    }

    let member;
    try {
      member = await teamMemberModel()?.findFirst?.({
        where: { id: memberId, landlordId: landlordResult.landlord.id },
      });
    } catch {
      return { success: false, message: 'Team management requires database migration' };
    }

    if (!member) {
      return { success: false, message: 'Team member not found' };
    }

    if (member.role === 'owner') {
      return { success: false, message: 'Cannot reset owner permissions' };
    }

    const defaultPermissions = await getDefaultPermissionsForRole(member.role as TeamMemberRole);

    await teamMemberModel()?.update?.({
      where: { id: memberId },
      data: { permissions: defaultPermissions },
    });

    return { 
      success: true, 
      message: 'Permissions reset to defaults', 
      permissions: defaultPermissions,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function checkTeamMemberPermission(userId: string, landlordId: string, permission: TeamPermission): Promise<boolean> {
  try {
    // First check if user is the landlord owner (always has full access)
    const landlord = await prisma.landlord.findUnique({
      where: { id: landlordId },
      select: { ownerUserId: true },
    });

    if (landlord?.ownerUserId === userId) {
      return true; // Landlord owner has all permissions
    }

    const member = await teamMemberModel()?.findFirst?.({
      where: {
        userId,
        landlordId,
        status: 'active',
      },
    });

    if (!member) return false;
    if (member.role === 'owner') return true; // Owner role has all permissions
    
    // Check the member's custom permissions array
    return member.permissions?.includes(permission) || false;
  } catch {
    return false;
  }
}

/**
 * Check if a user has any of the specified permissions
 */
export async function checkTeamMemberHasAnyPermission(
  userId: string, 
  landlordId: string, 
  permissions: TeamPermission[]
): Promise<boolean> {
  try {
    const landlord = await prisma.landlord.findUnique({
      where: { id: landlordId },
      select: { ownerUserId: true },
    });

    if (landlord?.ownerUserId === userId) {
      return true;
    }

    const member = await teamMemberModel()?.findFirst?.({
      where: {
        userId,
        landlordId,
        status: 'active',
      },
    });

    if (!member) return false;
    if (member.role === 'owner') return true;
    
    return permissions.some(p => member.permissions?.includes(p));
  } catch {
    return false;
  }
}

/**
 * Check if a user has all of the specified permissions
 */
export async function checkTeamMemberHasAllPermissions(
  userId: string, 
  landlordId: string, 
  permissions: TeamPermission[]
): Promise<boolean> {
  try {
    const landlord = await prisma.landlord.findUnique({
      where: { id: landlordId },
      select: { ownerUserId: true },
    });

    if (landlord?.ownerUserId === userId) {
      return true;
    }

    const member = await teamMemberModel()?.findFirst?.({
      where: {
        userId,
        landlordId,
        status: 'active',
      },
    });

    if (!member) return false;
    if (member.role === 'owner') return true;
    
    return permissions.every(p => member.permissions?.includes(p));
  } catch {
    return false;
  }
}

export async function getCurrentUserTeamRole(landlordId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, role: null, isOwner: false, canManageTeam: false, permissions: [] };
    }

    // First check if user is the landlord owner
    const landlord = await prisma.landlord.findUnique({
      where: { id: landlordId },
      select: { ownerUserId: true },
    });

    if (landlord?.ownerUserId === session.user.id) {
      return {
        success: true,
        role: 'owner' as TeamMemberRole,
        isOwner: true,
        canManageTeam: true,
        canCustomizePermissions: true,
        permissions: Object.keys(PERMISSION_DEFINITIONS) as TeamPermission[], // Owner has all permissions
      };
    }

    // Check if user is a team member
    const member = await teamMemberModel()?.findFirst?.({
      where: {
        userId: session.user.id,
        landlordId,
        status: 'active',
      },
    });

    if (!member) {
      return { success: false, role: null, isOwner: false, canManageTeam: false, permissions: [] };
    }

    const normalizedRole = await normalizeRole(member.role);
    const roleDefinition = ROLE_DEFINITIONS[normalizedRole];
    const isOwnerRole = normalizedRole === 'owner';
    const canManageTeam = isOwnerRole || 
                          normalizedRole === 'admin' || 
                          member.permissions?.includes('manage_team');

    return {
      success: true,
      role: normalizedRole,
      roleLabel: roleDefinition?.label || normalizedRole,
      isOwner: isOwnerRole,
      canManageTeam,
      canCustomizePermissions: canManageTeam,
      permissions: isOwnerRole 
        ? Object.keys(PERMISSION_DEFINITIONS) as TeamPermission[]
        : (member.permissions || []) as TeamPermission[],
    };
  } catch (error) {
    return { success: false, role: null, isOwner: false, canManageTeam: false, permissions: [] };
  }
}

/**
 * Get all team role and permission definitions for UI display
 */
export async function getTeamRoleDefinitions(tier: 'starter' | 'pro' | 'enterprise') {
  const availableRoles = await getRolesForTier(tier);
  
  return {
    roles: await Promise.all(
      Object.entries(ROLE_DEFINITIONS)
        .filter(([key]) => key === 'owner' || availableRoles.includes(key as TeamMemberRole))
        .map(async ([key, value]) => ({
          id: key as TeamMemberRole,
          ...value,
          defaultPermissions: await getDefaultPermissionsForRole(key as TeamMemberRole),
          isAvailable: key === 'owner' || availableRoles.includes(key as TeamMemberRole),
        }))
    ),
    permissions: Object.entries(PERMISSION_DEFINITIONS).map(([key, value]) => ({
      id: key as TeamPermission,
      ...value,
    })),
    permissionsByCategory: Object.entries(PERMISSION_DEFINITIONS).reduce((acc, [key, value]) => {
      if (!acc[value.category]) {
        acc[value.category] = [];
      }
      acc[value.category].push({ id: key as TeamPermission, ...value });
      return acc;
    }, {} as Record<string, Array<{ id: TeamPermission; label: string; description: string; category: string }>>),
  };
}
