import { NextResponse } from 'next/server';
import { verifyContractorApiKey, hasContractorScope } from '@/lib/contractor-api-auth';
import { prisma } from '@/db/prisma';

/**
 * GET /api/v1/contractor/customers
 * List all customers for the authenticated contractor.
 * Requires scope: customers:read
 */
export async function GET(request: Request) {
  const auth = await verifyContractorApiKey(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.message }, { status: 401 });
  }
  if (!hasContractorScope(auth.apiKey!, 'customers:read') && !hasContractorScope(auth.apiKey!, '*')) {
    return NextResponse.json({ error: 'Insufficient permissions. Required scope: customers:read' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const where = { contractorId: auth.contractor!.id };

  const [customers, total] = await Promise.all([
    prisma.contractorCustomer.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true,
        address: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contractorCustomer.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: customers,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
