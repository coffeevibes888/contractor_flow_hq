import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

/**
 * GET /api/mobile/contractor/estimates
 * List estimates for the authenticated contractor (ContractorProfile).
 * Supports ?status=draft|sent|accepted&search=text&trade=roofing
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const trade = searchParams.get('trade');
    const templatesOnly = searchParams.get('templates') === 'true';

    const where: any = {
      contractorProfileId: profile.id,
      isTemplate: templatesOnly,
    };
    if (status) where.status = status;
    if (trade) where.trade = trade;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { estimateNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const estimates = await prisma.contractorEstimate.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      estimates: estimates.map((e) => ({
        id: e.id,
        estimateNumber: e.estimateNumber,
        title: e.title,
        description: e.description,
        trade: e.trade,
        category: e.category,
        status: e.status,
        totalAmount: Number(e.totalAmount),
        laborCost: Number(e.laborCost),
        materialsCost: Number(e.materialsCost),
        markup: Number(e.markup),
        discount: Number(e.discount),
        taxRate: Number(e.taxRate),
        estimatedHours: e.estimatedHours ? Number(e.estimatedHours) : null,
        validUntil: e.validUntil?.toISOString() || null,
        isTemplate: e.isTemplate,
        templateName: e.templateName,
        customer: e.customer
          ? { id: e.customer.id, name: e.customer.name, email: e.customer.email, phone: e.customer.phone }
          : null,
        hasTiers: !!(e.tiers && (e.tiers as any[]).length > 0),
        photos: e.photos || [],
        sentAt: e.sentAt?.toISOString() || null,
        viewedAt: e.viewedAt?.toISOString() || null,
        acceptedAt: e.acceptedAt?.toISOString() || null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[mobile/contractor/estimates GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/mobile/contractor/estimates
 * Create a new estimate (or template).
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const {
      title,
      description,
      trade,
      category,
      customerName,
      customerEmail,
      customerPhone,
      customerId,
      lineItems = [],
      laborCost = 0,
      materialsCost = 0,
      markup = 0,
      discount = 0,
      taxRate = 0,
      estimatedHours,
      validUntil,
      tiers,
      measurements,
      notes,
      customerNotes,
      termsConditions,
      photos = [],
      isTemplate = false,
      templateName,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!isTemplate && !customerName && !customerId) {
      return NextResponse.json({ error: 'Customer name or ID is required for estimates' }, { status: 400 });
    }
    if (lineItems.length === 0 && (!tiers || tiers.length === 0)) {
      return NextResponse.json({ error: 'At least one line item or tier is required' }, { status: 400 });
    }

    // Resolve or create customer
    let resolvedCustomerId: string | null = customerId || null;
    if (!resolvedCustomerId && customerName && !isTemplate) {
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

    // Calculate totals
    const lineItemsTotal = lineItems.reduce(
      (sum: number, item: any) => sum + (Number(item.qty) || Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
      0
    );
    const subtotal = lineItemsTotal + Number(laborCost) + Number(materialsCost);
    const markupAmount = subtotal * (Number(markup) / 100);
    const afterMarkup = subtotal + markupAmount;
    const afterDiscount = afterMarkup - Number(discount);
    const taxAmount = afterDiscount * (Number(taxRate) / 100);
    const totalAmount = afterDiscount + taxAmount;

    // Generate estimate number
    const count = await prisma.contractorEstimate.count({
      where: { contractorProfileId: profile.id, isTemplate: false },
    });
    const estimateNumber = isTemplate ? null : `EST-${String(count + 1).padStart(4, '0')}`;

    const estimate = await prisma.contractorEstimate.create({
      data: {
        contractorProfileId: profile.id,
        customerId: resolvedCustomerId,
        estimateNumber,
        title,
        description: description || null,
        trade: trade || null,
        category: category || null,
        lineItems,
        laborCost: Number(laborCost),
        materialsCost: Number(materialsCost),
        markup: Number(markup),
        discount: Number(discount),
        taxRate: Number(taxRate),
        totalAmount,
        tiers: tiers || undefined,
        measurements: measurements || undefined,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        status: 'draft',
        isTemplate,
        templateName: isTemplate ? (templateName || title) : null,
        notes: notes || null,
        customerNotes: customerNotes || null,
        termsConditions: termsConditions || null,
        photos,
      },
    });

    return NextResponse.json({ success: true, id: estimate.id, estimateNumber });
  } catch (error) {
    console.error('[mobile/contractor/estimates POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
