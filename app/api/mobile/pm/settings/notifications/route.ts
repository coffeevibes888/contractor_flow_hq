/**
 * Mobile PM notification settings.
 *
 * GET  /api/mobile/pm/settings/notifications  — landlord notification
 *       preferences (email/SMS routing + per-event toggles + invite channels).
 * PUT  /api/mobile/pm/settings/notifications  — mirrors the website's
 *       /api/landlord/notification-settings PUT.
 *
 * Body for PUT mirrors the website settings UI:
 *   {
 *     notificationEmail, notificationPhone,
 *     newApplications, maintenanceTickets, latePayments,
 *     leaseExpiring, newMessages,
 *     emailInvites, smsInvites, smsAlerts,
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

async function ctxFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyMobileToken(token);
  if (!payload) return null;
  if (!PM_ROLES.has(payload.role)) return null;
  return { userId: payload.userId };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await ctxFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: ctx.userId },
      select: {
        notificationEmail: true,
        notificationPhone: true,
        notifyNewApplications: true,
        notifyMaintenanceTickets: true,
        notifyLatePayments: true,
        notifyLeaseExpiring: true,
        notifyNewMessages: true,
        emailInvitesEnabled: true,
        smsInvitesEnabled: true,
        smsAlertsEnabled: true,
      },
    });
    if (!landlord) return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });

    return NextResponse.json({
      settings: {
        notificationEmail: landlord.notificationEmail || '',
        notificationPhone: landlord.notificationPhone || '',
        newApplications: landlord.notifyNewApplications ?? true,
        maintenanceTickets: landlord.notifyMaintenanceTickets ?? true,
        latePayments: landlord.notifyLatePayments ?? true,
        leaseExpiring: landlord.notifyLeaseExpiring ?? true,
        newMessages: landlord.notifyNewMessages ?? true,
        emailInvites: landlord.emailInvitesEnabled ?? true,
        smsInvites: landlord.smsInvitesEnabled ?? false,
        smsAlerts: landlord.smsAlertsEnabled ?? false,
      },
    });
  } catch (error: any) {
    console.error('[mobile/pm/settings/notifications GET]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await ctxFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: ctx.userId },
      select: { id: true },
    });
    if (!landlord) return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: {
        notificationEmail: body.notificationEmail || null,
        notificationPhone: body.notificationPhone || null,
        notifyNewApplications: !!body.newApplications,
        notifyMaintenanceTickets: !!body.maintenanceTickets,
        notifyLatePayments: !!body.latePayments,
        notifyLeaseExpiring: !!body.leaseExpiring,
        notifyNewMessages: !!body.newMessages,
        emailInvitesEnabled: !!body.emailInvites,
        smsInvitesEnabled: !!body.smsInvites,
        smsAlertsEnabled: !!body.smsAlerts,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[mobile/pm/settings/notifications PUT]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 });
  }
}
