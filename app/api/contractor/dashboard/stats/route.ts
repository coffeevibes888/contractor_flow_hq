import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get contractor profile
    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const contractorId = contractorProfile.id;

    // Date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Fetch all stats in parallel
    const [
      leadsThisWeek,
      leadsThisMonth,
      hotLeads,
      activeJobs,
      completedJobsThisMonth,
      pendingQuotes,
      quotesThisWeek,
      revenueThisMonth,
      revenueThisYear,
      activeEmployees,
    ] = await Promise.all([
      prisma.contractorLeadMatch.count({
        where: {
          contractorId,
          createdAt: { gte: startOfWeek },
          status: { in: ['pending', 'sent', 'viewed'] },
        },
      }),
      prisma.contractorLeadMatch.count({
        where: {
          contractorId,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.contractorLeadMatch.count({
        where: {
          contractorId,
          status: { in: ['pending', 'sent', 'viewed'] },
          lead: { priority: 'hot' },
        },
      }),
      prisma.contractorJob.count({
        where: {
          contractorId,
          status: { in: ['approved', 'scheduled', 'in_progress'] },
        },
      }),
      prisma.contractorJob.count({
        where: {
          contractorId,
          status: 'completed',
          actualEndDate: { gte: startOfMonth },
        },
      }),
      prisma.contractorQuote.count({
        where: {
          contractorId: contractorId,
          status: 'pending',
        },
      }),
      prisma.contractorQuote.count({
        where: {
          contractorId: contractorId,
          createdAt: { gte: startOfWeek },
        },
      }),
      prisma.contractorJob.aggregate({
        where: {
          contractorId,
          status: { in: ['completed', 'invoiced', 'paid'] },
          actualEndDate: { gte: startOfMonth },
        },
        _sum: { actualCost: true },
      }),
      prisma.contractorJob.aggregate({
        where: {
          contractorId,
          status: { in: ['completed', 'invoiced', 'paid'] },
          actualEndDate: { gte: startOfYear },
        },
        _sum: { actualCost: true },
      }),
      prisma.contractorEmployee.count({
        where: {
          contractorId,
          status: 'active',
        },
      }),
    ]);

    const revenueMonth = Number(revenueThisMonth._sum.actualCost || 0);
    const revenueYear = Number(revenueThisYear._sum.actualCost || 0);
    const conversionRate =
      leadsThisMonth > 0 ? ((completedJobsThisMonth / leadsThisMonth) * 100).toFixed(1) : '0.0';

    return NextResponse.json({
      leads: {
        thisWeek: leadsThisWeek,
        thisMonth: leadsThisMonth,
        hot: hotLeads,
      },
      jobs: {
        active: activeJobs,
        completedThisMonth: completedJobsThisMonth,
      },
      quotes: {
        pending: pendingQuotes,
        thisWeek: quotesThisWeek,
      },
      revenue: {
        thisMonth: revenueMonth,
        thisYear: revenueYear,
      },
      team: {
        activeEmployees,
      },
      metrics: {
        conversionRate: parseFloat(conversionRate),
      },
    });
  } catch (error) {
    console.error('Error fetching contractor dashboard stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
