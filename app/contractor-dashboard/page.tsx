import { Metadata } from 'next';
import { requireContractor } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { unstable_cache } from 'next/cache';
import ContractorDashboardClient from './dashboard-client';
import { getContractorProfileForUser } from '@/lib/contractor-profile';
import { resolveContractorAuth } from '@/lib/contractor-auth';

export const metadata: Metadata = {
  title: 'Contractor Dashboard',
};

// Cache dashboard stats for 60 seconds to reduce DB load
const getCachedContractorStats = unstable_cache(
  async (contractorId: string, startOfWeek: Date, startOfMonth: Date, startOfYear: Date) => {
    const [
      // Leads
      leadsThisWeek,
      leadsThisMonth,
      hotLeads,

      // Jobs
      activeJobs,
      completedJobsThisMonth,

      // Quotes
      pendingQuotes,
      quotesThisWeek,

      // Revenue
      revenueThisMonth,
      revenueThisYear,

      // Team
      activeEmployees,

      // Recent activity
      recentLeads,
      recentJobs,
    ] = await Promise.all([
      // Leads this week
      prisma.contractorLeadMatch.count({
        where: {
          contractorId,
          createdAt: { gte: startOfWeek },
          status: { in: ['pending', 'sent', 'viewed'] },
        },
      }),

      // Leads this month
      prisma.contractorLeadMatch.count({
        where: {
          contractorId,
          createdAt: { gte: startOfMonth },
        },
      }),

      // Hot leads (high priority, not responded)
      prisma.contractorLead.count({
        where: {
          priority: 'hot',
          matches: {
            some: {
              contractorId,
              status: { in: ['pending', 'sent', 'viewed'] },
            },
          },
        },
      }),

      // Active jobs
      prisma.contractorJob.count({
        where: {
          contractorId,
          status: { in: ['approved', 'scheduled', 'in_progress'] },
        },
      }),

      // Completed jobs this month
      prisma.contractorJob.count({
        where: {
          contractorId,
          status: 'completed',
          actualEndDate: { gte: startOfMonth },
        },
      }),

      // Pending quotes
      prisma.contractorQuote.count({
        where: {
          contractorId: contractorId,
          status: 'pending',
        },
      }),

      // Quotes sent this week
      prisma.contractorQuote.count({
        where: {
          contractorId: contractorId,
          createdAt: { gte: startOfWeek },
        },
      }),

      // Revenue this month
      prisma.contractorJob.aggregate({
        where: {
          contractorId,
          status: { in: ['completed', 'invoiced', 'paid'] },
          actualEndDate: { gte: startOfMonth },
        },
        _sum: { actualCost: true },
      }),

      // Revenue this year
      prisma.contractorJob.aggregate({
        where: {
          contractorId,
          status: { in: ['completed', 'invoiced', 'paid'] },
          actualEndDate: { gte: startOfYear },
        },
        _sum: { actualCost: true },
      }),

      // Active employees
      prisma.contractorEmployee.count({
        where: {
          contractorId,
          status: 'active',
        },
      }),

      // Recent leads (last 5)
      prisma.contractorLeadMatch.findMany({
        where: { contractorId },
        include: {
          lead: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent jobs (last 5)
      prisma.contractorJob.findMany({
        where: { contractorId },
        include: {
          customer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
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
      recentLeads,
      recentJobs,
    };
  },
  ['contractor-dashboard-stats-v2'],
  { revalidate: 60 }
);

export default async function ContractorDashboardPage() {
  const session = await requireContractor();
  const { id: userId } = session.user;

  // Resolve the contractor profile — works for both owners and active employees.
  const contractorProfile = await getContractorProfileForUser(userId, {
    id: true,
    businessName: true,
    displayName: true,
    subscriptionTier: true,
    avgRating: true,
    totalReviews: true,
    completedJobs: true,
  });

  if (!contractorProfile) {
    return null;
  }

  // Resolve permissions so the dashboard widgets can be filtered for non-owners.
  const contractorAuth = await resolveContractorAuth(userId);
  const permissions = contractorAuth?.permissions ?? [];
  const isOwner = contractorAuth?.isOwner ?? false;

  const contractorId = contractorProfile.id;

  // Date ranges
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const cachedStats = await getCachedContractorStats(
    contractorId,
    startOfWeek,
    startOfMonth,
    startOfYear
  );

  const {
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
    recentLeads,
    recentJobs,
  } = cachedStats;

  const revenueMonth = Number(revenueThisMonth._sum.actualCost || 0);
  const revenueYear = Number(revenueThisYear._sum.actualCost || 0);

  // Calculate conversion rate
  const conversionRate = leadsThisMonth > 0
    ? ((completedJobsThisMonth / leadsThisMonth) * 100).toFixed(1)
    : '0.0';

  // Build monthly revenue data for chart (last 6 months)
  const monthlyRevenueData: { month: string; revenue: number; jobs: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short' });

    const [monthRevenue, monthJobs] = await Promise.all([
      prisma.contractorJob.aggregate({
        where: {
          contractorId,
          status: { in: ['completed', 'invoiced', 'paid'] },
          actualEndDate: { gte: d, lt: monthEnd },
        },
        _sum: { actualCost: true },
      }),
      prisma.contractorJob.count({
        where: {
          contractorId,
          status: 'completed',
          actualEndDate: { gte: d, lt: monthEnd },
        },
      }),
    ]);

    monthlyRevenueData.push({
      month: label,
      revenue: Number(monthRevenue._sum?.actualCost || 0),
      jobs: monthJobs,
    });
  }

  // Serialize dates for client component
  const serializedLeads = (recentLeads as any[]).map((match: any) => ({
    id: match.id,
    lead: {
      id: match.lead.id,
      projectTitle: match.lead.projectTitle,
      projectType: match.lead.projectType,
      propertyCity: match.lead.propertyCity,
      propertyState: match.lead.propertyState,
      priority: match.lead.priority,
    },
  }));

  const serializedJobs = (recentJobs as any[]).map((job: any) => ({
    id: job.id,
    title: job.title,
    status: job.status,
    createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : String(job.createdAt || ''),
    customer: job.customer,
  }));

  return (
    <ContractorDashboardClient
      stats={{
        activeJobs,
        completedJobsThisMonth,
        leadsThisWeek,
        leadsThisMonth,
        hotLeads,
        pendingQuotes,
        quotesThisWeek,
        revenueMonth,
        revenueYear,
        activeEmployees,
        conversionRate,
        avgRating: contractorProfile.avgRating,
        totalReviews: contractorProfile.totalReviews,
        completedJobsAllTime: contractorProfile.completedJobs,
        subscriptionTier: contractorProfile.subscriptionTier ?? 'starter',
      }}
      recentLeads={serializedLeads}
      recentJobs={serializedJobs}
      monthlyRevenueData={monthlyRevenueData}
      businessName={contractorProfile.businessName || contractorProfile.displayName || ''}
      permissions={permissions}
      isOwner={isOwner}
    />
  );
}
