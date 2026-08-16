/**
 * GET /api/mobile/marketplace/my-quotes
 *
 * Customer-side quote inbox. Returns ContractorQuote rows where the
 * authenticated user is the customer, ordered newest first.
 *
 * Response: { quotes: Array<{
 *   id, status, title, totalPrice, validUntil, createdAt,
 *   contractor: { id, businessName, profilePhoto, avgRating, totalReviews }
 * }> }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const quotes = await prisma.contractorQuote.findMany({
      where: { customerId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        contractor: {
          select: {
            id: true,
            slug: true,
            businessName: true,
            profilePhoto: true,
            avgRating: true,
            totalReviews: true,
          },
        },
      },
    });

    return NextResponse.json({
      quotes: quotes.map((q: any) => ({
        id: q.id,
        status: q.status,
        title: q.title,
        description: q.description ?? null,
        basePrice: Number(q.basePrice),
        totalPrice: Number(q.totalPrice),
        validUntil: q.validUntil?.toISOString() ?? null,
        createdAt: q.createdAt.toISOString(),
        contractor: q.contractor && {
          id: q.contractor.id,
          slug: q.contractor.slug,
          businessName: q.contractor.businessName,
          profilePhoto: q.contractor.profilePhoto,
          avgRating: q.contractor.avgRating ?? 0,
          totalReviews: q.contractor.totalReviews ?? 0,
        },
      })),
    });
  } catch (error: any) {
    console.error('[mobile/marketplace/my-quotes]', error);
    return NextResponse.json({ error: error?.message || 'Could not load quotes' }, { status: 500 });
  }
}
