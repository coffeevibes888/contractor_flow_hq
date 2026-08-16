'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Lock, Crown, Loader2, RefreshCw, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AccountingHelp, { type HelpBlock } from './accounting-help';

interface TierLockedState {
  message: string;
  requiredTier: 'pro' | 'enterprise';
}

interface CommonProps {
  landlordId: string;
  title: string;
  subtitle: string;
  help?: HelpBlock;
  children: (state: { data: unknown; loading: boolean; reload: () => void }) => React.ReactNode;
  buildUrl: () => string;
}

export default function ReportShell({ title, subtitle, help, children, buildUrl }: CommonProps) {
  const router = useRouter();
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState<TierLockedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string>(new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${buildUrl()}&asOf=${encodeURIComponent(asOf)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const text = await res.text();
      let json: { success?: boolean; data?: unknown; message?: string; code?: string; requiredTier?: 'pro' | 'enterprise' } | null = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }
      if (!res.ok) {
        if (json?.code === 'TIER_LOCKED') {
          setLocked({ message: json.message || 'This feature requires a paid plan.', requiredTier: json.requiredTier || 'pro' });
        } else if (json?.code === 'SCHEMA_NOT_MIGRATED') {
          setError(json.message || 'Database migration pending. Contact support.');
        } else {
          setError(json?.message || `Server error (${res.status})`);
        }
        return;
      }
      if (!json || json.success !== true) {
        setError(json?.message || 'Unexpected response from server');
        return;
      }
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [buildUrl, asOf]);

  useEffect(() => {
    load();
  }, [load]);

  if (locked) {
    return (
      <div className='max-w-lg mx-auto mt-20 text-center space-y-5'>
        <div className='mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center'>
          <Lock className='h-8 w-8 text-amber-400' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-black'>{title}</h1>
          <p className='text-sm text-gray-500 mt-1'>{locked.message}</p>
        </div>
        <div className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold'>
          <Crown className='h-4 w-4' />
          Requires {locked.requiredTier === 'enterprise' ? 'Enterprise' : 'Pro'} plan
        </div>
        <div>
          <Link
            href='/admin/overview?upgrade=1'
            className='text-sm text-sky-600 hover:underline'
          >
            Upgrade your plan →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className='w-full'>
      <div className='max-w-7xl space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4'>
          <div>
            <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>{title}</h1>
            <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>{subtitle}</p>
          </div>
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm'>
              <Calendar className='h-4 w-4 text-gray-500' />
              <input
                type='date'
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className='border-0 focus:outline-none text-sm'
              />
            </div>
            <button
              type='button'
              onClick={load}
              disabled={loading}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 disabled:opacity-50'
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {help && <AccountingHelp block={help} />}

        {error ? (
          <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>
        ) : loading ? (
          <div className='flex items-center justify-center py-20 text-gray-400'>
            <Loader2 className='h-6 w-6 animate-spin mr-2' />
            Loading report…
          </div>
        ) : (
          children({ data, loading, reload: load })
        )}
      </div>
    </main>
  );
}
