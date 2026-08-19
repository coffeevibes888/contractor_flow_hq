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
    const search = searchParams.get('search');

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const where: any = { contractorId: contractorProfile.id };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.contractorCustomer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        _count: { select: { jobs: true } },
      },
    });

    return NextResponse.json({
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: (c as any).address || null,
        city: (c as any).city || null,
        state: (c as any).state || null,
        totalJobs: (c._count as any)?.jobs || 0,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[mobile/contractor/customers GET]', error);
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
    const { name, email, phone, address, city, state, zip, notes } = body;

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const customer = await prisma.contractorCustomer.create({
      data: {
        contractorId: contractorProfile.id,
        name,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, id: customer.id });
  } catch (error) {
    console.error('[mobile/contractor/customers POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
