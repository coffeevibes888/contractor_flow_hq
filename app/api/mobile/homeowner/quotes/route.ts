import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const quotes = await prisma.contractorQuote.findMany({
      where: { customerId: payload.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, status: true, basePrice: true, totalPrice: true,
        discount: true, tax: true, estimatedHours: true, startDate: true,
        completionDate: true, paymentTerms: true, validUntil: true, createdAt: true,
        contractor: { select: { businessName: true, displayName: true, email: true } },
      },
    });

    return NextResponse.json({
      quotes: quotes.map((q) => ({
        id: q.id, title: q.title, status: q.status,
        basePrice: Number(q.basePrice), totalPrice: Number(q.totalPrice),
        discount: Number(q.discount), tax: Number(q.tax),
        estimatedHours: q.estimatedHours ? Number(q.estimatedHours) : null,
        startDate: q.startDate?.toISOString() ?? null,
        completionDate: q.completionDate?.toISOString() ?? null,
        paymentTerms: q.paymentTerms, validUntil: q.validUntil.toISOString(),
        createdAt: q.createdAt.toISOString(),
        contractorName: q.contractor.businessName ?? q.contractor.displayName ?? 'Contractor',
      })),
    });
  } catch (error) {
    console.error('[mobile/homeowner/quotes]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
