'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  Building2,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  Download,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { getLaborCostsByProperty } from '@/lib/actions/team-operations.actions';

interface PropertyLaborCost {
  propertyId: string;
  name: string;
  totalHours: number;
  totalCost: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

type PresetRange = 'last7' | 'last30' | 'thisMonth' | 'lastMonth';

export default function ReportsTab() {
  const [laborCosts, setLaborCosts] = useState<PropertyLaborCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [presetRange, setPresetRange] = useState<PresetRange>('last30');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    loadData();
  }, [dateRange]);

  function handlePresetChange(preset: PresetRange) {
    setPresetRange(preset);
    const now = new Date();

    switch (preset) {
      case 'last7':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case 'last30':
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
    }
  }

  async function loadData() {
    setIsLoading(true);
    try {
      const result = await getLaborCostsByProperty({ start: dateRange.from, end: dateRange.to });
      if (result.success && result.report) {
        setLaborCosts(result.report.byProperty);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  }


  const totalHours = laborCosts.reduce((sum, p) => sum + p.totalHours, 0);
  const totalCost = laborCosts.reduce((sum, p) => sum + p.totalCost, 0);
  const avgHourlyRate = totalHours > 0 ? totalCost / totalHours : 0;

  function exportToCSV() {
    const headers = ['Property', 'Total Hours', 'Total Cost'];
    const rows = laborCosts.map(p => [
      p.name,
      p.totalHours.toFixed(2),
      p.totalCost.toFixed(2),
    ]);
    rows.push(['TOTAL', totalHours.toFixed(2), totalCost.toFixed(2)]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labor-costs-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={presetRange} onValueChange={(v) => handlePresetChange(v as PresetRange)}>
          <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last7">Last 7 Days</SelectItem>
            <SelectItem value="last30">Last 30 Days</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
            <SelectItem value="lastMonth">Last Month</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-slate-400">
          {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
        </div>

        <Button onClick={exportToCSV} variant="outline" className="ml-auto bg-white/5 border-white/10 hover:bg-white/10">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-black">Total Labor Cost</div>
            <DollarSign className="h-4 w-4 text-white/90" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">${totalCost.toFixed(2)}</div>
          <div className="text-xs text-white/80">
            {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-black">Total Hours</div>
            <Clock className="h-4 w-4 text-white/90" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{totalHours.toFixed(1)}h</div>
          <div className="text-xs text-white/80">Across all properties</div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-black">Avg Hourly Rate</div>
            <TrendingUp className="h-4 w-4 text-white/90" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">${avgHourlyRate.toFixed(2)}</div>
          <div className="text-xs text-white/80">Per hour worked</div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-black">Properties</div>
            <Building2 className="h-4 w-4 text-white/90" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{laborCosts.length}</div>
          <div className="text-xs text-white/80">With labor activity</div>
        </div>
      </div>


      {/* Labor Costs by Property */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Labor Costs by Property
        </h3>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white/5 rounded-xl h-20" />
            ))}
          </div>
        ) : laborCosts.length === 0 ? (
          <div className="rounded-xl bg-slate-900/60 border border-white/10 p-8 text-center">
            <BarChart3 className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No labor data for this period</p>
            <p className="text-xs text-slate-500 mt-1">Time entries will appear here once tracked</p>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xs text-slate-400 uppercase">Property</th>
                  <th className="text-right p-4 text-xs text-slate-400 uppercase">Hours</th>
                  <th className="text-right p-4 text-xs text-slate-400 uppercase">Cost</th>
                  <th className="text-right p-4 text-xs text-slate-400 uppercase">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {laborCosts.map(property => {
                  const percentage = totalCost > 0 ? (property.totalCost / totalCost) * 100 : 0;
                  return (
                    <tr key={property.propertyId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-400" />
                          </div>
                          <span className="text-white font-medium">{property.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-slate-300 font-mono">
                        {property.totalHours.toFixed(1)}h
                      </td>
                      <td className="p-4 text-right text-white font-mono font-semibold">
                        ${property.totalCost.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-12 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-white/5">
                  <td className="p-4 text-white font-semibold">Total</td>
                  <td className="p-4 text-right text-white font-mono font-semibold">
                    {totalHours.toFixed(1)}h
                  </td>
                  <td className="p-4 text-right text-white font-mono font-bold text-lg">
                    ${totalCost.toFixed(2)}
                  </td>
                  <td className="p-4 text-right text-slate-400">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Coming Soon Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-900/60 border border-white/10 border-dashed p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-white font-medium">Attendance Report</h4>
              <p className="text-xs text-slate-400">Coming Soon</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Track attendance patterns, late arrivals, and no-shows across your team.
          </p>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-white/10 border-dashed p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-white font-medium">Performance Metrics</h4>
              <p className="text-xs text-slate-400">Coming Soon</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Analyze team productivity, task completion rates, and efficiency metrics.
          </p>
        </div>
      </div>
    </div>
  );
}
