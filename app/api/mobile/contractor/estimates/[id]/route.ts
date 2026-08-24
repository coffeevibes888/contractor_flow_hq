import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

/**
 * GET /api/mobile/contractor/estimates/[id]
 * Fetch a single estimate with full details.
 */
export async function GET(
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

    const estimate = await prisma.contractorEstimate.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, address: true },
        },
      },
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    // Verify ownership
    if (estimate.contractorProfileId !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      estimate: {
        id: estimate.id,
        estimateNumber: estimate.estimateNumber,
        title: estimate.title,
        description: estimate.description,
        trade: estimate.trade,
        category: estimate.category,
        status: estimate.status,
        lineItems: estimate.lineItems,
        laborCost: Number(estimate.laborCost),
        materialsCost: Number(estimate.materialsCost),
        markup: Number(estimate.markup),
        discount: Number(estimate.discount),
        taxRate: Number(estimate.taxRate),
        totalAmount: Number(estimate.totalAmount),
        tiers: estimate.tiers,
        measurements: estimate.measurements,
        estimatedHours: estimate.estimatedHours ? Number(estimate.estimatedHours) : null,
        validUntil: estimate.validUntil?.toISOString() || null,
        isTemplate: estimate.isTemplate,
        templateName: estimate.templateName,
        attachmentUrl: estimate.attachmentUrl,
        photos: estimate.photos || [],
        notes: estimate.notes,
        customerNotes: estimate.customerNotes,
        termsConditions: estimate.termsConditions,
        customer: estimate.customer
          ? {
              id: estimate.customer.id,
              name: estimate.customer.name,
              email: estimate.customer.email,
              phone: estimate.customer.phone,
              address: estimate.customer.address,
            }
          : null,
        sentAt: estimate.sentAt?.toISOString() || null,
        viewedAt: estimate.viewedAt?.toISOString() || null,
        respondedAt: estimate.respondedAt?.toISOString() || null,
        acceptedAt: estimate.acceptedAt?.toISOString() || null,
        declinedAt: estimate.declinedAt?.toISOString() || null,
        convertedAt: estimate.convertedAt?.toISOString() || null,
        createdAt: estimate.createdAt.toISOString(),
        updatedAt: estimate.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[mobile/contractor/estimates/[id] GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/mobile/contractor/estimates/[id]
 * Update an existing estimate.
 */
export async function PUT(
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

    const existing = await prisma.contractorEstimate.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }
    if (existing.contractorProfileId !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only drafts can be fully edited
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft estimates can be edited. Duplicate this estimate to make changes.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      trade,
      category,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      lineItems,
      laborCost,
      materialsCost,
      markup,
      discount,
      taxRate,
      estimatedHours,
      validUntil,
      tiers,
      measurements,
      notes,
      customerNotes,
      termsConditions,
      photos,
      templateName,
    } = body;

    // Resolve customer if name provided
    let resolvedCustomerId = customerId ?? existing.customerId;
    if (!customerId && customerName) {
      let customer = await prisma.contractorCustomer.findFirst({
        where: { contractorId: profile.id, name: customerName },
      });
      if (!customer) {
        customer = await prisma.contractorCustomer.create({
          data: {
            contractorId: profile.id,
            name: customerName,
            email: customerEmail || '',
            phone: customerPhone || null,
          },
        });
      }
      resolvedCustomerId = customer.id;
    }

    // Recalculate total if pricing fields changed
    const finalLineItems = lineItems ?? existing.lineItems;
    const finalLaborCost = laborCost ?? Number(existing.laborCost);
    const finalMaterialsCost = materialsCost ?? Number(existing.materialsCost);
    const finalMarkup = markup ?? Number(existing.markup);
    const finalDiscount = discount ?? Number(existing.discount);
    const finalTaxRate = taxRate ?? Number(existing.taxRate);

    const lineItemsTotal = (finalLineItems as any[]).reduce(
      (sum: number, item: any) => sum + (Number(item.qty) || Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
      0
    );
    const subtotal = lineItemsTotal + Number(finalLaborCost) + Number(finalMaterialsCost);
    const markupAmount = subtotal * (Number(finalMarkup) / 100);
    const afterMarkup = subtotal + markupAmount;
    const afterDiscount = afterMarkup - Number(finalDiscount);
    const taxAmount = afterDiscount * (Number(finalTaxRate) / 100);
    const totalAmount = afterDiscount + taxAmount;

    const estimate = await prisma.contractorEstimate.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        trade: trade !== undefined ? trade : existing.trade,
        category: category !== undefined ? category : existing.category,
        customerId: resolvedCustomerId,
        lineItems: lineItems ?? existing.lineItems,
        laborCost: Number(finalLaborCost),
        materialsCost: Number(finalMaterialsCost),
        markup: Number(finalMarkup),
        discount: Number(finalDiscount),
        taxRate: Number(finalTaxRate),
        totalAmount,
        tiers: tiers !== undefined ? tiers : existing.tiers,
        measurements: measurements !== undefined ? measurements : existing.measurements,
        estimatedHours: estimatedHours !== undefined ? (estimatedHours ? Number(estimatedHours) : null) : existing.estimatedHours,
        validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : existing.validUntil,
        notes: notes !== undefined ? notes : existing.notes,
        customerNotes: customerNotes !== undefined ? customerNotes : existing.customerNotes,
        termsConditions: termsConditions !== undefined ? termsConditions : existing.termsConditions,
        photos: photos !== undefined ? photos : existing.photos,
        templateName: templateName !== undefined ? templateName : existing.templateName,
      },
    });

    return NextResponse.json({ success: true, id: estimate.id, totalAmount: Number(estimate.totalAmount) });
  } catch (error) {
    console.error('[mobile/contractor/estimates/[id] PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/mobile/contractor/estimates/[id]
 * Delete an estimate (only drafts, or force=true for any status).
 */
export async function DELETE(
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
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    const existing = await prisma.contractorEstimate.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }
    if (existing.contractorProfileId !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Prevent accidental deletion of sent/accepted estimates
    if (!force && existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft estimates can be deleted. Use force=true to delete regardless of status.' },
        { status: 400 }
      );
    }

    await prisma.contractorEstimate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[mobile/contractor/estimates/[id] DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
