'use client';

import { motion } from 'framer-motion';
import { Shield, BadgeCheck, FileCheck, UserCheck, Award } from 'lucide-react';

interface TrustBadgesProps {
  insuranceVerified?: boolean;
  backgroundChecked?: boolean;
  identityVerified?: boolean;
  licenseNumber?: string | null;
  licenseState?: string | null;
}

export function TrustBadges({
  insuranceVerified = false,
  backgroundChecked = false,
  identityVerified = false,
  licenseNumber,
  licenseState,
}: TrustBadgesProps) {
  const badges = [
    ...(insuranceVerified ? [{
      icon: Shield,
      label: 'Insured',
      description: 'Liability coverage verified',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
    }] : []),
    ...(licenseNumber ? [{
      icon: FileCheck,
      label: 'Licensed',
      description: licenseState ? `${licenseState} License` : 'State licensed',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    }] : []),
    ...(backgroundChecked ? [{
      icon: UserCheck,
      label: 'Background Checked',
      description: 'Verified clean record',
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/20',
    }] : []),
    ...(identityVerified ? [{
      icon: BadgeCheck,
      label: 'ID Verified',
      description: 'Identity confirmed',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
    }] : []),
  ];

  if (badges.length === 0) return null;

  return (
    <section className="w-full py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {badges.map((badge, index) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${badge.bgColor} border border-white/10`}
            >
              <badge.icon className={`h-4 w-4 ${badge.color}`} />
              <div>
                <span className={`text-sm font-medium ${badge.color}`}>{badge.label}</span>
                <span className="text-xs text-slate-400 ml-1 hidden sm:inline">• {badge.description}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
