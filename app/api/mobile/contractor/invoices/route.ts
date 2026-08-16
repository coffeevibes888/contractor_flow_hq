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

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;
    const invoices = await db.contractorInvoice.findMany({
      where: { contractorId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        dueDate: true,
        createdAt: true,
        customer: { select: { name: true, email: true } },
        job: { select: { title: true, jobNumber: true } },
      },
    });

    return NextResponse.json({
      invoices: invoices.map((i: any) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        totalAmount: i.totalAmount ? Number(i.totalAmount) : 0,
        paidAmount: i.paidAmount ? Number(i.paidAmount) : 0,
        dueDate: i.dueDate?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
        customerName: i.customer?.name ?? 'Unknown',
        jobTitle: i.job?.title ?? null,
        jobNumber: i.job?.jobNumber ?? null,
      })),
    });
  } catch (error) {
    console.error('[mobile/contractor/invoices]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
