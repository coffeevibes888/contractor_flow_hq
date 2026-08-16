'use client';

/**
 * Per-team-member payroll settings list:
 *   - Hourly rate
 *   - "Set up payment" button (Stripe Treasury onboarding)
 *   - Pay schedule (Enterprise only)
 *   - 1099 Required badge if YTD ≥ $600
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface Member {
  id: string;
  name: string;
  hourlyRate: number | null;
  paySchedule: string | null;
  paySchedulePayDate: string | null;
  treasuryOnboardingStatus: string | null;
  treasuryEnabled: boolean;
}

interface Props {
  members: Member[];
  level: 'basic' | 'full';
  ytdByMember: Record<string, number>;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TeamMemberPayrollSettings({
  members,
  level,
  ytdByMember,
}: Props) {
  if (members.length === 0) {
    return (
      <div className='rounded-2xl border border-slate-200 bg-white py-12 px-6 text-center text-sm text-slate-500'>
        Invite team members to start running payroll.
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      {members.map((m) => (
        <Row
          key={m.id}
          member={m}
          level={level}
          ytd={ytdByMember[m.id] ?? 0}
        />
      ))}
    </div>
  );
}

function Row({
  member,
  level,
  ytd,
}: {
  member: Member;
  level: 'basic' | 'full';
  ytd: number;
}) {
  const [rateStr, setRateStr] = useState(
    member.hourlyRate?.toString() ?? ''
  );
  const [savingRate, setSavingRate] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [schedule, setSchedule] = useState(member.paySchedule ?? '');
  const [scheduleDay, setScheduleDay] = useState<number | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const verified = member.treasuryOnboardingStatus === 'verified' && member.treasuryEnabled;
  const ten99Required = ytd >= 600;

  const saveRate = async () => {
    const n = Number(rateStr);
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Enter a valid hourly rate.');
      return;
    }
    setSavingRate(true);
    try {
      const res = await fetch(
        `/api/payroll/team-member/${member.id}/rate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hourlyRate: n }),
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Save failed.');
      }
      toast.success('Rate updated');
    } catch (err: any) {
      toast.error(err?.message || 'Save failed.');
    } finally {
      setSavingRate(false);
    }
  };

  const startOnboarding = async () => {
    setOnboarding(true);
    try {
      const res = await fetch(
        `/api/payroll/team-member/${member.id}/onboard`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error || 'Could not start onboarding.');
      }
      window.location.href = json.url;
    } catch (err: any) {
      toast.error(err?.message || 'Could not start onboarding.');
      setOnboarding(false);
    }
  };

  const saveSchedule = async () => {
    if (!schedule) {
      // Clear
      setSavingSchedule(true);
      try {
        await fetch(`/api/payroll/team-member/${member.id}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paySchedule: null }),
        });
        toast.success('Schedule cleared');
      } finally {
        setSavingSchedule(false);
      }
      return;
    }
    if (scheduleDay === null) {
      toast.error('Pick a pay day first.');
      return;
    }
    setSavingSchedule(true);
    try {
      const res = await fetch(
        `/api/payroll/team-member/${member.id}/schedule`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paySchedule: schedule,
            paySchedulePayDay: scheduleDay,
          }),
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Save failed.');
      }
      toast.success('Schedule updated');
    } catch (err: any) {
      toast.error(err?.message || 'Save failed.');
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4'>
      {/* Header */}
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='flex items-center gap-2 flex-wrap'>
            <h4 className='text-sm font-semibold text-slate-900'>
              {member.name}
            </h4>
            {verified ? (
              <Badge className='bg-emerald-100 text-emerald-800 border-emerald-200 border text-[10px]'>
                <CheckCircle2 className='h-2.5 w-2.5 mr-0.5' />
                Payment ready
              </Badge>
            ) : (
              <Badge className='bg-amber-100 text-amber-800 border-amber-200 border text-[10px]'>
                <ShieldAlert className='h-2.5 w-2.5 mr-0.5' />
                Setup needed
              </Badge>
            )}
            {ten99Required && (
              <Badge className='bg-amber-100 text-amber-800 border-amber-200 border text-[10px]'>
                1099 Required ({usd.format(ytd)} YTD)
              </Badge>
            )}
          </div>
          {!verified && (
            <p className='text-[11px] text-slate-500 mt-1'>
              Team member completes Stripe-hosted KYC + W9. Funds land in
              their own Treasury wallet.
            </p>
          )}
        </div>
        {!verified && (
          <Button
            size='sm'
            onClick={startOnboarding}
            disabled={onboarding}
            className='bg-sky-600 hover:bg-sky-700'
          >
            {onboarding ? (
              <Loader2 className='h-4 w-4 mr-1.5 animate-spin' />
            ) : (
              <CreditCard className='h-4 w-4 mr-1.5' />
            )}
            {onboarding ? 'Opening Stripe…' : 'Set up payments'}
          </Button>
        )}
      </div>

      {/* Rate */}
      <div className='grid sm:grid-cols-2 gap-3 items-end'>
        <div>
          <label className='text-[11px] uppercase tracking-wide text-slate-500'>
            Hourly rate
          </label>
          <div className='relative mt-1'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'>
              $
            </span>
            <Input
              inputMode='decimal'
              value={rateStr}
              onChange={(e) => setRateStr(e.target.value)}
              className='pl-7 tabular-nums'
              placeholder='0.00'
            />
          </div>
        </div>
        <div className='flex justify-start sm:justify-end'>
          <Button
            size='sm'
            variant='outline'
            onClick={saveRate}
            disabled={savingRate}
          >
            {savingRate ? 'Saving…' : 'Save rate'}
          </Button>
        </div>
      </div>

      {/* Schedule (Enterprise only) */}
      {level === 'full' ? (
        <div className='rounded-lg bg-slate-50 border border-slate-100 px-3 py-3 space-y-3'>
          <div className='text-[11px] uppercase tracking-wide text-slate-500'>
            Pay schedule (optional)
          </div>
          <div className='flex flex-wrap gap-2 items-end'>
            <Select value={schedule} onValueChange={setSchedule}>
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='Manual only' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>Manual only</SelectItem>
                <SelectItem value='weekly'>Weekly</SelectItem>
                <SelectItem value='biweekly'>Bi-weekly</SelectItem>
                <SelectItem value='monthly'>Monthly</SelectItem>
              </SelectContent>
            </Select>
            {schedule === 'weekly' || schedule === 'biweekly' ? (
              <Select
                value={scheduleDay?.toString() ?? ''}
                onValueChange={(v) => setScheduleDay(Number(v))}
              >
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='Pay day' />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : schedule === 'monthly' ? (
              <Input
                type='number'
                min={1}
                max={31}
                placeholder='Day of month'
                className='w-[140px]'
                value={scheduleDay?.toString() ?? ''}
                onChange={(e) => setScheduleDay(Number(e.target.value))}
              />
            ) : null}
            <Button
              size='sm'
              variant='outline'
              onClick={saveSchedule}
              disabled={savingSchedule}
            >
              {savingSchedule ? 'Saving…' : 'Save schedule'}
            </Button>
          </div>
          {member.paySchedulePayDate && (
            <p className='text-[11px] text-slate-500'>
              Next pay date:{' '}
              {new Date(member.paySchedulePayDate).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : (
        <div className='rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 text-[11px] text-slate-500 flex items-center gap-2'>
          <AlertCircle className='h-3.5 w-3.5' />
          Pay schedules + overtime calculation are Enterprise-only.
        </div>
      )}
    </div>
  );
}
