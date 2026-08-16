import { Metadata } from 'next';
import { requireContractor } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Plus, CheckCircle, AlertTriangle, ClipboardCheck, Users, ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Safety & Compliance | Contractor Portal',
};

export default async function SafetyPage() {
  const session = await requireContractor();
  const { id: userId } = session.user;

  const contractorProfile = await prisma.contractorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!contractorProfile) {
    return (
      <div className='w-full space-y-5'>
        <h1 className='text-xl font-bold text-black'>Safety & Compliance</h1>
        <p className='text-sm text-gray-500'>Contractor profile not found.</p>
      </div>
    );
  }

  const checklists = await prisma.$queryRaw`
    SELECT * FROM "ContractorSafetyChecklist"
    WHERE "contractorId" = ${contractorProfile.id} AND "isActive" = true
    ORDER BY "category" ASC
  `;

  const completions = await prisma.$queryRaw`
    SELECT * FROM "ContractorSafetyChecklistCompletion"
    WHERE "contractorId" = ${contractorProfile.id}
    ORDER BY "completedAt" DESC
    LIMIT 10
  `;

  const checklistList = Array.isArray(checklists) ? checklists : [];
  const completionList = Array.isArray(completions) ? completions : [];

  const oshaCount = checklistList.filter((c: any) => c.category === 'osha_daily').length;
  const jobSpecificCount = checklistList.filter((c: any) => c.category === 'job_specific').length;
  const completedToday = completionList.filter((c: any) => {
    const completed = new Date(c.completedAt);
    return completed.toDateString() === new Date().toDateString();
  }).length;
  const issuesFound = completionList.reduce((acc: number, c: any) => acc + (c.issuesFound || 0), 0);

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Safety & Compliance</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>OSHA checklists, incident reports, and safety training</p>
        </div>
        <div className='flex gap-2'>
          <Link href='/contractor-dashboard/safety/checklists'>
            <Button variant='outline' className='border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm text-xs'>
              <ClipboardCheck className='h-3.5 w-3.5 mr-1.5' /> Manage Checklists
            </Button>
          </Link>
          <Link href='/contractor-dashboard/safety/new-checklist'>
            <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold text-xs'>
              <Plus className='h-3.5 w-3.5 mr-1.5' /> New Checklist
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          { label: 'OSHA Checklists', value: String(oshaCount), icon: Shield, gradient: 'from-blue-400 to-indigo-400' },
          { label: 'Job Specific', value: String(jobSpecificCount), icon: ClipboardCheck, gradient: 'from-violet-400 to-purple-400' },
          { label: 'Completed Today', value: String(completedToday), icon: CheckCircle, gradient: 'from-emerald-400 to-cyan-400' },
          { label: 'Issues Found', value: String(issuesFound), icon: AlertTriangle, gradient: 'from-red-400 to-rose-400', alert: issuesFound > 0 },
        ].map(({ label, value, icon: Icon, gradient, alert }) => (
          <div key={label} className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
            {alert && <div className='absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse' />}
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-[10px] text-gray-500 font-medium'>{label}</p>
                <p className='text-xl font-bold text-gray-900 mt-0.5'>{value}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                <Icon className='h-4 w-4' />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className='grid sm:grid-cols-3 gap-3'>
        {[
          { href: '/contractor-dashboard/safety/osha-daily', icon: ClipboardCheck, label: 'OSHA Daily Checklist', desc: 'Complete daily safety inspection before starting work', color: 'text-blue-500', bg: 'bg-blue-50' },
          { href: '/contractor-dashboard/safety/incidents', icon: AlertTriangle, label: 'Incident Reports', desc: 'Log safety incidents, injuries, and property damage', color: 'text-red-500', bg: 'bg-red-50' },
          { href: '/contractor-dashboard/safety/training', icon: Users, label: 'Training Records', desc: 'Track employee certifications and safety training', color: 'text-violet-500', bg: 'bg-violet-50' },
        ].map(({ href, icon: Icon, label, desc, color, bg }) => (
          <Link key={href} href={href}>
            <div className='flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-amber-200 transition-all cursor-pointer'>
              <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-semibold text-gray-800'>{label}</p>
                <p className='text-xs text-gray-500 mt-0.5'>{desc}</p>
              </div>
              <ChevronRight className='h-4 w-4 text-gray-300 shrink-0 mt-0.5' />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Completions */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>Recent Safety Checklist Completions</h3>
        </div>
        {completionList.length === 0 ? (
          <div className='p-8 text-center'>
            <ClipboardCheck className='h-10 w-10 mx-auto text-gray-300 mb-3' />
            <p className='text-sm text-gray-500'>No safety checklists completed yet</p>
          </div>
        ) : (
          <div className='divide-y divide-gray-50'>
            {completionList.map((c: any) => (
              <div key={c.id} className='flex items-center gap-3 px-4 py-3'>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${c.allItemsChecked ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  {c.allItemsChecked
                    ? <CheckCircle className='h-4 w-4 text-emerald-500' />
                    : <AlertTriangle className='h-4 w-4 text-amber-500' />}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-xs font-semibold text-gray-800'>{c.allItemsChecked ? 'All items passed' : `${c.issuesFound} issues found`}</p>
                  <p className='text-[10px] text-gray-500'>Completed {new Date(c.completedAt).toLocaleString()}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${c.allItemsChecked ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {c.allItemsChecked ? 'Passed' : 'Issues'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
