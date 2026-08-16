import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Calendar,
  Users,
  DollarSign,
  Download,
  CheckCircle,
  XCircle,
  PlayCircle,
  Lock,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function TimeTrackingPage() {
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

  const tier = contractorProfile.subscriptionTier || 'starter';
  const hasAccess = tier === 'pro' || tier === 'enterprise';

  if (!hasAccess) {
    return (
      <div className='w-full space-y-5'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Time Tracking</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Monitor employee hours and manage timesheets</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-cyan-50 border border-cyan-100 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-cyan-400' />
          </div>
          <h2 className='text-lg font-bold text-gray-800 mb-2'>Time Tracking</h2>
          <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
            Time tracking with GPS is available on the Pro plan. Upgrade to clock in/out your
            team, track hours by job, approve timesheets, and calculate payroll-ready totals.
          </p>
          <Link href='/contractor-dashboard/settings/subscription' className='inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm'>
            <Zap className='h-4 w-4' /> Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  // Date ranges
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch time entries
  const [weekEntries, monthEntries, recentEntries, activeEmployees] =
    await Promise.all([
      // Week entries
      prisma.contractorTimeEntry.findMany({
        where: {
          employee: {
            contractorId: contractorProfile.id,
          },
          clockIn: { gte: startOfWeek },
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              payRate: true,
            },
          },
        },
      }),

      // Month entries
      prisma.contractorTimeEntry.findMany({
        where: {
          employee: {
            contractorId: contractorProfile.id,
          },
          clockIn: { gte: startOfMonth },
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              payRate: true,
            },
          },
        },
      }),

      // Recent entries (last 20)
      prisma.contractorTimeEntry.findMany({
        where: {
          employee: {
            contractorId: contractorProfile.id,
          },
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              photo: true,
              payRate: true,
            },
          },
        },
        orderBy: { clockIn: 'desc' },
        take: 20,
      }),

      // Active employees (currently clocked in)
      prisma.contractorTimeEntry.findMany({
        where: {
          employee: {
            contractorId: contractorProfile.id,
          },
          clockOut: null,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photo: true,
            },
          },
        },
      }),
    ]);

  // Calculate stats
  const calculateHours = (entries: typeof weekEntries) => {
    return entries.reduce((sum, entry) => {
      if (entry.clockOut) {
        const hours =
          (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) /
          (1000 * 60 * 60);
        const breakHours = (entry.breakMinutes || 0) / 60;
        return sum + hours - breakHours;
      }
      return sum;
    }, 0);
  };

  const calculateCost = (entries: typeof weekEntries) => {
    return entries.reduce((sum, entry) => {
      if (entry.clockOut) {
        const hours =
          (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) /
          (1000 * 60 * 60);
        const breakHours = (entry.breakMinutes || 0) / 60;
        const netHours = hours - breakHours;
        const cost = netHours * Number(entry.employee?.payRate ?? 0);
        return sum + cost;
      }
      return sum;
    }, 0);
  };

  const weekHours = calculateHours(weekEntries);
  const monthHours = calculateHours(monthEntries);
  const weekCost = calculateCost(weekEntries);
  const monthCost = calculateCost(monthEntries);

  const pendingApproval = recentEntries.filter(
    (e) => e.clockOut && !e.approvedBy
  ).length;

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Time Tracking</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Monitor employee hours and manage timesheets</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' className='border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm text-xs'>
            <Download className='h-3.5 w-3.5 mr-1.5' /> Export
          </Button>
          <Link href='/contractor-dashboard/team'>
            <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold text-xs'>
              <Users className='h-3.5 w-3.5 mr-1.5' /> Manage Team
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          { label: 'Hours (Week)', value: weekHours.toFixed(0), icon: Clock, gradient: 'from-blue-400 to-indigo-400' },
          { label: 'Hours (Month)', value: monthHours.toFixed(0), icon: Calendar, gradient: 'from-violet-400 to-purple-400' },
          { label: 'Clocked In', value: String(activeEmployees.length), icon: PlayCircle, gradient: 'from-emerald-400 to-cyan-400' },
          { label: 'Cost (Week)', value: `$${weekCost.toFixed(0)}`, icon: DollarSign, gradient: 'from-amber-400 to-orange-400' },
        ].map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
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

      {/* Currently Clocked In */}
      {activeEmployees.length > 0 && (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='p-4 border-b border-gray-100'>
            <h3 className='text-sm font-bold text-gray-800'>Currently Clocked In</h3>
          </div>
          <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4'>
            {activeEmployees.map((entry) => {
              const hoursWorked = (Date.now() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60);
              return (
                <div key={entry.id} className='flex items-start gap-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50'>
                  <div className='h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200'>
                    <span className='text-sm font-bold text-emerald-700'>
                      {entry.employee?.firstName?.[0] ?? '?'}{entry.employee?.lastName?.[0] ?? ''}
                    </span>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-semibold text-gray-800'>{entry.employee?.firstName ?? 'Unknown'} {entry.employee?.lastName ?? ''}</p>
                    <p className='text-[10px] text-gray-500'>Clocked in at {new Date(entry.clockIn).toLocaleTimeString()}</p>
                    <div className='flex items-center gap-1 mt-1'>
                      <PlayCircle className='h-3 w-3 text-emerald-500 animate-pulse' />
                      <span className='text-[10px] font-semibold text-emerald-600'>{hoursWorked.toFixed(1)} hours</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Time Entries */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <div>
            <h3 className='text-sm font-bold text-gray-800'>Recent Time Entries</h3>
            {pendingApproval > 0 && (
              <p className='text-[11px] text-amber-600 mt-0.5'>{pendingApproval} entries pending approval</p>
            )}
          </div>
        </div>
        {recentEntries.length === 0 ? (
          <div className='p-8 text-center'>
            <Clock className='h-10 w-10 mx-auto text-gray-300 mb-3' />
            <p className='text-sm text-gray-500'>No time entries yet</p>
          </div>
        ) : (
          <div className='divide-y divide-gray-50'>
            {recentEntries.map((entry) => {
              const hours = entry.clockOut
                ? ((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60) - (entry.breakMinutes || 0) / 60).toFixed(2)
                : null;
              const cost = hours ? parseFloat(hours) * Number(entry.employee?.payRate ?? 0) : 0;
              return (
                <div key={entry.id} className='flex items-center gap-3 px-4 py-3'>
                  <div className='h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100'>
                    <span className='text-xs font-bold text-blue-600'>
                      {entry.employee?.firstName?.[0] ?? '?'}{entry.employee?.lastName?.[0] ?? ''}
                    </span>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-semibold text-gray-800'>{entry.employee?.firstName ?? 'Unknown'} {entry.employee?.lastName ?? ''}</p>
                    <p className='text-[10px] text-gray-500'>
                      {new Date(entry.clockIn).toLocaleDateString()} · {new Date(entry.clockIn).toLocaleTimeString()} — {entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString() : 'In Progress'}
                    </p>
                  </div>
                  <div className='text-right shrink-0'>
                    {hours ? (
                      <>
                        <p className='text-xs font-bold text-gray-800'>{hours}h · ${cost.toFixed(2)}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${entry.approvedBy ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {entry.approvedBy ? 'Approved' : 'Pending'}
                        </span>
                      </>
                    ) : (
                      <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600'>Active</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Summary */}
      <div className='relative rounded-xl border border-gray-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 overflow-hidden'>
        <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-bl-full' />
        <div className='relative p-4'>
          <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3'>Monthly Summary</p>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
            <SummaryItem label='Total Hours' value={monthHours.toFixed(1)} />
            <SummaryItem label='Total Cost' value={`$${monthCost.toFixed(2)}`} />
            <SummaryItem label='Avg Hours/Day' value={(monthHours / new Date().getDate()).toFixed(1)} />
            <SummaryItem label='Active Now' value={String(activeEmployees.length)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='space-y-0.5'>
      <div className='text-[9px] sm:text-[10px] text-gray-500 font-semibold uppercase tracking-wide'>{label}</div>
      <div className='text-sm sm:text-base font-bold text-gray-800'>{value}</div>
    </div>
  );
}
