import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import crypto from 'crypto';

const ENTERPRISE_TIER = 'enterprise';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, subscriptionTier: true },
  });
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (profile.subscriptionTier !== ENTERPRISE_TIER) {
    return NextResponse.json({ error: 'Webhooks require the Enterprise plan ($199/month)' }, { status: 403 });
  }

  const endpoints = await prisma.contractorWebhookEndpoint.findMany({
    where: { contractorId: profile.id },
    select: {
      id: true, url: true, description: true, events: true,
      isActive: true, failureCount: true, lastSuccessAt: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, endpoints });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, subscriptionTier: true },
  });
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (profile.subscriptionTier !== ENTERPRISE_TIER) {
    return NextResponse.json({ error: 'Webhooks require the Enterprise plan ($199/month)' }, { status: 403 });
  }

  const body = await req.json();
  const { url, description, events = [] } = body;

  if (!url?.startsWith('https://')) {
    return NextResponse.json({ error: 'URL must be a valid HTTPS endpoint' }, { status: 400 });
  }

  const count = await prisma.contractorWebhookEndpoint.count({ where: { contractorId: profile.id } });
  if (count >= 5) return NextResponse.json({ error: 'Maximum of 5 webhook endpoints allowed' }, { status: 400 });

  const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

  const endpoint = await prisma.contractorWebhookEndpoint.create({
    data: {
      contractorId: profile.id,
      url,
      description: description || null,
      secret,
      events,
    },
    select: { id: true, url: true, events: true, createdAt: true },
  });

  // Return secret ONCE
  return NextResponse.json({ success: true, endpoint, secret });
}
