'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Target, ArrowRight, MousePointerClick,
  Smartphone, Monitor, Tablet, Globe, ArrowDown, BarChart2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface FunnelStep { step: string; count: number; pct: number }
interface RoleRow    { role: string; count: number }
interface OnboardRow { role: string; total: number; completed: number; rate: number }
interface SourceRow  { source: string; visits: number; signups: number; rate: number }
interface DropOff    { path: string; exits: number; views: number; exitRate: number; avgTimeOnPageSec: number }
interface DeviceRow  { device: string; sessions: number; signups: number; rate: number }
interface TimeRow    { date: string; count: number }
interface PageRow    { path: string; count: number }

interface BehaviorData {
  summary: {
    totalSignups: number;
    verifiedEmail: number;
    completedOnboarding: number;
    converted: number;
    conversionRate: number;
    formAbandonRate: number;
  };
  funnel: FunnelStep[];
  roleSignups: RoleRow[];
  onboardingRates: OnboardRow[];
  sourceConversion: SourceRow[];
  dropOffPages: DropOff[];
  topPreSignupPages: PageRow[];
  deviceBreakdown: DeviceRow[];
  signupTimeline: TimeRow[];
}

const ROLE_COLORS: Record<string, string> = {
  landlord: 'bg-violet-500',
  tenant: 'bg-cyan-500',
  contractor: 'bg-amber-500',
  homeowner: 'bg-emerald-500',
  agent: 'bg-blue-500',
  user: 'bg-slate-500',
};

function StatBadge({ value, label, color = 'text-white' }: { value: string | number; label: string; color?: string }) {
  return (
    <div className='rounded-xl bg-slate-800/60 border border-white/10 p-4 text-center'>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className='text-xs text-slate-400 mt-1'>{label}</p>
    </div>
  );
}

export default function BehaviorDashboard() {
  const [data, setData] = useState<BehaviorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/super-admin/analytics/behavior?range=${range}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range]);

  if (loading || !data) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6 flex items-center justify-center'>
        <BarChart2 className='h-10 w-10 animate-pulse text-violet-400' />
      </div>
    );
  }

  const { summary, funnel, roleSignups, onboardingRates, sourceConversion, dropOffPages, topPreSignupPages, deviceBreakdown, signupTimeline } = data;

  const maxTimeline = Math.max(...signupTimeline.map(r => r.count), 1);

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6'>
      <div className='max-w-7xl mx-auto space-y-8'>

        {/* Header + Range */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-white'>User Behavior & Conversion</h1>
            <p className='text-slate-300 mt-1'>Where people come from, what they do, and where they fall off</p>
          </div>
          <div className='flex gap-2'>
            {(['7d', '30d', '90d'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  range === r ? 'bg-violet-500 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                }`}
              >
                {r === '7d' ? 'Last 7 days' : r === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Bar */}
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
          <StatBadge value={summary.totalSignups}           label='New signups'           color='text-white' />
          <StatBadge value={summary.verifiedEmail}          label='Email verified'         color='text-emerald-400' />
          <StatBadge value={summary.completedOnboarding}    label='Onboarded'              color='text-cyan-400' />
          <StatBadge value={summary.converted}              label='Paid plans started'     color='text-violet-400' />
          <StatBadge value={`${summary.conversionRate}%`}   label='Visitor → signup'       color='text-amber-400' />
          <StatBadge value={`${summary.formAbandonRate}%`}  label='Sign-up form abandon'   color={summary.formAbandonRate > 60 ? 'text-red-400' : 'text-slate-300'} />
        </div>

        {/* Signup Funnel */}
        <Card className='bg-slate-800/60 border-white/10'>
          <CardHeader>
            <CardTitle className='text-white flex items-center gap-2'>
              <Target className='h-5 w-5 text-violet-400' />
              Conversion Funnel
            </CardTitle>
            <CardDescription className='text-slate-400'>Step-by-step drop-off from first visit to paid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {funnel.map((step, i) => (
                <div key={i} className='flex items-center gap-4'>
                  <div className='w-48 text-sm text-slate-300 shrink-0'>{step.step}</div>
                  <div className='flex-1 bg-slate-700/40 rounded-full h-6 relative overflow-hidden'>
                    <div
                      className='h-6 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-end pr-3 transition-all duration-500'
                      style={{ width: `${Math.max(step.pct, 2)}%` }}
                    >
                      <span className='text-xs font-bold text-white'>{step.pct}%</span>
                    </div>
                  </div>
                  <span className='text-sm text-white font-semibold w-16 text-right'>{step.count.toLocaleString()}</span>
                  {i < funnel.length - 1 && (
                    <ArrowRight className='h-4 w-4 text-slate-600 shrink-0' />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Signup Trend */}
        {signupTimeline.length > 1 && (
          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white flex items-center gap-2'>
                <TrendingUp className='h-5 w-5 text-emerald-400' />
                Daily Signups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex items-end gap-1 h-32'>
                {signupTimeline.map((row, i) => (
                  <div key={i} className='flex-1 flex flex-col items-center gap-1 group'>
                    <div className='relative w-full'>
                      <div
                        className='w-full bg-violet-500 rounded-t transition-all hover:bg-violet-400'
                        style={{ height: `${Math.round((row.count / maxTimeline) * 112)}px`, minHeight: row.count > 0 ? '4px' : '1px' }}
                        title={`${row.date}: ${row.count}`}
                      />
                    </div>
                    {signupTimeline.length <= 14 && (
                      <span className='text-xs text-slate-500 rotate-45 origin-left whitespace-nowrap' style={{ fontSize: '9px' }}>
                        {row.date.slice(5)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Two columns: Role breakdown + Onboarding rates */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white flex items-center gap-2'>
                <Users className='h-5 w-5 text-cyan-400' />
                Signups by Role
              </CardTitle>
              <CardDescription className='text-slate-400'>Who is signing up</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {roleSignups.map((row) => {
                  const pct = summary.totalSignups > 0 ? Math.round((row.count / summary.totalSignups) * 100) : 0;
                  return (
                    <div key={row.role} className='flex items-center gap-3'>
                      <span className='text-sm text-slate-300 w-28 capitalize shrink-0'>{row.role}</span>
                      <div className='flex-1 bg-slate-700/40 rounded-full h-3'>
                        <div
                          className={`h-3 rounded-full ${ROLE_COLORS[row.role] ?? 'bg-slate-400'}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className='text-sm text-white w-8 text-right'>{row.count}</span>
                      <span className='text-xs text-slate-500 w-10 text-right'>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white flex items-center gap-2'>
                <Target className='h-5 w-5 text-amber-400' />
                Onboarding Completion by Role
              </CardTitle>
              <CardDescription className='text-slate-400'>Which roles finish setup vs drop off</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {onboardingRates.map((row) => (
                  <div key={row.role}>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-sm text-slate-300 capitalize'>{row.role}</span>
                      <span className={`text-sm font-bold ${row.rate >= 70 ? 'text-emerald-400' : row.rate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                        {row.rate}%
                      </span>
                    </div>
                    <div className='w-full bg-slate-700/40 rounded-full h-2'>
                      <div
                        className={`h-2 rounded-full ${row.rate >= 70 ? 'bg-emerald-500' : row.rate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${row.rate}%` }}
                      />
                    </div>
                    <p className='text-xs text-slate-500 mt-0.5'>{row.completed} / {row.total} completed</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Traffic Source Conversion */}
        <Card className='bg-slate-800/60 border-white/10'>
          <CardHeader>
            <CardTitle className='text-white flex items-center gap-2'>
              <Globe className='h-5 w-5 text-blue-400' />
              Traffic Source → Signup Rate
            </CardTitle>
            <CardDescription className='text-slate-400'>Which channels actually convert</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-white/10 text-slate-400'>
                    <th className='text-left py-2 font-medium'>Source</th>
                    <th className='text-right py-2 font-medium'>Sessions</th>
                    <th className='text-right py-2 font-medium'>Signups</th>
                    <th className='text-right py-2 font-medium'>Rate</th>
                    <th className='py-2 pl-4'>Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceConversion.map((row, i) => (
                    <tr key={i} className='border-b border-white/5'>
                      <td className='py-2 text-white capitalize'>{row.source}</td>
                      <td className='py-2 text-right text-slate-300'>{row.visits.toLocaleString()}</td>
                      <td className='py-2 text-right text-emerald-400 font-semibold'>{row.signups}</td>
                      <td className='py-2 text-right'>
                        <span className={`font-bold ${row.rate >= 5 ? 'text-emerald-400' : row.rate >= 2 ? 'text-amber-400' : 'text-slate-400'}`}>
                          {row.rate}%
                        </span>
                      </td>
                      <td className='py-2 pl-4'>
                        <div className='w-24 bg-slate-700/40 rounded-full h-2'>
                          <div
                            className='h-2 rounded-full bg-cyan-500'
                            style={{ width: `${Math.min(row.rate * 5, 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Two columns: Drop-off pages + Pre-signup pages */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white flex items-center gap-2'>
                <ArrowDown className='h-5 w-5 text-red-400' />
                Top Drop-Off Pages
              </CardTitle>
              <CardDescription className='text-slate-400'>Highest exit rate with avg time on page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {dropOffPages.slice(0, 8).map((page, i) => (
                  <div key={i} className='flex items-center justify-between gap-2'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm text-white truncate font-medium'>{page.path}</p>
                      <p className='text-xs text-slate-500'>{page.avgTimeOnPageSec}s avg • {page.views} views</p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${page.exitRate >= 70 ? 'text-red-400' : page.exitRate >= 40 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {page.exitRate}% exit
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white flex items-center gap-2'>
                <MousePointerClick className='h-5 w-5 text-violet-400' />
                Pages Seen Before Signup
              </CardTitle>
              <CardDescription className='text-slate-400'>Where converting users spend time — your best content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {topPreSignupPages.map((page, i) => {
                  const pct = topPreSignupPages[0]?.count > 0 ? Math.round((page.count / topPreSignupPages[0].count) * 100) : 0;
                  return (
                    <div key={i} className='flex items-center gap-3'>
                      <span className='text-xs text-slate-500 w-4 text-right'>{i + 1}</span>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm text-white truncate'>{page.path}</p>
                        <div className='w-full bg-slate-700/40 rounded-full h-1.5 mt-1'>
                          <div className='h-1.5 rounded-full bg-violet-500' style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className='text-sm text-slate-300 shrink-0'>{page.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device conversion */}
        <Card className='bg-slate-800/60 border-white/10'>
          <CardHeader>
            <CardTitle className='text-white flex items-center gap-2'>
              <Smartphone className='h-5 w-5 text-emerald-400' />
              Device × Conversion
            </CardTitle>
            <CardDescription className='text-slate-400'>Do mobile users convert as well as desktop?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              {deviceBreakdown.map((row) => {
                const Icon = row.device === 'mobile' ? Smartphone : row.device === 'tablet' ? Tablet : Monitor;
                return (
                  <div key={row.device} className='rounded-xl bg-slate-700/30 p-4 text-center'>
                    <Icon className='h-6 w-6 text-slate-400 mx-auto mb-2' />
                    <p className='text-sm text-slate-300 capitalize'>{row.device}</p>
                    <p className='text-2xl font-bold text-white mt-1'>{row.rate}%</p>
                    <p className='text-xs text-slate-500 mt-1'>{row.signups} signups / {row.sessions} sessions</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
