/**
 * GET /api/mobile/chat/threads
 *
 * Unified message-thread list across all roles. The mobile floating chat
 * widget uses this so the user sees ONE inbox regardless of role:
 *   - PM ↔ tenant
 *   - PM ↔ contractor
 *   - PM ↔ team member
 *   - Tenant ↔ PM
 *   - Contractor ↔ PM
 *
 * Each thread row includes participant names, last-message preview, unread
 * count, and a relative timestamp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const threads = await prisma.thread.findMany({
      where: {
        participants: { some: { userId: payload.userId, isDeleted: false } },
        isArchived: false,
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        subject: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            senderName: true,
            senderUserId: true,
            role: true,
            createdAt: true,
          },
        },
        participants: {
          select: {
            userId: true,
            lastReadAt: true,
            user: { select: { name: true, email: true, image: true } },
          },
        },
      },
    });

    const unreadCount = threads.filter((t) => {
      const last = t.messages[0];
      const me = t.participants.find((p) => p.userId === payload.userId);
      if (!last || last.senderUserId === payload.userId) return false;
      return !me?.lastReadAt || new Date(last.createdAt) > new Date(me.lastReadAt);
    }).length;

    return NextResponse.json({
      threads: threads.map((t) => {
        const last = t.messages[0] ?? null;
        const others = t.participants.filter((p) => p.userId !== payload.userId);
        const me = t.participants.find((p) => p.userId === payload.userId);
        const isUnread = last
          ? last.senderUserId !== payload.userId
            && (!me?.lastReadAt || new Date(last.createdAt) > new Date(me.lastReadAt))
          : false;

        return {
          id: t.id,
          subject: t.subject,
          updatedAt: t.updatedAt.toISOString(),
          isUnread,
          participants: others.map((p) => ({
            id: p.userId,
            name: p.user?.name ?? 'Unknown',
            image: p.user?.image ?? null,
          })),
          lastMessage: last
            ? {
                content: previewMessageContent(last.content, last.role),
                senderName: last.senderName ?? 'Unknown',
                createdAt: last.createdAt.toISOString(),
                isOwn: last.senderUserId === payload.userId,
              }
            : null,
        };
      }),
      unreadCount,
    });
  } catch (e: any) {
    console.error('chat threads', e);
    return NextResponse.json({ threads: [], unreadCount: 0 });
  }
}


/**
 * For inbox previews. Renders friendly text for:
 *  - role='system' marketplace cards (JSON in content) — show the card title
 *  - normal text messages — show plain text trimmed to 140 chars
 *  - garbage/encoded messages (base64-ish blobs, very long with no spaces) —
 *    show a generic placeholder so the inbox stays readable
 */
function previewMessageContent(content: string | null, role?: string | null) {
  const s = (content ?? '').trim();
  if (!s) return '';
  if (role === 'system' && s.startsWith('{')) {
    try {
      const obj = JSON.parse(s);
      if (obj?.title) {
        const amount = obj?.amount;
        if (typeof amount === 'number' && amount > 0) {
          const money = amount >= 1000 ? `$${(amount / 1000).toFixed(1)}k` : `$${amount.toFixed(0)}`;
          return `${obj.title} · ${money}`;
        }
        return obj.title as string;
      }
    } catch {
      // fall through
    }
  }

  // Heuristic: if a message has no spaces and contains base64-ish characters
  // for >40 consecutive chars, it's almost certainly garbage / corrupted /
  // unreadable to a human. Don't leak it into the inbox.
  if (s.length > 40 && !/\s/.test(s) && /[A-Za-z0-9+/=]{40,}/.test(s)) {
    return '[Unreadable message]';
  }

  return s.slice(0, 140);
}
