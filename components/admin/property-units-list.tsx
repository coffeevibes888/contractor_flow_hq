'use client';

import { useState } from 'react';
import { UnitAvailabilityToggle } from './unit-availability-toggle';
import { ChevronDown, ChevronUp, Home } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface UnitData {
  id: string;
  name: string;
  rentAmount: number;
  isAvailable: boolean;
  hasActiveLease?: boolean;
  tenantName?: string;
  leaseId?: string;
}

interface PropertyUnitsListProps {
  propertyId: string;
  units: UnitData[];
}

export function PropertyUnitsList({ propertyId, units }: PropertyUnitsListProps) {
  const [expanded, setExpanded] = useState(false);

  if (units.length === 0) {
    return <span className="text-slate-500">No units</span>;
  }

  if (units.length === 1) {
    const unit = units[0];
    return (
      <div className="flex items-center gap-2">
        <UnitAvailabilityToggle
          unitId={unit.id}
          unitName={unit.name}
          isAvailable={unit.isAvailable}
          hasActiveLease={unit.hasActiveLease}
          tenantName={unit.tenantName}
          leaseId={unit.leaseId}
        />
      </div>
    );
  }

  // Multiple units - show expandable list
  const availableCount = units.filter(u => u.isAvailable).length;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
      >
        <span className={availableCount === units.length ? 'text-emerald-400' : 'text-amber-400'}>
          {availableCount}/{units.length} available
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 pl-2 border-l border-white/10">
          {units.map((unit) => (
            <div key={unit.id} className="flex items-center justify-between gap-3 py-1">
              <div className="flex items-center gap-2 min-w-0">
                <Home className="w-3 h-3 text-slate-500 flex-shrink-0" />
                <span className="text-xs text-slate-400 truncate">
                  {unit.name} • {formatCurrency(Number(unit.rentAmount))}
                </span>
              </div>
              <UnitAvailabilityToggle
                unitId={unit.id}
                unitName={unit.name}
                isAvailable={unit.isAvailable}
                hasActiveLease={unit.hasActiveLease}
                tenantName={unit.tenantName}
                leaseId={unit.leaseId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
