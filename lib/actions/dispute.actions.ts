'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// Generate unique case number
function generateCaseNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `DSP-${dateStr}-${random}`;
}

// ============= DISPUTE CRUD =============

export async function getDisputes(filters?: {
  status?: string;
  priority?: string;
  type?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    // Only super admins can access all disputes
    if (session.user.role !== 'superAdmin' && session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const disputes = await prisma.dispute.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.priority && { priority: filters.priority }),
        ...(filters?.type && { type: filters.type }),
        ...(filters?.search && {
          OR: [
            { caseNumber: { contains: filters.search, mode: 'insensitive' } },
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
        ...(filters?.dateFrom && { createdAt: { gte: new Date(filters.dateFrom) } }),
        ...(filters?.dateTo && { createdAt: { lte: new Date(filters.dateTo) } }),
      },
      include: {
        landlord: { select: { id: true, name: true, subdomain: true } },
        filedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true, evidence: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return { success: true, disputes };
  } catch (error) {
    console.error('Failed to get disputes:', error);
    return { success: false, message: 'Failed to get disputes' };
  }
}

// Get disputes for a specific user (contractor, homeowner, or landlord)
export async function getMyDisputes() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const disputes = await prisma.dispute.findMany({
      where: {
        OR: [
          { filedById: session.user.id },
          // Add more conditions based on user role
        ],
      },
      include: {
        landlord: { select: { id: true, name: true, subdomain: true } },
        filedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true, evidence: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, disputes };
  } catch (error) {
    console.error('Failed to get my disputes:', error);
    return { success: false, message: 'Failed to get disputes' };
  }
}

export async function getDispute(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        landlord: { select: { id: true, name: true, subdomain: true, companyEmail: true, companyPhone: true } },
        filedBy: { select: { id: true, name: true, email: true, phoneNumber: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
        messages: {
          where: {
            OR: [
              { isInternal: false },
              // Admins can see internal notes
              ...(session.user.role === 'superAdmin' || session.user.role === 'admin' ? [{ isInternal: true }] : []),
            ],
          },
          include: { sender: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
        evidence: {
          include: { uploadedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        timeline: {
          include: { performedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!dispute) {
      return { success: false, message: 'Dispute not found' };
    }

    // Check if user has access to this dispute
    const isAdmin = session.user.role === 'superAdmin' || session.user.role === 'admin';
    const isParty = dispute.filedById === session.user.id;
    
    if (!isAdmin && !isParty) {
      return { success: false, message: 'Unauthorized' };
    }

    return { success: true, dispute };
  } catch (error) {
    console.error('Failed to get dispute:', error);
    return { success: false, message: 'Failed to get dispute' };
  }
}


export async function createDispute(data: {
  landlordId: string;
  contractorId?: string;
  homeownerId?: string;
  workOrderId?: string;
  type: string;
  category: string;
  priority?: string;
  title: string;
  description: string;
  desiredResolution?: string;
  disputedAmount?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const caseNumber = generateCaseNumber();
    
    // Determine filer role
    let filedByRole = session.user.role || 'user';
    if (filedByRole === 'superAdmin') filedByRole = 'admin';
    
    // Set response deadline (24 hours for urgent, 48 for high, 72 for others)
    const responseHours = data.priority === 'urgent' ? 24 : data.priority === 'high' ? 48 : 72;
    const responseDeadline = new Date();
    responseDeadline.setHours(responseDeadline.getHours() + responseHours);

    // Set resolution deadline (3 days for urgent, 7 for high, 14 for others)
    const resolutionDays = data.priority === 'urgent' ? 3 : data.priority === 'high' ? 7 : 14;
    const resolutionDeadline = new Date();
    resolutionDeadline.setDate(resolutionDeadline.getDate() + resolutionDays);

    const dispute = await prisma.dispute.create({
      data: {
        caseNumber,
        landlordId: data.landlordId,
        contractorId: data.contractorId || null,
        homeownerId: data.homeownerId || null,
        workOrderId: data.workOrderId || null,
        type: data.type,
        category: data.category,
        priority: data.priority || 'medium',
        title: data.title,
        description: data.description,
        desiredResolution: data.desiredResolution || null,
        disputedAmount: data.disputedAmount || null,
        filedById: session.user.id,
        filedByRole,
        responseDeadline,
        resolutionDeadline,
      },
    });

    // Create timeline entry
    await prisma.disputeTimeline.create({
      data: {
        disputeId: dispute.id,
        action: 'created',
        description: `Dispute case ${caseNumber} was created`,
        performedById: session.user.id,
      },
    });

    revalidatePath('/dispute-center');
    revalidatePath('/contractor/disputes');
    revalidatePath('/homeowner/disputes');
    revalidatePath('/admin/contractors');
    return { success: true, message: 'Dispute created successfully', disputeId: dispute.id, caseNumber };
  } catch (error) {
    console.error('Failed to create dispute:', error);
    return { success: false, message: 'Failed to create dispute' };
  }
}

// File a dispute for a specific work order (user-facing)
export async function fileWorkOrderDispute(data: {
  workOrderId: string;
  type: string;
  category: string;
  title: string;
  description: string;
  desiredResolution?: string;
  disputedAmount?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    // Get the work order to find the landlord
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: data.workOrderId },
      select: { 
        id: true, 
        landlordId: true, 
        contractorId: true,
        agreedPrice: true,
        title: true,
      },
    });

    if (!workOrder) {
      return { success: false, message: 'Work order not found' };
    }

    return createDispute({
      landlordId: workOrder.landlordId,
      contractorId: workOrder.contractorId || undefined,
      workOrderId: data.workOrderId,
      type: data.type,
      category: data.category,
      priority: 'medium',
      title: data.title || `Dispute: ${workOrder.title}`,
      description: data.description,
      desiredResolution: data.desiredResolution,
      disputedAmount: data.disputedAmount || (workOrder.agreedPrice ? Number(workOrder.agreedPrice) : undefined),
    });
  } catch (error) {
    console.error('Failed to file work order dispute:', error);
    return { success: false, message: 'Failed to file dispute' };
  }
}

export async function updateDisputeStatus(data: {
  id: string;
  status: string;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    if (session.user.role !== 'superAdmin' && session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const existing = await prisma.dispute.findUnique({ where: { id: data.id } });
    if (!existing) {
      return { success: false, message: 'Dispute not found' };
    }

    const updateData: any = { status: data.status };
    
    if (data.status === 'resolved' || data.status === 'closed') {
      updateData.resolvedAt = new Date();
      updateData.resolvedById = session.user.id;
    }

    await prisma.$transaction([
      prisma.dispute.update({ where: { id: data.id }, data: updateData }),
      prisma.disputeTimeline.create({
        data: {
          disputeId: data.id,
          action: 'status_changed',
          description: `Status changed from ${existing.status} to ${data.status}${data.notes ? `: ${data.notes}` : ''}`,
          previousValue: existing.status,
          newValue: data.status,
          performedById: session.user.id,
        },
      }),
    ]);

    revalidatePath('/dispute-center');
    revalidatePath(`/dispute-center/${data.id}`);
    return { success: true, message: 'Dispute status updated' };
  } catch (error) {
    console.error('Failed to update dispute status:', error);
    return { success: false, message: 'Failed to update dispute status' };
  }
}

export async function assignDispute(data: { id: string; assignedToId: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    if (session.user.role !== 'superAdmin' && session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const assignee = await prisma.user.findUnique({
      where: { id: data.assignedToId },
      select: { name: true, email: true },
    });

    await prisma.$transaction([
      prisma.dispute.update({
        where: { id: data.id },
        data: {
          assignedToId: data.assignedToId,
          assignedAt: new Date(),
          status: 'under_review',
        },
      }),
      prisma.disputeTimeline.create({
        data: {
          disputeId: data.id,
          action: 'assigned',
          description: `Dispute assigned to ${assignee?.name || assignee?.email}`,
          newValue: data.assignedToId,
          performedById: session.user.id,
        },
      }),
    ]);

    revalidatePath('/dispute-center');
    return { success: true, message: 'Dispute assigned successfully' };
  } catch (error) {
    console.error('Failed to assign dispute:', error);
    return { success: false, message: 'Failed to assign dispute' };
  }
}


export async function resolveDispute(data: {
  id: string;
  resolution: string;
  resolutionType: string;
  resolvedAmount?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    if (session.user.role !== 'superAdmin' && session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    await prisma.$transaction([
      prisma.dispute.update({
        where: { id: data.id },
        data: {
          status: 'resolved',
          resolution: data.resolution,
          resolutionType: data.resolutionType,
          resolvedAmount: data.resolvedAmount || null,
          resolvedById: session.user.id,
          resolvedAt: new Date(),
        },
      }),
      prisma.disputeTimeline.create({
        data: {
          disputeId: data.id,
          action: 'resolved',
          description: `Dispute resolved: ${data.resolutionType}`,
          newValue: data.resolutionType,
          performedById: session.user.id,
          metadata: { resolution: data.resolution, resolvedAmount: data.resolvedAmount },
        },
      }),
    ]);

    revalidatePath('/dispute-center');
    return { success: true, message: 'Dispute resolved successfully' };
  } catch (error) {
    console.error('Failed to resolve dispute:', error);
    return { success: false, message: 'Failed to resolve dispute' };
  }
}

export async function escalateDispute(data: { id: string; reason: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    if (session.user.role !== 'superAdmin' && session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    await prisma.$transaction([
      prisma.dispute.update({
        where: { id: data.id },
        data: { status: 'escalated', priority: 'urgent' },
      }),
      prisma.disputeTimeline.create({
        data: {
          disputeId: data.id,
          action: 'escalated',
          description: `Dispute escalated: ${data.reason}`,
          performedById: session.user.id,
        },
      }),
    ]);

    revalidatePath('/dispute-center');
    return { success: true, message: 'Dispute escalated successfully' };
  } catch (error) {
    console.error('Failed to escalate dispute:', error);
    return { success: false, message: 'Failed to escalate dispute' };
  }
}

// ============= MESSAGES =============

export async function addDisputeMessage(data: {
  disputeId: string;
  message: string;
  isInternal?: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const senderRole = session.user.role === 'superAdmin' ? 'admin' : session.user.role || 'user';

    await prisma.$transaction([
      prisma.disputeMessage.create({
        data: {
          disputeId: data.disputeId,
          senderId: session.user.id,
          senderRole,
          message: data.message,
          isInternal: data.isInternal || false,
        },
      }),
      prisma.disputeTimeline.create({
        data: {
          disputeId: data.disputeId,
          action: 'message_sent',
          description: data.isInternal ? 'Internal note added' : 'Message sent',
          performedById: session.user.id,
        },
      }),
    ]);

    revalidatePath(`/dispute-center/${data.disputeId}`);
    return { success: true, message: 'Message sent successfully' };
  } catch (error) {
    console.error('Failed to add dispute message:', error);
    return { success: false, message: 'Failed to send message' };
  }
}

// ============= EVIDENCE =============

export async function addDisputeEvidence(data: {
  disputeId: string;
  type: string;
  url: string;
  fileName?: string;
  description?: string;
  category?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    await prisma.$transaction([
      prisma.disputeEvidence.create({
        data: {
          disputeId: data.disputeId,
          uploadedById: session.user.id,
          type: data.type,
          url: data.url,
          fileName: data.fileName || null,
          description: data.description || null,
          category: data.category || 'other',
        },
      }),
      prisma.disputeTimeline.create({
        data: {
          disputeId: data.disputeId,
          action: 'evidence_added',
          description: `Evidence uploaded: ${data.fileName || data.type}`,
          performedById: session.user.id,
        },
      }),
    ]);

    revalidatePath(`/dispute-center/${data.disputeId}`);
    return { success: true, message: 'Evidence uploaded successfully' };
  } catch (error) {
    console.error('Failed to add dispute evidence:', error);
    return { success: false, message: 'Failed to upload evidence' };
  }
}

export async function deleteDisputeEvidence(evidenceId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    if (session.user.role !== 'superAdmin' && session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const evidence = await prisma.disputeEvidence.findUnique({ where: { id: evidenceId } });
    if (!evidence) {
      return { success: false, message: 'Evidence not found' };
    }

    await prisma.$transaction([
      prisma.disputeEvidence.delete({ where: { id: evidenceId } }),
      prisma.disputeTimeline.create({
        data: {
          disputeId: evidence.disputeId,
          action: 'evidence_removed',
          description: `Evidence removed: ${evidence.fileName || evidence.type}`,
          performedById: session.user.id,
        },
      }),
    ]);

    revalidatePath(`/dispute-center/${evidence.disputeId}`);
    return { success: true, message: 'Evidence deleted successfully' };
  } catch (error) {
    console.error('Failed to delete dispute evidence:', error);
    return { success: false, message: 'Failed to delete evidence' };
  }
}


// ============= ANALYTICS & REPORTS =============

export async function getDisputeStats() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    if (session.user.role !== 'superAdmin' && session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const [
      totalDisputes,
      openDisputes,
      resolvedThisMonth,
      avgResolutionTime,
      byStatus,
      byType,
      byPriority,
      recentDisputes,
      overdueDisputes,
    ] = await Promise.all([
      prisma.dispute.count(),
      prisma.dispute.count({ where: { status: { in: ['open', 'under_review', 'mediation', 'escalated'] } } }),
      prisma.dispute.count({ where: { status: 'resolved', resolvedAt: { gte: startOfMonth } } }),
      prisma.dispute.aggregate({
        where: { status: 'resolved', resolvedAt: { not: null } },
        _avg: { disputedAmount: true },
      }),
      prisma.dispute.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.dispute.groupBy({ by: ['type'], _count: { _all: true } }),
      prisma.dispute.groupBy({ by: ['priority'], _count: { _all: true } }),
      prisma.dispute.findMany({
        where: { createdAt: { gte: startOfWeek } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          landlord: { select: { name: true } },
          filedBy: { select: { name: true } },
        },
      }),
      prisma.dispute.count({
        where: {
          status: { in: ['open', 'under_review'] },
          responseDeadline: { lt: now },
        },
      }),
    ]);

    // Calculate resolution rate
    const totalResolved = await prisma.dispute.count({ where: { status: { in: ['resolved', 'closed'] } } });
    const resolutionRate = totalDisputes > 0 ? Math.round((totalResolved / totalDisputes) * 100) : 0;

    // Calculate average resolution time in days
    const resolvedDisputes = await prisma.dispute.findMany({
      where: { status: 'resolved', resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });
    
    let avgDays = 0;
    if (resolvedDisputes.length > 0) {
      const totalDays = resolvedDisputes.reduce((sum, d) => {
        const diff = (d.resolvedAt!.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + diff;
      }, 0);
      avgDays = Math.round(totalDays / resolvedDisputes.length);
    }

    return {
      success: true,
      stats: {
        totalDisputes,
        openDisputes,
        resolvedThisMonth,
        resolutionRate,
        avgResolutionDays: avgDays,
        overdueDisputes,
        byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count._all }), {}),
        byType: byType.reduce((acc, t) => ({ ...acc, [t.type]: t._count._all }), {}),
        byPriority: byPriority.reduce((acc, p) => ({ ...acc, [p.priority]: p._count._all }), {}),
        recentDisputes,
      },
    };
  } catch (error) {
    console.error('Failed to get dispute stats:', error);
    return { success: false, message: 'Failed to get dispute statistics' };
  }
}

export async function getAdminUsers() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    if (session.user.role !== 'superAdmin' && session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'superAdmin'] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });

    return { success: true, admins };
  } catch (error) {
    console.error('Failed to get admin users:', error);
    return { success: false, message: 'Failed to get admin users' };
  }
}

export async function getLandlordsForDispute() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlords = await prisma.landlord.findMany({
      select: { id: true, name: true, subdomain: true, companyEmail: true },
      orderBy: { name: 'asc' },
      take: 100,
    });

    return { success: true, landlords };
  } catch (error) {
    console.error('Failed to get landlords:', error);
    return { success: false, message: 'Failed to get landlords' };
  }
}
