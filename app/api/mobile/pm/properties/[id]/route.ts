/**
 * GET /api/mobile/pm/properties/:id
 *
 * Returns a single property with full detail used by the mobile property card:
 *   - identity (name, type, address, cover image)
 *   - units (with availability + rent)
 *   - tenants on those units (current + past)
 *   - financial summary (rent collected, scheduled, expenses MTD)
 *   - recent documents
 *   - upcoming maintenance
 *
 * Mirrors the layout of the website's tenants admin tabs but consolidated into
 * a single round-trip so the mobile detail page renders instantly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 404 });

    const property = await prisma.property.findFirst({
      where: { id, landlordId: landlord.id, status: { not: 'deleted' } },
      include: {
        units: {
          include: {
            leases: {
              include: {
                tenant: { select: { id: true, name: true, email: true, image: true } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // ── Aggregate tenants across all units (current & past) ────────────────
    const currentTenants: any[] = [];
    const pastTenants: any[] = [];
    for (const unit of property.units) {
      for (const lease of unit.leases) {
        if (!lease.tenant) continue;
        const entry = {
          tenantId: lease.tenant.id,
          tenantName: lease.tenant.name,
          tenantEmail: lease.tenant.email,
          tenantImage: lease.tenant.image,
          leaseId: lease.id,
          leaseStatus: lease.status,
          unitId: unit.id,
          unitName: unit.name,
          rentAmount: Number(lease.rentAmount ?? unit.rentAmount ?? 0),
          startDate: lease.startDate,
          endDate: lease.endDate,
          tenantSigned: !!lease.tenantSignedAt,
          landlordSigned: !!lease.landlordSignedAt,
        };
        if (lease.status === 'active' || lease.status === 'pending_signature') {
          currentTenants.push(entry);
        } else {
          pastTenants.push(entry);
        }
      }
    }

    // ── Financial snapshot ─────────────────────────────────────────────────
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [collectedThisMonth, scheduledThisMonth, expenses, openTickets, recentDocs] = await Promise.all([
      prisma.rentPayment.aggregate({
        where: {
          lease: { unit: { propertyId: property.id } },
          status: 'paid',
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.rentPayment.aggregate({
        where: {
          lease: { unit: { propertyId: property.id } },
          dueDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { propertyId: property.id, incurredAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.maintenanceTicket.count({
        where: { unit: { propertyId: property.id }, status: { in: ['open', 'in_progress'] } },
      }),
      prisma.document.findMany({
        where: {
          landlordId: landlord.id,
          relatedToType: 'property',
          relatedToId: property.id,
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          name: true,
          category: true,
          fileUrl: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
      }),
    ]);

    const totalUnits = property.units.length;
    const occupiedUnits = property.units.filter(
      (u) => u.leases.some((l) => l.status === 'active'),
    ).length;
    const totalRent = property.units.reduce(
      (sum, u) => sum + Number(u.rentAmount ?? 0),
      0,
    );

    return NextResponse.json({
      property: {
        id: property.id,
        name: property.name,
        slug: property.slug,
        type: property.type,
        // address is a JSON object: { street, city, state, zip, lat?, lng? }
        address: (property.address as any) ?? {},
        coverImage: property.units[0]?.images?.[0] ?? null,
        description: property.description ?? null,
        amenities: property.amenities ?? [],
        createdAt: property.createdAt,
      },
      stats: {
        totalUnits,
        occupiedUnits,
        availableUnits: totalUnits - occupiedUnits,
        occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
        totalRentScheduled: totalRent,
        collectedThisMonth: Number(collectedThisMonth._sum.amount ?? 0),
        scheduledThisMonth: Number(scheduledThisMonth._sum.amount ?? 0),
        expensesThisMonth: Number(expenses._sum.amount ?? 0),
        openTickets,
      },
      units: property.units.map((u) => ({
        id: u.id,
        name: u.name,
        rentAmount: Number(u.rentAmount ?? 0),
        isAvailable: u.isAvailable,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms ? Number(u.bathrooms) : null,
        sizeSqFt: u.sizeSqFt,
        currentTenant: u.leases.find((l) => l.status === 'active')?.tenant ?? null,
      })),
      currentTenants,
      pastTenants,
      recentDocuments: recentDocs,
    });
  } catch (e: any) {
    console.error('property detail', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


/**
 * DELETE /api/mobile/pm/properties/:id
 *
 * Soft-deletes (archives) a property after verifying landlord ownership.
 * Mirrors the website's `deletePropertyById` server action so behavior is
 * consistent across web and mobile:
 *
 *   - Blocks if any rent payments are pending or paid-but-not-yet-credited
 *     to the wallet (returns 409 with `canForce: true` so the client can
 *     prompt the PM to override).
 *   - Blocks if any leases are active or pending (same override pattern).
 *   - On success, sets `status = 'deleted'` and `deletedAt = now()` instead
 *     of hard-deleting, preserving historical payment records.
 *
 * Pass `?force=1` (or `force=true` in the body) to override warnings.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Allow the override flag via query string (?force=1) or JSON body.
    const url = new URL(req.url);
    let force = url.searchParams.get('force') === '1' || url.searchParams.get('force') === 'true';
    if (!force && req.headers.get('content-length')) {
      try {
        const body = (await req.json()) as { force?: boolean } | null;
        if (body?.force) force = true;
      } catch {
        // body absent / not JSON — ignore
      }
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 403 });

    const property = await prisma.property.findFirst({
      where: { id, landlordId: landlord.id },
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
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // ── Uncredited payments check ──────────────────────────────────────────
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
    if (uncreditedPaymentCount > 0 && !force) {
      return NextResponse.json(
        {
          success: false,
          canForce: true,
          warningType: 'payments',
          uncreditedPaymentCount,
          totalUncreditedAmount,
          message: `There are ${uncreditedPaymentCount} payment(s) totaling $${totalUncreditedAmount.toFixed(2)} that haven't been credited to your wallet yet.`,
        },
        { status: 409 },
      );
    }

    // ── Active lease check ─────────────────────────────────────────────────
    const activeLeases = await prisma.lease.count({
      where: {
        unit: { propertyId: property.id },
        status: { in: ['active', 'pending'] },
      },
    });
    if (activeLeases > 0 && !force) {
      return NextResponse.json(
        {
          success: false,
          canForce: true,
          warningType: 'leases',
          activeLeases,
          message: `This property has ${activeLeases} active lease(s).`,
        },
        { status: 409 },
      );
    }

    // ── Soft delete (archive) — preserves payment history ──────────────────
    await prisma.property.update({
      where: { id: property.id },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
      },
    });

    const message =
      force && (uncreditedPaymentCount > 0 || activeLeases > 0)
        ? `Property archived. ${
            uncreditedPaymentCount > 0
              ? `${uncreditedPaymentCount} uncredited payment(s) may be affected. `
              : ''
          }${activeLeases > 0 ? `${activeLeases} active lease(s) were terminated. ` : ''}Historical records preserved.`
        : 'Property archived. Historical payment records preserved.';

    return NextResponse.json({ success: true, message });
  } catch (e: any) {
    console.error('property delete', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/mobile/pm/properties/:id
 *
 * Quick-edit the high-frequency property fields from the mobile app:
 *   - name, type, description
 *   - address (full object — street/city/state/zip), preserving any
 *     pre-geocoded lat/lng that already exists
 *   - amenities (replaces the array)
 *   - images (replaces images on the *first* unit, which is what the
 *     mobile detail screen reads as `coverImage`)
 *
 * Anything else (units, pricing, photos beyond the cover, complex setup)
 * is intentionally out of scope — those flow through the full website
 * wizard at /admin/products/:id/edit.
 */
interface PatchPayload {
  name?: string;
  type?: string;
  description?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  amenities?: string[];
  images?: string[];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 403 });

    const existing = await prisma.property.findFirst({
      where: { id, landlordId: landlord.id, status: { not: 'deleted' } },
      include: {
        units: { orderBy: { createdAt: 'asc' }, take: 1, select: { id: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as PatchPayload;

    // Build the update payload only with provided fields so partial PATCH
    // requests don't overwrite untouched columns with empties.
    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
    if (typeof body.type === 'string' && body.type.trim()) data.type = body.type.trim();
    if (body.description !== undefined) data.description = body.description ?? null;
    if (Array.isArray(body.amenities)) data.amenities = body.amenities;

    if (body.address) {
      // Merge with whatever's already stored so we keep lat/lng + any extra fields.
      const current = (existing as any).address ?? {};
      data.address = {
        ...current,
        street: body.address.street ?? current.street ?? null,
        city: body.address.city ?? current.city ?? null,
        state: body.address.state ?? current.state ?? null,
        zip: body.address.zip ?? current.zip ?? null,
      };
    }

    await prisma.property.update({ where: { id: existing.id }, data });

    // Cover image lives on the first unit — replace its `images` array if
    // the client sent one. We deliberately don't touch other units.
    if (Array.isArray(body.images) && existing.units[0]) {
      await prisma.unit.update({
        where: { id: existing.units[0].id },
        data: { images: body.images },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('property patch', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
