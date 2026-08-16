'use client';

import { motion } from 'framer-motion';
import { Star, Clock, CheckCircle2, Users, Award, TrendingUp } from 'lucide-react';

interface ContractorStatsProps {
  avgRating: number;
  totalReviews: number;
  completedJobs: number;
  responseRate: number;
  onTimeRate: number;
  yearsExperience?: number | null;
}

export function ContractorStats({
  avgRating,
  totalReviews,
  completedJobs,
  responseRate,
  onTimeRate,
  yearsExperience,
}: ContractorStatsProps) {
  const stats = [
    {
      icon: Star,
      value: avgRating.toFixed(1),
      label: 'Rating',
      subLabel: `${totalReviews} reviews`,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-400/30',
    },
    {
      icon: CheckCircle2,
      value: completedJobs.toString(),
      label: 'Jobs Completed',
      subLabel: 'Verified',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-400/30',
    },
    {
      icon: Clock,
      value: `${Math.round(responseRate)}%`,
      label: 'Response Rate',
      subLabel: 'Within 24hrs',
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/20',
      borderColor: 'border-violet-400/30',
    },
    {
      icon: TrendingUp,
      value: `${Math.round(onTimeRate)}%`,
      label: 'On-Time',
      subLabel: 'Completion',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-400/30',
    },
  ];

  // Add years experience if available
  if (yearsExperience) {
    stats.push({
      icon: Award,
      value: `${yearsExperience}+`,
      label: 'Years',
      subLabel: 'Experience',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-400/30',
    });
  }

  return (
    <section className="w-full py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={`rounded-xl border ${stat.borderColor} ${stat.bgColor} backdrop-blur-sm p-4 text-center`}
            >
              <div className={`h-10 w-10 mx-auto mb-2 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-white font-medium">{stat.label}</div>
              <div className="text-xs text-slate-400">{stat.subLabel}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
