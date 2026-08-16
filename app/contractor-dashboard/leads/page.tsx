import { Metadata } from 'next';
import type { ComponentProps } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { LeadsKanban } from '@/components/contractor/leads-kanban';
import { canAccessFeature } from '@/lib/services/contractor-feature-gate';
import { Lock, Zap, TrendingUp, Target, BarChart2, Bell } from 'lucide-react';
import Link from 'next/link';
import { getContractorProfileForUser } from '@/lib/contractor-profile';
import { prisma } from '@/db/prisma';

export const metadata: Metadata = {
  title: 'Leads | Contractor Dashboard',
};

export default async function ContractorLeadsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
    subscriptionTier: true,
  });

  if (!contractorProfile) {
    redirect('/onboarding/contractor');
  }

  const featureAccess = await canAccessFeature(contractorProfile.id, 'leadManagement');

  if (!featureAccess.allowed) {
    return (
      <div className='w-full space-y-5'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Leads Pipeline</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Manage leads from marketplace to conversion</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-violet-400' />
          </div>
          <h2 className='text-lg font-bold text-gray-800 mb-2'>Lead Management</h2>
          <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
            Lead management is available on the Pro plan. Upgrade to track leads,
            manage your pipeline, and convert more opportunities into jobs.
          </p>
          <div className='flex flex-wrap gap-3 justify-center mb-6'>
            {[
              { icon: BarChart2, label: 'Lead Pipeline' },
              { icon: Target, label: 'Lead Scoring' },
              { icon: TrendingUp, label: 'Conversion Tracking' },
              { icon: Bell, label: 'Follow-up Reminders' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className='flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700'>
                <Icon className='h-4 w-4 text-violet-500' />
                {label}
              </div>
            ))}
          </div>
          <Link
            href='/contractor-dashboard/settings/subscription'
            className='inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm'
          >
            <Zap className='h-4 w-4' />
            Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  const leadMatches = await prisma.contractorLeadMatch.findMany({
    where: { contractorId: contractorProfile.id },
    include: {
      lead: {
        select: {
          id: true,
          projectType: true,
          projectTitle: true,
          projectDescription: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          propertyAddress: true,
          propertyCity: true,
          propertyState: true,
          propertyZip: true,
          budgetMin: true,
          budgetMax: true,
          timeline: true,
          urgency: true,
          priority: true,
          stage: true,
          status: true,
          leadScore: true,
          assignedToId: true,
          lastContactDate: true,
          nextFollowUpDate: true,
          emailOpens: true,
          emailClicks: true,
          estimateViews: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const employees = await prisma.contractorEmployee.findMany({
    where: { contractorId: contractorProfile.id, status: 'active' },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });

  const serializedLeadMatches = leadMatches.map((match) => ({
    ...match,
    createdAt: match.createdAt.toISOString(),
    sentAt: match.sentAt?.toISOString() || null,
    viewedAt: match.viewedAt?.toISOString() || null,
    respondedAt: match.respondedAt?.toISOString() || null,
    quotedAt: match.quotedAt?.toISOString() || null,
    lead: {
      ...match.lead,
      lastContactDate: match.lead.lastContactDate?.toISOString() || null,
      nextFollowUpDate: match.lead.nextFollowUpDate?.toISOString() || null,
      createdAt: match.lead.createdAt.toISOString(),
    },
  }));

  const stats = {
    total: leadMatches.length,
    new: leadMatches.filter((m) => m.lead.stage === 'new').length,
    contacted: leadMatches.filter((m) => m.lead.stage === 'contacted').length,
    qualified: leadMatches.filter((m) => m.lead.stage === 'qualified').length,
    quoted: leadMatches.filter((m) => m.lead.stage === 'quoted').length,
    won: leadMatches.filter((m) => m.lead.stage === 'won').length,
    lost: leadMatches.filter((m) => m.lead.stage === 'lost').length,
    hot: leadMatches.filter((m) => m.lead.priority === 'hot').length,
  };

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Leads Pipeline</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Manage leads from marketplace to conversion
          </p>
        </div>
      </div>

      {/* Summary Bar */}
      <div className='relative rounded-xl border border-gray-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 overflow-hidden'>
        <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-bl-full' />
        <div className='relative p-4'>
          <div className='grid grid-cols-4 sm:grid-cols-8 gap-4'>
            {[
              { label: 'Total', value: stats.total, color: 'text-gray-800' },
              { label: 'New', value: stats.new, color: 'text-blue-600' },
              { label: 'Contacted', value: stats.contacted, color: 'text-indigo-600' },
              { label: 'Qualified', value: stats.qualified, color: 'text-violet-600' },
              { label: 'Quoted', value: stats.quoted, color: 'text-amber-600' },
              { label: 'Won', value: stats.won, color: 'text-emerald-600' },
              { label: 'Lost', value: stats.lost, color: 'text-red-500' },
              { label: '🔥 Hot', value: stats.hot, color: 'text-orange-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className='space-y-0.5'>
                <div className='text-[9px] sm:text-[10px] text-gray-500 font-semibold uppercase tracking-wide'>{label}</div>
                <div className={`text-sm sm:text-base font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <LeadsKanban
        // Cast to the kanban's narrow display type. The Prisma row has many
        // fields (sentAt, refundedAt, ...) the kanban doesn't render; the
        // hand-written kanban interface enumerates only what it needs.
        leadMatches={serializedLeadMatches as unknown as ComponentProps<typeof LeadsKanban>['leadMatches']}
        employees={employees as unknown as ComponentProps<typeof LeadsKanban>['employees']}
        contractorId={contractorProfile.id}
      />
    </div>
  );
}
