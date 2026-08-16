import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { notifyContactForm } from '@/lib/services/admin-notifications';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, projectType, message } = body ?? {};

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const session = await auth();
    const adminUserId = session?.user?.id ?? null;

    const thread = await prisma.thread.create({
      data: {
        type: 'contact',
        subject: subject || 'New contact message',
        createdByUserId: adminUserId,
        messages: {
          create: {
            senderUserId: null,
            senderName: name,
            senderEmail: email,
            content: [
              projectType ? `Inquiry type: ${projectType}` : null,
              message,
            ]
              .filter(Boolean)
              .join('\n\n'),
            role: 'user',
          },
        },
      },
    });

    // Send email notification to admin (non-blocking)
    notifyContactForm({
      name,
      email,
      subject: subject || projectType || 'General Inquiry',
      message,
    }).catch(console.error);

    return NextResponse.json(
      {
        success: true,
        threadId: thread.id,
        message: 'Your message has been received.',
      },
      { status: 201 }
    );
  } catch (error) {
    // Log error without exposing sensitive details
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error creating contact message:', error instanceof Error ? error.message : 'Unknown error');
    }
    return NextResponse.json(
      { error: 'Failed to submit message. Please try again later.' },
      { status: 500 }
    );
  }
}
