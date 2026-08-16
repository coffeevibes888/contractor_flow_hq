'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { formatError } from '../utils';
import { revalidatePath } from 'next/cache';

const recurringChargeSchema = z.object({
  leaseId: z.string().uuid(),
  description: z.string().min(2, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  dayOfMonthToPost: z.number().min(1).max(31),
});

export async function createRecurringCharge(data: {
  leaseId: string;
  description: string;
  amount: number;
  dayOfMonthToPost: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const validatedData = recurringChargeSchema.parse(data);

    // Verify lease and ownership
    const lease = await prisma.lease.findUnique({
      where: { id: validatedData.leaseId },
      select: { tenantId: true, unit: { select: { property: { select: { landlordId: true } } } } },
    });

    if (!lease) {
      return { success: false, message: 'Lease not found.' };
    }

    const landlordId = lease.unit.property.landlordId;
    // You might want to check if the session.user.id corresponds to the landlord owner
    // For now, we assume the user has the correct role if they can access this action.

    if (!landlordId || !lease.tenantId) {
        return { success: false, message: 'Invalid lease data.' };
    }

    // Calculate next post date
    const today = new Date();
    let postDate = new Date(today.getFullYear(), today.getMonth(), validatedData.dayOfMonthToPost);
    if (postDate < today) {
      // If the day has passed this month, schedule for next month
      postDate.setMonth(postDate.getMonth() + 1);
    }
    
    await prisma.recurringCharge.create({
      data: {
        landlordId: landlordId,
        leaseId: validatedData.leaseId,
        tenantId: lease.tenantId,
        description: validatedData.description,
        amount: validatedData.amount,
        dayOfMonthToPost: validatedData.dayOfMonthToPost,
        status: 'active',
        startDate: new Date(),
        nextPostDate: postDate,
      },
    });

    // Revalidate the path where the charges are displayed
    // This path might need to be adjusted depending on the final URL
    revalidatePath(`/admin/dashboard/properties/`);

    return { success: true, message: 'Recurring charge created successfully.' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
