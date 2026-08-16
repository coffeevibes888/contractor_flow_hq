/**
 * Upgrade API
 * 
 * POST /api/contractor/subscription/upgrade
 * 
 * Initiates a subscription tier upgrade for a contractor.
 * Handles Stripe payment, prorated billing, immediate tier update, and confirmation email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import Stripe from 'stripe';
import { Resend } from 'resend';
import {
  CONTRACTOR_TIERS,
  type ContractorTier,
  isValidTier,
  compareTiers,
  getMonthlyPrice,
  getPriceDifference,
  getTierFeatures,
} from '@/lib/config/contractor-subscription-tiers';

interface UpgradeRequest {
  targetTier: string;
  paymentMethodId?: string; // Optional: for new payment method
}

interface UpgradeResponse {
  success: boolean;
  message: string;
  subscription?: {
    tier: string;
    status: string;
    currentPeriodEnd: string;
    newFeatures: string[];
  };
  payment?: {
    amount: number;
    prorated: boolean;
    proratedAmount?: number;
  };
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

/**
 * POST /api/contractor/subscription/upgrade
 * 
 * Initiates a subscription tier upgrade
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe and Resend inside the function to avoid module-level initialization issues
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });

    const resend = new Resend(process.env.RESEND_API_KEY || '');

    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    let body: UpgradeRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    const { targetTier, paymentMethodId } = body;

    // Validate targetTier parameter
    if (!targetTier || typeof targetTier !== 'string') {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Missing or invalid "targetTier" parameter. Must be a string.',
        },
        { status: 400 }
      );
    }

    if (!isValidTier(targetTier)) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: `Invalid tier "${targetTier}". Valid tiers are: starter, pro, enterprise`,
        },
        { status: 400 }
      );
    }

    // 3. Get contractor profile with user details
    const contractor = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!contractor) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Contractor profile not found',
        },
        { status: 404 }
      );
    }

    const currentTier = contractor.subscriptionTier as ContractorTier;

    // 4. Validate upgrade is valid (can't downgrade or stay same)
    const tierComparison = compareTiers(targetTier as ContractorTier, currentTier);
    
    if (tierComparison === 0) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: `You are already on the ${targetTier} plan`,
        },
        { status: 400 }
      );
    }

    if (tierComparison < 0) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Cannot downgrade using this endpoint. Please use the downgrade endpoint or contact support.',
        },
        { status: 400 }
      );
    }

    // 5. Calculate pricing
    const currentPrice = getMonthlyPrice(currentTier);
    const newPrice = getMonthlyPrice(targetTier as ContractorTier);
    const priceDifference = getPriceDifference(currentTier, targetTier as ContractorTier);

    // Calculate prorated amount
    // For simplicity, we'll charge the full difference for the first month
    // In production, you'd calculate based on days remaining in billing period
    const daysInMonth = 30;
    const currentPeriodEnd = contractor.currentPeriodEnd || new Date();
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    
    // Prorated amount: (price difference) * (days remaining / days in month)
    const proratedAmount = daysRemaining > 0 
      ? Number(((priceDifference * daysRemaining) / daysInMonth).toFixed(2))
      : newPrice;

    // 6. Process payment with Stripe
    let paymentIntent: Stripe.PaymentIntent | null = null;
    
    if (proratedAmount > 0) {
      try {
        // Create payment intent for the prorated amount
        const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
          amount: Math.round(proratedAmount * 100), // Convert to cents
          currency: 'usd',
          metadata: {
            contractorId: contractor.id,
            userId: session.user.id,
            upgradeFrom: currentTier,
            upgradeTo: targetTier,
            type: 'subscription_upgrade',
          },
          description: `Upgrade from ${currentTier} to ${targetTier} plan`,
        };

        // If payment method provided, attach it
        if (paymentMethodId) {
          paymentIntentParams.payment_method = paymentMethodId;
          paymentIntentParams.confirm = true;
          paymentIntentParams.automatic_payment_methods = {
            enabled: true,
            allow_redirects: 'never',
          };
        } else {
          paymentIntentParams.automatic_payment_methods = {
            enabled: true,
          };
        }

        paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        // If payment method was provided and payment failed
        if (paymentMethodId && paymentIntent.status !== 'succeeded') {
          return NextResponse.json<ErrorResponse>(
            {
              success: false,
              message: 'Payment failed. Please check your payment method and try again.',
              error: paymentIntent.last_payment_error?.message,
            },
            { status: 402 }
          );
        }

        // If no payment method provided, return client secret for frontend to complete
        if (!paymentMethodId) {
          return NextResponse.json(
            {
              success: false,
              requiresPayment: true,
              clientSecret: paymentIntent.client_secret,
              amount: proratedAmount,
              message: 'Payment required. Please complete payment on the frontend.',
            },
            { status: 402 }
          );
        }
      } catch (error) {
        console.error('Error creating payment intent:', error);
        return NextResponse.json<ErrorResponse>(
          {
            success: false,
            message: 'Failed to process payment',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // 7. Verify payment was actually processed before upgrading
    // When proratedAmount === 0 (free upgrade or first month), we still need
    // to ensure the user has a valid payment method on file or the upgrade
    // is genuinely free (e.g., starter→pro within trial). Never update tier
    // without payment confirmation.
    if (proratedAmount === 0 && !paymentIntent) {
      // Free upgrade path: verify the contractor has an active subscription
      // or a trial that allows free upgrades. If not, require payment.
      const hasActiveSubscription = contractor.subscriptionStatus === 'active' ||
        contractor.subscriptionStatus === 'trialing';
      
      if (!hasActiveSubscription) {
        return NextResponse.json<ErrorResponse>(
          {
            success: false,
            message: 'Payment required. Please add a payment method to upgrade.',
          },
          { status: 402 }
        );
      }
    }

    // 8. Update subscription tier only after payment is confirmed
    const newPeriodEnd = new Date();
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

    try {
      await prisma.contractorProfile.update({
        where: { id: contractor.id },
        data: {
          subscriptionTier: targetTier,
          subscriptionStatus: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: newPeriodEnd,
        },
      });

      console.log(`Upgraded contractor ${contractor.id} from ${currentTier} to ${targetTier}`);
    } catch (error) {
      console.error('Error updating subscription tier:', error);
      
      // If payment was processed but DB update failed, we have a problem
      // Log this for manual intervention
      console.error('CRITICAL: Payment processed but tier update failed', {
        contractorId: contractor.id,
        paymentIntentId: paymentIntent?.id,
        error,
      });

      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Payment processed but failed to update subscription. Please contact support.',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // 9. Get new features gained
    const newFeatures = getTierFeatures(targetTier as ContractorTier);
    const currentFeatures = new Set(getTierFeatures(currentTier));
    const gainedFeatures = newFeatures.filter(feature => !currentFeatures.has(feature));

    // 10. Send confirmation email
    try {
      const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
      const userName = contractor.user.name || 'there';
      const businessName = contractor.businessName || 'your business';

      const featuresList = gainedFeatures.length > 0
        ? `<ul>${gainedFeatures.slice(0, 10).map(f => `<li>${formatFeatureName(f)}</li>`).join('')}</ul>`
        : '<p>All features from your previous tier, plus more!</p>';

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">🎉 Subscription Upgraded!</h1>
          
          <p>Hi ${userName},</p>
          
          <p>Great news! Your subscription for <strong>${businessName}</strong> has been successfully upgraded.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #1f2937;">Upgrade Details</h2>
            <p><strong>Previous Plan:</strong> ${CONTRACTOR_TIERS[currentTier].name} ($${currentPrice}/month)</p>
            <p><strong>New Plan:</strong> ${CONTRACTOR_TIERS[targetTier as ContractorTier].name} ($${newPrice}/month)</p>
            ${proratedAmount > 0 ? `<p><strong>Prorated Charge:</strong> $${proratedAmount.toFixed(2)}</p>` : ''}
            <p><strong>Next Billing Date:</strong> ${newPeriodEnd.toLocaleDateString()}</p>
          </div>
          
          <h3 style="color: #1f2937;">New Features Unlocked:</h3>
          ${featuresList}
          
          <p>You can start using these features immediately!</p>
          
          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'http://localhost:3000'}/contractor/dashboard" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you have any questions about your new plan, please don't hesitate to contact our support team.
          </p>
          
          <p style="color: #6b7280; font-size: 14px;">
            Thank you for choosing to grow with us!
          </p>
        </div>
      `;

      await resend.emails.send({
        from: `Property Flow <${senderEmail}>`,
        to: contractor.user.email,
        subject: `🎉 Your subscription has been upgraded to ${CONTRACTOR_TIERS[targetTier as ContractorTier].name}!`,
        html: emailHtml,
      });

      console.log(`Sent upgrade confirmation email to ${contractor.user.email}`);
    } catch (error) {
      // Don't fail the request if email fails, just log it
      console.error('Error sending confirmation email:', error);
    }

    // 11. Return success response
    return NextResponse.json<UpgradeResponse>(
      {
        success: true,
        message: `Successfully upgraded to ${CONTRACTOR_TIERS[targetTier as ContractorTier].name} plan!`,
        subscription: {
          tier: targetTier,
          status: 'active',
          currentPeriodEnd: newPeriodEnd.toISOString(),
          newFeatures: gainedFeatures.slice(0, 10), // Limit to 10 features
        },
        payment: proratedAmount > 0 ? {
          amount: proratedAmount,
          prorated: daysRemaining > 0,
          proratedAmount: daysRemaining > 0 ? proratedAmount : undefined,
        } : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing upgrade:', error);
    
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        message: 'Failed to process upgrade',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to format feature names for display
 */
function formatFeatureName(feature: string): string {
  // Convert camelCase to Title Case with spaces
  return feature
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
