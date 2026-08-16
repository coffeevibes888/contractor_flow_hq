import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { formatError } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

interface ConfirmRequest {
  setupIntentId: string;
  isDefault?: boolean;
}

/**
 * POST /api/payment-methods/bank/confirm
 *
 * Called after the client successfully confirms a bank-account SetupIntent.
 * Reads the resulting PaymentMethod from Stripe and saves it to our DB so the
 * user sees it in their saved payment methods list.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as ConfirmRequest | null;

    if (!body?.setupIntentId) {
      return NextResponse.json(
        { success: false, message: 'Missing setupIntentId' },
        { status: 400 }
      );
    }

    const setupIntent = await stripe.setupIntents.retrieve(body.setupIntentId);

    if (setupIntent.metadata?.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Setup intent does not belong to this user' },
        { status: 403 }
      );
    }

    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;

    if (!paymentMethodId) {
      return NextResponse.json(
        { success: false, message: 'No payment method on setup intent' },
        { status: 400 }
      );
    }

    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (pm.type !== 'us_bank_account' || !pm.us_bank_account) {
      return NextResponse.json(
        { success: false, message: 'Not a bank account payment method' },
        { status: 400 }
      );
    }

    // Avoid creating duplicates if user clicks twice
    const existing = await prisma.savedPaymentMethod.findUnique({
      where: { stripePaymentMethodId: paymentMethodId },
    });

    if (existing) {
      if (existing.userId !== session.user.id) {
        return NextResponse.json(
          { success: false, message: 'Payment method belongs to another user' },
          { status: 403 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Bank account already saved',
        paymentMethodId: existing.id,
      });
    }

    const shouldBeDefault =
      Boolean(body.isDefault) ||
      (await prisma.savedPaymentMethod.count({
        where: { userId: session.user.id, isDefault: true },
      })) === 0;

    if (shouldBeDefault) {
      await prisma.savedPaymentMethod.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    // Verification status: 'verified' from instant verification, otherwise pending micro-deposits
    const isVerified =
      // @ts-expect-error - status is on the bank account object at runtime
      pm.us_bank_account.status_details?.blocked == null &&
      setupIntent.status === 'succeeded';

    const saved = await prisma.savedPaymentMethod.create({
      data: {
        userId: session.user.id,
        stripePaymentMethodId: paymentMethodId,
        type: 'us_bank_account',
        cardholderName: pm.billing_details?.name || null,
        last4: pm.us_bank_account.last4 || '0000',
        brand: pm.us_bank_account.bank_name || pm.us_bank_account.account_type || 'Bank',
        expirationDate: null,
        billingAddress: undefined,
        isDefault: shouldBeDefault,
        isVerified,
      },
    });

    revalidatePath('/user/profile');
    revalidatePath('/homeowner/settings/payment');

    return NextResponse.json({
      success: true,
      message: isVerified
        ? 'Bank account linked successfully'
        : 'Bank account added — pending verification',
      paymentMethodId: saved.id,
    });
  } catch (error) {
    console.error('Error confirming bank setup:', error);
    return NextResponse.json(
      { success: false, message: formatError(error) },
      { status: 500 }
    );
  }
}
