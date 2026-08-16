import { NextResponse } from 'next/server';
import { verifyContractorApiKey, hasContractorScope } from '@/lib/contractor-api-auth';
import { prisma } from '@/db/prisma';

/**
 * GET /api/v1/contractor/invoices
 * List all invoices for the authenticated contractor.
 * Requires scope: invoices:read
 */
export async function GET(request: Request) {
  const auth = await verifyContractorApiKey(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.message }, { status: 401 });
  }
  if (!hasContractorScope(auth.apiKey!, 'invoices:read') && !hasContractorScope(auth.apiKey!, '*')) {
    return NextResponse.json({ error: 'Insufficient permissions. Required scope: invoices:read' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const where: any = { contractorId: auth.contractor!.id };
  if (status) where.status = status;

  const [invoices, total] = await Promise.all([
    prisma.contractorInvoice.findMany({
      where,
      select: {
        id: true, invoiceNumber: true, status: true,
        total: true, amountDue: true, amountPaid: true,
        dueDate: true, paidAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contractorInvoice.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: invoices,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
