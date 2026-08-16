'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, Users, Target } from 'lucide-react';

interface QuickStats {
  pageViews24h: number;
  visitors24h: number;
  conversionRate: number;
  trending: 'up' | 'down' | 'stable';
}

export default function AnalyticsWidget() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuickStats();
  }, []);

  const fetchQuickStats = async () => {
    try {
      const response = await fetch('/api/super-admin/analytics?range=24h');
      const data = await response.json();
      
      setStats({
        pageViews24h: data.summary.totalPageViews,
        visitors24h: data.summary.uniqueVisitors,
        conversionRate: data.summary.conversionRate,
        trending: data.summary.conversions > 0 ? 'up' : 'stable',
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className='bg-slate-800/60 border-white/10'>
        <CardHeader>
          <CardTitle className='text-white flex items-center gap-2'>
            <Activity className='h-5 w-5 animate-pulse' />
            Analytics (Last 24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-slate-400 text-sm'>Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card className='bg-gradient-to-br from-violet-900/40 to-blue-900/40 border-violet-500/30'>
      <CardHeader>
        <CardTitle className='text-white flex items-center justify-between'>
          <span className='flex items-center gap-2'>
            <Activity className='h-5 w-5' />
            Analytics (Last 24h)
          </span>
          <Link 
            href='/super-admin/analytics'
            className='text-xs text-violet-300 hover:text-violet-200 transition-colors'
          >
            View Full Report →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-3 gap-4'>
          <div className='text-center'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <Users className='h-4 w-4 text-cyan-400' />
            </div>
            <div className='text-2xl font-bold text-white'>{stats.pageViews24h}</div>
            <div className='text-xs text-slate-300'>Page Views</div>
          </div>
          
          <div className='text-center'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <Users className='h-4 w-4 text-emerald-400' />
            </div>
            <div className='text-2xl font-bold text-white'>{stats.visitors24h}</div>
            <div className='text-xs text-slate-300'>Visitors</div>
          </div>
          
          <div className='text-center'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <Target className='h-4 w-4 text-violet-400' />
              {stats.trending === 'up' && <TrendingUp className='h-3 w-3 text-emerald-400' />}
            </div>
            <div className='text-2xl font-bold text-white'>{stats.conversionRate}%</div>
            <div className='text-xs text-slate-300'>Conversion</div>
          </div>
        </div>
        
        <Link
          href='/super-admin/analytics'
          className='mt-4 block w-full text-center bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 py-2 rounded-lg text-sm font-medium transition-colors'
        >
          View Detailed Analytics
        </Link>
      </CardContent>
    </Card>
  );
}
