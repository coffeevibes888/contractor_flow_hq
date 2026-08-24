import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

/**
 * POST /api/mobile/contractor/estimates/[id]/duplicate
 *
 * Creates a copy of an estimate (or template) as a new draft.
 * Useful for:
 * - Creating a new estimate from a template
 * - Revising a sent estimate (duplicate → edit → send new version)
 *
 * Accepts optional body: { customerId?: string, title?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { id } = await params;

    const source = await prisma.contractorEstimate.findUnique({
      where: { id },
    });

    if (!source) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }
    if (source.contractorProfileId !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse optional overrides
    let overrideCustomerId: string | null = null;
    let overrideTitle: string | null = null;
    try {
      const body = await req.json();
      overrideCustomerId = body.customerId || null;
      overrideTitle = body.title || null;
    } catch {
      // No body is fine
    }

    // Generate new estimate number
    const count = await prisma.contractorEstimate.count({
      where: { contractorProfileId: profile.id, isTemplate: false },
    });
    const estimateNumber = `EST-${String(count + 1).padStart(4, '0')}`;

    const duplicate = await prisma.contractorEstimate.create({
      data: {
        contractorProfileId: profile.id,
        customerId: overrideCustomerId || (source.isTemplate ? null : source.customerId),
        estimateNumber,
        title: overrideTitle || `${source.title} (Copy)`,
        description: source.description,
        trade: source.trade,
        category: source.category,
        lineItems: source.lineItems as any,
        laborCost: source.laborCost,
        materialsCost: source.materialsCost,
        markup: source.markup,
        discount: source.discount,
        taxRate: source.taxRate,
        totalAmount: source.totalAmount,
        tiers: source.tiers as any ?? undefined,
        measurements: source.measurements as any ?? undefined,
        estimatedHours: source.estimatedHours,
        validUntil: null, // Don't copy expiration
        status: 'draft',
        isTemplate: false, // Duplicates are always real estimates, not templates
        notes: source.notes,
        customerNotes: source.customerNotes,
        termsConditions: source.termsConditions,
        photos: source.photos,
      },
    });

    return NextResponse.json({ success: true, id: duplicate.id, estimateNumber });
  } catch (error) {
    console.error('[mobile/contractor/estimates/[id]/duplicate POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
