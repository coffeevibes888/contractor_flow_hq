/**
 * GET /api/mobile/marketplace/my-jobs
 *
 * Customer-side job inbox. Lists open jobs the user has posted plus the
 * bids on each. Auto-detects whether the caller is a homeowner or a PM
 * and returns the appropriate set.
 *
 * Response: { jobs: Array<{ id, kind, title, status, bidCount, ...summary, bids: [...] }> }
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

    const db = prisma as any;

    const [homeowner, landlord] = await Promise.all([
      db.homeowner.findUnique({ where: { userId: auth.userId }, select: { id: true } }),
      db.landlord.findUnique({ where: { userId: auth.userId }, select: { id: true } }),
    ]);

    const merged: any[] = [];

    if (homeowner) {
      const jobs = await db.homeownerWorkOrder.findMany({
        where: { homeownerId: homeowner.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          bids: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              // No explicit contractor relation on HomeownerWorkOrderBid model,
              // so resolve manually
            },
          },
        },
      });

      const profileIds = Array.from(
        new Set(jobs.flatMap((j: any) => j.bids.map((b: any) => b.contractorId))),
      );
      const profiles = profileIds.length
        ? await db.contractorProfile.findMany({
            where: { id: { in: profileIds } },
            select: { id: true, slug: true, businessName: true, profilePhoto: true, avgRating: true, totalReviews: true },
          })
        : [];
      const byId = new Map(profiles.map((p: any) => [p.id, p]));

      for (const j of jobs) {
        merged.push({
          id: j.id,
          kind: 'homeowner',
          title: j.title,
          description: j.description,
          status: j.status,
          priority: j.priority,
          budgetMin: j.budgetMin ? Number(j.budgetMin) : null,
          budgetMax: j.budgetMax ? Number(j.budgetMax) : null,
          createdAt: j.createdAt.toISOString(),
          bidCount: j.bids.length,
          bids: j.bids.map((b: any) => ({
            id: b.id,
            amount: Number(b.amount),
            estimatedHours: b.estimatedHours ? Number(b.estimatedHours) : null,
            proposedStartDate: b.proposedStartDate?.toISOString() ?? null,
            message: b.message ?? null,
            status: b.status,
            createdAt: b.createdAt.toISOString(),
            contractor: byId.get(b.contractorId) ?? null,
          })),
        });
      }
    }

    if (landlord) {
      const jobs = await prisma.workOrder.findMany({
        where: { landlordId: landlord.id, isOpenBid: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          bids: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              contractor: {
                select: {
                  id: true,
                  user: { select: { id: true, name: true, image: true } },
                },
              },
            },
          },
        },
      });

      for (const j of jobs) {
        merged.push({
          id: j.id,
          kind: 'workorder',
          title: j.title,
          description: j.description,
          status: j.status,
          priority: j.priority,
          budgetMin: j.budgetMin ? Number(j.budgetMin) : null,
          budgetMax: j.budgetMax ? Number(j.budgetMax) : null,
          createdAt: j.createdAt.toISOString(),
          bidCount: j.bids.length,
          bids: j.bids.map((b: any) => ({
            id: b.id,
            amount: Number(b.amount),
            estimatedHours: b.estimatedHours ? Number(b.estimatedHours) : null,
            proposedStartDate: b.proposedStartDate?.toISOString() ?? null,
            estimatedCompletionDate: b.estimatedCompletionDate?.toISOString() ?? null,
            inclusions: b.inclusions ?? [],
            exclusions: b.exclusions ?? [],
            warrantyDays: b.warrantyDays ?? null,
            message: b.message ?? null,
            status: b.status,
            createdAt: b.createdAt.toISOString(),
            contractor: b.contractor && {
              id: b.contractor.id,
              name: b.contractor.user?.name ?? 'Contractor',
              image: b.contractor.user?.image ?? null,
            },
          })),
        });
      }
    }

    merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return NextResponse.json({ jobs: merged });
  } catch (error: any) {
    console.error('[mobile/marketplace/my-jobs]', error);
    return NextResponse.json({ error: error?.message || 'Could not load jobs' }, { status: 500 });
  }
}
