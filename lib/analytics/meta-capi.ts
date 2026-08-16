/**
 * Meta Conversions API (server-side)
 *
 * Fires events directly to Facebook from our server so they land even when:
 * - The user has an ad blocker
 * - Safari / iOS 17 tracking prevention strips the client pixel
 * - The browser closed before the Pixel could fire
 *
 * Primarily used from the Stripe webhook to report Purchase events.
 * Deduplicated against client-side events via `eventId` (Meta matches on it).
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 *
 * Required env vars:
 *   META_CAPI_ACCESS_TOKEN   — System user token with ads_management
 *   META_PIXEL_ID            — (optional, falls back to the hardcoded ID in meta-pixel.ts)
 *   META_CAPI_TEST_CODE      — (optional) Test Event Code while you're verifying in Events Manager
 */

import { createHash } from 'crypto';
import { META_PIXEL_ID as DEFAULT_PIXEL_ID } from './meta-pixel';

type MetaEventName =
  | 'Lead'
  | 'CompleteRegistration'
  | 'InitiateCheckout'
  | 'Subscribe'
  | 'StartTrial'
  | 'Purchase';

interface MetaUserData {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  externalId?: string | null; // user id from our DB
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbc?: string | null; // _fbc cookie value
  fbp?: string | null; // _fbp cookie value
}

interface MetaServerEventInput {
  eventName: MetaEventName;
  eventId: string; // used for dedup with client-side events
  eventTime?: number; // seconds since epoch; defaults to now
  eventSourceUrl?: string;
  actionSource?: 'website' | 'system_generated' | 'email';
  value?: number;
  currency?: string;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  predictedLtv?: number;
  user: MetaUserData;
}

function hash(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Fire a single server-side event to Meta. Never throws — logs on failure.
 */
export async function sendMetaServerEvent(input: MetaServerEventInput): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const testCode = process.env.META_CAPI_TEST_CODE;

  if (!accessToken) {
    // CAPI is optional — if the token isn't set we just skip quietly.
    // The client-side Pixel still fires.
    return;
  }

  const userData: Record<string, string> = {};
  if (input.user.email) userData.em = hash(input.user.email)!;
  if (input.user.firstName) userData.fn = hash(input.user.firstName)!;
  if (input.user.lastName) userData.ln = hash(input.user.lastName)!;
  if (input.user.externalId) userData.external_id = hash(input.user.externalId)!;
  if (input.user.clientIp) userData.client_ip_address = input.user.clientIp;
  if (input.user.clientUserAgent) userData.client_user_agent = input.user.clientUserAgent;
  if (input.user.fbc) userData.fbc = input.user.fbc;
  if (input.user.fbp) userData.fbp = input.user.fbp;

  const customData: Record<string, unknown> = {};
  if (typeof input.value === 'number') customData.value = input.value;
  if (input.currency) customData.currency = input.currency;
  if (input.contentName) customData.content_name = input.contentName;
  if (input.contentCategory) customData.content_category = input.contentCategory;
  if (input.contentIds?.length) {
    customData.content_ids = input.contentIds;
    customData.content_type = 'product';
  }
  if (typeof input.predictedLtv === 'number') customData.predicted_ltv = input.predictedLtv;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName,
        event_time: input.eventTime || Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.eventSourceUrl,
        action_source: input.actionSource || 'website',
        user_data: userData,
        custom_data: customData,
      },
    ],
  };

  if (testCode) body.test_event_code = testCode;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('[Meta CAPI] non-ok response', response.status, text);
    }
  } catch (err) {
    console.error('[Meta CAPI] request failed', err);
  }
}
