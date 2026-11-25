/**
 * Partner bridge: marketplace messaging between an external customer (from a
 * site such as Property Flow HQ) and a contractor. The customer does NOT need
 * an account anywhere — they are identified by name + email — so this uses the
 * MarketplaceMessageThread / MarketplaceMessage tables, not the User-based
 * Thread system.
 *
 * Protected by the shared INTERNAL_API_SECRET (x-internal-secret header). The
 * calling site is responsible for deciding who may send.
 *
 * GET  ?threadId=...                      → { threadId, messages }
 * GET  ?contractor=<id|slug>&email=...    → { threadId, messages }  (null if none)
 * POST { contractor, customer:{name,email}, message, threadId? }
 *                                         → { threadId, messages }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-internal-secret');
  return Boolean(secret && secret === process.env.INTERNAL_API_SECRET);
}

async function resolveContractorId(ref: string): Promise<string | null> {
  const isUUID = UUID_RE.test(ref);
  const profile = await prisma.contractorProfile.findFirst({
    where: isUUID ? { OR: [{ id: ref }, { slug: ref }] } : { slug: ref },
    select: { id: true, isPublic: true },
  });
  if (!profile || !profile.isPublic) return null;
  return profile.id;
}

function serializeMessages(
  messages: { id: string; senderSide: string; senderName: string; content: string; createdAt: Date }[],
) {
  return messages.map((m) => ({
    id: m.id,
    senderSide: m.senderSide,
    senderName: m.senderName,
    content: m.content,
    createdAt: m.createdAt,
  }));
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get('threadId');
  const contractorRef = searchParams.get('contractor');
  const email = searchParams.get('email')?.trim().toLowerCase();

  try {
    let thread = null as Awaited<ReturnType<typeof prisma.marketplaceMessageThread.findFirst>> | null;

    if (threadId) {
      thread = await prisma.marketplaceMessageThread.findUnique({ where: { id: threadId } });
    } else if (contractorRef && email) {
      const contractorId = await resolveContractorId(contractorRef);
      if (!contractorId) {
        return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
      }
      thread = await prisma.marketplaceMessageThread.findUnique({
        where: { contractorId_customerEmail: { contractorId, customerEmail: email } },
      });
    } else {
      return NextResponse.json(
        { error: 'threadId or (contractor + email) required' },
        { status: 400 },
      );
    }

    if (!thread) {
      return NextResponse.json({ threadId: null, messages: [] });
    }

    const messages = await prisma.marketplaceMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    // The customer is reading — mark the contractor's messages as read.
    await prisma.marketplaceMessage.updateMany({
      where: { threadId: thread.id, senderSide: 'contractor', readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ threadId: thread.id, messages: serializeMessages(messages) });
  } catch (error) {
    console.error('[partner/marketplace/messages GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const contractorRef: string | undefined = body?.contractor;
  const customer = body?.customer ?? {};
  const message: string | undefined = body?.message;
  const existingThreadId: string | undefined = body?.threadId;

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }
  if (!customer.name?.trim() || !customer.email?.trim()) {
    return NextResponse.json({ error: 'customer name and email are required' }, { status: 400 });
  }

  const customerEmail = customer.email.trim().toLowerCase();
  const customerName = customer.name.trim();

  try {
    let thread = existingThreadId
      ? await prisma.marketplaceMessageThread.findUnique({ where: { id: existingThreadId } })
      : null;

    if (!thread) {
      if (!contractorRef) {
        return NextResponse.json({ error: 'contractor is required for a new thread' }, { status: 400 });
      }
      const contractorId = await resolveContractorId(contractorRef);
      if (!contractorId) {
        return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
      }
      thread = await prisma.marketplaceMessageThread.upsert({
        where: { contractorId_customerEmail: { contractorId, customerEmail } },
        update: { customerName, lastMessageAt: new Date() },
        create: {
          contractorId,
          customerName,
          customerEmail,
          customerUserId: customer.externalUserId ?? null,
        },
      });
    }

    await prisma.marketplaceMessage.create({
      data: {
        threadId: thread.id,
        senderSide: 'customer',
        senderName: customerName,
        content: message.trim(),
      },
    });

    await prisma.marketplaceMessageThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    });

    const messages = await prisma.marketplaceMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return NextResponse.json({ threadId: thread.id, messages: serializeMessages(messages) });
  } catch (error) {
    console.error('[partner/marketplace/messages POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
