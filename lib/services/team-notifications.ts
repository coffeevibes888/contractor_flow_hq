/**
 * Team-wide notification fan-out.
 *
 * When something happens on a property — a showing is requested, a tenant
 * applies, rent comes in, a maintenance ticket is filed — we want to ping
 * everyone on the landlord's team who has reason to care, not just the
 * landlord themselves.
 *
 * `notifyLandlordTeam` resolves the audience by combining:
 *   - the landlord's owner user
 *   - all `active` TeamMembers with a linked userId
 *
 * …and filters them through a `category -> required permission` map so a
 * maintenance tech doesn't get pinged about a new rent payment, and an
 * accountant doesn't get pinged about a maintenance ticket.
 *
 * Each chosen user is fed through `NotificationService.createNotification`,
 * which already respects their per-user email/sms/push toggles (and writes
 * the bell-icon row in the `Notification` table). De-dupes by userId so
 * someone who's both the owner and a TeamMember only gets one ping.
 */

import { prisma } from '@/db/prisma';
import { NotificationService } from './notification-service';

/**
 * High-level event categories that the team-wide fan-out understands.
 * Each one maps to one or more `TeamPermission` values (see
 * lib/types/team.types.ts). A team member is in the audience if at least
 * one of those permissions is on their permissions[] array.
 *
 * `owner` and `admin` roles always pass — they implicitly have everything,
 * even if their permissions[] array is empty for some reason.
 */
export type TeamNotificationCategory =
  | 'showing'        // new property showing booked
  | 'application'    // new rental application submitted
  | 'lease'          // lease activity (signed, expiring, terminated)
  | 'rent'           // rent paid, rent due, rent overdue
  | 'payment'        // any non-rent payment (deposits, fees, refunds)
  | 'maintenance'    // maintenance ticket / work order activity
  | 'message'        // new inbound message from a tenant or applicant
  | 'team'           // team admin events (invites, role changes)
  | 'general';       // catch-all that fans to owner+admin only

/**
 * Permission(s) a team member must have to receive a notification of the
 * given category. A maintenance tech (only `manage_maintenance`) is
 * therefore excluded from `rent` and `payment` categories — which is the
 * whole point of routing through this helper.
 *
 * Keep this list in sync with `TeamPermission` in lib/types/team.types.ts.
 */
const REQUIRED_PERMISSIONS: Record<TeamNotificationCategory, string[]> = {
  showing:     ['schedule_showings', 'manage_tenants'],
  application: ['process_applications', 'manage_tenants'],
  lease:       ['manage_tenants', 'view_financials', 'manage_finances'],
  rent:        ['view_financials', 'manage_finances'],
  payment:     ['view_financials', 'manage_finances'],
  maintenance: ['manage_maintenance'],
  message:     ['manage_tenants', 'manage_maintenance'],
  team:        ['manage_team'],
  general:     [], // owner+admin only
};

/** Roles that always receive every notification regardless of permissions[]. */
const ALWAYS_NOTIFY_ROLES = new Set(['owner', 'admin']);

interface TeamNotificationOptions {
  landlordId: string;
  category: TeamNotificationCategory;
  /** What the user sees in the bell list and the email subject. */
  title: string;
  /** Body of the notification — keep it under ~140 chars for SMS. */
  message: string;
  /**
   * Underlying notification type that drives template selection in
   * `NotificationService.sendEmailNotification`. Defaults to a sensible
   * value for the category.
   */
  type?: 'application' | 'message' | 'maintenance' | 'payment' | 'reminder';
  /** Where the in-app notification should deep-link to. */
  actionUrl?: string;
  /** Free-form metadata stored on the Notification row. */
  metadata?: any;
  /**
   * Optional list of userIds to skip. Useful when the actor is one of the
   * recipients (e.g. a PM scheduling a showing for themselves shouldn't
   * notify themselves).
   */
  excludeUserIds?: string[];
}

/**
 * Fan a notification out to every member of a landlord's team that has the
 * permissions needed to care. Returns the list of userIds that were
 * actually notified, so callers can debug / log if they need to.
 */
export async function notifyLandlordTeam(
  options: TeamNotificationOptions,
): Promise<string[]> {
  const { landlordId, category, title, message, type, actionUrl, metadata, excludeUserIds } = options;

  // Resolve owner + active team members in one round-trip.
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: {
      ownerUserId: true,
      teamMembers: {
        where: { status: 'active', userId: { not: null } },
        select: { userId: true, role: true, permissions: true },
      },
    },
  });

  if (!landlord) return [];

  const exclude = new Set(excludeUserIds ?? []);

  // Build {userId -> reason} map, deduped. Owner gets the "owner" role even
  // if they're also listed as a team member.
  const audience = new Map<string, { role: string; permissions: string[] }>();

  if (landlord.ownerUserId && !exclude.has(landlord.ownerUserId)) {
    audience.set(landlord.ownerUserId, { role: 'owner', permissions: [] });
  }

  for (const m of landlord.teamMembers) {
    if (!m.userId || exclude.has(m.userId)) continue;
    if (audience.has(m.userId)) continue;
    audience.set(m.userId, {
      role: m.role,
      permissions: m.permissions,
    });
  }

  // Filter by category permissions.
  const requiredAny = REQUIRED_PERMISSIONS[category];
  const recipients: string[] = [];

  for (const [userId, info] of audience) {
    if (ALWAYS_NOTIFY_ROLES.has(info.role)) {
      recipients.push(userId);
      continue;
    }
    // No required permissions => owner/admin only, skip everyone else.
    if (requiredAny.length === 0) continue;
    if (info.permissions.some((p) => requiredAny.includes(p))) {
      recipients.push(userId);
    }
  }

  if (recipients.length === 0) return [];

  // Resolve a default `type` for the email-template selector.
  const resolvedType =
    type ??
    (category === 'maintenance'
      ? 'maintenance'
      : category === 'rent' || category === 'payment'
      ? 'payment'
      : category === 'application'
      ? 'application'
      : category === 'message'
      ? 'message'
      : 'reminder');

  // Fan out in parallel. Per-user errors don't fail the whole batch — the
  // caller should still see "notified 4 of 5" if one user's email bounces.
  await Promise.allSettled(
    recipients.map((userId) =>
      NotificationService.createNotification({
        userId,
        type: resolvedType,
        title,
        message,
        actionUrl,
        metadata,
        landlordId,
      }),
    ),
  );

  return recipients;
}
