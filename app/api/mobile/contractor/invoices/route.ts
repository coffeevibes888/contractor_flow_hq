import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PAGE_SIZE = 50;
const INVOICE_STATUSES = new Set([
  'draft',
  'sent',
  'viewed',
  'partial',
  'paid',
  'overdue',
  'cancelled',
]);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload || typeof payload.userId !== 'string' || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const status = req.nextUrl.searchParams.get('status')?.trim() || null;
    if (status && !INVOICE_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid invoice status' }, { status: 400 });
    }

    const requestedPage = Number.parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const where = {
      contractorId: profile.id,
      ...(status ? { status } : {}),
    };

    const [invoices, total] = await Promise.all([
      prisma.contractorInvoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          amountPaid: true,
          dueDate: true,
          createdAt: true,
          customerId: true,
          jobId: true,
        },
      }),
      prisma.contractorInvoice.count({ where }),
    ]);

    const customerIds = Array.from(new Set(invoices.map((invoice) => invoice.customerId)));
    const jobIds = Array.from(
      new Set(invoices.flatMap((invoice) => (invoice.jobId ? [invoice.jobId] : [])))
    );

    const [customers, jobs] = await Promise.all([
      prisma.contractorCustomer.findMany({
        where: {
          contractorId: profile.id,
          id: { in: customerIds },
        },
        select: { id: true, name: true },
      }),
      prisma.contractorJob.findMany({
        where: {
          contractorId: profile.id,
          id: { in: jobIds },
        },
        select: { id: true, title: true, jobNumber: true },
      }),
    ]);

    const customersById = new Map(customers.map((customer) => [customer.id, customer]));
    const jobsById = new Map(jobs.map((job) => [job.id, job]));

    return NextResponse.json({
      invoices: invoices.map((invoice) => {
        const customer = customersById.get(invoice.customerId);
        const job = invoice.jobId ? jobsById.get(invoice.jobId) : undefined;

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          totalAmount: Number(invoice.total),
          paidAmount: Number(invoice.amountPaid),
          dueDate: invoice.dueDate.toISOString(),
          createdAt: invoice.createdAt.toISOString(),
          customerName: customer?.name ?? 'Unknown',
          jobTitle: job?.title ?? null,
          jobNumber: job?.jobNumber ?? null,
        };
      }),
      pagination: {
        total,
        page,
        limit: PAGE_SIZE,
        pages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (error) {
    console.error('[mobile/contractor/invoices]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
