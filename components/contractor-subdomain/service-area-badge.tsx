'use client';

import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';

interface ServiceAreaBadgeProps {
  baseCity?: string | null;
  baseState?: string | null;
  serviceRadius?: number | null;
  serviceAreas?: string[];
}

export function ServiceAreaBadge({
  baseCity,
  baseState,
  serviceRadius,
  serviceAreas = [],
}: ServiceAreaBadgeProps) {
  const location = [baseCity, baseState].filter(Boolean).join(', ');
  
  if (!location && serviceAreas.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-emerald-500/30 flex items-center justify-center">
          <MapPin className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-white">{location || 'Multiple Areas'}</p>
          {serviceRadius && (
            <p className="text-xs text-emerald-300">
              Serving {serviceRadius} mile radius
            </p>
          )}
        </div>
      </div>
      
      {serviceAreas.length > 0 && (
        <>
          <div className="h-6 w-px bg-white/20" />
          <div className="flex items-center gap-1 text-xs text-slate-300">
            <Navigation className="h-3 w-3" />
            <span>{serviceAreas.length} service areas</span>
          </div>
        </>
      )}
    </motion.div>
  );
}
