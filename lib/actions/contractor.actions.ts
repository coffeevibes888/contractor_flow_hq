'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from './landlord.actions';

// ============= CONTRACTOR CRUD =============

export async function getContractors(search?: string) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const contractors = await prisma.contractor.findMany({
      where: {
        landlordId: landlordResult.landlord.id,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { specialties: { hasSome: [search] } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, contractors };
  } catch (error) {
    console.error('Failed to get contractors:', error);
    return { success: false, message: 'Failed to get contractors' };
  }
}

export async function getContractor(id: string) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const contractor = await prisma.contractor.findFirst({
      where: {
        id,
        landlordId: landlordResult.landlord.id,
      },
      include: {
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!contractor) {
      return { success: false, message: 'Contractor not found' };
    }

    return { success: true, contractor };
  } catch (error) {
    console.error('Failed to get contractor:', error);
    return { success: false, message: 'Failed to get contractor' };
  }
}


export async function addContractor(data: {
  name: string;
  email: string;
  phone?: string;
  specialties?: string[];
  notes?: string;
}) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const contractor = await prisma.contractor.create({
      data: {
        landlordId: landlordResult.landlord.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        specialties: data.specialties || [],
        notes: data.notes,
      },
    });

    return {
      success: true,
      message: 'Contractor added successfully',
      contractorId: contractor.id,
    };
  } catch (error: any) {
    console.error('Failed to add contractor:', error);
    if (error.code === 'P2002') {
      return { success: false, message: 'A contractor with this email already exists' };
    }
    return { success: false, message: 'Failed to add contractor' };
  }
}

export async function updateContractor(data: {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  specialties?: string[];
  notes?: string;
}) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const existing = await prisma.contractor.findFirst({
      where: {
        id: data.id,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!existing) {
      return { success: false, message: 'Contractor not found' };
    }

    await prisma.contractor.update({
      where: { id: data.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.specialties && { specialties: data.specialties }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    return { success: true, message: 'Contractor updated successfully' };
  } catch (error: any) {
    console.error('Failed to update contractor:', error);
    if (error.code === 'P2002') {
      return { success: false, message: 'A contractor with this email already exists' };
    }
    return { success: false, message: 'Failed to update contractor' };
  }
}

export async function deleteContractor(id: string) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const existing = await prisma.contractor.findFirst({
      where: {
        id,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!existing) {
      return { success: false, message: 'Contractor not found' };
    }

    await prisma.contractor.delete({
      where: { id },
    });

    return { success: true, message: 'Contractor deleted successfully' };
  } catch (error) {
    console.error('Failed to delete contractor:', error);
    return { success: false, message: 'Failed to delete contractor' };
  }
}


// ============= WORK ORDERS =============

export async function getWorkOrders(filters?: {
  status?: string;
  contractorId?: string;
  propertyId?: string;
}) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const workOrders = await prisma.workOrder.findMany({
      where: {
        landlordId: landlordResult.landlord.id,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.contractorId && { contractorId: filters.contractorId }),
        ...(filters?.propertyId && { propertyId: filters.propertyId }),
      },
      include: {
        contractor: {
          select: { id: true, name: true, email: true },
        },
        property: {
          select: { id: true, name: true },
        },
        unit: {
          select: { id: true, name: true },
        },
        bids: {
          select: {
            id: true,
            amount: true,
            status: true,
            contractorId: true,
          },
        },
        _count: {
          select: { bids: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, workOrders };
  } catch (error) {
    console.error('Failed to get work orders:', error);
    return { success: false, message: 'Failed to get work orders' };
  }
}

export async function getWorkOrder(id: string) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: {
        id,
        landlordId: landlordResult.landlord.id,
      },
      include: {
        contractor: true,
        property: true,
        unit: true,
        media: {
          orderBy: { createdAt: 'desc' },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: {
              select: { name: true, email: true },
            },
          },
        },
        bids: {
          include: {
            contractor: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        payment: true,
      },
    });

    if (!workOrder) {
      return { success: false, message: 'Work order not found' };
    }

    return { success: true, workOrder };
  } catch (error) {
    console.error('Failed to get work order:', error);
    return { success: false, message: 'Failed to get work order' };
  }
}


export async function createWorkOrder(data: {
  contractorId?: string;
  propertyId: string;
  unitId?: string;
  maintenanceTicketId?: string;
  title: string;
  description: string;
  priority?: string;
  agreedPrice?: number;
  scheduledDate?: string;
  notes?: string;
  isOpenBid?: boolean;
  isOpenForBids?: boolean;
  budgetMin?: number;
  budgetMax?: number;
  bidDeadline?: string;
  postingType?: 'bid' | 'estimate';
  status?: string;
  media?: { url: string; type: string }[];
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const isOpenBid = data.isOpenBid || data.isOpenForBids || false;
    
    // Determine initial status based on whether it's an open bid or direct assignment
    const initialStatus = data.status || (isOpenBid ? 'open' : (data.contractorId ? 'assigned' : 'draft'));

    const workOrder = await prisma.workOrder.create({
      data: {
        landlordId: landlordResult.landlord.id,
        contractorId: data.contractorId || null,
        propertyId: data.propertyId,
        unitId: data.unitId || null,
        maintenanceTicketId: data.maintenanceTicketId || null,
        title: data.title,
        description: data.description,
        status: initialStatus,
        priority: data.priority || 'medium',
        agreedPrice: data.agreedPrice ? data.agreedPrice : null,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        notes: data.notes || null,
        isOpenBid: isOpenBid,
        budgetMin: data.budgetMin ? data.budgetMin : null,
        budgetMax: data.budgetMax ? data.budgetMax : null,
        bidDeadline: data.bidDeadline ? new Date(data.bidDeadline) : null,
        postingType: data.postingType || 'bid',
      },
    });

    // ✅ NEW: Emit event for work order creation (notifies contractors)
    try {
      const { dbTriggers } = await import('@/lib/event-system');
      await dbTriggers.onWorkOrderCreate(workOrder, 'landlord');
    } catch (error) {
      console.error('Failed to emit work order event:', error);
    }

    // Create media entries if provided
    if (data.media && data.media.length > 0) {
      await prisma.workOrderMedia.createMany({
        data: data.media.map(m => ({
          workOrderId: workOrder.id,
          uploadedById: session.user!.id!,
          uploaderRole: 'landlord',
          type: m.type,
          url: m.url,
          phase: 'before',
        })),
      });
    }

    // Create initial history entry
    await prisma.workOrderHistory.create({
      data: {
        workOrderId: workOrder.id,
        changedById: session.user.id,
        previousStatus: 'none',
        newStatus: initialStatus,
        notes: 'Work order created',
      },
    });

    return {
      success: true,
      message: 'Work order created successfully',
      workOrderId: workOrder.id,
    };
  } catch (error) {
    console.error('Failed to create work order:', error);
    return { success: false, message: 'Failed to create work order' };
  }
}

export async function updateWorkOrderStatus(data: {
  id: string;
  status: string;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const existing = await prisma.workOrder.findFirst({
      where: {
        id: data.id,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!existing) {
      return { success: false, message: 'Work order not found' };
    }

    const updateData: any = { status: data.status };
    if (data.status === 'completed') {
      updateData.completedAt = new Date();
    }

    await prisma.$transaction([
      prisma.workOrder.update({
        where: { id: data.id },
        data: updateData,
      }),
      prisma.workOrderHistory.create({
        data: {
          workOrderId: data.id,
          changedById: session.user.id,
          previousStatus: existing.status,
          newStatus: data.status,
          notes: data.notes || null,
        },
      }),
    ]);

    return { success: true, message: 'Work order status updated' };
  } catch (error) {
    console.error('Failed to update work order status:', error);
    return { success: false, message: 'Failed to update work order status' };
  }
}

export async function updateWorkOrder(id: string, data: {
  contractorId?: string;
  propertyId?: string;
  unitId?: string;
  title?: string;
  description?: string;
  priority?: string;
  agreedPrice?: number;
  scheduledDate?: string;
  notes?: string;
  isOpenForBids?: boolean;
  budgetMin?: number;
  budgetMax?: number;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const existing = await prisma.workOrder.findFirst({
      where: {
        id,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!existing) {
      return { success: false, message: 'Work order not found' };
    }

    // Only allow editing draft work orders or updating certain fields
    if (existing.status !== 'draft' && !data.status) {
      return { success: false, message: 'Can only edit draft work orders' };
    }

    const updateData: any = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.propertyId !== undefined) updateData.propertyId = data.propertyId;
    if (data.unitId !== undefined) updateData.unitId = data.unitId || null;
    if (data.contractorId !== undefined) updateData.contractorId = data.contractorId || null;
    if (data.agreedPrice !== undefined) updateData.agreedPrice = data.agreedPrice;
    if (data.scheduledDate !== undefined) updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null;
    if (data.isOpenForBids !== undefined) updateData.isOpenBid = data.isOpenForBids;
    if (data.budgetMin !== undefined) updateData.budgetMin = data.budgetMin;
    if (data.budgetMax !== undefined) updateData.budgetMax = data.budgetMax;
    if (data.status !== undefined) updateData.status = data.status;

    await prisma.workOrder.update({
      where: { id },
      data: updateData,
    });

    return { success: true, message: 'Work order updated successfully' };
  } catch (error) {
    console.error('Failed to update work order:', error);
    return { success: false, message: 'Failed to update work order' };
  }
}

export async function deleteWorkOrder(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const existing = await prisma.workOrder.findFirst({
      where: {
        id,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!existing) {
      return { success: false, message: 'Work order not found' };
    }

    // If a contractor has accepted the order, PM must contact Customer Service
    const contractorAcceptedStatuses = ['assigned', 'in_progress', 'completed', 'approved', 'paid'];
    if (contractorAcceptedStatuses.includes(existing.status)) {
      return {
        success: false,
        message: 'This work order has been accepted by a contractor. Please contact Customer Service to cancel.',
      };
    }

    // For draft, open, cancelled, disputed — cancel then delete
    // If not already cancelled, update status to cancelled first
    if (existing.status !== 'cancelled') {
      await prisma.workOrder.update({
        where: { id },
        data: { status: 'cancelled' },
      });
    }

    // Delete related records and the work order
    await prisma.$transaction([
      prisma.workOrderHistory.deleteMany({ where: { workOrderId: id } }),
      prisma.workOrderMedia.deleteMany({ where: { workOrderId: id } }),
      prisma.workOrderBid.deleteMany({ where: { workOrderId: id } }),
      prisma.workOrder.delete({ where: { id } }),
    ]);

    return { success: true, message: 'Work order deleted successfully' };
  } catch (error) {
    console.error('Failed to delete work order:', error);
    return { success: false, message: 'Failed to delete work order' };
  }
}


// ============= WORK ORDER MEDIA =============

export async function getWorkOrderMedia(workOrderId: string) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: {
        id: workOrderId,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!workOrder) {
      return { success: false, message: 'Work order not found' };
    }

    const media = await prisma.workOrderMedia.findMany({
      where: { workOrderId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { name: true, email: true },
        },
      },
    });

    return { success: true, media };
  } catch (error) {
    console.error('Failed to get work order media:', error);
    return { success: false, message: 'Failed to get work order media' };
  }
}

export async function addWorkOrderMedia(data: {
  workOrderId: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  phase?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: {
        id: data.workOrderId,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!workOrder) {
      return { success: false, message: 'Work order not found' };
    }

    const media = await prisma.workOrderMedia.create({
      data: {
        workOrderId: data.workOrderId,
        uploadedById: session.user.id,
        uploaderRole: 'landlord',
        type: data.type,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl || null,
        caption: data.caption || null,
        phase: data.phase || 'before',
      },
    });

    return {
      success: true,
      message: 'Media added successfully',
      mediaId: media.id,
    };
  } catch (error) {
    console.error('Failed to add work order media:', error);
    return { success: false, message: 'Failed to add work order media' };
  }
}

export async function deleteWorkOrderMedia(mediaId: string) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const media = await prisma.workOrderMedia.findFirst({
      where: { id: mediaId },
      include: {
        workOrder: {
          select: { landlordId: true },
        },
      },
    });

    if (!media || media.workOrder.landlordId !== landlordResult.landlord.id) {
      return { success: false, message: 'Media not found' };
    }

    await prisma.workOrderMedia.delete({
      where: { id: mediaId },
    });

    return { success: true, message: 'Media deleted successfully' };
  } catch (error) {
    console.error('Failed to delete work order media:', error);
    return { success: false, message: 'Failed to delete work order media' };
  }
}


// ============= CONTRACTOR PAYMENTS =============

export async function getContractorPayments(filters?: {
  contractorId?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const payments = await prisma.contractorPayment.findMany({
      where: {
        landlordId: landlordResult.landlord.id,
        ...(filters?.contractorId && { contractorId: filters.contractorId }),
        ...(filters?.startDate && {
          createdAt: { gte: new Date(filters.startDate) },
        }),
        ...(filters?.endDate && {
          createdAt: { lte: new Date(filters.endDate) },
        }),
      },
      include: {
        contractor: {
          select: { id: true, name: true, email: true },
        },
        workOrder: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, payments };
  } catch (error) {
    console.error('Failed to get contractor payments:', error);
    return { success: false, message: 'Failed to get contractor payments' };
  }
}

export async function payContractor(data: {
  contractorId: string;
  workOrderId: string;
  amount: number;
}) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    // Verify work order belongs to landlord and is completed
    const workOrder = await prisma.workOrder.findFirst({
      where: {
        id: data.workOrderId,
        landlordId: landlordResult.landlord.id,
        contractorId: data.contractorId,
      },
    });

    if (!workOrder) {
      return { success: false, message: 'Work order not found' };
    }

    if (workOrder.status !== 'completed' && workOrder.status !== 'approved') {
      return { success: false, message: 'Work order must be completed before payment' };
    }

    // $1 flat platform fee for contractor cashout
    const platformFee = 1;
    const netAmount = data.amount - platformFee;

    const payment = await prisma.contractorPayment.create({
      data: {
        landlordId: landlordResult.landlord.id,
        contractorId: data.contractorId,
        workOrderId: data.workOrderId,
        amount: data.amount,
        platformFee,
        netAmount,
        status: 'pending',
      },
    });

    // Update work order status to paid
    await prisma.workOrder.update({
      where: { id: data.workOrderId },
      data: { status: 'paid' },
    });

    return {
      success: true,
      message: 'Payment initiated successfully',
      paymentId: payment.id,
    };
  } catch (error: any) {
    console.error('Failed to pay contractor:', error);
    if (error.code === 'P2002') {
      return { success: false, message: 'Payment already exists for this work order' };
    }
    return { success: false, message: 'Failed to process payment' };
  }
}


// ============= REPORTS =============

export async function getContractorSpendingReport() {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    // Get all payments for the year
    const payments = await prisma.contractorPayment.findMany({
      where: {
        landlordId: landlordResult.landlord.id,
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
        status: 'completed',
      },
      include: {
        contractor: {
          select: { id: true, name: true, specialties: true },
        },
        workOrder: {
          select: { id: true, title: true, propertyId: true },
        },
      },
    });

    // Aggregate by contractor
    const byContractor = payments.reduce((acc: any, payment) => {
      const contractorId = payment.contractorId;
      if (!acc[contractorId]) {
        acc[contractorId] = {
          contractor: payment.contractor,
          totalSpent: 0,
          jobCount: 0,
          payments: [],
        };
      }
      acc[contractorId].totalSpent += Number(payment.amount);
      acc[contractorId].jobCount += 1;
      acc[contractorId].payments.push(payment);
      return acc;
    }, {});

    // Aggregate by month
    const byMonth = payments.reduce((acc: any, payment) => {
      const month = new Date(payment.createdAt).getMonth();
      if (!acc[month]) {
        acc[month] = { month, totalSpent: 0, jobCount: 0 };
      }
      acc[month].totalSpent += Number(payment.amount);
      acc[month].jobCount += 1;
      return acc;
    }, {});

    const totalSpent = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalJobs = payments.length;

    return {
      success: true,
      report: {
        year: currentYear,
        totalSpent,
        totalJobs,
        byContractor: Object.values(byContractor),
        byMonth: Object.values(byMonth),
      },
    };
  } catch (error) {
    console.error('Failed to get contractor spending report:', error);
    return { success: false, message: 'Failed to generate report' };
  }
}
