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
    if (payload.role !== 'contractor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const contractorId = contractorProfile.id;

    const where: any = { contractorId };
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { jobNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [jobs, total, statusCounts] = await Promise.all([
      prisma.contractorJob.findMany({
        where,
        include: {
          customer: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contractorJob.count({ where }),
      Promise.all(
        ['quoted', 'approved', 'scheduled', 'in_progress', 'completed', 'on_hold', 'canceled'].map(
          (s) => prisma.contractorJob.count({ where: { contractorId, status: s } })
        )
      ),
    ]);

    const serialized = jobs.map((j) => ({
      ...j,
      estimatedCost: j.estimatedCost ? Number(j.estimatedCost) : null,
      actualCost: j.actualCost ? Number(j.actualCost) : null,
      laborCost: j.laborCost ? Number(j.laborCost) : null,
      materialCost: j.materialCost ? Number(j.materialCost) : null,
    }));

    const [quoted, approved, scheduled, inProgress, completed, onHold, canceled] = statusCounts;

    return NextResponse.json({
      jobs: serialized,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      statusCounts: { quoted, approved, scheduled, inProgress, completed, onHold, canceled, all: total },
    });
  } catch (error) {
    console.error('[mobile/contractor/jobs]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
