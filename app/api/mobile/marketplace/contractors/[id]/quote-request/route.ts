/**
 * POST /api/mobile/marketplace/contractors/[id]/quote-request
 *
 * A homeowner / PM / tenant requests a quote from a contractor.
 *
 * We create a minimal `ContractorLead` (so the contractor's CRM picks it up)
 * and then a `ContractorQuote` placeholder in `pending` status. The contractor
 * fills in pricing in their app and the customer accepts/declines.
 *
 * Body:
 *   {
 *     title: string,
 *     description?: string,
 *     serviceType?: string,
 *     budget?: number,        // optional ceiling hint
 *     urgency?: 'low'|'medium'|'high'|'urgent',
 *     attachments?: string[],
 *     address?: { street, city, state, zip }
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { emitMarketplaceCard } from '@/lib/services/marketplace-cards';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { title, description, serviceType, budget, urgency, attachments, address } = body ?? {};
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const contractor = await prisma.contractorProfile.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, userId: true },
    });
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });

    const customer = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, email: true },
    });
    if (!customer) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Create a lead (so it shows up in contractor's leads inbox)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const lead = await (prisma as any).contractorLead.create({
      data: {
        source: 'mobile_quote_request',
        customerName: customer.name ?? 'Customer',
        customerEmail: customer.email ?? `${auth.userId}@no-email.local`,
        customerUserId: auth.userId,
        projectType: serviceType ?? 'general',
        projectTitle: title,
        projectDescription: description ?? title,
        projectPhotos: Array.isArray(attachments) ? attachments : [],
        timeline: urgency === 'urgent' ? 'asap' : urgency === 'high' ? 'this_week' : urgency === 'low' ? 'flexible' : 'this_month',
        urgency: urgency ?? 'normal',
        budgetMax: budget != null ? Number(budget) : null,
        ...(address?.city ? { propertyCity: address.city } : {}),
        ...(address?.state ? { propertyState: address.state } : {}),
        ...(address?.zip ? { propertyZip: address.zip } : {}),
        ...(address?.street ? { propertyAddress: address.street } : {}),
        status: 'new',
        stage: 'new',
        isExclusive: true,
        maxContractors: 1,
        expiresAt,
      },
    });

    // Match it to this specific contractor
    await (prisma as any).contractorLeadMatch.create({
      data: {
        leadId: lead.id,
        contractorId: contractor.id,
        status: 'sent',
      },
    });

    // Placeholder quote in `pending` so contractor can fill it in
    const quote = await prisma.contractorQuote.create({
      data: {
        leadId: lead.id,
        contractorId: contractor.id,
        customerId: auth.userId,
        title,
        description: description ?? null,
        basePrice: 0,
        totalPrice: 0,
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        status: 'pending',
      },
    });

    // Drop a card in the DM with the contractor so they see the request inline
    if (contractor.userId) {
      await emitMarketplaceCard(auth.userId, contractor.userId, {
        kind: 'quote_sent',
        title: 'Quote requested',
        summary: `${customer.name ?? 'A customer'} requested a quote: ${title}`,
        refId: quote.id,
        refType: 'quote',
        details: {
          urgency: urgency ?? 'normal',
          ...(budget != null ? { budget: Number(budget) } : {}),
        },
      }, { senderName: customer.name ?? undefined });
    }

    return NextResponse.json({
      success: true,
      lead: { id: lead.id },
      quote: { id: quote.id, status: quote.status },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[mobile/marketplace/quote-request]', error);
    return NextResponse.json({ error: error?.message || 'Could not request quote' }, { status: 500 });
  }
}
