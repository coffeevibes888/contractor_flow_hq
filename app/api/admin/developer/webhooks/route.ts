import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import crypto from 'crypto';

// GET - List webhooks
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { landlordId: landlord.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, webhooks });
  } catch (error) {
    console.error('Failed to fetch webhooks:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

// POST - Create webhook
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
      include: { subscription: true },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    // Check if user has Enterprise subscription
    if (landlord.subscription?.tier !== 'enterprise' && landlord.subscriptionTier !== 'enterprise') {
      return NextResponse.json(
        { success: false, message: 'Webhooks require Enterprise subscription' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { url, description, events } = body;

    if (!url?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Webhook URL required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Generate webhook secret for HMAC signing
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhookEndpoint.create({
      data: {
        landlordId: landlord.id,
        url: url.trim(),
        description: description?.trim() || null,
        secret,
        events: events || [],
      },
    });

    return NextResponse.json({
      success: true,
      webhook,
      secret, // Return secret only once
    });
  } catch (error) {
    console.error('Failed to create webhook:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}
