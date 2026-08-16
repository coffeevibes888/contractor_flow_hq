import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';

/**
 * GET /api/pay/invoice/[token]
 * Get invoice details by payment token (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invoice = await prisma.contractorInvoice.findFirst({
      where: {
        paymentLink: {
          contains: params.token,
        },
      },
      include: {
        contractor: {
          select: {
            businessName: true,
            email: true,
            phone: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Mark invoice as viewed if not already
    if (!invoice.viewedAt) {
      await prisma.contractorInvoice.update({
        where: { id: invoice.id },
        data: { viewedAt: new Date() },
      });
    }

    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pay/invoice/[token]
 * Create Stripe checkout session for invoice payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { amount } = body;

    const invoice = await prisma.contractorInvoice.findFirst({
      where: {
        paymentLink: {
          contains: params.token,
        },
      },
      include: {
        contractor: {
          select: {
            businessName: true,
            stripeCustomerId: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    // Get customer info
    const customer = await prisma.contractorCustomer.findUnique({
      where: { id: invoice.customerId },
      select: { email: true, name: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: `Payment for ${invoice.contractor.businessName}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/pay/invoice/${params.token}?success=true`,
      cancel_url: `${request.nextUrl.origin}/pay/invoice/${params.token}?canceled=true`,
      customer_email: customer.email,
      metadata: {
        invoiceId: invoice.id,
        contractorId: invoice.contractorId,
        customerId: invoice.customerId,
      },
    });

    // Store payment intent ID
    await prisma.contractorInvoice.update({
      where: { id: invoice.id },
      data: {
        stripePaymentIntentId: session.id,
      },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error: any) {
    console.error('Error creating payment session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment session' },
      { status: 500 }
    );
  }
}
