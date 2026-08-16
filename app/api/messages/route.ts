import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NotificationService } from '@/lib/services/notification-service';

// GET /api/messages - Get messages for user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const threads = await NotificationService.getMessages(session.user.id, limit);

    return NextResponse.json({ messages: threads });
  } catch (error) {
    // Log error without exposing sensitive details
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch messages:', error instanceof Error ? error.message : 'Unknown error');
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/messages - Send message
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientId, subject, content, landlordId } = body;

    // Validate required fields
    if (!recipientId || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify sender permissions - check landlord/tenant relationships
    if (landlordId) {
      // Verify sender is associated with this landlord (owner or tenant)
      const landlord = await prisma.landlord.findFirst({
        where: {
          id: landlordId,
          OR: [
            { ownerUserId: session.user.id },
            {
              properties: {
                some: {
                  units: {
                    some: {
                      leases: {
                        some: {
                          tenantId: session.user.id,
                          status: 'active',
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      });

      if (!landlord) {
        return NextResponse.json({ error: 'Forbidden - not associated with this landlord' }, { status: 403 });
      }
    }

    // Verify recipient exists and is accessible
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    const { message, thread } = await NotificationService.createMessage(
      session.user.id,
      recipientId,
      subject,
      content,
      landlordId
    );

    return NextResponse.json({ message, thread });
  } catch (error) {
    // Log error without exposing sensitive details
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Failed to send message:', error instanceof Error ? error.message : 'Unknown error');
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
