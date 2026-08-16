/**
 * push-service — fan out a notification to a user's registered Expo push
 * tokens via the Expo Push API. Used by NotificationService to add a
 * push channel alongside email + SMS.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * Behavior:
 *   - Best-effort: never throws. Push failure shouldn't break the
 *     primary action (e.g. saving an application).
 *   - If Expo returns DeviceNotRegistered, MessageTooBig, or similar
 *     terminal errors, we mark the offending PushToken row `enabled = false`
 *     so we stop trying to deliver to it.
 */

import { prisma } from '@/db/prisma';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushPayload {
  /** Auto-truncated by Expo if too long. */
  title: string;
  body: string;
  /** Custom payload the mobile app reads on tap (action URL, ids, etc.). */
  data?: Record<string, unknown>;
  /** iOS sound override; default uses system default. */
  sound?: 'default' | null;
  /** Optional channel id (Android). Falls back to 'default'. */
  channelId?: string;
  /** Optional thread/category id for collapsing on iOS. */
  threadId?: string;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoResponse {
  data?: ExpoTicket | ExpoTicket[];
  errors?: { message: string }[];
}

/**
 * Send a push notification to every enabled token registered to `userId`.
 * Returns the number of devices we attempted to reach.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId, enabled: true },
    select: { id: true, token: true, platform: true },
  });

  if (tokens.length === 0) return 0;

  // Expo accepts an array of messages in a single POST. Build one per token.
  const messages = tokens.map((t) => ({
    to: t.token,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: payload.sound === null ? undefined : (payload.sound ?? 'default'),
    channelId: payload.channelId ?? 'default',
    ...(payload.threadId ? { threadId: payload.threadId } : {}),
    priority: 'high',
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    const body = (await res.json().catch(() => ({}))) as ExpoResponse;
    const tickets: ExpoTicket[] = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];

    // Disable any token Expo says is dead. We only walk tickets if we got
    // them back in order — Expo guarantees this.
    const TERMINAL_ERRORS = new Set([
      'DeviceNotRegistered',
      'InvalidCredentials',
      'MessageTooBig',
      'MessageRateExceeded',
    ]);
    const toDisable: string[] = [];
    tickets.forEach((ticket, idx) => {
      if (ticket.status === 'error' && ticket.details?.error && TERMINAL_ERRORS.has(ticket.details.error)) {
        const t = tokens[idx];
        if (t) toDisable.push(t.id);
      }
    });
    if (toDisable.length > 0) {
      await prisma.pushToken.updateMany({
        where: { id: { in: toDisable } },
        data: { enabled: false },
      });
    }

    return tokens.length;
  } catch (err) {
    console.error('[push-service] send failed', err);
    return 0;
  }
}
