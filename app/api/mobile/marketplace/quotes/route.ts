/**
 * POST /api/mobile/marketplace/quotes
 *
 * Contractor-side: send a digital quote in response to a lead/quote-request.
 * Updates the existing placeholder ContractorQuote (or creates one) with
 * pricing and notifies the customer.
 *
 * Body:
 *   {
 *     leadId: string,                   // ContractorLead id from quote-request
 *     existingQuoteId?: string,         // pass to update the placeholder created at request time
 *     title: string,
 *     description?: string,
 *     projectScope?: string,
 *     deliverables?: string[],
 *     basePrice: number,
 *     discount?: number,
 *     tax?: number,
 *     totalPrice: number,               // basePrice - discount + tax
 *     estimatedHours?: number,
 *     hourlyRate?: number,
 *     startDate?: ISO,
 *     completionDate?: ISO,
 *     paymentTerms?: string,
 *     warranty?: string,
 *     notes?: string,
 *     validDays?: number                // default 7
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { emitMarketplaceCard } from '@/lib/services/marketplace-cards';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const {
      leadId,
      existingQuoteId,
      title,
      description,
      projectScope,
      deliverables,
      basePrice,
      discount = 0,
      tax = 0,
      totalPrice,
      estimatedHours,
      hourlyRate,
      startDate,
      completionDate,
      paymentTerms,
      warranty,
      notes,
      validDays = 7,
    } = body ?? {};

    if (!leadId || !title || basePrice == null) {
      return NextResponse.json(
        { error: 'leadId, title, and basePrice are required' },
        { status: 400 },
      );
    }

    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: auth.userId },
      select: { id: true },
    });
    if (!contractor) {
      return NextResponse.json({ error: 'You need a contractor profile to send quotes' }, { status: 403 });
    }

    const db = prisma as any;
    const lead = await db.contractorLead.findUnique({
      where: { id: leadId },
      select: { id: true, customerId: true, customerUserId: true },
    });
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const customerId = lead.customerUserId ?? lead.customerId;
    if (!customerId) {
      return NextResponse.json({ error: 'Lead has no customer attached' }, { status: 400 });
    }

    const validUntil = new Date(Date.now() + Math.max(1, validDays) * 24 * 60 * 60 * 1000);

    const dataPayload = {
      leadId,
      contractorId: contractor.id,
      customerId,
      title,
      description: description ?? null,
      projectScope: projectScope ?? null,
      deliverables: Array.isArray(deliverables) ? deliverables : [],
      basePrice: Number(basePrice),
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      totalPrice: Number(totalPrice ?? basePrice),
      estimatedHours: estimatedHours != null ? Number(estimatedHours) : null,
      hourlyRate: hourlyRate != null ? Number(hourlyRate) : null,
      startDate: startDate ? new Date(startDate) : null,
      completionDate: completionDate ? new Date(completionDate) : null,
      paymentTerms: paymentTerms ?? null,
      warranty: warranty ?? null,
      notes: notes ?? null,
      validUntil,
      status: 'pending',
    };

    let quote;
    if (existingQuoteId) {
      quote = await prisma.contractorQuote.update({
        where: { id: existingQuoteId },
        data: dataPayload,
      });
    } else {
      quote = await prisma.contractorQuote.create({ data: dataPayload });
    }

    // Drop a Quote card into the DM thread with the customer
    const sender = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true },
    });
    await emitMarketplaceCard(auth.userId, customerId, {
      kind: 'quote_sent',
      title: 'Quote sent',
      summary: `${sender?.name ?? 'Contractor'} sent a quote: ${title}`,
      amount: Number(totalPrice ?? basePrice),
      refId: quote.id,
      refType: 'quote',
      details: {
        validUntil: validUntil.toISOString(),
      },
    }, { senderName: sender?.name ?? undefined });

    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      status: quote.status,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[mobile/marketplace/quotes POST]', error);
    return NextResponse.json({ error: error?.message || 'Could not send quote' }, { status: 500 });
  }
}
