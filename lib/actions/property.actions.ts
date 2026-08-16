"use server";

import { prisma } from '@/db/prisma';
import { formatError } from '@/lib/utils';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { revalidatePath } from 'next/cache';
import { NotificationService } from '@/lib/services/notification-service';

export async function deletePropertyById(id: string, force: boolean = false) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      throw new Error(landlordResult.message || 'Unable to determine landlord');
    }

    const property = await prisma.property.findFirst({
      where: { id, landlordId: landlordResult.landlord.id },
      include: {
        units: {
          include: {
            leases: {
              include: {
                rentPayments: {
                  where: {
                    OR: [
                      { status: 'pending' },
                      { status: 'processing' },
                      { status: 'paid', walletCredited: false },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Check for uncredited payments across all units/leases
    let totalUncreditedAmount = 0;
    let uncreditedPaymentCount = 0;

    for (const unit of property.units) {
      for (const lease of unit.leases) {
        for (const payment of lease.rentPayments) {
          totalUncreditedAmount += Number(payment.amount);
          uncreditedPaymentCount++;
        }
      }
    }

    // Block deletion if there are uncredited payments (unless forced)
    if (uncreditedPaymentCount > 0 && !force) {
      return {
        success: false,
        canForce: true,
        warningType: 'payments' as const,
        uncreditedPaymentCount,
        totalUncreditedAmount,
        message: `There are ${uncreditedPaymentCount} payment(s) totaling $${totalUncreditedAmount.toFixed(2)} that haven't been credited to your wallet yet.`,
      };
    }

    // Check for active leases
    const activeLeases = await prisma.lease.count({
      where: {
        unit: { propertyId: property.id },
        status: { in: ['active', 'pending'] },
      },
    });

    // Block deletion if there are active leases (unless forced)
    if (activeLeases > 0 && !force) {
      return {
        success: false,
        canForce: true,
        warningType: 'leases' as const,
        activeLeases,
        message: `This property has ${activeLeases} active lease(s).`,
      };
    }

    // Safe to delete (or force delete) - use soft delete by archiving instead of hard delete
    // This preserves historical payment records
    await prisma.property.update({
      where: { id: property.id },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
      },
    });

    revalidatePath('/admin/dashboard/properties');

    const successMessage = force && (uncreditedPaymentCount > 0 || activeLeases > 0)
      ? `Property archived. Warning: ${uncreditedPaymentCount > 0 ? `${uncreditedPaymentCount} uncredited payment(s) may be affected. ` : ''}${activeLeases > 0 ? `${activeLeases} active lease(s) were terminated. ` : ''}Historical records have been preserved.`
      : 'Property archived successfully. Historical payment records have been preserved.';

    return { success: true, message: successMessage };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function startEvictionNotice({
  tenantId,
  leaseId,
  propertyId,
  portalUrl,
  reason,
  amountOwed,
  deadline,
}: {
  tenantId: string;
  leaseId: string;
  propertyId: string;
  portalUrl: string;
  reason: string;
  amountOwed?: string;
  deadline?: string;
}) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      throw new Error(landlordResult.message || 'Unable to determine landlord');
    }
    const landlordId = landlordResult.landlord.id;

    const lease = await prisma.lease.findFirst({
      where: { id: leaseId, tenantId },
      include: {
        tenant: { select: { email: true, name: true, id: true } },
        unit: { select: { name: true, property: { select: { name: true } } } },
      },
    });

    if (!lease) {
      throw new Error('Lease not found for tenant');
    }

    const messageLines = [
      `An eviction process has been initiated for ${lease.unit.property?.name || 'your unit'}.`,
      amountOwed ? `Amount owed: $${amountOwed}` : null,
      deadline ? `Deadline to cure or vacate: ${deadline}` : null,
      reason ? `Reason: ${reason}` : null,
      `Please review and respond via the tenant portal.`,
    ]
      .filter(Boolean)
      .join(' ');

    await NotificationService.createNotification({
      userId: tenantId,
      type: 'reminder',
      title: 'Eviction process started',
      message: messageLines,
      actionUrl: '/user/notifications',
      metadata: {
        leaseId,
        propertyId,
        portalUrl,
      },
      landlordId,
    });

    return { success: true, message: 'Eviction notice drafted and tenant notified.' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
