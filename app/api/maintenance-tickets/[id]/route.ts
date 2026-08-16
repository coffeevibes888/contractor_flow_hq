import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { auth } from '@/auth';
import { NotificationService } from '@/lib/services/notification-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const ticket = await prisma.maintenanceTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: 'Maintenance ticket not found' }, { status: 404 });
    }

    await prisma.maintenanceTicket.delete({ where: { id } });
    return NextResponse.json({ message: 'Maintenance ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance ticket:', error);
    return NextResponse.json({ error: 'Failed to delete maintenance ticket' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        unit: {
          select: {
            id: true,
            name: true,
            images: true,
            property: { select: { id: true, name: true, address: true, type: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Maintenance ticket not found' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error fetching maintenance ticket:', error);
    return NextResponse.json({ error: 'Failed to fetch maintenance ticket' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();

    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true } } },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Maintenance ticket not found' }, { status: 404 });
    }

    const previousStatus = ticket.status;

    // ── Core field updates ────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
      if ((body.status === 'resolved' || body.status === 'completed') && !ticket.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
    }
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.assignedToName !== undefined) updateData.assignedToName = body.assignedToName;
    if (body.cost !== undefined) updateData.cost = body.cost;
    if (body.isRecurring !== undefined) updateData.isRecurring = body.isRecurring;
    if (body.estimatedCompletionDate !== undefined) {
      updateData.estimatedCompletionDate = body.estimatedCompletionDate
        ? new Date(body.estimatedCompletionDate)
        : null;
    }

    // ── Comment append ────────────────────────────────────────────────────────
    // body.comment = { message: string, isInternal?: boolean }
    // Stored as JSON array in ticket.comments
    if (body.comment && typeof body.comment.message === 'string' && body.comment.message.trim()) {
      const existing = Array.isArray(ticket.comments) ? (ticket.comments as object[]) : [];
      const newComment = {
        userId: session.user.id,
        userName: session.user.name ?? 'Staff',
        message: body.comment.message.trim(),
        isInternal: body.comment.isInternal === true,
        createdAt: new Date().toISOString(),
      };
      updateData.comments = [...existing, newComment];
    }

    const updatedTicket = await prisma.maintenanceTicket.update({
      where: { id },
      data: updateData,
    });

    // ── Tenant notifications on status change ─────────────────────────────────
    const newStatus: string | undefined = body.status;
    const tenantId = ticket.tenantId;

    if (newStatus && newStatus !== previousStatus && tenantId) {
      const statusMessages: Record<string, { title: string; message: string }> = {
        in_progress: {
          title: 'Work Has Started on Your Request',
          message: `Your maintenance request "${ticket.title}" is now in progress.`,
        },
        contractor_on_the_way: {
          title: 'Contractor Is On The Way!',
          message: `A technician is on their way to address "${ticket.title}". Please ensure access is available.`,
        },
        resolved: {
          title: 'Maintenance Request Resolved',
          message: `Your maintenance request "${ticket.title}" has been marked as resolved.`,
        },
        completed: {
          title: 'Maintenance Request Completed',
          message: `Your maintenance request "${ticket.title}" has been completed.`,
        },
        closed: {
          title: 'Maintenance Request Closed',
          message: `Your maintenance request "${ticket.title}" has been closed.`,
        },
      };

      const notif = statusMessages[newStatus];
      if (notif) {
        try {
          await NotificationService.createNotification({
            userId: tenantId,
            type: 'maintenance',
            title: notif.title,
            message: notif.message,
            actionUrl: '/user/profile/ticket',
            metadata: { ticketId: id, status: newStatus },
          });
        } catch (err) {
          console.error('[maintenance PATCH] tenant notify failed', err);
        }
      }
    }

    // ── Notify tenant when a non-internal comment is added ────────────────────
    if (
      body.comment &&
      !body.comment.isInternal &&
      typeof body.comment.message === 'string' &&
      body.comment.message.trim() &&
      tenantId
    ) {
      try {
        await NotificationService.createNotification({
          userId: tenantId,
          type: 'maintenance',
          title: 'New Update on Your Maintenance Request',
          message: `Staff replied to "${ticket.title}": ${body.comment.message.trim().slice(0, 120)}`,
          actionUrl: '/user/profile/ticket',
          metadata: { ticketId: id },
        });
      } catch (err) {
        console.error('[maintenance PATCH] tenant comment notify failed', err);
      }
    }

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error('Error updating maintenance ticket:', error);
    return NextResponse.json({ error: 'Failed to update maintenance ticket' }, { status: 500 });
  }
}
