import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
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

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

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
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json({ message: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: {
        notificationEmail: body.notificationEmail || null,
        notificationPhone: body.notificationPhone || null,
        notifyNewApplications: body.newApplications,
        notifyMaintenanceTickets: body.maintenanceTickets,
        notifyLatePayments: body.latePayments,
        notifyLeaseExpiring: body.leaseExpiring,
        notifyNewMessages: body.newMessages,
        emailInvitesEnabled: body.emailInvites,
        smsInvitesEnabled: body.smsInvites,
        smsAlertsEnabled: body.smsAlerts,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json({ message: 'Failed to update settings' }, { status: 500 });
  }
}
