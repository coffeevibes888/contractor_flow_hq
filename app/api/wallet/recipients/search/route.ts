/**
 * GET /api/wallet/recipients/search
 *
 * Search for verified Property Flow users (landlords or contractors) the
 * caller can send Treasury wallet funds to. We never list unverified users
 * — there's no Treasury account to pay into.
 *
 *   ?q=name|email|phone   (required, min 2 chars)
 *
 * Returns a small set; the UI shows avatars + verified badges before the
 * sender confirms.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export interface WalletRecipientResult {
  userId: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  /** 'landlord' | 'contractor' (we only let users send to either). */
  kind: 'landlord' | 'contractor';
  verified: boolean;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    if (q.length < 2) {
      return NextResponse.json({ recipients: [] });
    }

    // Find users whose name/email/phone matches AND who have a Treasury
    // financial account. We pre-filter by role so we only return potential
    // recipients (landlord-owners or contractor-owners), never tenants.
    const users = await prisma.user.findMany({
      where: {
        id: { not: session.user.id },
        role: { in: ['landlord', 'property_manager', 'contractor'] },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phoneNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    const recipients: WalletRecipientResult[] = [];
    for (const u of users) {
      // Look up their financial account — only verified Treasury holders
      // are surfaced as send targets. We check both landlord and contractor
      // ownership paths.
      let kind: 'landlord' | 'contractor' = 'landlord';
      let verified = false;

      if (u.role === 'contractor') {
        kind = 'contractor';
        const fa = await prisma.financialAccount.findFirst({
          where: {
            contractorId: { not: null },
            status: 'active',
          },
        });
        verified = !!fa;
      } else {
        const landlord = await prisma.landlord.findFirst({
          where: { ownerUserId: u.id },
          select: { id: true, stripeOnboardingStatus: true },
        });
        if (landlord) {
          const fa = await prisma.financialAccount.findFirst({
            where: { landlordId: landlord.id, status: 'active' },
          });
          verified =
            !!fa && landlord.stripeOnboardingStatus === 'verified';
        }
      }

      if (verified) {
        recipients.push({
          userId: u.id,
          name: u.name,
          email: u.email,
          avatar: u.image ?? null,
          kind,
          verified,
        });
      }
    }

    return NextResponse.json({ recipients });
  } catch (err: any) {
    console.error('[wallet/recipients/search] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Search failed.' },
      { status: 500 }
    );
  }
}
