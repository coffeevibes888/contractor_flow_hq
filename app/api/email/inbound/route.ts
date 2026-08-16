import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const toRaw = payload.to as string | string[] | undefined;
    const fromRaw = payload.from as string | string[] | undefined;
    const subject: string | undefined = payload.subject;
    const text: string | undefined = payload.text;
    const html: string | undefined = payload.html;

    const toEmail = Array.isArray(toRaw) ? toRaw[0] : toRaw;
    const fromEmail = Array.isArray(fromRaw) ? fromRaw[0] : fromRaw;

    if (!toEmail || !fromEmail) {
      return NextResponse.json({ error: 'Missing to/from in inbound payload' }, { status: 400 });
    }

    const content = html || text || '';

    let thread = await prisma.thread.findFirst({
      where: {
        type: 'email',
        toEmail,
        subject: subject ?? undefined,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          type: 'email',
          subject: subject ?? null,
          fromEmail,
          toEmail,
        },
      });
    }

    const relatedEmails = [toEmail, fromEmail].filter(Boolean) as string[];
    if (relatedEmails.length > 0) {
      const users = await prisma.user.findMany({
        where: { email: { in: relatedEmails } },
        select: { id: true },
      });

      for (const u of users) {
        try {
          await prisma.threadParticipant.create({
            data: {
              threadId: thread.id,
              userId: u.id,
            },
          });
        } catch {
          // ignore unique violations
        }
      }
    }

    await prisma.message.create({
      data: {
        threadId: thread.id,
        senderUserId: null,
        senderName: fromEmail,
        senderEmail: fromEmail,
        content,
        role: 'user',
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error handling inbound email:', error);
    return NextResponse.json({ error: 'Failed to handle inbound email' }, { status: 500 });
  }
}
