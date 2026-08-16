import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';
import { errorResponse, serverError } from '@/lib/contractor-route-helpers';
import { randomBytes } from 'crypto';

type Params = { params: { id: string } };

/**
 * POST /api/contractor/contracts/[id]/send
 * Generates a unique signing token and marks the contract as "sent".
 * Returns the public signing URL.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const db = prisma as any;

    const existing = await db.contractorContract.findFirst({
      where: { id: params.id, contractorId: contractorAuth.contractorId },
    });
    if (!existing) return errorResponse('Contract not found', 404);

    if (['signed', 'void'].includes(existing.status)) {
      return NextResponse.json({ error: 'Contract cannot be re-sent in its current state' }, { status: 400 });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = existing.expiresAt ?? new Date(Date.now() + 30 * 86_400_000); // default 30 days

    const updated = await db.contractorContract.update({
      where: { id: params.id },
      data: {
        token,
        status: 'sent',
        sentAt: new Date(),
        expiresAt,
      },
    });

    await db.contractorContractEvent.create({
      data: {
        contractId: params.id,
        eventType: 'sent',
        actor: 'contractor',
        actorName: existing.contractorName,
      },
    });

    const signingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/sign/contractor/${token}`;

    return NextResponse.json({ signingUrl, token, expiresAt: updated.expiresAt });
  } catch (error) {
    return serverError('Failed to send contract', error);
  }
}
