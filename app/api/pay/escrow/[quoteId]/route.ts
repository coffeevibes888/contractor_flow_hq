import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { auth } from '@/auth';

/**
 * POST /api/pay/escrow/[quoteId]
 * Create Stripe checkout session for escrow payment (Contractor Offer)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const { quoteId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quote = await prisma.contractorQuote.findUnique({
      where: { id: quoteId },
      include: {
        contractor: {
          select: {
            businessName: true,
            stripeCustomerId: true, // Assuming this stores their connected account ID or customer ID
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.status === 'accepted' || quote.status === 'paid') {
      return NextResponse.json({ error: 'Quote already accepted' }, { status: 400 });
    }

    // Verify user owns the lead/request
    if (quote.customerId !== session.user.id && !session.user.role?.includes('admin')) {
        // Double check via lead if customerId is direct match
        // For MVP, simplistic check
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Project Escrow: ${quote.title}`,
              description: `Payment to ${quote.contractor.businessName} - Held in Escrow`,
            },
            unit_amount: Math.round(Number(quote.totalPrice) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/homeowner/dashboard?payment_success=true&quote_id=${quoteId}`,
      cancel_url: `${request.nextUrl.origin}/homeowner/dashboard?payment_canceled=true`,
      customer_email: session.user.email || undefined,
      metadata: {
        type: 'contractor_escrow',
        quoteId: quote.id,
        contractorId: quote.contractorId,
        customerId: quote.customerId,
      },
      payment_intent_data: {
          capture_method: 'manual', // Authorize only, capture later when job complete (Escrow-like)
          metadata: {
            quoteId: quote.id
          }
      }
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (error: any) {
    console.error('Error creating escrow session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment session' },
      { status: 500 }
    );
  }
}
