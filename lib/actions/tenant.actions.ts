'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { formatError } from '../utils';
import { getOrCreateCurrentLandlord } from './landlord.actions';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hash } from '../encrypt';
import { randomUUID } from 'crypto';
import { addTenantSchema, type AddTenantInput } from '../validators';

export async function addTenantToProperty(data: AddTenantInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message || 'Unable to determine landlord' };
    }

    const landlordId = landlordResult.landlord.id;
    const validated = addTenantSchema.parse(data);

    // Verify property belongs to landlord
    const property = await prisma.property.findFirst({
      where: { id: validated.propertyId, landlordId },
    });

    if (!property) {
      return { success: false, message: 'Property not found or access denied' };
    }

    // Verify unit belongs to property
    const unit = await prisma.unit.findFirst({
      where: { id: validated.unitId, propertyId: validated.propertyId },
    });

    if (!unit) {
      return { success: false, message: 'Unit not found in this property' };
    }

    // Check if unit already has an active lease
    const existingLease = await prisma.lease.findFirst({
      where: {
        unitId: validated.unitId,
        status: { in: ['active', 'pending', 'pending_signature'] },
      },
    });

    if (existingLease) {
      return { success: false, message: 'This unit already has an active lease' };
    }

    // Check if user with this email already exists
    let tenant = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    const fullName = `${validated.firstName} ${validated.lastName}`;
    const tempPassword = randomUUID().slice(0, 12);

    if (!tenant) {
      // Create new user for tenant
      tenant = await prisma.user.create({
        data: {
          name: fullName,
          email: validated.email,
          phoneNumber: validated.phone || null,
          password: await hash(tempPassword),
          role: 'user',
          emailVerified: null, // Will be verified when they sign up
        },
      });
    }

    let lease = null;

    if (validated.createLeaseImmediately) {
      // If a pre-built LegalDocument was provided (e.g. from the free lease
      // builder onboarding flow), create the lease as pending_signature so
      // the tenant can sign immediately via /sign/[token].
      // Otherwise fall back to the legacy 'pending' status.
      const hasDocument = !!validated.legalDocumentId;

      lease = await prisma.lease.create({
        data: {
          unitId: validated.unitId,
          tenantId: tenant.id,
          startDate: new Date(validated.leaseStartDate),
          endDate: validated.leaseEndDate ? new Date(validated.leaseEndDate) : null,
          rentAmount: validated.rentAmount,
          billingDayOfMonth: validated.billingDayOfMonth,
          status: hasDocument ? 'pending_signature' : 'pending',
          ...(hasDocument ? { legalDocumentId: validated.legalDocumentId } : {}),
          ...(hasDocument ? { generatedFrom: 'auto', generatedAt: new Date() } : {}),
        },
      });

      // Mark unit as unavailable
      await prisma.unit.update({
        where: { id: validated.unitId },
        data: { isAvailable: false },
      });

      // Fire lease-create event so rent schedules are set up automatically
      // once the tenant signs (handled by the event system).
      if (hasDocument) {
        try {
          const { dbTriggers } = await import('@/lib/event-system');
          await dbTriggers.onLeaseCreate(lease);
        } catch (eventErr) {
          console.error('[addTenantToProperty] Failed to emit lease event:', eventErr);
          // Non-fatal — the lease is created; events can be replayed.
        }
      }
    }

    // Note: TenantHistory is for historical records of past tenants
    // Current tenant info is stored in the Lease and User models

    revalidatePath('/admin/leases');
    revalidatePath('/admin/tenants');
    revalidatePath('/admin/dashboard/properties');

    return {
      success: true,
      message: `Tenant ${fullName} added successfully${lease ? ' with lease created' : ''}`,
      tenantId: tenant.id,
      leaseId: lease?.id,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0].message };
    }
    return { success: false, message: formatError(error) };
  }
}

// Get properties with units for tenant assignment
export async function getPropertiesWithUnits() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', properties: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message, properties: [] };
    }

    const properties = await prisma.property.findMany({
      where: {
        landlordId: landlordResult.landlord.id,
        status: { not: 'deleted' },
      },
      select: {
        id: true,
        name: true,
        address: true,
        units: {
          select: {
            id: true,
            name: true,
            type: true,
            rentAmount: true,
            isAvailable: true,
            bedrooms: true,
            bathrooms: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Serialize Decimal values
    const serialized = properties.map(p => ({
      ...p,
      units: p.units.map(u => ({
        ...u,
        rentAmount: Number(u.rentAmount),
        bathrooms: u.bathrooms ? Number(u.bathrooms) : null,
      })),
    }));

    return { success: true, properties: serialized };
  } catch (error) {
    return { success: false, message: formatError(error), properties: [] };
  }
}

// Get tenants for a landlord
export async function getLandlordTenants() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', tenants: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message, tenants: [] };
    }

    const leases = await prisma.lease.findMany({
      where: {
        unit: {
          property: {
            landlordId: landlordResult.landlord.id,
          },
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
            property: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const tenants = leases.map(lease => ({
      id: lease.tenant.id,
      name: lease.tenant.name,
      email: lease.tenant.email,
      phone: lease.tenant.phoneNumber,
      leaseId: lease.id,
      leaseStatus: lease.status,
      unitName: lease.unit.name,
      propertyName: lease.unit.property.name,
      propertyId: lease.unit.property.id,
      rentAmount: Number(lease.rentAmount),
      startDate: lease.startDate,
      endDate: lease.endDate,
    }));

    return { success: true, tenants };
  } catch (error) {
    return { success: false, message: formatError(error), tenants: [] };
  }
}
