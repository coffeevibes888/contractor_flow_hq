import { NextRequest, NextResponse, after } from 'next/server';
import Stripe from 'stripe';
import { updateOrderToPaid } from '@/lib/actions/order-actions';
import { prisma } from '@/db/prisma';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/lib/config/subscription-tiers';
import { NotificationService } from '@/lib/services/notification-service';
import { formatCurrency } from '@/lib/utils';
import { formatEstimatedArrival } from '@/lib/config/stripe-constants';
import { sendLandlordPaymentReceivedEmail } from '@/lib/actions/email.actions';
import { logFinancialEvent } from '@/lib/security/audit-logger';
import { sendMetaServerEvent } from '@/lib/analytics/meta-capi';
import {
  ensureFinancialAccountForLandlord,
  syncLandlordConnectStatus,
} from '@/lib/services/stripe-connect.service';
import { deriveOnboardingStatus, persistOnboardingStatus } from '@/types/stripe';
import {
  recordBankTransaction,
  type RecordBankTransactionInput,
} from '@/lib/banking';
import type { Prisma } from '@prisma/client';

// Stripe expects a response within 10 seconds. This handler does a lot of
// synchronous work (Connect syncs, Meta CAPI calls, Resend emails, Prisma
// writes) so we explicitly run on the Node runtime with the maximum
// duration our Vercel plan allows. Without this, slow events
// (checkout.session.completed, payment_intent.succeeded with affiliate
// commission processing) time out and Stripe retries — producing the
// "other errors" category in webhook delivery reports.
//
// Architectural follow-up: split this into a thin acknowledger that returns
// 200 immediately and a background worker that does the side effects.
// Stripe's own docs recommend that pattern. Tracked in WEBHOOK_REFACTOR.md.
export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Stripe Webhook Handler
 * 
 * DIRECT PAYMENT MODEL:
 * - Rent payments go directly to landlord's Connect account
 * - No wallet crediting needed - landlord receives funds immediately
 * - We just update payment status and send notifications
 */

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let payload: string;
  let signature: string | null;
  let event: Stripe.Event | null = null;

  // CRITICAL: Wrap ALL operations in try-catch to ensure we ALWAYS return 200
  // Stripe will disable the webhook if we don't respond with 2xx within 10 seconds
  try {
    payload = await req.text();
    signature = req.headers.get('stripe-signature');

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
    
    if ((!webhookSecret && !connectWebhookSecret) || !signature) {
      console.error('[stripe webhook] Missing webhook secret or signature header');
      // Log asynchronously - don't block the response
      prisma.inboundWebhookEvent
        .create({
          data: {
            provider: 'stripe',
            eventType: 'unknown',
            status: 'signature_invalid',
            httpStatus: 400,
            error: 'Missing webhook secret or signature header',
            signatureOk: false,
          },
        })
        .catch((err) => console.error('[stripe webhook] Failed to log invalid signature', err));
      
      // Still return 200 to prevent webhook disabling - Stripe will see the event wasn't processed
      return NextResponse.json({ received: true, error: 'Configuration error' }, { status: 200 });
    }

    // Stripe forces a split between platform-account events and connected-
    // account events when configuring destinations — you must register two
    // separate endpoints, each with its own signing secret. We host both at
    // the same URL and try whichever secret was configured. The first that
    // verifies wins; if neither does, the request is rejected.
    const verificationErrors: string[] = [];

    for (const secret of [webhookSecret, connectWebhookSecret]) {
      if (!secret) continue;
      try {
        event = Stripe.webhooks.constructEvent(payload, signature, secret);
        break;
      } catch (err: any) {
        verificationErrors.push(err?.message || 'unknown');
      }
    }

    if (!event) {
      console.error('[stripe webhook] Invalid signature:', verificationErrors.join('; '));
      // Log asynchronously - don't block the response
      prisma.inboundWebhookEvent
        .create({
          data: {
            provider: 'stripe',
            eventType: 'unknown',
            status: 'signature_invalid',
            httpStatus: 400,
            error: ('Invalid Stripe webhook signature: ' + verificationErrors.join('; ')).slice(0, 500),
            signatureOk: false,
          },
        })
        .catch((err) => console.error('[stripe webhook] Failed to log invalid signature', err));
      
      // Still return 200 to prevent webhook disabling
      return NextResponse.json({ received: true, error: 'Invalid signature' }, { status: 200 });
    }

    // Use next/server `after()` so Vercel keeps the function alive for the
    // async processing even after we've returned the 200 to Stripe. Without
    // this the serverless function is terminated on response and all the DB
    // writes / email sends in processWebhookAsync are killed mid-flight.
    const capturedEvent = event;
    after(async () => {
      let inboundLogId: string | null = null;
      try {
        const log = await prisma.inboundWebhookEvent.create({
          data: {
            provider: 'stripe',
            eventType: capturedEvent.type,
            eventId: capturedEvent.id,
            status: 'received',
            signatureOk: true,
          },
          select: { id: true },
        });
        inboundLogId = log.id;
      } catch (logErr) {
        console.error('[stripe webhook] inbound log create failed', logErr);
      }
      await processWebhookAsync(capturedEvent, inboundLogId, startedAt);
    });

  } catch (err: any) {
    // Catch ANY error in the main handler to ensure we return 200
    console.error('[stripe webhook] Critical error in main handler:', err);
    
    // Try to log the error asynchronously
    if (event) {
      prisma.inboundWebhookEvent
        .create({
          data: {
            provider: 'stripe',
            eventType: event.type,
            eventId: event.id,
            status: 'failed',
            httpStatus: 500,
            error: (err?.message || String(err)).slice(0, 500),
            signatureOk: true,
          },
        })
        .catch(() => {});
    }
  }

  // ALWAYS return 200 - this is critical to prevent Stripe from disabling the webhook
  return NextResponse.json({ received: true }, { status: 200 });
}

/**
 * Process webhook asynchronously after returning 200 to Stripe
 */
async function processWebhookAsync(
  event: Stripe.Event,
  inboundLogId: string | null,
  startedAt: number
) {
  try {
    const resp = await handleStripeEvent(event);
    
    if (inboundLogId) {
      await prisma.inboundWebhookEvent
        .update({
          where: { id: inboundLogId },
          data: {
            status: 'processed',
            httpStatus: resp.status,
            durationMs: Date.now() - startedAt,
          },
        })
        .catch((err) => console.error('[stripe webhook] Failed to update log to processed', err));
    }
  } catch (err: any) {
    console.error('[stripe webhook] async handler threw', err);
    
    if (inboundLogId) {
      await prisma.inboundWebhookEvent
        .update({
          where: { id: inboundLogId },
          data: {
            status: 'failed',
            httpStatus: 500,
            error: (err?.message || String(err)).slice(0, 500),
            durationMs: Date.now() - startedAt,
          },
        })
        .catch((err) => console.error('[stripe webhook] Failed to update log to failed', err));
    }
  }
}

async function handleStripeEvent(event: Stripe.Event): Promise<NextResponse> {

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const now = new Date();
    const paymentMethodType = paymentIntent.payment_method_types?.[0] || 'unknown';

    if (paymentIntent.metadata?.type === 'rent_payment') {
      const idsRaw = paymentIntent.metadata?.rentPaymentIds;
      const rentPaymentIds = idsRaw
        ? String(idsRaw)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      try {
        await prisma.$transaction(async (tx) => {
          const rentPayments = await tx.rentPayment.findMany({
            where: rentPaymentIds.length
              ? { id: { in: rentPaymentIds } }
              : { stripePaymentIntentId: paymentIntent.id },
            include: {
              tenant: true,
              lease: {
                include: {
                  unit: {
                    include: {
                      property: {
                        include: {
                          landlord: { include: { owner: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          if (!rentPayments.length) {
            throw new Error('No RentPayment records found for payment_intent.succeeded');
          }

          // Update payments first
          await tx.rentPayment.updateMany({
            where: { id: { in: rentPayments.map((rp) => rp.id) } },
            data: {
              status: 'paid',
              paidAt: now,
              paymentMethod: paymentMethodType,
              amountPaid: undefined,
            },
          });

          // Keep amountPaid accurate per row
          await Promise.all(
            rentPayments.map((rp) =>
              tx.rentPayment.update({
                where: { id: rp.id },
                data: { amountPaid: rp.amount },
              })
            )
          );

          // Log payment to audit trail
          const totalPaidAmount = rentPayments.reduce((sum, rp) => sum + Number(rp.amount), 0);
          const landlord = rentPayments[0]?.lease?.unit?.property?.landlord;
          
          logFinancialEvent('PAYMENT_COMPLETED', {
            userId: rentPayments[0]?.tenant?.id || undefined,
            landlordId: landlord?.id,
            amount: totalPaidAmount,
            currency: 'USD',
            transactionId: paymentIntent.id,
            paymentMethod: paymentMethodType,
            additionalData: {
              rentPaymentIds: rentPayments.map(rp => rp.id),
              leaseId: rentPayments[0]?.leaseId,
              tenantName: rentPayments[0]?.tenant?.name,
            },
          }).catch(console.error);

          // Best-effort transaction ledger write (avoid duplicates where possible)
          try {
            await tx.paymentTransaction.createMany({
              data: rentPayments.map((rp) => ({
                rentPaymentId: rp.id,
                amount: rp.amount,
                status: 'succeeded',
                method: paymentMethodType,
                referenceId: paymentIntent.id,
              })),
              skipDuplicates: true,
            });
          } catch {
            // createMany/skipDuplicates relies on a unique constraint; fall back to best-effort creates
            for (const rp of rentPayments) {
              try {
                await tx.paymentTransaction.create({
                  data: {
                    rentPaymentId: rp.id,
                    amount: rp.amount,
                    status: 'succeeded',
                    method: paymentMethodType,
                    referenceId: paymentIntent.id,
                  },
                });
              } catch {
                // noop
              }
            }
          }

          // Post to the General Ledger (Pro/Enterprise only). Failures here
          // must NOT block the webhook — accounting is best-effort observability
          // for now. Source-keyed by (rent_payment, rp.id) so re-runs are
          // idempotent at the postJournalEntry layer.
          const paymentLandlordId = rentPayments[0]?.lease?.unit?.property?.landlord?.id;
          if (paymentLandlordId) {
            try {
              const { postRentPaymentReceipt, postTenantPayment } = await import('@/lib/accounting');
              // The webhook tx client is the deeply-typed extended Prisma client;
              // cast through `unknown` to align with the lib's narrowed signature
              // without losing runtime compatibility.
              const glTx = tx as unknown as Parameters<typeof postRentPaymentReceipt>[5] extends infer T
                ? T extends { tx?: infer X } ? X : never
                : never;
              for (const rp of rentPayments) {
                const property = rp.lease?.unit?.property;
                if (!property) continue;
                const lateFee = rp.metadata && typeof (rp.metadata as { lateFee?: unknown }).lateFee === 'number'
                  ? ((rp.metadata as { lateFee: number }).lateFee)
                  : 0;
                try {
                  await postRentPaymentReceipt(
                    paymentLandlordId,
                    rp.id,
                    Number(rp.amount),
                    lateFee,
                    now,
                    {
                      propertyId: property.id,
                      unitId: rp.lease!.unitId,
                      tenantId: rp.tenantId,
                      tx: glTx,
                    },
                  );
                } catch (glErr) {
                  // Tenant-ledger post is also best-effort and inherits its
                  // own try/catch so we never block a successful payment.
                  try {
                    await postTenantPayment({
                      leaseId: rp.leaseId,
                      amount: Number(rp.amount),
                      effectiveDate: now,
                      description: `Stripe ${paymentMethodType} — ${paymentIntent.id}`,
                      rentPaymentId: rp.id,
                      tx: glTx as never,
                    });
                  } catch (tlErr) {
                    console.error('[accounting] tenant-ledger post failed', rp.id, tlErr);
                  }
                  console.error('[accounting] GL post failed', rp.id, glErr);
                }
              }
            } catch (impErr) {
              console.error('[accounting] module import failed in webhook', impErr);
            }
          }

          const paymentLandlord = rentPayments[0]?.lease?.unit?.property?.landlord;
          const tenantName = rentPayments[0]?.tenant?.name || 'Tenant';
          const totalPaid = rentPayments.reduce((sum, rp) => sum + Number(rp.amount), 0);
          const idsForNotification = rentPayments.map((rp) => rp.id);

          if (paymentLandlord?.owner?.id && paymentLandlord.id) {
            // Fan out a bell-row + email + push to the eligible team. The
            // `rent` category routes to anyone with `view_financials` /
            // `manage_finances` (plus owner/admin). Maintenance techs are
            // intentionally excluded.
            try {
              const { notifyLandlordTeam } = await import('@/lib/services/team-notifications');
              await notifyLandlordTeam({
                landlordId: paymentLandlord.id,
                category: 'rent',
                type: 'payment',
                title: 'Rent Payment Received',
                message: `${tenantName} paid ${formatCurrency(totalPaid)}.`,
                actionUrl: `/admin/revenue`,
                metadata: { rentPaymentIds: idsForNotification, leaseId: rentPayments[0]?.leaseId },
              });
            } catch (err) {
              console.error('[CRITICAL] rent payment team notify failed:', err);
              // Log to audit trail for monitoring
              await prisma.auditLog.create({
                data: {
                  action: 'NOTIFICATION_FAILED',
                  resourceType: 'RentPayment',
                  resourceId: idsForNotification[0],
                  userId: paymentLandlord.owner.id,
                  landlordId: paymentLandlord.id,
                  metadata: JSON.stringify({
                    error: err instanceof Error ? err.message : String(err),
                    rentPaymentIds: idsForNotification,
                    notificationType: 'team_notification',
                  }),
                  severity: 'CRITICAL',
                },
              }).catch(console.error);
            }

            // Send branded email summary to the landlord owner. We keep
            // this as a single-recipient send because the email contains
            // owner-specific copy ("payout arrives by ..."). Other team
            // members already received the bell-row + email through
            // notifyLandlordTeam above.
            const firstPayment = rentPayments[0];
            const propertyName = firstPayment?.lease?.unit?.property?.name || 'Property';
            const unitNumber = firstPayment?.lease?.unit?.name || '';
            const estimatedArrival = formatEstimatedArrival(paymentMethodType);
            const paymentMethodDisplay = paymentMethodType === 'us_bank_account' ? 'Bank Transfer (ACH)' : 'Card';

            if (paymentLandlord.owner?.email) {
              try {
                // Detect whether this is the landlord's very first received rent payment.
                // Count excludes the payments we just marked paid (they are already updated).
                const priorPaidCount = await prisma.rentPayment.count({
                  where: {
                    status: 'paid',
                    lease: { unit: { property: { landlordId: paymentLandlord.id } } },
                    id: { notIn: idsForNotification },
                  },
                });
                const isFirstPayment = priorPaidCount === 0;

                await sendLandlordPaymentReceivedEmail({
                  landlordEmail: paymentLandlord.owner.email,
                  landlordName: paymentLandlord.name,
                  tenantName,
                  propertyName,
                  unitNumber,
                  amount: formatCurrency(totalPaid),
                  paymentMethod: paymentMethodDisplay,
                  paidAt: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                  estimatedArrival,
                  logoUrl: paymentLandlord.logoUrl,
                  isFirstPayment,
                });
              } catch (emailErr) {
                console.error('[CRITICAL] landlord payment email failed:', emailErr);
                // Log to audit trail
                await prisma.auditLog.create({
                  data: {
                    action: 'EMAIL_FAILED',
                    resourceType: 'RentPayment',
                    resourceId: idsForNotification[0],
                    userId: paymentLandlord.owner.id,
                    landlordId: paymentLandlord.id,
                    metadata: JSON.stringify({
                      error: emailErr instanceof Error ? emailErr.message : String(emailErr),
                      recipientEmail: paymentLandlord.owner.email,
                      emailType: 'payment_received',
                    }),
                    severity: 'CRITICAL',
                  },
                }).catch(console.error);
              }
            } else {
              console.error('[WARNING] Cannot send payment email: missing landlord owner email', {
                landlordId: paymentLandlord.id,
                rentPaymentIds: idsForNotification,
              });
            }
          } else {
            console.error('[WARNING] Cannot send notifications: missing landlord data', {
              hasOwner: !!paymentLandlord?.owner?.id,
              hasLandlordId: !!paymentLandlord?.id,
              rentPaymentIds: idsForNotification,
            });
          }
        });
      } catch (error) {
        console.error('Error processing rent payment payment_intent.succeeded:', error);
        return NextResponse.json({ message: 'Failed to process rent payment webhook' }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Webhook processed: payment_intent.succeeded' });
  }

  // Handle successful charges
  if (event.type === 'charge.succeeded') {
    const charge = event.data.object as Stripe.Charge;
    const amountPaid = charge.amount / 100;
    const now = new Date();
    const paymentMethodType = charge.payment_method_details?.type || 'unknown';

    // Handle rent payments (new partial payment logic)
    const rentPaymentId = charge.metadata?.rentPaymentId;
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;

    if (rentPaymentId) {
      try {
        await prisma.$transaction(async (tx) => {
          const rentPayment = await tx.rentPayment.findUnique({
            where: { id: rentPaymentId },
            include: { lease: { include: { unit: { include: { property: { include: { landlord: { include: { owner: true } } } } } } } }, tenant: true }
          });

          if (!rentPayment) {
            throw new Error(`RentPayment with ID ${rentPaymentId} not found.`);
          }

          // 1. Create the transaction record
          await tx.paymentTransaction.create({
            data: {
              rentPaymentId: rentPayment.id,
              amount: amountPaid,
              status: 'succeeded',
              method: paymentMethodType,
              referenceId: charge.id,
            },
          });

          // 2. Update the RentPayment itself
          const newAmountPaid = Number(rentPayment.amountPaid) + amountPaid;
          const totalAmountDue = Number(rentPayment.amount);

          let newStatus = rentPayment.status;
          if (newAmountPaid >= totalAmountDue) {
            newStatus = 'paid';
          } else if (newAmountPaid > 0) {
            newStatus = 'partially_paid';
          }

          await tx.rentPayment.update({
            where: { id: rentPaymentId },
            data: {
              amountPaid: newAmountPaid,
              status: newStatus,
              paidAt: newStatus === 'paid' ? now : null, // Only set paidAt when fully paid
              paymentMethod: paymentMethodType,
            },
          });

          // 2b. Bank reconciliation: record this charge on the ledger so the
          //     reconciliation screen can show it (and auto-match it to the
          //     GL receipt we just posted above). Best-effort — a bank-rec
          //     failure must not fail the rent post.
          try {
            const landlordId = rentPayment.lease.unit.property.landlord?.id
              ?? rentPayment.lease.unit.property.landlordId;
            if (landlordId) {
              await recordChargeForRent({
                charge,
                landlordId,
                paymentIntentId: paymentIntentId ?? null,
                // Cast `tx` through `any` to dodge the "excessive stack depth"
                // error Prisma throws when comparing the extended transaction
                // client to the bare TransactionClient type alias.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tx: tx as any,
              });
            }
          } catch (bankErr) {
            console.error('[banking] charge.succeeded record failed', rentPaymentId, bankErr);
          }

          // 3. Send notification — fan out to the team finance side
          //    (`view_financials` / `manage_finances` + owner/admin).
          //    Maintenance techs intentionally drop out.
          const landlord = rentPayment.lease.unit.property.landlord;
          if (landlord?.id) {
            try {
              const { notifyLandlordTeam } = await import('@/lib/services/team-notifications');
              await notifyLandlordTeam({
                landlordId: landlord.id,
                category: 'rent',
                type: 'payment',
                title: 'Rent Payment Received',
                message: `Partial payment of ${formatCurrency(amountPaid)} received from ${rentPayment.tenant.name}. Total paid: ${formatCurrency(newAmountPaid)} of ${formatCurrency(totalAmountDue)}.`,
                actionUrl: `/admin/analytics`,
                metadata: { paymentId: rentPayment.id, leaseId: rentPayment.leaseId },
              });
            } catch (err) {
              console.error('[CRITICAL] partial rent payment team notify failed:', err);
              // Log to audit trail for monitoring
              await tx.auditLog.create({
                data: {
                  action: 'NOTIFICATION_FAILED',
                  resourceType: 'RentPayment',
                  resourceId: rentPayment.id,
                  userId: landlord.owner?.id || landlord.ownerUserId,
                  landlordId: landlord.id,
                  metadata: JSON.stringify({
                    error: err instanceof Error ? err.message : String(err),
                    paymentId: rentPayment.id,
                    notificationType: 'partial_payment_notification',
                  }),
                  severity: 'CRITICAL',
                },
              }).catch(console.error);
            }
          }
        });
      } catch (error) {
         console.error('Error processing partial rent payment:', error);
         // Return 500 to signal Stripe to retry the webhook
         return NextResponse.json({ message: 'Failed to process partial payment webhook' }, { status: 500 });
      }
    } else if (paymentIntentId) {
      // Fallback for older logic or payments not using the new flow
      await prisma.rentPayment.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: { status: 'paid', paidAt: now, paymentMethod: paymentMethodType },
      });
    }

    // Handle e-commerce orders
    if (charge.metadata?.orderId) {
      await updateOrderToPaid({
        orderId: charge.metadata.orderId,
        paymentResult: {
          id: charge.id,
          status: 'COMPLETED',
          email_address: charge.billing_details.email!,
          pricePaid: (charge.amount / 100).toFixed(),
        },
      });
    }

    return NextResponse.json({
      message: 'Webhook processed: charge.succeeded',
    });
  }

  // Handle payment processing (ACH takes time)
  if (event.type === 'payment_intent.processing') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    if (paymentIntent.metadata?.type === 'rent_payment') {
      await prisma.rentPayment.updateMany({
        where: {
          stripePaymentIntentId: paymentIntent.id,
        },
        data: {
          status: 'processing',
        },
      });
    }

    return NextResponse.json({
      message: 'Webhook processed: payment_intent.processing',
    });
  }

  // Handle failed payments
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    if (paymentIntent.metadata?.type === 'rent_payment') {
      await prisma.rentPayment.updateMany({
        where: {
          stripePaymentIntentId: paymentIntent.id,
        },
        data: {
          status: 'failed',
        },
      });

      // Log failed payment to audit trail
      logFinancialEvent('PAYMENT_FAILED', {
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency?.toUpperCase() || 'USD',
        transactionId: paymentIntent.id,
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'unknown',
        additionalData: {
          failureReason: paymentIntent.last_payment_error?.message,
          failureCode: paymentIntent.last_payment_error?.code,
        },
      }).catch(console.error);
    }

    return NextResponse.json({
      message: 'Webhook processed: payment_intent.payment_failed',
    });
  }

  // Handle subscription events
  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const landlordId = subscription.metadata?.landlordId;
    const tier = (subscription.metadata?.tier || 'starter') as SubscriptionTier;
    const billingInterval = (subscription.metadata?.billingInterval || 'monthly') as 'monthly' | 'yearly';
    if (landlordId) {
      const tierConfig = SUBSCRIPTION_TIERS[tier];

      // Only promote the landlord's tier when the subscription is in a paid/valid
      // state. 'incomplete' means the first payment was declined — the card was
      // rejected and no money has been collected. Treating it as an active
      // upgrade would give free access to paid features. 'incomplete_expired'
      // and 'canceled' similarly must never grant a higher tier.
      const PAID_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'] as const;
      const isPaidStatus = (PAID_STATUSES as readonly string[]).includes(subscription.status);

      // Always record the Stripe subscription row (we need the ID + status
      // for the billing portal / cancellation flow), but only write the
      // upgraded tier when payment has actually been confirmed.
      const effectiveTier = isPaidStatus ? tier : 'starter';
      const effectiveTierConfig = isPaidStatus ? tierConfig : SUBSCRIPTION_TIERS['starter'];

      await prisma.landlordSubscription.upsert({
        where: { landlordId },
        create: {
          landlordId,
          tier: effectiveTier,
          billingInterval,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
          stripePriceId: subscription.items.data[0]?.price?.id,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          unitLimit: effectiveTierConfig.unitLimit === Infinity ? 999999 : effectiveTierConfig.unitLimit,
          freeBackgroundChecks: effectiveTierConfig.features.freeBackgroundChecks,
          freeEvictionChecks: effectiveTierConfig.features.freeEvictionChecks,
          freeEmploymentVerification: effectiveTierConfig.features.freeEmploymentVerification,
        },
        update: {
          // Status always updated so billing portal / cancellation work correctly.
          status: subscription.status,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price?.id,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          // Tier and perks only updated when payment is confirmed.
          ...(isPaidStatus && {
            tier: effectiveTier,
            billingInterval,
            unitLimit: effectiveTierConfig.unitLimit === Infinity ? 999999 : effectiveTierConfig.unitLimit,
            freeBackgroundChecks: effectiveTierConfig.features.freeBackgroundChecks,
            freeEvictionChecks: effectiveTierConfig.features.freeEvictionChecks,
            freeEmploymentVerification: effectiveTierConfig.features.freeEmploymentVerification,
          }),
        },
      });

      const isTrialing = subscription.status === 'trialing';
      const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
      const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1000) : null;

      await prisma.landlord.update({
        where: { id: landlordId },
        data: {
          // subscriptionTier only elevated for confirmed-paid statuses.
          subscriptionTier: effectiveTier,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          ...(isPaidStatus && {
            freeBackgroundChecks: effectiveTierConfig.features.freeBackgroundChecks,
            freeEmploymentVerification: effectiveTierConfig.features.freeEmploymentVerification,
          }),
          // Set trial dates from Stripe so the subscription gate can verify trial validity
          ...(isTrialing && trialStart && { trialStartDate: trialStart }),
          ...(isTrialing && trialEnd && { trialEndDate: trialEnd, trialStatus: 'trialing' }),
          // When trial ends and subscription activates, mark trial as completed
          ...(!isTrialing && subscription.status === 'active' && { trialStatus: 'active' }),
        },
      });

      await prisma.subscriptionEvent.create({
        data: {
          landlordId,
          eventType: event.type === 'customer.subscription.created' ? 'upgrade' : 'updated',
          toTier: tier,
          stripeEventId: event.id,
          metadata: {
            subscriptionId: subscription.id,
            status: subscription.status,
          },
        },
      });

    }

    // Handle contractor subscription (contractorProfileId in metadata)
    const contractorProfileId = subscription.metadata?.contractorProfileId;
    if (contractorProfileId) {
      const isTrialing = subscription.status === 'trialing';
      const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
      const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1000) : null;

      await prisma.contractorProfile.update({
        where: { id: contractorProfileId },
        data: {
          subscriptionTier: tier,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          ...(isTrialing && trialStart && { trialStartDate: trialStart }),
          ...(isTrialing && trialEnd && { trialEndDate: trialEnd, trialStatus: 'trialing' }),
          ...(!isTrialing && subscription.status === 'active' && { trialStatus: 'active' }),
        },
      });
    }

    // Fire Meta Conversions API events on subscription creation:
    //   - StartTrial while the user is in the 14-day free trial
    //   - Subscribe for fully-active subscriptions (skipped the trial somehow)
    // Purchase is fired on invoice.payment_succeeded below for the real $$ moment.
    if (event.type === 'customer.subscription.created') {
      try {
        const tierConfig = SUBSCRIPTION_TIERS[tier];
        const price =
          billingInterval === 'yearly'
            ? (tierConfig as { yearlyPrice?: number }).yearlyPrice ?? tierConfig.price * 12
            : tierConfig.price;

        const isTrial = subscription.status === 'trialing';
        const metaEventName = isTrial ? 'StartTrial' : 'Subscribe';
        const role = subscription.metadata?.role === 'contractor' ? 'contractor' : 'landlord';

        await sendMetaServerEvent({
          eventName: metaEventName,
          eventId: subscription.metadata?.metaEventId || `trial_${subscription.id}`,
          value: price,
          currency: 'USD',
          contentName: `${role}_${tier}_${billingInterval}`,
          contentCategory: `${role}_subscription`,
          contentIds: [tier],
          predictedLtv: price * 12,
          actionSource: 'website',
          user: {
            email: subscription.metadata?.metaUserEmail || null,
            externalId: subscription.metadata?.metaUserId || landlordId || contractorProfileId || null,
            clientIp: subscription.metadata?.metaIp || null,
            clientUserAgent: subscription.metadata?.metaUa || null,
            fbc: subscription.metadata?.metaFbc || null,
            fbp: subscription.metadata?.metaFbp || null,
          },
        });
      } catch (err) {
        console.error('[Meta CAPI] StartTrial/Subscribe failed:', err);
      }
    }

    return NextResponse.json({
      message: `Webhook processed: ${event.type}`,
    });
  }

  // Handle subscription cancellation
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const landlordId = subscription.metadata?.landlordId;

    if (landlordId) {
      await prisma.landlordSubscription.update({
        where: { landlordId },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
          tier: 'starter',
          unitLimit: 24,
          freeBackgroundChecks: false,
          freeEvictionChecks: false,
          freeEmploymentVerification: false,
        },
      });

      await prisma.landlord.update({
        where: { id: landlordId },
        data: {
          subscriptionTier: 'starter',
          subscriptionStatus: 'canceled',
          freeBackgroundChecks: false,
          freeEmploymentVerification: false,
        },
      });

      await prisma.subscriptionEvent.create({
        data: {
          landlordId,
          eventType: 'canceled',
          fromTier: subscription.metadata?.tier,
          toTier: 'starter',
          stripeEventId: event.id,
        },
      });
    }

    return NextResponse.json({
      message: 'Webhook processed: customer.subscription.deleted',
    });
  }

  // Handle successful invoice payments (subscription renewals)
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice;
    
    if (invoice.subscription && invoice.metadata?.landlordId) {
      await prisma.subscriptionEvent.create({
        data: {
          landlordId: invoice.metadata.landlordId,
          eventType: 'renewed',
          amount: invoice.amount_paid / 100,
          stripeEventId: event.id,
          metadata: {
            invoiceId: invoice.id,
            subscriptionId: invoice.subscription,
          },
        },
      });
    }

    // Fire Meta Conversions API Purchase event — the moment the card is actually charged.
    // We pull the attribution data off the subscription metadata (seeded during checkout creation)
    // so we can attribute this payment to the original ad click.
    if (invoice.amount_paid > 0 && invoice.subscription) {
      try {
        const subscriptionId =
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
          const stripeForLookup = new Stripe(stripeSecretKey);
          const sub = await stripeForLookup.subscriptions.retrieve(subscriptionId);
          const meta = sub.metadata || {};
          const role = meta.role === 'contractor' ? 'contractor' : 'landlord';
          const tier = meta.tier || 'starter';
          const billingInterval = meta.billingInterval || 'monthly';

          await sendMetaServerEvent({
            eventName: 'Purchase',
            // Use a per-invoice event id so renewals aren't deduplicated with the original.
            // The original StartTrial dedup key (metaEventId) is only used for the trial event.
            eventId: `purchase_${invoice.id}`,
            value: invoice.amount_paid / 100,
            currency: (invoice.currency || 'usd').toUpperCase(),
            contentName: `${role}_${tier}_${billingInterval}`,
            contentCategory: `${role}_subscription`,
            contentIds: [tier],
            actionSource: 'website',
            user: {
              email: meta.metaUserEmail || invoice.customer_email || null,
              externalId: meta.metaUserId || meta.landlordId || meta.contractorProfileId || null,
              clientIp: meta.metaIp || null,
              clientUserAgent: meta.metaUa || null,
              fbc: meta.metaFbc || null,
              fbp: meta.metaFbp || null,
            },
          });
        }
      } catch (err) {
        console.error('[Meta CAPI] Purchase event failed:', err);
      }
    }

    return NextResponse.json({
      message: 'Webhook processed: invoice.payment_succeeded',
    });
  }

  // Handle failed invoice payments
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    
    if (invoice.subscription && invoice.metadata?.landlordId) {
      const landlordId = invoice.metadata.landlordId;

      await prisma.landlordSubscription.update({
        where: { landlordId },
        data: { status: 'past_due' },
      });

      await prisma.landlord.update({
        where: { id: landlordId },
        data: { subscriptionStatus: 'past_due' },
      });

      await prisma.subscriptionEvent.create({
        data: {
          landlordId,
          eventType: 'payment_failed',
          stripeEventId: event.id,
          metadata: {
            invoiceId: invoice.id,
            subscriptionId: invoice.subscription,
          },
        },
      });
    }

    return NextResponse.json({
      message: 'Webhook processed: invoice.payment_failed',
    });
  }

  // Handle Stripe Connect account updates
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    
    // Find landlord or contractor by Connect account ID
    const landlord = await prisma.landlord.findFirst({
      where: { stripeConnectAccountId: account.id },
    });

    if (landlord) {
      const newStatus = persistOnboardingStatus(deriveOnboardingStatus(account));
      const treasuryActive = account.capabilities?.treasury === 'active';

      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          stripeOnboardingStatus: newStatus,
          stripeTreasuryEnabled: treasuryActive,
        },
      });

      // The first time treasury flips to active, auto-provision the
      // Financial Account so the user's wallet appears immediately on
      // their dashboard without an extra click.
      if (treasuryActive) {
        try {
          await ensureFinancialAccountForLandlord(landlord.id);
        } catch (err) {
          console.error(
            `[webhook account.updated] FA provisioning failed for landlord ${landlord.id}:`,
            err
          );
        }
      }

      console.log(
        `Landlord Connect account ${account.id} updated: status=${newStatus}, treasury=${treasuryActive}`
      );
    }

    // Also check team-member compensation rows (payroll Treasury onboarding).
    const tmComp = await prisma.teamMemberCompensation.findFirst({
      where: { stripeConnectAccountId: account.id },
      select: { id: true, teamMemberId: true, treasuryEnabled: true, treasuryVerifiedAt: true },
    });
    if (tmComp) {
      const newStatus = persistOnboardingStatus(deriveOnboardingStatus(account));
      const treasuryActive = account.capabilities?.treasury === 'active';

      await prisma.teamMemberCompensation.update({
        where: { id: tmComp.id },
        data: {
          treasuryOnboardingStatus: newStatus,
          treasuryEnabled: treasuryActive,
          ...(treasuryActive && !tmComp.treasuryVerifiedAt
            ? { treasuryVerifiedAt: new Date() }
            : {}),
        },
      });

      if (treasuryActive) {
        try {
          const { ensureFinancialAccountForTeamMember } = await import(
            '@/lib/services/payroll.service'
          );
          await ensureFinancialAccountForTeamMember(tmComp.teamMemberId);
        } catch (err) {
          console.error(
            `[webhook account.updated] team FA provisioning failed for tm ${tmComp.teamMemberId}:`,
            err
          );
        }
      }
      console.log(
        `Team member Connect account ${account.id} updated: status=${newStatus}, treasury=${treasuryActive}`
      );
    }

    // Also check contractors
    const contractor = await prisma.contractor.findFirst({
      where: { stripeConnectAccountId: account.id },
    });

    if (contractor) {
      const isPaymentReady = account.payouts_enabled || false;
      
      await prisma.contractor.update({
        where: { id: contractor.id },
        data: { isPaymentReady },
      });

      console.log(`Contractor Connect account ${account.id} updated: paymentReady=${isPaymentReady}`);
    }

    return NextResponse.json({
      message: 'Webhook processed: account.updated',
    });
  }

  // ============= STRIPE CAPABILITY UPDATES =============
  // Fired when a specific capability (transfers, treasury, ...) flips
  // status. We just re-sync the parent account so derived state stays
  // accurate without duplicating the logic above.
  if (event.type === 'capability.updated') {
    const capability = event.data.object as Stripe.Capability;
    const accountId =
      typeof capability.account === 'string'
        ? capability.account
        : capability.account?.id;
    if (accountId) {
      const landlord = await prisma.landlord.findFirst({
        where: { stripeConnectAccountId: accountId },
        select: { id: true },
      });
      if (landlord) {
        try {
          await syncLandlordConnectStatus(landlord.id);
        } catch (err) {
          console.error('[webhook capability.updated] sync failed', err);
        }
      }
    }
    return NextResponse.json({ message: 'Webhook processed: capability.updated' });
  }

  // ============= TREASURY EVENTS =============
  // We listen on Treasury events purely to keep our local mirror tables
  // up to date and to write per-transaction rows the dashboard can render.
  // The actual money movement is fully managed by Stripe — we don't make
  // money decisions in webhooks, we just record what happened.
  if (event.type.startsWith('treasury.')) {
    return handleTreasuryEvent(event);
  }

  // ============= ISSUING EVENTS =============
  // Card issuance, authorization decisions, and final transaction rows
  // (the durable record of money leaving the user's wallet via card swipe).
  if (event.type.startsWith('issuing_')) {
    return handleIssuingEvent(event);
  }

  // Handle transfer events (for contractor payments)
  if (event.type === 'transfer.created') {
    const transfer = event.data.object as Stripe.Transfer;

    if (transfer.metadata?.type === 'contractor_payout') {
      console.log(`Contractor transfer created: ${transfer.id} for ${transfer.amount / 100}`);
    }

    // Bank reconciliation: legacy Connect transfer path. Record the row
    // so the rec screen shows it alongside the new Treasury events.
    try {
      await recordConnectTransfer({ transfer });
    } catch (bankErr) {
      console.error('[banking] connect transfer record failed', transfer.id, bankErr);
    }

    return NextResponse.json({
      message: 'Webhook processed: transfer.created',
    });
  }

  // ============= BANK REC: Refunds, Payouts, Fees =============
  // These handlers exist primarily to feed the BankTransaction table so the
  // reconciliation screen has a complete ledger. They are intentionally
  // lightweight — the actual refund/payout processing is the existing
  // application logic elsewhere.

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const landlordId = await resolveLandlordIdFromCharge(charge);
    if (landlordId) {
      try {
        await recordBankTransaction({
          landlordId,
          source: 'stripe_charge',
          externalId: `${charge.id}_refund`,
          stripeEventId: event.id,
          amount: -(charge.amount_refunded / 100),
          currency: charge.currency ?? 'usd',
          description: `Refund — ${charge.description ?? charge.billing_details?.name ?? charge.id}`,
          rawPayload: charge as unknown as Prisma.InputJsonValue,
          postedAt: new Date((charge.created ?? Math.floor(Date.now() / 1000)) * 1000),
        });
      } catch (bankErr) {
        console.error('[banking] charge.refunded record failed', charge.id, bankErr);
      }
    }
    return NextResponse.json({ message: 'Webhook processed: charge.refunded' });
  }

  if (event.type === 'payout.paid' || event.type === 'payout.failed') {
    const payout = event.data.object as Stripe.Payout;
    // Payouts are always on a connected account (landlord's Treasury
    // auto-payout) or on the platform account. event.account is set for
    // connected-account payouts.
    const acctId = (payout as unknown as { account?: string }).account ?? null;
    const landlord = acctId
      ? await prisma.landlord.findFirst({
          where: { stripeConnectAccountId: acctId },
          select: { id: true },
        })
      : null;
    if (landlord) {
      try {
        await recordBankTransaction({
          landlordId: landlord.id,
          source: 'stripe_payout',
          externalId: payout.id,
          stripeEventId: event.id,
          amount: -(payout.amount / 100),
          currency: payout.currency ?? 'usd',
          description: `Payout ${payout.status} — ${(payout as unknown as { destination_details?: { bank?: { bank_name?: string } } }).destination_details?.bank?.bank_name ?? 'bank'}`,
          rawPayload: payout as unknown as Prisma.InputJsonValue,
          postedAt: new Date(payout.arrival_date * 1000),
        });
      } catch (bankErr) {
        console.error('[banking] payout record failed', payout.id, bankErr);
      }
    }
    return NextResponse.json({ message: `Webhook processed: ${event.type}` });
  }

  if (event.type === 'application_fee.created') {
    const fee = event.data.object as Stripe.ApplicationFee;
    // Application fees land on the platform account. Look up the
    // originating charge and find the landlord through it.
    let landlordId: string | null = null;
    if (typeof fee.charge === 'string') {
      const charge = await prisma.rentPayment.findFirst({
        where: { stripePaymentIntentId: fee.charge },
        select: { lease: { select: { unit: { select: { property: { select: { landlordId: true } } } } } } },
      });
      landlordId = charge?.lease?.unit?.property?.landlordId ?? null;
    }
    if (landlordId) {
      try {
        await recordBankTransaction({
          landlordId,
          source: 'stripe_application_fee',
          externalId: fee.id,
          stripeEventId: event.id,
          amount: -(fee.amount / 100),
          currency: fee.currency ?? 'usd',
          description: `Stripe platform fee (${fee.id})`,
          rawPayload: fee as unknown as Prisma.InputJsonValue,
          postedAt: new Date(fee.created * 1000),
        });
      } catch (bankErr) {
        console.error('[banking] application_fee record failed', fee.id, bankErr);
      }
    }
    return NextResponse.json({ message: 'Webhook processed: application_fee.created' });
  }

  // Handle visibility boost purchases
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // ── Public lease e-sign one-time payment ($4.99) ──────────────────────────
    if (session.metadata?.type === 'public_lease_esign' && session.payment_status === 'paid') {
      const publicLeaseEsignId = session.metadata.publicLeaseEsignId;
      if (publicLeaseEsignId) {
        try {
          // Mark as paid and kick off tenant invite emails via the internal API
          await (prisma as any).publicLeaseEsign.update({
            where: { id: publicLeaseEsignId },
            data: { paidAt: new Date() },
          });

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com';
          const secret = process.env.CRON_SECRET;
          await fetch(`${baseUrl}/api/public/lease/esign-send-invites`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
            },
            body: JSON.stringify({ publicLeaseEsignId }),
          });

          console.log(`[webhook] public_lease_esign paid and invites queued for ${publicLeaseEsignId}`);
        } catch (err) {
          console.error('[webhook] public_lease_esign handler error:', err);
        }
      }
    }

    if (session.metadata?.type === 'visibility_boost' && session.payment_status === 'paid') {
      const contractorProfileId = session.metadata.contractorProfileId;
      const credits = parseInt(session.metadata.credits || '0', 10);

      if (contractorProfileId && credits > 0) {
        // Check if already processed via the success-page confirm endpoint
        // by seeing if visibilityCredits already includes this amount.
        // We use the Stripe session ID stored in a simple way: just try to update
        // and rely on the fact that the success-page already ran the increment.
        // To avoid double-crediting, we store processed session IDs.
        const alreadyProcessed = await prisma.contractorProfile.findFirst({
          where: {
            id: contractorProfileId,
            // Simple dedup: if featuredUntil is in the future, the success page already ran
            featuredUntil: { gt: new Date() },
          },
          select: { id: true },
        });

        if (!alreadyProcessed) {
          await prisma.contractorProfile.update({
            where: { id: contractorProfileId },
            data: {
              visibilityCredits: { increment: credits },
              featuredUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
          console.log(`Visibility boost credited via webhook: ${credits} impressions to profile ${contractorProfileId}`);
        } else {
          console.log(`Visibility boost already credited via success page for profile ${contractorProfileId}, skipping webhook`);
        }
      }
    }

    return NextResponse.json({ message: 'Webhook processed: checkout.session.completed' });
  }

  return NextResponse.json({
    message: 'Webhook event not handled: ' + event.type,
  });
}

// ============================================================================
// Bank transaction recording — Stripe → BankTransaction table
// ============================================================================
//
// Each helper below is fire-and-forget. We never let bank-rec failures break
// the webhook (the existing flow is the source of truth for domain state —
// bank transactions are a derived view). The helpers accept an optional
// `Prisma.TransactionClient` so callers can fold bank-rec into an existing
// $transaction and keep idempotency guarantees tight.

type MaybeTx = Prisma.TransactionClient | undefined;

/**
 * Cast a `tx | undefined` to the extended Prisma client type so method
 * calls (findUnique, update, etc.) don't trip the "excessive stack depth"
 * error Prisma throws when the extended client is unioned with the
 * transaction-client type. We use `any` for the return type because
 * `PrismaClient` itself triggers the same deep-type error when unioned
 * with the extended singleton.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asExec = (tx: MaybeTx): any =>
  tx ? (tx as unknown as Prisma.TransactionClient) : (prisma as unknown as Prisma.TransactionClient);

async function recordChargeForRent(args: {
  charge: Stripe.Charge;
  landlordId: string;
  paymentIntentId: string | null;
  tx?: MaybeTx;
}): Promise<void> {
  // Skip if it's not a real money-in (e.g. a 0-cent test charge).
  if (args.charge.amount <= 0) return;
  await recordBankTransaction(
    {
      landlordId: args.landlordId,
      source: 'stripe_charge',
      externalId: args.charge.id,
      stripeEventId: args.charge.metadata?.['event_id'] ?? null,
      amount: args.charge.amount / 100,
      currency: args.charge.currency ?? 'usd',
      description: args.charge.description ?? args.charge.billing_details?.name ?? 'Stripe charge',
      rawPayload: { ...args.charge, metadata: { ...args.charge.metadata, paymentIntentId: args.paymentIntentId ?? '' } } as unknown as Prisma.InputJsonValue,
      postedAt: new Date((args.charge.created ?? Math.floor(Date.now() / 1000)) * 1000),
    },
    args.tx
  );
}

async function recordTreasuryOutbound(args: {
  transfer: Stripe.Treasury.OutboundTransfer;
  eventType: string;
  tx?: MaybeTx;
}): Promise<void> {
  const exec = asExec(args.tx);
  const landlord = await exec.landlord.findFirst({
    where: { stripeConnectAccountId: (args.transfer as unknown as { account?: string }).account ?? null },
    select: { id: true },
  });
  if (!landlord) return;
  const fa = await exec.financialAccount.findFirst({
    where: { landlordId: landlord.id, status: { in: ['pending', 'active'] } },
    select: { id: true },
  });
  await recordBankTransaction(
    {
      landlordId: landlord.id,
      financialAccountId: fa?.id ?? null,
      stripeConnectedAccountId: (args.transfer as unknown as { account?: string }).account ?? null,
      source: 'stripe_outbound_xfer',
      externalId: args.transfer.id,
      amount: -(args.transfer.amount / 100), // outbound = negative
      currency: args.transfer.currency ?? 'usd',
      description: args.transfer.description ?? 'Treasury outbound transfer',
      rawPayload: args.transfer as unknown as Prisma.InputJsonValue,
      postedAt: new Date(((args.transfer as unknown as { arrived_at?: number }).arrived_at ?? Math.floor(Date.now() / 1000)) * 1000),
    },
    args.tx
  );
}

async function recordTreasuryInbound(args: {
  transfer: Stripe.Treasury.InboundTransfer;
  eventType: string;
  tx?: MaybeTx;
}): Promise<void> {
  const exec = asExec(args.tx);
  const landlord = await exec.landlord.findFirst({
    where: { stripeConnectAccountId: (args.transfer as unknown as { account?: string }).account ?? null },
    select: { id: true },
  });
  if (!landlord) return;
  const fa = await exec.financialAccount.findFirst({
    where: { landlordId: landlord.id, status: { in: ['pending', 'active'] } },
    select: { id: true },
  });
  await recordBankTransaction(
    {
      landlordId: landlord.id,
      financialAccountId: fa?.id ?? null,
      stripeConnectedAccountId: (args.transfer as unknown as { account?: string }).account ?? null,
      source: 'stripe_inbound_xfer',
      externalId: args.transfer.id,
      amount: args.transfer.amount / 100, // inbound = positive
      currency: args.transfer.currency ?? 'usd',
      description: args.transfer.description ?? 'Treasury inbound transfer',
      rawPayload: args.transfer as unknown as Prisma.InputJsonValue,
      postedAt: new Date(((args.transfer as unknown as { arrived_at?: number }).arrived_at ?? Math.floor(Date.now() / 1000)) * 1000),
    },
    args.tx
  );
}

async function recordConnectTransfer(args: {
  transfer: Stripe.Transfer;
  tx?: MaybeTx;
}): Promise<void> {
  const dest = typeof args.transfer.destination === 'string'
    ? args.transfer.destination
    : args.transfer.destination?.id;
  if (!dest) return;
  const exec = asExec(args.tx);
  const landlord = await exec.landlord.findFirst({
    where: { stripeConnectAccountId: dest },
    select: { id: true },
  });
  if (!landlord) return;
  // Transfer is money out of platform → into connected account → negative from
  // the bank-rec ledger perspective.
  await recordBankTransaction(
    {
      landlordId: landlord.id,
      stripeConnectedAccountId: dest,
      source: 'stripe_transfer',
      externalId: args.transfer.id,
      amount: -(args.transfer.amount / 100),
      currency: args.transfer.currency ?? 'usd',
      description: args.transfer.description ?? 'Connect transfer',
      rawPayload: args.transfer as unknown as Prisma.InputJsonValue,
      postedAt: new Date(args.transfer.created * 1000),
    },
    args.tx
  );
}

/**
 * Find the landlord for a charge by walking the originating payment intent
 * back to the RentPayment. Used by `charge.refunded` and the new
 * application_fee.created handler.
 */
async function resolveLandlordIdFromCharge(charge: Stripe.Charge): Promise<string | null> {
  const piId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;
  if (piId) {
    const rp = await prisma.rentPayment.findFirst({
      where: { stripePaymentIntentId: piId },
      select: { lease: { select: { unit: { select: { property: { select: { landlordId: true } } } } } } },
    });
    if (rp) return rp.lease.unit.property.landlordId;
  }
  return null;
}

// ============================================================================
// Treasury event handler
// ============================================================================
//
// We intentionally keep this in a separate function (rather than inlining in
// the giant if/else above) so the Treasury logic is easy to find and modify
// without scrolling past 700 lines of subscription / rent payment code.
async function handleTreasuryEvent(event: Stripe.Event): Promise<NextResponse> {
  // Stripe emits events on the connected account; we use that account ID
  // both for filtering and for retrieving any related FA from the DB.
  const connectedAccountId = (event.account as string) || null;

  switch (event.type) {
    // ── Financial Account lifecycle ────────────────────────────────────
    case 'treasury.financial_account.created':
    case 'treasury.financial_account.features_status_updated':
    case 'treasury.financial_account.closed': {
      const fa = event.data.object as Stripe.Treasury.FinancialAccount;
      // Find the matching DB row by stripeFinancialAccountId. If we don't
      // have one yet (account.updated fired the auto-provisioning path
      // before this event landed), fall back to inserting from scratch.
      const existing = await prisma.financialAccount.findUnique({
        where: { stripeFinancialAccountId: fa.id },
      });

      const status =
        fa.status === 'open' ? 'active' :
        fa.status === 'closed' ? 'closed' :
        'pending';

      if (existing) {
        await prisma.financialAccount.update({
          where: { id: existing.id },
          data: {
            status,
            activeFeatures: fa.active_features ?? [],
          },
        });
      } else if (connectedAccountId) {
        // First time we're hearing about this FA — try to link it to a
        // landlord by connected account ID. Only a single landlord owns
        // a given Connect account, so this lookup is unambiguous.
        const landlord = await prisma.landlord.findFirst({
          where: { stripeConnectAccountId: connectedAccountId },
          select: { id: true },
        });
        if (landlord) {
          await prisma.financialAccount.create({
            data: {
              landlordId: landlord.id,
              stripeConnectedAccountId: connectedAccountId,
              stripeFinancialAccountId: fa.id,
              status,
              activeFeatures: fa.active_features ?? [],
              bankName: 'Property Flow Wallet',
            },
          });
          await prisma.landlord.update({
            where: { id: landlord.id },
            data: { stripeTreasuryEnabled: true },
          });
        }
      }
      return NextResponse.json({ message: `Webhook processed: ${event.type}` });
    }

    // ── Inbound transfers (money flowing INTO the user's FA) ───────────
    case 'treasury.inbound_transfer.created':
    case 'treasury.inbound_transfer.succeeded':
    case 'treasury.inbound_transfer.failed':
    case 'treasury.inbound_transfer.canceled': {
      const transfer = event.data
        .object as Stripe.Treasury.InboundTransfer;
      await upsertFinancialAccountTransaction({
        stripeTransactionId: transfer.id,
        type: 'inbound_transfer',
        amount: transfer.amount,
        currency: transfer.currency,
        status: transfer.status,
        description: transfer.description ?? null,
        counterpartyName:
          (transfer.origin_payment_method_details as any)?.us_bank_account
            ?.bank_name ?? null,
        counterpartyType: 'bank_account',
        financialAccountStripeId: transfer.financial_account,
        metadata: { eventType: event.type },
      });
      // Bank reconciliation: record the inbound event so the rec screen sees
      // it. Fire-and-forget — the upsert above is the source of truth.
      try {
        await recordTreasuryInbound({ transfer, eventType: event.type });
      } catch (bankErr) {
        console.error('[banking] inbound transfer record failed', transfer.id, bankErr);
      }
      return NextResponse.json({ message: `Webhook processed: ${event.type}` });
    }

    // ── Outbound transfers (money flowing OUT of the user's FA) ────────
    case 'treasury.outbound_transfer.created':
    case 'treasury.outbound_transfer.posted':
    case 'treasury.outbound_transfer.canceled':
    case 'treasury.outbound_transfer.expected_arrival_date_updated':
    case 'treasury.outbound_transfer.failed':
    case 'treasury.outbound_transfer.returned': {
      const transfer = event.data
        .object as Stripe.Treasury.OutboundTransfer;
      await upsertFinancialAccountTransaction({
        stripeTransactionId: transfer.id,
        type: 'outbound_transfer',
        amount: -Math.abs(transfer.amount),
        currency: transfer.currency,
        status: transfer.status,
        description: transfer.description ?? null,
        counterpartyName:
          (transfer.destination_payment_method_details as any)
            ?.us_bank_account?.bank_name ?? null,
        counterpartyType: 'bank_account',
        financialAccountStripeId: transfer.financial_account,
        metadata: { eventType: event.type },
      });

      // ── Marketplace payment side effects ──────────────────────────
      // Reflect the transfer status onto any ContractorPayment row that
      // tracks it. This is what flips a job from "processing" → "paid".
      await reflectMarketplacePaymentFromTransfer(transfer, event.type);

      // ── Payroll payment side effects ──────────────────────────────
      // Same shape, different table — TeamPayment for landlord payroll.
      await reflectPayrollPaymentFromTransfer(transfer, event.type);

      // Bank reconciliation: outbound Transfer is the marketplace payment
      // leg. Auto-match will find the matching ContractorPayment and link
      // it to its (eventual) GL entry.
      try {
        await recordTreasuryOutbound({ transfer, eventType: event.type });
      } catch (bankErr) {
        console.error('[banking] outbound transfer record failed', transfer.id, bankErr);
      }

      return NextResponse.json({ message: `Webhook processed: ${event.type}` });
    }

    // ── Outbound payments (money flowing OUT to a payee) ───────────────
    case 'treasury.outbound_payment.created':
    case 'treasury.outbound_payment.posted':
    case 'treasury.outbound_payment.canceled':
    case 'treasury.outbound_payment.failed':
    case 'treasury.outbound_payment.returned': {
      const payment = event.data.object as Stripe.Treasury.OutboundPayment;
      await upsertFinancialAccountTransaction({
        stripeTransactionId: payment.id,
        type: 'outbound_payment',
        amount: -Math.abs(payment.amount),
        currency: payment.currency,
        status: payment.status,
        description: payment.description ?? null,
        counterpartyName: payment.end_user_details?.present
          ? null
          : (payment as any).destination_payment_method_details?.us_bank_account
              ?.bank_name ?? null,
        counterpartyType: 'bank_account',
        financialAccountStripeId: payment.financial_account,
        metadata: { eventType: event.type },
      });

      // Marketplace + payroll BOTH use OutboundPayment under the hood
      // (legacy marketplace was OutboundTransfer; new payroll service is
      // OutboundPayment). Reflect into both tables — `paymentId` metadata
      // tells us which one to touch.
      await reflectMarketplacePaymentFromOutboundPayment(payment, event.type);
      await reflectPayrollPaymentFromOutboundPayment(payment, event.type);

      return NextResponse.json({ message: `Webhook processed: ${event.type}` });
    }

    // ── Received credits / debits (raw bank events) ────────────────────
    case 'treasury.received_credit.created':
    case 'treasury.received_credit.succeeded':
    case 'treasury.received_credit.failed': {
      const credit = event.data.object as Stripe.Treasury.ReceivedCredit;
      await upsertFinancialAccountTransaction({
        stripeTransactionId: credit.id,
        type: 'received_credit',
        amount: credit.amount,
        currency: credit.currency,
        status: credit.status,
        description: credit.description ?? null,
        counterpartyType: 'bank_account',
        financialAccountStripeId: typeof credit.financial_account === 'string'
          ? credit.financial_account
          : (credit.financial_account as any)?.id || credit.financial_account,
        metadata: { eventType: event.type },
      });
      return NextResponse.json({ message: `Webhook processed: ${event.type}` });
    }

    case 'treasury.received_debit.created': {
      const debit = event.data.object as Stripe.Treasury.ReceivedDebit;
      await upsertFinancialAccountTransaction({
        stripeTransactionId: debit.id,
        type: 'received_debit',
        amount: -Math.abs(debit.amount),
        currency: debit.currency,
        status: debit.status,
        description: debit.description ?? null,
        counterpartyType: 'bank_account',
        financialAccountStripeId: typeof debit.financial_account === 'string'
          ? debit.financial_account
          : (debit.financial_account as any)?.id || debit.financial_account,
        metadata: { eventType: event.type },
      });
      return NextResponse.json({ message: `Webhook processed: ${event.type}` });
    }

    default:
      // Unhandled treasury event — just log and ack so Stripe doesn't retry.
      console.log(`[stripe webhook] Unhandled treasury event: ${event.type}`);
      return NextResponse.json({
        message: 'Treasury event not specifically handled: ' + event.type,
      });
  }
}

/**
 * Insert or update a row in `FinancialAccountTransaction` for a given
 * Stripe transaction id. Idempotent — if the same Stripe id is re-emitted
 * we update the existing row rather than create a duplicate.
 */
async function upsertFinancialAccountTransaction(params: {
  stripeTransactionId: string;
  type: string;
  amount: number; // cents (signed: negative for money out)
  currency: string;
  status: string;
  description: string | null;
  counterpartyName?: string | null;
  counterpartyType?: string | null;
  financialAccountStripeId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const fa = await prisma.financialAccount.findUnique({
    where: { stripeFinancialAccountId: params.financialAccountStripeId },
    select: { id: true },
  });
  if (!fa) {
    // Edge case — we got a treasury event for an FA we don't have a row
    // for yet. Drop a structured log; the next account.updated/treasury
    // financial_account.created will create the row and the next iteration
    // of this same Stripe id will land in the matching row.
    console.warn(
      '[treasury webhook] received transaction for unknown FA',
      params.financialAccountStripeId
    );
    return;
  }

  const existing = await prisma.financialAccountTransaction.findFirst({
    where: { stripeTransactionId: params.stripeTransactionId },
    select: { id: true },
  });

  const data = {
    financialAccountId: fa.id,
    stripeTransactionId: params.stripeTransactionId,
    type: params.type,
    amount: params.amount / 100,
    currency: params.currency,
    status: params.status,
    description: params.description,
    counterpartyName: params.counterpartyName ?? null,
    counterpartyType: params.counterpartyType ?? null,
    metadata: params.metadata as any,
  };

  if (existing) {
    await prisma.financialAccountTransaction.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.financialAccountTransaction.create({ data });
  }
}

// ============================================================================
// Marketplace payment reflection
// ============================================================================
//
// `reflectMarketplacePaymentFromTransfer` keeps the ContractorPayment row in
// sync with the Stripe OutboundTransfer state machine. When Stripe says a
// transfer posted, we mark the payment paid and notify both parties. When
// Stripe says a transfer failed, we run a single 60-second retry; if the
// retry also fails we surface it for manual review and notify both parties.

async function reflectMarketplacePaymentFromTransfer(
  transfer: Stripe.Treasury.OutboundTransfer,
  eventType: string
): Promise<void> {
  // We only care about transfers initiated by our marketplace flow — the
  // metadata on the Stripe object tells us which ContractorPayment row to
  // update. Skip silently for non-marketplace transfers (e.g., wallet
  // withdrawals from /api/wallet/withdraw).
  const paymentId = (transfer.metadata as Record<string, string>)?.paymentId;
  if (!paymentId) return;

  const payment = await prisma.contractorPayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      status: true,
      retryCount: true,
      transferType: true,
      landlordId: true,
      contractorId: true,
      milestoneRefId: true,
      milestoneRefType: true,
      workOrderId: true,
      amount: true,
    },
  });
  if (!payment) {
    console.warn(
      `[stripe webhook] no ContractorPayment matched paymentId=${paymentId}`
    );
    return;
  }

  // ── posted: payment confirmed ─────────────────────────────────────────
  if (eventType === 'treasury.outbound_transfer.posted') {
    await prisma.contractorPayment.update({
      where: { id: payment.id },
      data: {
        status: 'paid',
        treasuryStatus: 'posted',
        paidAt: new Date(),
      },
    });

    // Notify both parties.
    try {
      const landlord = await prisma.landlord.findUnique({
        where: { id: payment.landlordId },
        select: { ownerUserId: true, name: true },
      });
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: payment.contractorId },
        select: { userId: true, businessName: true },
      });
      if (landlord?.ownerUserId) {
        await prisma.notification.create({
          data: {
            userId: landlord.ownerUserId,
            type: 'marketplace_payment_posted',
            title: '💸 Payment Sent',
            message: `Your $${Number(payment.amount).toLocaleString()} payment to ${contractor?.businessName || 'the contractor'} posted.`,
            actionUrl: payment.workOrderId
              ? `/admin/maintenance/${payment.workOrderId}`
              : '/admin/wallet',
          },
        });
      }
      if (contractor?.userId) {
        await prisma.notification.create({
          data: {
            userId: contractor.userId,
            type: 'marketplace_payment_received',
            title: '💰 Payment Received',
            message: `$${Number(payment.amount).toLocaleString()} (minus $1 fee) was deposited to your wallet.`,
            actionUrl: '/contractor-dashboard/payouts',
          },
        });
      }
    } catch (err) {
      console.error('[stripe webhook] post notify failed', err);
    }
    return;
  }

  // ── failed / returned: retry once after 60s, then escalate ────────────
  if (
    eventType === 'treasury.outbound_transfer.failed' ||
    eventType === 'treasury.outbound_transfer.returned'
  ) {
    if (payment.retryCount === 0) {
      // Schedule the retry. We use a lightweight setTimeout because the
      // webhook process stays alive long enough for 60s; in production
      // a queue worker would be a hardened replacement.
      await prisma.contractorPayment.update({
        where: { id: payment.id },
        data: {
          status: 'processing',
          treasuryStatus: 'failed',
          retryCount: 1,
          lastRetryAt: new Date(),
          failureReason: (transfer as any).failure_details?.code ?? 'transfer_failed',
        },
      });
      setTimeout(() => {
        retryFailedMarketplacePayment(payment.id).catch((err) =>
          console.error('[stripe webhook] retry failed', err)
        );
      }, 60_000);
      return;
    }

    // Already retried once — flag for manual review.
    await prisma.contractorPayment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        treasuryStatus: 'failed',
        failureReason: (transfer as any).failure_details?.code ?? 'transfer_failed_after_retry',
      },
    });
    try {
      const landlord = await prisma.landlord.findUnique({
        where: { id: payment.landlordId },
        select: { ownerUserId: true },
      });
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: payment.contractorId },
        select: { userId: true },
      });
      if (landlord?.ownerUserId) {
        await prisma.notification.create({
          data: {
            userId: landlord.ownerUserId,
            type: 'marketplace_payment_failed',
            title: '⚠ Payment Failed',
            message: `Your $${Number(payment.amount).toLocaleString()} contractor payment could not be completed. Our team will follow up.`,
            actionUrl: '/admin/wallet',
          },
        });
      }
      if (contractor?.userId) {
        await prisma.notification.create({
          data: {
            userId: contractor.userId,
            type: 'marketplace_payment_failed',
            title: '⚠ Incoming Payment Failed',
            message: `A $${Number(payment.amount).toLocaleString()} payment from the platform could not be delivered. Our team is investigating.`,
            actionUrl: '/contractor-dashboard/payouts',
          },
        });
      }
    } catch (err) {
      console.error('[stripe webhook] failure notify failed', err);
    }
  }
}

/**
 * Retry a failed marketplace payment exactly once. We never re-charge the
 * $1 platform fee — `platformFeeCollected=true` from the first attempt
 * skips the fee leg in the service.
 */
async function retryFailedMarketplacePayment(paymentId: string): Promise<void> {
  const { retryMarketplacePayment } = await import(
    '@/lib/services/treasury-payments.service'
  );
  const result = await retryMarketplacePayment(paymentId);
  if (!result.success) {
    console.error(
      `[stripe webhook] retry of payment ${paymentId} failed: ${result.message}`
    );
  }
}


// ============================================================================
// Issuing event handler
// ============================================================================
//
// We DON'T approve/deny authorizations from this handler — Stripe Issuing
// auto-approves based on the card's `spending_controls` (we configured
// blocked_categories + monthly limits at card-create time) and Treasury
// balance. This handler just mirrors the events into our DB so the
// dashboard can show real-time spend and history.

async function handleIssuingEvent(event: Stripe.Event): Promise<NextResponse> {
  switch (event.type) {
    // ── Card lifecycle ─────────────────────────────────────────────────
    case 'issuing_card.created':
    case 'issuing_card.updated': {
      const card = event.data.object as Stripe.Issuing.Card;
      const existing = await prisma.issuingCard.findUnique({
        where: { stripeCardId: card.id },
      });
      if (existing) {
        await prisma.issuingCard.update({
          where: { id: existing.id },
          data: {
            status: card.status,
            frozen: card.status === 'inactive',
            last4: card.last4 ?? existing.last4,
            brand: card.brand ?? existing.brand,
            expMonth: card.exp_month ?? existing.expMonth,
            expYear: card.exp_year ?? existing.expYear,
            shippingStatus:
              card.type === 'physical'
                ? card.shipping?.status ?? existing.shippingStatus
                : existing.shippingStatus,
            shippingCarrier:
              card.shipping?.carrier ?? existing.shippingCarrier,
            shippingTrackingNumber:
              card.shipping?.tracking_number ?? existing.shippingTrackingNumber,
          },
        });
      }
      return NextResponse.json({ message: `Webhook processed: ${event.type}` });
    }

    // ── Authorization (real-time spend decision) ──────────────────────
    case 'issuing_authorization.request':
    case 'issuing_authorization.created':
    case 'issuing_authorization.updated': {
      const auth = event.data.object as Stripe.Issuing.Authorization;
      const card = await prisma.issuingCard.findUnique({
        where: { stripeCardId: auth.card.id ?? (auth.card as any) },
        select: { id: true, userId: true },
      });
      if (!card) {
        return NextResponse.json({ message: 'Unknown card; skipping' });
      }
      const merchant = auth.merchant_data;
      const decline = (auth as any).request_history?.[0]?.reason ?? null;

      await prisma.issuingAuthorization.upsert({
        where: { stripeAuthId: auth.id },
        create: {
          cardId: card.id,
          userId: card.userId,
          stripeAuthId: auth.id,
          amount: Math.abs(auth.amount) / 100,
          currency: auth.currency,
          approved: auth.approved,
          merchantName: merchant?.name ?? null,
          merchantCategory: merchant?.category ?? null,
          merchantCity: merchant?.city ?? null,
          merchantState: merchant?.state ?? null,
          merchantCountry: merchant?.country ?? null,
          declineReason: decline,
        },
        update: {
          approved: auth.approved,
          declineReason: decline,
        },
      });

      // Real-time push notification on the request event so the user
      // sees the swipe immediately.
      if (event.type === 'issuing_authorization.request' && auth.approved) {
        try {
          await prisma.notification.create({
            data: {
              userId: card.userId,
              type: 'card_authorization',
              title: '💳 Card spend',
              message: `$${(Math.abs(auth.amount) / 100).toFixed(2)} at ${merchant?.name || 'a merchant'}`,
              actionUrl: '/admin/wallet',
            },
          });
        } catch (err) {
          console.error('[issuing webhook] notify failed', err);
        }
      }
      return NextResponse.json({ message: `Webhook processed: ${event.type}` });
    }

    // ── Final transaction (money actually moved) ──────────────────────
    case 'issuing_transaction.created':
    case 'issuing_transaction.updated': {
      const tx = event.data.object as Stripe.Issuing.Transaction;
      const cardId = typeof tx.card === 'string' ? tx.card : tx.card?.id;
      if (!cardId) {
        return NextResponse.json({ message: 'No card id on transaction' });
      }
      const card = await prisma.issuingCard.findUnique({
        where: { stripeCardId: cardId },
        select: { id: true, userId: true },
      });
      if (!card) {
        return NextResponse.json({ message: 'Unknown card; skipping' });
      }

      await prisma.issuingTransaction.upsert({
        where: { stripeTransactionId: tx.id },
        create: {
          cardId: card.id,
          userId: card.userId,
          stripeTransactionId: tx.id,
          stripeAuthId: typeof tx.authorization === 'string'
            ? tx.authorization
            : tx.authorization?.id ?? null,
          amount: tx.amount / 100, // signed: capture is negative
          currency: tx.currency,
          type: tx.type,
          merchantName: tx.merchant_data?.name ?? null,
          merchantCategory: tx.merchant_data?.category ?? null,
        },
        update: {
          amount: tx.amount / 100,
          type: tx.type,
          merchantName: tx.merchant_data?.name ?? null,
        },
      });
      return NextResponse.json({ message: `Webhook processed: ${event.type}` });
    }

    default:
      return NextResponse.json({
        message: 'Issuing event not specifically handled: ' + event.type,
      });
  }
}


// ============================================================================
// Marketplace + Payroll: OutboundPayment reflection
// ============================================================================
//
// Both flows use `treasury.outbound_payment.*` because Treasury doesn't
// expose a direct intra-Stripe API; everything moves via ABA-routed
// OutboundPayment. We dispatch on the `paymentId` + `purpose` metadata
// the originator stamped at create time.

async function reflectMarketplacePaymentFromOutboundPayment(
  payment: Stripe.Treasury.OutboundPayment,
  eventType: string
): Promise<void> {
  const md = (payment.metadata || {}) as Record<string, string>;
  const isMarketplace = md.source === 'wallet.send' || md.source === 'wallet.withdraw' ||
    md.purpose === 'marketplace_platform_fee';
  // The marketplace single/milestone path uses outbound_transfer (handled
  // separately above). This handler only catches platform-fee legs and
  // wallet sends/withdraws — they don't roll up to ContractorPayment, so
  // there's nothing to reflect here. Kept as a stub for future use.
  if (!isMarketplace) return;
  // Currently noop.
}

async function reflectPayrollPaymentFromOutboundPayment(
  payment: Stripe.Treasury.OutboundPayment,
  eventType: string
): Promise<void> {
  const md = (payment.metadata || {}) as Record<string, string>;
  if (md.source !== 'payroll.timesheet') return;

  const teamPaymentId = md.paymentId || md.teamPaymentId;
  if (!teamPaymentId) return;

  const tp = await prisma.teamPayment.findUnique({
    where: { id: teamPaymentId },
    select: {
      id: true,
      teamMemberId: true,
      landlordId: true,
      grossAmount: true,
      retryCount: true,
    },
  });
  if (!tp) return;

  if (eventType === 'treasury.outbound_payment.posted') {
    await prisma.teamPayment.update({
      where: { id: tp.id },
      data: {
        status: 'completed',
        treasuryStatus: 'posted',
        paidAt: new Date(),
      },
    });
    // Promote linked timesheet to 'paid' so it stops appearing in the
    // approved-unpaid list. We use the foreign key directly — updateMany
    // doesn't support relation filters.
    const tpFull = await prisma.teamPayment.findUnique({
      where: { id: tp.id },
      select: { timesheetId: true },
    });
    if (tpFull?.timesheetId) {
      await prisma.timesheet
        .update({
          where: { id: tpFull.timesheetId },
          data: { status: 'paid' },
        })
        .catch(() => {});
    }
    // Email-style in-app notification on the team member side
    try {
      const tm = await prisma.teamMember.findUnique({
        where: { id: tp.teamMemberId },
        select: { userId: true },
      });
      if (tm?.userId) {
        await prisma.notification.create({
          data: {
            userId: tm.userId,
            type: 'payroll_posted',
            title: '💰 Payroll deposited',
            message: `$${Number(tp.grossAmount).toFixed(2)} (minus $1 fee) is now in your wallet.`,
            actionUrl: '/employee/pay',
          },
        });
      }
    } catch (err) {
      console.error('[payroll webhook] notify failed', err);
    }
    return;
  }

  if (
    eventType === 'treasury.outbound_payment.failed' ||
    eventType === 'treasury.outbound_payment.returned' ||
    eventType === 'treasury.outbound_payment.canceled'
  ) {
    await prisma.teamPayment.update({
      where: { id: tp.id },
      data: {
        status: 'failed',
        treasuryStatus: 'failed',
        failureReason: (payment as any).failure_reason || `payment_${eventType.split('.').pop()}`,
      },
    });
    // Notify PM that the payment failed — they can retry from the UI.
    try {
      const landlord = await prisma.landlord.findUnique({
        where: { id: tp.landlordId },
        select: { ownerUserId: true },
      });
      if (landlord?.ownerUserId) {
        await prisma.notification.create({
          data: {
            userId: landlord.ownerUserId,
            type: 'payroll_failed',
            title: '⚠ Payroll payment failed',
            message: `A $${Number(tp.grossAmount).toFixed(2)} payroll payment didn't go through. Open the payroll page to review.`,
            actionUrl: '/admin/team/payroll',
          },
        });
      }
    } catch (err) {
      console.error('[payroll webhook] failure notify failed', err);
    }
  }
}

/**
 * Marketplace's existing OutboundTransfer reflection — kept callable
 * separately so I can reuse it from the payment.created/posted/failed
 * cases above. (No body change; this is just a forward-compat stub
 * matching the signature used in the dispatch.)
 */
async function reflectPayrollPaymentFromTransfer(
  _transfer: Stripe.Treasury.OutboundTransfer,
  _eventType: string
): Promise<void> {
  // Not used by current payroll path (we use OutboundPayment, not
  // OutboundTransfer). Future v2 / cashout flows can hook in here.
}
