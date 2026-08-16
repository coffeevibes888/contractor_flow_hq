'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function startInspection(propertyId: string, unitId?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const inspection = await prisma.propertyInspection.create({
      data: {
        propertyId,
        inspectorId: session.user.id,
        unitId,
        status: 'in_progress',
      },
    });

    revalidatePath(`/admin/dashboard/properties/${propertyId}/details`);
    return { success: true, inspection };
  } catch (error) {
    console.error('Start inspection error:', error);
    return { success: false, message: 'Failed to start inspection' };
  }
}

export async function addInspectionItem(
  inspectionId: string,
  data: {
    category: string;
    item: string;
    status: 'pass' | 'fail' | 'warning';
    notes?: string;
    photos?: string[];
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const item = await prisma.inspectionItem.create({
      data: {
        inspectionId,
        ...data,
      },
    });

    return { success: true, item };
  } catch (error) {
    console.error('Add inspection item error:', error);
    return { success: false, message: 'Failed to add inspection item' };
  }
}

export async function completeInspection(inspectionId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const items = await prisma.inspectionItem.findMany({
      where: { inspectionId },
    });

    const summary = {
      total: items.length,
      passed: items.filter((i) => i.status === 'pass').length,
      failed: items.filter((i) => i.status === 'fail').length,
      warnings: items.filter((i) => i.status === 'warning').length,
    };

    const inspection = await prisma.propertyInspection.update({
      where: { id: inspectionId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        summary,
      },
    });

    revalidatePath('/admin/dashboard/properties');
    return { success: true, inspection };
  } catch (error) {
    console.error('Complete inspection error:', error);
    return { success: false, message: 'Failed to complete inspection' };
  }
}

export async function getPropertyInspections(propertyId: string) {
  try {
    const inspections = await prisma.propertyInspection.findMany({
      where: { propertyId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, inspections };
  } catch (error) {
    console.error('Get inspections error:', error);
    return { success: false, message: 'Failed to fetch inspections' };
  }
}
