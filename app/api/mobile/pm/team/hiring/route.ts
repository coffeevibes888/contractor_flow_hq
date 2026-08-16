/**
 * GET /api/mobile/pm/team/hiring
 *
 * Returns job postings with applicant counts and recent applicants.
 * Mirrors the website's Hiring page.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });
    if (!landlord) {
      return NextResponse.json({ jobs: [], counts: { active: 0, draft: 0, closed: 0, totalApplicants: 0 } });
    }

    const jobs = await prisma.jobPosting.findMany({
      where: { landlordId: landlord.id },
      include: {
        _count: { select: { applicants: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const counts = {
      active: jobs.filter((j) => j.status === 'active').length,
      draft: jobs.filter((j) => j.status === 'draft').length,
      closed: jobs.filter((j) => j.status === 'closed' || j.status === 'filled').length,
      totalApplicants: jobs.reduce((s, j) => s + j._count.applicants, 0),
    };

    return NextResponse.json({
      counts,
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        location: j.location,
        isRemote: j.isRemote,
        type: j.type,
        category: j.category,
        status: j.status,
        salary: j.salary,
        salaryMin: j.salaryMin ? Number(j.salaryMin) : null,
        salaryMax: j.salaryMax ? Number(j.salaryMax) : null,
        salaryType: j.salaryType,
        experienceLevel: j.experienceLevel,
        views: j.views,
        applicantCount: j._count.applicants,
        createdAt: j.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[mobile/pm/team/hiring]', error);
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
}
