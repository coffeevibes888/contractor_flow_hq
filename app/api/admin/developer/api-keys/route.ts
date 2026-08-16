import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import crypto from 'crypto';

// GET - List API keys
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

    const apiKeys = await prisma.apiKey.findMany({
      where: { landlordId: landlord.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        createdAt: true,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, apiKeys });
  } catch (error) {
    console.error('Failed to fetch API keys:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST - Create new API key
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
        { success: false, message: 'API keys require Enterprise subscription' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Key name required' },
        { status: 400 }
      );
    }

    // Generate API key
    const apiKey = `pfhq_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 12);

    // Save to database
    const newKey = await prisma.apiKey.create({
      data: {
        landlordId: landlord.id,
        name: name.trim(),
        keyHash,
        keyPrefix,
        scopes: ['*'], // Full access by default
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        createdAt: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      apiKey, // Return the full key only once
      keyData: newKey,
    });
  } catch (error) {
    console.error('Failed to create API key:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
