import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const to = formData.get('to');
    const subject = formData.get('subject');
    const html = formData.get('html');

    if (!to || typeof to !== 'string') {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    if (!subject || typeof subject !== 'string') {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }

    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromAddress = process.env.SMTP_FROM_EMAIL || 'noreply@propertyflowhq.com';

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return NextResponse.json({ error: 'SMTP configuration is not configured' }, { status: 500 });
    }

    const currentUserId = session.user.id as string;
    const fromName = session.user.name || 'Rooms4Rent';

    const attachmentEntries = formData.getAll('attachments');
    const attachments: { filename: string; content: string; contentType?: string }[] = [];

    for (const entry of attachmentEntries) {
      if (entry instanceof File) {
        const arrayBuffer = await entry.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        attachments.push({ filename: entry.name, content: base64, contentType: entry.type || undefined });
      }
    }

    const thread = await prisma.thread.create({
      data: {
        type: 'email',
        subject,
        fromEmail: fromAddress,
        toEmail: to,
        createdByUserId: currentUserId,
        messages: {
          create: {
            senderUserId: currentUserId,
            senderName: fromName,
            senderEmail: fromAddress,
            content: html,
            role: 'user',
          },
        },
      },
    });

    try {
      await prisma.threadParticipant.create({
        data: {
          threadId: thread.id,
          userId: currentUserId,
        },
      });
    } catch {
      // ignore if participant already exists
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to,
      subject,
      html,
      attachments:
        attachments.length > 0
          ? attachments.map((a) => ({
              filename: a.filename,
              content: Buffer.from(a.content, 'base64'),
              contentType: a.contentType,
            }))
          : undefined,
    });

    return NextResponse.json({ ok: true, threadId: thread.id, providerId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
