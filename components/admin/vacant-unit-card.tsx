'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, ChevronRight, History, Users, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface VacantUnitCardProps {
  unit: {
    id: string;
    name: string;
    type?: string;
    bedrooms?: number;
    bathrooms?: number;
    rentAmount?: number;
    sizeSqFt?: number;
    isAvailable: boolean;
  };
  propertyId: string;
  onViewPastTenants?: () => void;
}

export function VacantUnitCard({ unit, propertyId, onViewPastTenants }: VacantUnitCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-dashed border-gray-300">
            <Home className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-semibold text-gray-900">Unit {unit.name}</p>
            <p className="text-xs text-gray-600">
              {unit.type || 'Unit'} • {formatCurrency(Number(unit.rentAmount || 0))}/mo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] sm:text-xs">
            Vacant
          </Badge>
          <ChevronRight
            className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Unit Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {unit.bedrooms !== undefined && (
              <div className="text-center p-2 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-lg font-bold text-gray-900">{unit.bedrooms}</p>
                <p className="text-[10px] text-gray-600">Bedrooms</p>
              </div>
            )}
            {unit.bathrooms !== undefined && (
              <div className="text-center p-2 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-lg font-bold text-gray-900">{unit.bathrooms}</p>
                <p className="text-[10px] text-gray-600">Bathrooms</p>
              </div>
            )}
            {unit.sizeSqFt && (
              <div className="text-center p-2 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-lg font-bold text-gray-900">{unit.sizeSqFt.toLocaleString()}</p>
                <p className="text-[10px] text-gray-600">Sq Ft</p>
              </div>
            )}
            <div className="text-center p-2 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-lg font-bold text-emerald-600">
                {formatCurrency(Number(unit.rentAmount || 0))}
              </p>
              <p className="text-[10px] text-gray-600">Rent/mo</p>
            </div>
          </div>

          {/* Status Message */}
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50 p-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-emerald-700">Ready for new tenant</p>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              This unit is available and can be listed for rent.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/dashboard/properties/${propertyId}/units/${unit.id}`}>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 text-white hover:opacity-90 text-xs sm:text-sm"
              >
                <Home className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Edit Unit</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            </Link>
            {onViewPastTenants && (
              <Button
                size="sm"
                variant="outline"
                onClick={onViewPastTenants}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
              >
                <History className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Past Tenants</span>
                <span className="sm:hidden">History</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
