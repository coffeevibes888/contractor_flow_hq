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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const where: any = { contractorId: contractorProfile.id };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const estimates = await prisma.contractorQuote.findMany({
      where,
      include: {
        customer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      estimates: estimates.map((e) => ({
        id: e.id,
        title: (e as any).title || `Quote #${e.id.slice(0, 6)}`,
        estimateNumber: (e as any).estimateNumber || null,
        status: e.status,
        total: Number((e as any).totalAmount || (e as any).amount || 0),
        customerName: e.customer?.name || null,
        createdAt: e.createdAt.toISOString(),
        validUntil: (e as any).validUntil?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error('[mobile/contractor/estimates GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const body = await req.json();
    const { title, customerName, customerEmail, items, notes, validUntil } = body;

    if (!title || !customerName || !items?.length) {
      return NextResponse.json({ error: 'Title, customer name, and at least one item are required' }, { status: 400 });
    }

    // Find or create customer
    let customer = await prisma.contractorCustomer.findFirst({
      where: { contractorId: contractorProfile.id, name: customerName },
    });
    if (!customer) {
      customer = await prisma.contractorCustomer.create({
        data: {
          contractorId: contractorProfile.id,
          name: customerName,
          email: customerEmail || null,
        },
      });
    }

    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity || 1) * (item.unitPrice || 0), 0);

    const quote = await prisma.contractorQuote.create({
      data: {
        contractorId: contractorProfile.id,
        customerId: customer.id,
        status: 'pending',
        amount: totalAmount,
        description: title,
        notes: notes || null,
        items: items,
      } as any,
    });

    return NextResponse.json({ success: true, id: quote.id });
  } catch (error) {
    console.error('[mobile/contractor/estimates POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
