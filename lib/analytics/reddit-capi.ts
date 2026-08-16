/**
 * Reddit Conversions API (server-side)
 *
 * Fires conversion events directly to Reddit from our server so they land even when:
 *   - The user has an ad blocker
 *   - Safari / iOS strips the client pixel
 *   - The browser closed before pixel could fire
 *
 * Primary use: Purchase event from the Stripe webhook.
 * Dedup-matched with the client-side pixel via `conversionId` (Reddit dedups on it).
 *
 * Docs: https://ads-api.reddit.com/docs/v2/operations/Send-Conversion-Events
 *
 * Required env vars:
 *   REDDIT_CAPI_ACCESS_TOKEN       — OAuth2 access token you generated in Reddit Ads
 *   NEXT_PUBLIC_REDDIT_PIXEL_ID    — account/pixel id (shared with the browser pixel)
 *   REDDIT_CAPI_TEST_MODE          — (optional) set to "true" while verifying in Events Manager
 */

import { createHash } from 'crypto';

type RedditEventName =
  | 'PageVisit'
  | 'ViewContent'
  | 'Search'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'Purchase'
  | 'Lead'
  | 'SignUp'
  | 'Custom';

interface RedditUserData {
  email?: string | null;
  externalId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  // Reddit click id (rdt_cid) from URL after an ad click — optional but boosts match rate
  clickId?: string | null;
  // Reddit Pixel identifier cookie
  uuid?: string | null;
  screenDimensions?: { width: number; height: number } | null;
}

interface RedditServerEventInput {
  eventName: RedditEventName;
  // Dedup key — match to the same id used on the client for the same user action
  conversionId: string;
  eventAt?: Date;
  clickId?: string;
  value?: number;
  currency?: string;
  itemCount?: number;
  products?: Array<{ id?: string; name?: string; category?: string }>;
  user: RedditUserData;
}

function sha256(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Send a single server-side event to Reddit. Never throws — logs on failure.
 */
export async function sendRedditServerEvent(input: RedditServerEventInput): Promise<void> {
  const accessToken = process.env.REDDIT_CAPI_ACCESS_TOKEN;
  const accountId = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID;
  const testMode = process.env.REDDIT_CAPI_TEST_MODE === 'true';

  if (!accessToken || !accountId) {
    // Reddit CAPI is optional — if env vars aren't set, skip quietly.
    // The client-side pixel still fires.
    return;
  }

  // Reddit expects the account id in the URL path without any "t2_" / "a2_" prefix handling —
  // they accept it as-is.
  const url = `https://ads-api.reddit.com/api/v2.0/conversions/events/${encodeURIComponent(accountId)}`;

  const eventAt = (input.eventAt || new Date()).toISOString();

  const userPayload: Record<string, unknown> = {};
  if (input.user.email) userPayload.email = sha256(input.user.email);
  if (input.user.externalId) userPayload.external_id = sha256(input.user.externalId);
  if (input.user.ipAddress) userPayload.ip_address = sha256(input.user.ipAddress);
  if (input.user.userAgent) userPayload.user_agent = input.user.userAgent;
  if (input.user.uuid) userPayload.uuid = input.user.uuid;
  if (input.user.screenDimensions) userPayload.screen_dimensions = input.user.screenDimensions;

  const eventMetadata: Record<string, unknown> = {
    conversion_id: input.conversionId,
  };
  if (typeof input.value === 'number') eventMetadata.value_decimal = input.value;
  if (input.currency) eventMetadata.currency = input.currency;
  if (typeof input.itemCount === 'number') eventMetadata.item_count = input.itemCount;
  if (input.products?.length) {
    eventMetadata.products = input.products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
    }));
  }

  const body: Record<string, unknown> = {
    events: [
      {
        event_at: eventAt,
        event_type: { tracking_type: input.eventName },
        click_id: input.clickId || input.user.clickId || undefined,
        event_metadata: eventMetadata,
        user: userPayload,
      },
    ],
    test_mode: testMode,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('[Reddit CAPI] non-ok response', response.status, text);
    }
  } catch (err) {
    console.error('[Reddit CAPI] request failed', err);
  }
}
