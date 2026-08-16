'use client';

import Link from 'next/link';
import {
  Star, Users, CheckCircle, Clock, BarChart3, Shield,
  Award, RefreshCw, TrendingUp, ArrowRight, Zap, ExternalLink,
} from 'lucide-react';

export interface ScoreBreakdown {
  meritScore: number;
  rankPosition: number;       // e.g. 12
  totalContractors: number;   // e.g. 87
  percentile: number;         // e.g. 86 = top 14%

  // Raw values for each factor
  avgRating: number;
  totalReviews: number;
  completedJobs: number;
  responseRate: number;
  profileCompleteness: number; // 0–100
  identityVerified: boolean;
  insuranceVerified: boolean;
  backgroundChecked: boolean;
  onTimeRate: number;
  recencyScore: number;        // 0–100

  // Computed factor scores (0–max)
  ratingPoints: number;        // max 25
  reviewPoints: number;        // max 15
  jobPoints: number;           // max 15
  responsePoints: number;      // max 15
  completenessPoints: number;  // max 10
  trustPoints: number;         // max 10
  onTimePoints: number;        // max 5
  recencyPoints: number;       // max 5

  hasActiveBoost: boolean;
  isNew: boolean;
}

interface Props {
  score: ScoreBreakdown;
  compact?: boolean; // true = smaller widget for branding page
}

const FACTORS = [
  {
    key: 'rating',
    label: 'Average Rating',
    icon: Star,
    color: 'text-amber-500',
    barColor: 'bg-amber-500',
    max: 25,
    pointsKey: 'ratingPoints' as const,
    tip: 'Bayesian-weighted — more reviews = more weight',
    action: null,
  },
  {
    key: 'reviews',
    label: 'Review Volume',
    icon: Users,
    color: 'text-blue-500',
    barColor: 'bg-blue-500',
    max: 15,
    pointsKey: 'reviewPoints' as const,
    tip: 'Ask every happy client to leave a review',
    action: null,
  },
  {
    key: 'jobs',
    label: 'Completed Jobs',
    icon: CheckCircle,
    color: 'text-emerald-500',
    barColor: 'bg-emerald-500',
    max: 15,
    pointsKey: 'jobPoints' as const,
    tip: 'Grows automatically as you complete work',
    action: null,
  },
  {
    key: 'response',
    label: 'Response Rate',
    icon: Clock,
    color: 'text-violet-500',
    barColor: 'bg-violet-500',
    max: 15,
    pointsKey: 'responsePoints' as const,
    tip: 'Reply to messages quickly — this is worth 15 pts',
    action: null,
  },
  {
    key: 'completeness',
    label: 'Profile Completeness',
    icon: BarChart3,
    color: 'text-cyan-500',
    barColor: 'bg-cyan-500',
    max: 10,
    pointsKey: 'completenessPoints' as const,
    tip: 'Photo, bio, tagline, location, rate',
    action: '/contractor-dashboard/profile/branding',
  },
  {
    key: 'trust',
    label: 'Trust & Verification',
    icon: Shield,
    color: 'text-indigo-500',
    barColor: 'bg-indigo-500',
    max: 10,
    pointsKey: 'trustPoints' as const,
    tip: 'Identity + insurance + background check',
    action: '/contractor-dashboard/verification',
  },
  {
    key: 'ontime',
    label: 'On-Time Rate',
    icon: Award,
    color: 'text-orange-500',
    barColor: 'bg-orange-500',
    max: 5,
    pointsKey: 'onTimePoints' as const,
    tip: 'Show up when you say you will',
    action: null,
  },
  {
    key: 'recency',
    label: 'Recent Activity',
    icon: RefreshCw,
    color: 'text-pink-500',
    barColor: 'bg-pink-500',
    max: 5,
    pointsKey: 'recencyPoints' as const,
    tip: 'Log in and stay active — decays after 30 days',
    action: null,
  },
];

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

export default function MarketplaceScoreCard({ score, compact = false }: Props) {
  const topPercent = 100 - score.percentile;
  const scoreColor = score.meritScore >= 70 ? 'text-emerald-600' : score.meritScore >= 40 ? 'text-amber-600' : 'text-red-500';
  const rankLabel = topPercent <= 10 ? '🏆 Top 10%' : topPercent <= 25 ? '⭐ Top 25%' : topPercent <= 50 ? 'Top 50%' : 'Building up';

  if (compact) {
    // Compact version for branding page — just score + top 3 missing items
    const lowestFactors = [...FACTORS]
      .sort((a, b) => {
        const pctA = score[a.pointsKey] / a.max;
        const pctB = score[b.pointsKey] / b.max;
        return pctA - pctB;
      })
      .slice(0, 3);

    return (
      <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Score ring */}
        <div className="relative shrink-0 flex items-center justify-center">
          <ScoreRing score={score.meritScore} size={72} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold ${scoreColor}`}>{score.meritScore}</span>
            <span className="text-[9px] text-slate-400 font-medium">/ 100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-white text-sm">Marketplace Score</p>
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{rankLabel}</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Rank #{score.rankPosition} of {score.totalContractors} contractors
          </p>
          <div className="space-y-1.5">
            {lowestFactors.map(f => {
              const Icon = f.icon;
              const pct = Math.round((score[f.pointsKey] / f.max) * 100);
              return (
                <div key={f.key} className="flex items-center gap-2">
                  <Icon className={`h-3 w-3 shrink-0 ${f.color}`} />
                  <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                    <div className={`${f.barColor} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 w-16 text-right">
                    {score[f.pointsKey].toFixed(1)}/{f.max}pts
                  </span>
                  {f.action && (
                    <Link href={f.action} className={`text-[10px] ${f.color} hover:underline shrink-0`}>Fix →</Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Link href="/contractor-dashboard/profile/visibility" className="shrink-0">
          <button className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold whitespace-nowrap">
            Full breakdown <ArrowRight className="h-3 w-3" />
          </button>
        </Link>
      </div>
    );
  }

  // Full version for dashboard
  return (
    <div className="relative rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.12),_transparent_60%)]" />

      <div className="relative p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-violet-400" />
              <h3 className="text-base font-bold text-white">Marketplace Score</h3>
            </div>
            <p className="text-xs text-slate-400">How you rank among all contractors on PropertyFlowHQ</p>
          </div>
          <Link href="/contractor-dashboard/profile/visibility">
            <button className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold">
              Details <ExternalLink className="h-3 w-3" />
            </button>
          </Link>
        </div>

        {/* Score + rank */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative shrink-0">
            <ScoreRing score={score.meritScore} size={96} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor}`}>{score.meritScore}</span>
              <span className="text-[10px] text-slate-400 font-medium">/ 100</span>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-white">#{score.rankPosition}</span>
              <span className="text-slate-400 text-sm">of {score.totalContractors}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-violet-500/20 border border-violet-500/30 rounded-full px-3 py-1 mb-3">
              <Zap className="h-3 w-3 text-violet-400" />
              <span className="text-xs font-bold text-violet-300">{rankLabel}</span>
            </div>
            {/* Rank progress bar */}
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-violet-500 to-indigo-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${score.percentile}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Better than {score.percentile}% of contractors</p>
          </div>
        </div>

        {/* Factor breakdown */}
        <div className="space-y-2.5">
          {FACTORS.map(f => {
            const Icon = f.icon;
            const pts = score[f.pointsKey];
            const pct = Math.round((pts / f.max) * 100);
            const isLow = pct < 50;

            return (
              <div key={f.key} className="group">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${f.color}`} />
                  <span className="text-xs text-slate-300 flex-1">{f.label}</span>
                  <span className={`text-xs font-bold ${isLow ? 'text-red-400' : 'text-slate-300'}`}>
                    {pts.toFixed(1)}<span className="text-slate-600 font-normal">/{f.max}</span>
                  </span>
                  {f.action && isLow && (
                    <Link href={f.action} className={`text-[10px] ${f.color} hover:underline font-semibold`}>
                      Improve →
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-700/80 rounded-full h-1.5">
                    <div
                      className={`${f.barColor} h-1.5 rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 w-8 text-right">{pct}%</span>
                </div>
                {/* Tooltip on hover */}
                <p className="text-[10px] text-slate-500 mt-0.5 hidden group-hover:block">{f.tip}</p>
              </div>
            );
          })}
        </div>

        {/* Boost status */}
        {score.hasActiveBoost && (
          <div className="mt-4 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            <Zap className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300 font-medium">Visibility boost active — your card is being shown to more people</p>
          </div>
        )}

        {score.isNew && !score.hasActiveBoost && (
          <div className="mt-4 flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-lg px-3 py-2">
            <Zap className="h-4 w-4 text-violet-400 shrink-0" />
            <p className="text-xs text-violet-300 font-medium">New member boost active — you're getting extra visibility for your first 30 days</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 flex gap-2">
          <Link href="/contractor-dashboard/profile/visibility" className="flex-1">
            <button className="w-full text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg py-2 transition-colors">
              Boost Visibility
            </button>
          </Link>
          <Link href="/contractor-dashboard/verification" className="flex-1">
            <button className="w-full text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 transition-colors">
              Get Verified +10pts
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
