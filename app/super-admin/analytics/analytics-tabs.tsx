'use client';

import { useState } from 'react';
import AnalyticsDashboard from './analytics-dashboard';
import BehaviorDashboard from './behavior-dashboard';

const TABS = [
  { id: 'traffic',  label: 'Traffic & Engagement' },
  { id: 'behavior', label: 'User Behavior & Conversion' },
] as const;

export default function AnalyticsTabs() {
  const [tab, setTab] = useState<'traffic' | 'behavior'>('traffic');

  return (
    <div>
      {/* Tab bar */}
      <div className='flex gap-1 px-6 pt-4 bg-slate-900/80 border-b border-white/10'>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
              tab === t.id
                ? 'bg-slate-800 text-white border border-white/10 border-b-0'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'traffic'   && <AnalyticsDashboard />}
      {tab === 'behavior'  && <BehaviorDashboard />}
    </div>
  );
}
