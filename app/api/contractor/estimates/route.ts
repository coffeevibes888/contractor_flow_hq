import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';

/**
 * GET /api/contractor/estimates
 * Fetch contractor's estimates. Checks ContractorProfile first (standalone),
 * falls back to PM-side Contractor for legacy compatibility.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const templatesOnly = searchParams.get('templates') === 'true';
    const status = searchParams.get('status');
    const trade = searchParams.get('trade');
    const search = searchParams.get('search');

    // Primary: ContractorProfile (standalone contractor platform)
    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    // Fallback: PM-side Contractor (legacy/marketplace)
    const contractors = await prisma.contractor.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!profile && contractors.length === 0) {
      return NextResponse.json({ estimates: [], templates: [] });
    }

    // Build OR condition to get estimates from both identity types
    const orConditions: any[] = [];
    if (profile) orConditions.push({ contractorProfileId: profile.id });
    if (contractors.length > 0) orConditions.push({ contractorId: { in: contractors.map(c => c.id) } });

    const where: any = {
      OR: orConditions,
      isTemplate: templatesOnly,
    };
    if (status) where.status = status;
    if (trade) where.trade = trade;
    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { estimateNumber: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const estimates = await prisma.contractorEstimate.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        landlord: { select: { id: true, name: true, companyName: true } },
        workOrder: { select: { id: true, title: true, property: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ estimates });
  } catch (error) {
    console.error('Error fetching estimates:', error);
    return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 });
  }
}

/**
 * POST /api/contractor/estimates
 * Create new estimate or template. Uses ContractorProfile as primary identity.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      attachmentUrl,
      // Legacy PM-side fields (optional)
      landlordId,
      workOrderId,
    } = body;

    // Get ContractorProfile (primary)
    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    // Fallback to PM-side Contractor
    let contractorId: string | null = null;
    if (!profile) {
      const contractor = await prisma.contractor.findFirst({
        where: { userId: session.user.id },
      });
      if (!contractor) {
        return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
      }
      contractorId = contractor.id;
    }

    // Resolve or create customer (only for ContractorProfile path)
    let resolvedCustomerId: string | null = customerId || null;
    if (!resolvedCustomerId && customerName && profile && !isTemplate) {
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
    const profileId = profile?.id;
    if (profileId && !isTemplate) {
      const count = await prisma.contractorEstimate.count({
        where: { contractorProfileId: profileId, isTemplate: false },
      });
      var estimateNumber: string | null = `EST-${String(count + 1).padStart(4, '0')}`;
    } else {
      var estimateNumber: string | null = null;
    }

    const estimate = await prisma.contractorEstimate.create({
      data: {
        contractorProfileId: profile?.id || null,
        contractorId: contractorId,
        customerId: resolvedCustomerId,
        landlordId: landlordId || null,
        workOrderId: workOrderId || null,
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
        attachmentUrl: attachmentUrl || null,
        notes: notes || null,
        customerNotes: customerNotes || null,
        termsConditions: termsConditions || null,
        photos,
      },
    });

    // Emit event for real estimates
    if (!isTemplate) {
      await eventBus.emit('contractor.estimate.created', {
        estimateId: estimate.id,
        contractorId: estimate.contractorId,
        contractorProfileId: estimate.contractorProfileId,
        contractorUserId: session.user.id,
        title: estimate.title,
        totalAmount: Number(estimate.totalAmount),
        landlordId: estimate.landlordId,
        workOrderId: estimate.workOrderId,
      });
    }

    return NextResponse.json({ estimate });
  } catch (error) {
    console.error('Error creating estimate:', error);
    return NextResponse.json({ error: 'Failed to create estimate' }, { status: 500 });
  }
}
