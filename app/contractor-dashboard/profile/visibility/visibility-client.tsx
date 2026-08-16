'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Star, Shield, TrendingUp, Eye, CheckCircle, XCircle,
  BarChart3, RefreshCw, Users, Award, Clock, Sparkles, Info,
  ExternalLink, AlertCircle, Trophy, Target, Lock,
} from 'lucide-react';
import Link from 'next/link';

interface VisibilityPackage {
  id: string; name: string; credits: number; price: number; description: string; popular: boolean;
}

interface ScoreBreakdownItem {
  key: string; earned: number; max: number;
}

interface ProfileData {
  id: string; name: string; completionScore: number; missingItems: string[];
  visibilityCredits: number; featuredUntil: string | null;
  newContractorBoostUntil: string | null; hasActiveBoost: boolean;
  isNewMember: boolean; isPublic: boolean; acceptingNewWork: boolean;
  avgRating: number; totalReviews: number; completedJobs: number;
  meritScore: number; scoreBreakdown: ScoreBreakdownItem[];
  rankPosition: number; rankPercentile: number; totalContractors: number;
  newBoostActive: boolean; newBoostDaysLeft: number;
  responseRate: number; onTimeRate: number;
  identityVerified: boolean; insuranceVerified: boolean; backgroundChecked: boolean;
}

interface Props {
  profile: ProfileData; packages: VisibilityPackage[]; boostResult: string | null;
}

const FACTOR_META: Record<string, { label: string; icon: any; color: string; barColor: string; tip: string; action: string; actionHref: string }> = {
  rating:       { label: 'Average Rating',       icon: Star,        color: 'text-amber-500',   barColor: 'bg-amber-500',   tip: 'Bayesian-weighted — more reviews = more weight on your actual rating.', action: 'Get more reviews', actionHref: '/contractor-dashboard/profile/branding' },
  reviews:      { label: 'Review Volume',         icon: Users,       color: 'text-blue-500',    barColor: 'bg-blue-500',    tip: 'Log scale — going from 0→10 reviews matters more than 100→110.', action: 'Ask clients for reviews', actionHref: '/contractor-dashboard/customers' },
  jobs:         { label: 'Completed Jobs',        icon: CheckCircle, color: 'text-emerald-500', barColor: 'bg-emerald-500', tip: 'Proven track record. Log scale so new contractors aren\'t buried.', action: 'Complete more jobs', actionHref: '/contractor-dashboard/jobs' },
  response:     { label: 'Response Rate',         icon: Clock,       color: 'text-violet-500',  barColor: 'bg-violet-500',  tip: 'Reply to messages fast — clients hate being ignored.', action: 'Check messages', actionHref: '/contractor-dashboard/leads' },
  completeness: { label: 'Profile Completeness',  icon: BarChart3,   color: 'text-cyan-500',    barColor: 'bg-cyan-500',    tip: 'Photo, bio, tagline, location, specialties, hourly rate.', action: 'Complete profile', actionHref: '/contractor-dashboard/profile/branding' },
  trust:        { label: 'Trust & Verification',  icon: Shield,      color: 'text-indigo-500',  barColor: 'bg-indigo-500',  tip: 'Identity verified (4pts), insured (4pts), background checked (2pts).', action: 'Get verified', actionHref: '/contractor-dashboard/verification' },
  ontime:       { label: 'On-Time Rate',          icon: Award,       color: 'text-orange-500',  barColor: 'bg-orange-500',  tip: 'Do you show up when you say you will?', action: 'Keep showing up on time', actionHref: '/contractor-dashboard/jobs' },
  recency:      { label: 'Recent Activity',       icon: RefreshCw,   color: 'text-pink-500',    barColor: 'bg-pink-500',    tip: 'Active in last 30 days = full points. Decays over 90 days.', action: 'Stay active', actionHref: '/contractor-dashboard' },
};

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-500';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Needs Work';
  return 'Just Starting';
}

export default function VisibilityClient({ profile, packages, boostResult }: Props) {
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);
    try {
      const res = await fetch('/api/contractor/visibility/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const boostActiveUntil = profile.featuredUntil
    ? new Date(profile.featuredUntil)
    : profile.newContractorBoostUntil
    ? new Date(profile.newContractorBoostUntil)
    : null;

  return (
    <main className="w-full px-4 py-8 md:px-0 space-y-8 max-w-5xl mx-auto">

      {/* Result banners */}
      {boostResult === 'success' && (
        <div className="rounded-xl bg-emerald-50 border-2 border-emerald-400 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-emerald-800 font-semibold">Visibility boost activated! Your profile will now appear more frequently in the marketplace.</p>
        </div>
      )}
      {boostResult === 'canceled' && (
        <div className="rounded-xl bg-amber-50 border-2 border-amber-400 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-amber-800 font-semibold">Purchase canceled — no charge was made.</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Marketplace Visibility</h1>
        <p className="text-slate-500">Your live ranking, score breakdown, and how to improve.</p>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MERIT SCORE HERO CARD */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card className="border-2 border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-[200px_1fr] gap-6">
            {/* Score circle */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke="url(#scoreGradient)" strokeWidth="10"
                    strokeLinecap="round" strokeDasharray={`${(profile.meritScore / 100) * 327} 327`} />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-white">{profile.meritScore}</span>
                  <span className="text-xs text-white/60">/ 100</span>
                </div>
              </div>
              <p className={`text-sm font-bold mt-2 ${getScoreColor(profile.meritScore)}`}>
                {getScoreLabel(profile.meritScore)}
              </p>
            </div>

            {/* Rank + stats */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
                  <Trophy className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-xs text-white/60">Rank</p>
                    <p className="text-lg font-bold text-white">#{profile.rankPosition} <span className="text-sm font-normal text-white/50">of {profile.totalContractors}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
                  <Target className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-xs text-white/60">Percentile</p>
                    <p className="text-lg font-bold text-white">Top {100 - profile.rankPercentile}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
                  <Star className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-xs text-white/60">Rating</p>
                    <p className="text-lg font-bold text-white">{profile.avgRating.toFixed(1)} <span className="text-sm font-normal text-white/50">({profile.totalReviews} reviews)</span></p>
                  </div>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-xs text-white/50">Jobs Done</p>
                  <p className="text-lg font-bold text-white">{profile.completedJobs}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-xs text-white/50">Response</p>
                  <p className="text-lg font-bold text-white">{profile.responseRate}%</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-xs text-white/50">On-Time</p>
                  <p className="text-lg font-bold text-white">{profile.onTimeRate}%</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-xs text-white/50">Verified</p>
                  <p className="text-lg font-bold text-white">
                    {[profile.identityVerified, profile.insuranceVerified, profile.backgroundChecked].filter(Boolean).length}/3
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PER-FACTOR SCORE BREAKDOWN */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card className="border-2 border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Score Breakdown — What's Helping & What's Hurting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.scoreBreakdown.map(item => {
            const meta = FACTOR_META[item.key];
            if (!meta) return null;
            const Icon = meta.icon;
            const pct = item.max > 0 ? (item.earned / item.max) * 100 : 0;
            const isLow = pct < 40;
            return (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                    <span className="text-sm font-medium text-slate-700">{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isLow ? 'text-red-500' : 'text-slate-700'}`}>
                      {item.earned}/{item.max}
                    </span>
                    {isLow && (
                      <Link href={meta.actionHref} className="text-xs text-blue-600 hover:underline hidden sm:inline">
                        {meta.action} →
                      </Link>
                    )}
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${isLow ? 'bg-red-400' : meta.barColor}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">{meta.tip}</p>
                {isLow && (
                  <Link href={meta.actionHref} className="text-xs text-blue-600 hover:underline sm:hidden inline-block">
                    {meta.action} →
                  </Link>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STATUS CARDS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className={`border-2 ${profile.hasActiveBoost ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className={`h-5 w-5 ${profile.hasActiveBoost ? 'text-amber-500' : 'text-slate-400'}`} />
              <p className="font-semibold text-slate-700">Boost Status</p>
            </div>
            {profile.hasActiveBoost ? (
              <>
                <p className="text-lg font-bold text-amber-600">Active ✦</p>
                {profile.newBoostActive && (
                  <p className="text-xs text-amber-700 mt-1">Free new-member boost ({profile.newBoostDaysLeft} days left)</p>
                )}
                {profile.visibilityCredits > 0 && (
                  <p className="text-xs text-amber-700 mt-1">{profile.visibilityCredits.toLocaleString()} impressions remaining</p>
                )}
                {boostActiveUntil && !profile.newBoostActive && (
                  <p className="text-xs text-slate-500 mt-1">Until {boostActiveUntil.toLocaleDateString()}</p>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-sm">No active boost</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <p className="font-semibold text-slate-700">Profile Completeness</p>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-blue-600">{profile.completionScore}%</p>
              <p className="text-slate-500 text-sm mb-1">({Math.round(profile.completionScore / 10)}/10 items)</p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${profile.completionScore}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="h-5 w-5 text-violet-500" />
              <p className="font-semibold text-slate-700">Marketplace Status</p>
            </div>
            {profile.isPublic && profile.acceptingNewWork ? (
              <p className="text-emerald-600 font-bold">Visible ✓</p>
            ) : (
              <p className="text-red-500 font-bold">Hidden</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {!profile.isPublic ? 'Profile is set to private' : !profile.acceptingNewWork ? 'Not accepting new work' : 'Showing in search results'}
            </p>
            <Link href="/contractor-dashboard/profile/branding" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
              Edit in Branding →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PROFILE COMPLETION CHECKLIST */}
      {/* ═══════════════════════════════════════════════════════ */}
      {profile.missingItems.length > 0 && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-800 flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Complete your profile to rank higher — for free
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700 text-sm mb-4">
              Profile completeness is worth <strong>10 points</strong> in your merit score. These items are missing:
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {profile.missingItems.map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-blue-800">
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <Link href="/contractor-dashboard/profile/branding">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Complete My Profile</Button>
              </Link>
              <Link href="/contractor-dashboard/verification">
                <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">Get Verified</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HOW THE ALGORITHM WORKS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Info className="h-5 w-5 text-slate-500" />
            How We Rank Contractors — Full Transparency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-slate-700 font-semibold mb-2">The core principle</p>
            <p className="text-slate-600 text-sm leading-relaxed">
              Your position in search results is based entirely on <strong>merit</strong> — quality signals that reflect how good you are at your job.
              Money cannot buy a higher rank. What money <em>can</em> buy is <strong>more impressions</strong> — your card gets shown to more people,
              but always in a clearly labeled "Sponsored" slot that sits alongside organic results, not above them.
            </p>
          </div>
          <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
            <p className="text-violet-800 font-semibold mb-2 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              The Rotation System (Airbnb-style)
            </p>
            <p className="text-violet-700 text-sm leading-relaxed">
              Contractors with active visibility boosts rotate through up to <strong>3 "Sponsored" slots</strong> at the top of results.
              The rotation changes daily — no single contractor locks the top spot forever.
              New contractors (first 30 days) get a <strong>free automatic boost</strong> so they can build their first reviews.
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-emerald-800 font-semibold mb-2">The best way to rank higher is free</p>
            <ul className="text-emerald-700 text-sm space-y-1">
              <li>✓ Get more reviews from happy clients</li>
              <li>✓ Complete your profile (photo, bio, location, rate)</li>
              <li>✓ Get verified and insured — worth 10 points</li>
              <li>✓ Reply to messages quickly — worth 15 points</li>
              <li>✓ Show up on time — tracked automatically</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* VISIBILITY BOOST PACKAGES */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Visibility Boost</h2>
        <p className="text-slate-500 mb-6">
          Buy impressions to get your card shown to more people. Clearly labeled as "Sponsored."
          Your organic rank is never affected — this is purely about reach.
        </p>

        {/* New-member lock */}
        {profile.newBoostActive && (
          <div className="rounded-xl bg-violet-50 border-2 border-violet-300 p-4 mb-6 flex items-start gap-3">
            <Lock className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-violet-800 font-semibold">You're already boosted for free!</p>
              <p className="text-violet-700 text-sm">
                As a new member, you have a free visibility boost for {profile.newBoostDaysLeft} more day{profile.newBoostDaysLeft !== 1 ? 's' : ''}.
                Use this time to complete your profile, get your first reviews, and build your reputation.
                You can purchase additional boosts after your free period ends.
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {packages.map(pkg => (
            <Card
              key={pkg.id}
              className={`border-2 relative ${profile.newBoostActive ? 'opacity-50' : ''} ${pkg.popular ? 'border-violet-500 shadow-lg shadow-violet-100' : 'border-slate-200'}`}
            >
              {pkg.popular && !profile.newBoostActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-violet-600 text-white px-3 py-1">Most Popular</Badge>
                </div>
              )}
              <CardContent className="p-6 text-center">
                <p className="text-lg font-bold text-slate-900 mb-1">{pkg.name}</p>
                <p className="text-4xl font-bold text-slate-900 mb-1">${(pkg.price / 100).toFixed(2)}</p>
                <p className="text-slate-500 text-sm mb-4">{pkg.description}</p>
                <div className="text-xs text-slate-400 mb-6 space-y-1">
                  <p>✦ Rotates in Sponsored slots daily</p>
                  <p>✦ Clearly labeled — no deception</p>
                  <p>✦ Credits never expire</p>
                </div>
                <Button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasing === pkg.id || profile.newBoostActive}
                  className={`w-full ${profile.newBoostActive ? 'bg-slate-400 cursor-not-allowed' : pkg.popular ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-800 hover:bg-slate-700'} text-white`}
                >
                  {profile.newBoostActive ? 'Free boost active' : purchasing === pkg.id ? 'Loading...' : `Get ${pkg.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-4 text-center">
          Secure checkout via Stripe. One-time payment, no subscription. Credits are added instantly after payment.
        </p>
      </div>

      {/* View public profile */}
      <div className="flex justify-center pb-8">
        <Link href="/contractor-marketplace" target="_blank">
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            See how you appear in the marketplace
          </Button>
        </Link>
      </div>
    </main>
  );
}
