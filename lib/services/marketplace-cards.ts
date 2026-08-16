/**
 * Marketplace action cards — Fiverr-style "order activity" messages that
 * live inside the existing chat threads.
 *
 * When a buyer or seller takes a transactional action (sends a bid,
 * accepts a quote, schedules a booking, etc.) we drop a structured
 * "system message" into the DM thread between them. The mobile chat
 * renderer detects role='system' + JSON content and renders an
 * interactive card with the appropriate Accept / Decline / View buttons.
 *
 * Storage: we reuse the existing `Message` row. No DB migration needed.
 *   - role:    'system'
 *   - content: JSON string, schema below
 *
 * If a thread between the two users doesn't exist, we create it.
 */
import { prisma } from '@/db/prisma';

export type CardKind =
  | 'bid_sent'
  | 'bid_accepted'
  | 'bid_declined'
  | 'bid_countered'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_declined'
  | 'quote_countered'
  | 'booking_created'
  | 'offer_sent'
  | 'job_completed'
  | 'review_request';

export interface MarketplaceCard {
  kind: CardKind;
  /** Short title shown at top of the card, e.g. "New bid" */
  title: string;
  /** Subline, e.g. "John's Plumbing offered $1,250" */
  summary: string;
  /** Money associated with the card (bid amount, quote total, deposit). */
  amount?: number;
  /** Object id this card refers to (bidId, quoteId, bookingId, etc.) */
  refId?: string;
  /** What kind of resource refId is — used by client to call the right action. */
  refType?: 'bid' | 'quote' | 'booking' | 'job';
  /** Free-form details displayed inside the card body. */
  details?: Record<string, string | number | boolean | null>;
  /** ISO date when the card was authored. The Message.createdAt is the source of truth, but we mirror it for parsers. */
  createdAt?: string;
}

/** Find the existing 1:1 DM thread between two users, or create one. */
async function getOrCreateDmThread(
  userIdA: string,
  userIdB: string,
  subject?: string,
): Promise<string> {
  const existing = await prisma.thread.findFirst({
    where: {
      type: 'dm',
      AND: [
        { participants: { some: { userId: userIdA, isDeleted: false } } },
        { participants: { some: { userId: userIdB, isDeleted: false } } },
      ],
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const t = await prisma.thread.create({
    data: {
      type: 'dm',
      subject: subject ?? null,
      createdByUserId: userIdA,
      participants: {
        create: [{ userId: userIdA }, { userId: userIdB }],
      },
    },
    select: { id: true },
  });
  return t.id;
}

/**
 * Drop a marketplace action card into the DM thread between the actor
 * (`fromUserId`) and the counterparty (`toUserId`). Returns the new
 * Message id and the threadId — handy for tests/debug, otherwise can
 * be ignored.
 *
 * Errors are swallowed and logged. We never want a card-emission failure
 * to roll back a successful bid/quote action.
 */
export async function emitMarketplaceCard(
  fromUserId: string,
  toUserId: string | null | undefined,
  card: MarketplaceCard,
  opts: { senderName?: string } = {},
): Promise<{ threadId: string; messageId: string } | null> {
  if (!toUserId || fromUserId === toUserId) return null;

  try {
    const threadId = await getOrCreateDmThread(fromUserId, toUserId, card.title);

    const payload: MarketplaceCard = {
      ...card,
      createdAt: new Date().toISOString(),
    };

    const message = await prisma.message.create({
      data: {
        threadId,
        senderUserId: fromUserId,
        senderName: opts.senderName ?? null,
        role: 'system',
        content: JSON.stringify(payload),
      },
      select: { id: true },
    });

    await prisma.thread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    return { threadId, messageId: message.id };
  } catch (error) {
    console.error('[emitMarketplaceCard] failed:', error);
    return null;
  }
}
