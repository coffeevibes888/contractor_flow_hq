/**
 * GET /api/mobile/marketplace/my-quote-requests
 *
 * Contractor-side: incoming quote-request leads that need a digital quote
 * sent. Returns leads matched to this contractor + the placeholder quote
 * (if any) created when the customer requested it.
 *
 * Use this to show "Quote requests" cards in the contractor's leads inbox
 * with an inline "Build quote" CTA.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: auth.userId },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ requests: [] });
    }

    const db = prisma as any;

    const leads = await db.contractorLead.findMany({
      where: {
        source: 'mobile_quote_request',
        matches: { some: { contractorId: profile.id } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        quotes: {
          where: { contractorId: profile.id },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        customer: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({
      requests: leads.map((l: any) => {
        const placeholder = l.quotes[0];
        return {
          leadId: l.id,
          title: l.projectTitle ?? l.projectDescription?.slice(0, 60) ?? 'Service request',
          description: l.projectDescription ?? null,
          projectType: l.projectType,
          urgency: l.urgency,
          budget: l.budgetMax ? Number(l.budgetMax) : null,
          createdAt: l.createdAt.toISOString(),
          customer: l.customer
            ? { id: l.customer.id, name: l.customer.name, image: l.customer.image }
            : { id: null, name: l.customerName, image: null },
          city: l.propertyCity ?? null,
          state: l.propertyState ?? null,
          attachments: l.projectPhotos ?? [],
          existingQuoteId: placeholder?.id ?? null,
          quoteStatus: placeholder?.status ?? 'pending',
          quoteSent: placeholder ? Number(placeholder.totalPrice) > 0 : false,
          quoteAmount: placeholder ? Number(placeholder.totalPrice) : 0,
        };
      }),
    });
  } catch (error: any) {
    console.error('[mobile/marketplace/my-quote-requests]', error);
    return NextResponse.json({ error: error?.message || 'Could not load requests' }, { status: 500 });
  }
}
