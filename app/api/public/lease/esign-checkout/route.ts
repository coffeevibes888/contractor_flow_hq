/**
 * POST /api/public/lease/esign-checkout
 *
 * Creates a Stripe Checkout session for the $4.99 one-time e-sign upsell on
 * the free lease builder. No account required.
 *
 * Body:
 *   leaseHtml           string  – the generated lease HTML
 *   landlordName        string
 *   landlordEmail       string
 *   landlordSigDataUrl  string  – base64 PNG from the canvas pad
 *   tenantName1         string
 *   tenantEmail1        string
 *   tenantName2?        string
 *   tenantEmail2?       string
 *   state?              string
 *   propertyAddress?    string
 *   utmSource?          string
 *   utmMedium?          string
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { SERVER_URL } from '@/lib/constants';

const ESIGN_PRICE_ID = process.env.STRIPE_PRICE_LEASE_ESIGN; // set this in Vercel env
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leaseHtml,
      landlordName,
      landlordEmail,
      landlordSigDataUrl,
      tenantName1,
      tenantEmail1,
      tenantName2,
      tenantEmail2,
      state,
      propertyAddress,
      utmSource,
      utmMedium,
    } = body;

    if (!leaseHtml || !landlordName || !landlordEmail || !landlordSigDataUrl || !tenantName1 || !tenantEmail1) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const baseUrl = (() => { try { return new URL(SERVER_URL).origin; } catch { return SERVER_URL; } })();

    // ── Signed-in users get e-sign for free ──────────────────────────────────
    const session = await auth();
    const isSignedIn = !!session?.user?.id;

    if (isSignedIn) {
      // Create the record directly as paid/active and trigger invites
      const record = await (prisma as any).publicLeaseEsign.create({
        data: {
          leaseHtml,
          landlordName,
          landlordEmail,
          landlordSigDataUrl,
          tenantName1,
          tenantEmail1,
          tenantName2: tenantName2 || null,
          tenantEmail2: tenantEmail2 || null,
          state: state || null,
          propertyAddress: propertyAddress || null,
          utmSource: utmSource || null,
          utmMedium: utmMedium || null,
          status: 'pending_tenant_sig',
        },
        select: { id: true, token: true },
      });

      // Trigger invite emails via the internal send-invites endpoint
      const inviteUrl = `${baseUrl}/api/public/lease/esign-send-invites`;
      fetch(inviteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(CRON_SECRET ? { Authorization: `Bearer ${CRON_SECRET}` } : {}),
        },
        body: JSON.stringify({ publicLeaseEsignId: record.id }),
      }).catch((err) => console.error('[esign-checkout] invite send failed:', err));

      return NextResponse.json({ redirectUrl: `${baseUrl}/sign/lease/sent?token=${record.token}` });
    }

    // ── Guest users: one free e-sign (Stripe checkout temporarily disabled) ──
    // TODO: re-enable Stripe payment when the $2.99 charge is restored.
    // const stripeKey = process.env.STRIPE_SECRET_KEY;
    // if (!stripeKey) {
    //   return NextResponse.json({ error: 'Payment system not configured.' }, { status: 500 });
    // }
    // if (!ESIGN_PRICE_ID) {
    //   return NextResponse.json({ error: 'E-sign product not configured.' }, { status: 500 });
    // }

    // Create the record directly as active and trigger invites (free for now)
    const record = await (prisma as any).publicLeaseEsign.create({
      data: {
        leaseHtml,
        landlordName,
        landlordEmail,
        landlordSigDataUrl,
        tenantName1,
        tenantEmail1,
        tenantName2: tenantName2 || null,
        tenantEmail2: tenantEmail2 || null,
        state: state || null,
        propertyAddress: propertyAddress || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        status: 'pending_tenant_sig',
      },
      select: { id: true, token: true },
    });

    // Trigger invite emails via the internal send-invites endpoint
    const inviteUrl = `${baseUrl}/api/public/lease/esign-send-invites`;
    fetch(inviteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CRON_SECRET ? { Authorization: `Bearer ${CRON_SECRET}` } : {}),
      },
      body: JSON.stringify({ publicLeaseEsignId: record.id }),
    }).catch((err) => console.error('[esign-checkout] invite send failed:', err));

    return NextResponse.json({ redirectUrl: `${baseUrl}/sign/lease/sent?token=${record.token}` });

    // ── Stripe checkout (disabled — e-sign is free for now) ──────────────────
    // const stripe = new Stripe(stripeKey);
    // const stripeSession = await stripe.checkout.sessions.create({
    //   mode: 'payment',
    //   line_items: [{ price: ESIGN_PRICE_ID, quantity: 1 }],
    //   customer_email: landlordEmail,
    //   success_url: `${baseUrl}/sign/lease/sent?token=${record.token}`,
    //   cancel_url: `${baseUrl}/free-lease-builder?esign_canceled=1`,
    //   metadata: {
    //     type: 'public_lease_esign',
    //     publicLeaseEsignId: record.id,
    //     publicLeaseEsignToken: record.token,
    //   },
    // });
    // await (prisma as any).publicLeaseEsign.update({
    //   where: { id: record.id },
    //   data: { stripeSessionId: stripeSession.id },
    // });
    // return NextResponse.json({ checkoutUrl: stripeSession.url });
  } catch (err) {
    console.error('[esign-checkout]', err);
    return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 500 });
  }
}
