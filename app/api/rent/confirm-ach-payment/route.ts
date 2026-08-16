import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';

interface ACHPaymentRequest {
  // Either provide the PaymentIntent id (pi_...) or the client_secret (pi_..._secret_...)
  paymentIntentId?: string;
  clientSecret?: string;
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  accountHolderType?: 'individual' | 'company';
  consent?: boolean;
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => null)) as ACHPaymentRequest | null;

  if (!body) {
    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }

  const {
    paymentIntentId,
    clientSecret,
    accountHolderName,
    routingNumber,
    accountNumber,
    accountType,
    accountHolderType,
  } = body;

  // Validate required fields
  // Accept either a PaymentIntent id or a client_secret; extract id from client_secret if provided
  const finalPaymentIntentId = paymentIntentId || (clientSecret ? String(clientSecret).split('_secret')[0] : undefined);

  if (!finalPaymentIntentId || !accountHolderName || !routingNumber || !accountNumber || !accountType) {
    return NextResponse.json(
      { success: false, message: 'Missing required fields' },
      { status: 400 }
    );
  }

  try {
    // Retrieve the payment intent to validate it exists
    const paymentIntent = await stripe.paymentIntents.retrieve(finalPaymentIntentId);

    if (!paymentIntent) {
      return NextResponse.json(
        { success: false, message: 'Payment intent not found' },
        { status: 404 }
      );
    }

    // Create a bank account payment method for ACH
    // Using type assertion since Stripe SDK typing can be strict
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'us_bank_account',
      us_bank_account: {
        account_holder_type: accountHolderType || 'individual',
        account_number: accountNumber,
        routing_number: routingNumber,
        account_type: accountType,
      },
      billing_details: {
        name: accountHolderName,
        // no email/phone collected at checkout for authenticated tenants
      },
    } as Parameters<typeof stripe.paymentMethods.create>[0]);

    // Collect client info for online mandate acceptance
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || '0.0.0.0';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Confirm the payment with the bank account and include online acceptance details
    const confirmed = await stripe.paymentIntents.confirm(finalPaymentIntentId, {
      payment_method: paymentMethod.id,
      mandate_data: {
        customer_acceptance: {
          type: 'online',
          accepted_at: Math.floor(Date.now() / 1000),
          online: {
            ip_address: ipAddress,
            user_agent: userAgent,
          },
        },
      },
    } as Parameters<typeof stripe.paymentIntents.confirm>[1]);

    if (confirmed.status === 'requires_action') {
      return NextResponse.json({
        success: false,
        requiresAction: true,
        message: 'Additional bank account verification is required to complete this payment.',
        paymentIntentId: confirmed.id,
        status: confirmed.status,
        nextAction: confirmed.next_action ?? null,
      });
    }

    if (
      confirmed.status !== 'succeeded' &&
      confirmed.status !== 'processing'
    ) {
      return NextResponse.json(
        { success: false, message: `Payment failed: ${confirmed.status}` },
        { status: 400 }
      );
    }

    const user = (await prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { id: true, email: true, name: true, stripeCustomerId: true } as any,
    })) as
      | { id: string; email: string; name: string; stripeCustomerId?: string | null }
      | null;

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    let customerId: string | null = user.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: {
          tenantId: user.id,
        },
      });

      customerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId } as any,
      });
    }

    try {
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customerId,
      });
    } catch (e) {
      // Ignore if already attached
    }

    const pm = await stripe.paymentMethods.retrieve(paymentMethod.id);

    if (pm && pm.type === 'us_bank_account') {
      const existingSaved = await prisma.savedPaymentMethod.findUnique({
        where: { stripePaymentMethodId: paymentMethod.id },
        select: { id: true, userId: true },
      });

      if (existingSaved && existingSaved.userId !== user.id) {
        return NextResponse.json(
          { success: false, message: 'Payment method already belongs to another user' },
          { status: 403 }
        );
      }

      const shouldBeDefault =
        (await prisma.savedPaymentMethod.count({
          where: { userId: user.id, isDefault: true },
        })) === 0;

      if (existingSaved) {
        await prisma.savedPaymentMethod.update({
          where: { id: existingSaved.id },
          data: { isVerified: true },
        });
      } else {
        await prisma.savedPaymentMethod.create({
          data: {
            userId: user.id,
            stripePaymentMethodId: paymentMethod.id,
            type: 'us_bank_account',
            cardholderName: pm.billing_details?.name || null,
            last4: pm.us_bank_account?.last4 || '0000',
            brand: pm.us_bank_account?.bank_name || null,
            expirationDate: null,
            isDefault: shouldBeDefault,
            isVerified: true,
          },
        });
      }
    }

    // Mark rent payments as processing — ACH takes 1-5 business days to clear.
    // The webhook (payment_intent.succeeded) will update status to 'paid' when funds settle.
    const result = await prisma.rentPayment.updateMany({
      where: {
        stripePaymentIntentId: finalPaymentIntentId,
        tenantId: session.user.id as string,
      },
      data: {
        status: confirmed.status === 'succeeded' ? 'paid' : 'processing',
        paidAt: confirmed.status === 'succeeded' ? new Date() : null,
        paymentMethod: 'ach',
      },
    });

    if (!result.count) {
      console.warn('No matching rent payments found to update for payment intent:', finalPaymentIntentId);
    }

    return NextResponse.json({
      success: true,
      message: confirmed.status === 'succeeded'
        ? 'ACH payment completed successfully.'
        : 'ACH payment submitted. Funds typically arrive in 1-5 business days.',
      paymentIntentId: confirmed.id,
      status: confirmed.status,
    });
  } catch (error) {
    console.error('ACH payment error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { success: false, message: `Payment error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'An error occurred while processing your payment' },
      { status: 500 }
    );
  }
}
