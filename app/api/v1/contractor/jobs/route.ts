import { NextResponse } from 'next/server';
import { verifyContractorApiKey, hasContractorScope } from '@/lib/contractor-api-auth';
import { prisma } from '@/db/prisma';

/**
 * GET /api/v1/contractor/jobs
 * List all jobs for the authenticated contractor.
 * Requires scope: jobs:read
 */
export async function GET(request: Request) {
  const auth = await verifyContractorApiKey(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.message }, { status: 401 });
  }
  if (!hasContractorScope(auth.apiKey!, 'jobs:read') && !hasContractorScope(auth.apiKey!, '*')) {
    return NextResponse.json({ error: 'Insufficient permissions. Required scope: jobs:read' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const where: any = { contractorId: auth.contractor!.id };
  if (status) where.status = status;

  const [jobsRaw, total] = await Promise.all([
    prisma.contractorJob.findMany({
      where,
      select: {
        id: true, jobNumber: true, title: true, status: true, priority: true,
        estimatedStartDate: true, actualEndDate: true,
        estimatedCost: true, actualCost: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contractorJob.count({ where }),
  ]);

  // Normalize to stable public API field names so external consumers aren't
  // coupled to internal column naming.
  const jobs = jobsRaw.map((j) => ({
    id: j.id,
    jobNumber: j.jobNumber,
    title: j.title,
    status: j.status,
    priority: j.priority,
    scheduledDate: j.estimatedStartDate,
    completedDate: j.actualEndDate,
    estimatedCost: j.estimatedCost,
    actualCost: j.actualCost,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  }));

  return NextResponse.json({
    success: true,
    data: jobs,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
