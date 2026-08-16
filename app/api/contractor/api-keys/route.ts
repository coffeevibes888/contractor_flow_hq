import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { generateContractorApiKey } from '@/lib/contractor-api-auth';

const ENTERPRISE_TIER = 'enterprise';

async function getContractorProfile(userId: string) {
  return prisma.contractorProfile.findUnique({
    where: { userId },
    select: { id: true, subscriptionTier: true },
  });
}

/** GET — list all API keys for the contractor */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getContractorProfile(session.user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (profile.subscriptionTier !== ENTERPRISE_TIER) {
    return NextResponse.json({ error: 'API access requires the Enterprise plan ($199/month)' }, { status: 403 });
  }

  const keys = await prisma.contractorApiKey.findMany({
    where: { contractorId: profile.id },
    select: {
      id: true, name: true, keyPrefix: true, scopes: true,
      isActive: true, lastUsedAt: true, expiresAt: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, keys });
}

/** POST — create a new API key */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getContractorProfile(session.user.id);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (profile.subscriptionTier !== ENTERPRISE_TIER) {
    return NextResponse.json({ error: 'API access requires the Enterprise plan ($199/month)' }, { status: 403 });
  }

  const body = await req.json();
  const { name, scopes = ['*'], expiresAt } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  // Max 10 keys per contractor
  const count = await prisma.contractorApiKey.count({ where: { contractorId: profile.id } });
  if (count >= 10) return NextResponse.json({ error: 'Maximum of 10 API keys allowed' }, { status: 400 });

  const { raw, hash, prefix } = generateContractorApiKey();

  await prisma.contractorApiKey.create({
    data: {
      contractorId: profile.id,
      name: name.trim(),
      keyHash: hash,
      keyPrefix: prefix,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  // Return the raw key ONCE — it cannot be retrieved again
  return NextResponse.json({ success: true, key: raw, prefix, scopes });
}
