'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  DollarSign,
  Calendar,
  Users,
  Clock,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type Job = {
  id: string;
  title: string;
  description: string;
  status: string;
  budgetMin: any;
  budgetMax: any;
  priority: string;
  postingType: string;
  bidDeadline: Date | null;
  createdAt: Date;
  landlord: {
    companyName: string | null;
    logoUrl: string | null;
  };
  _count: {
    contractorBids: number;
  };
};

type MyBid = {
  id: string;
  jobId: string;
  bidAmount: any;
  status: string;
  job: {
    id: string;
    title: string;
    status: string;
  };
};

export function JobMarketplace({
  jobs,
  contractorId,
  myBids,
  filters,
}: {
  jobs: Job[];
  contractorId: string;
  myBids: MyBid[];
  filters?: { category?: string; budget?: string; location?: string };
}) {
  const [categoryFilter, setCategoryFilter] = useState(filters?.category || 'all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'bid' | 'estimate'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'budget' | 'bids'>('recent');

  // Get job IDs where contractor has already bid
  const bidJobIds = new Set(myBids.map((bid) => bid.jobId));

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    if (typeFilter !== 'all' && job.postingType !== typeFilter) return false;
    return true;
  });

  // Sort jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'budget') {
      return Number(b.budgetMax) - Number(a.budgetMax);
    }
    if (sortBy === 'bids') {
      return a._count.contractorBids - b._count.contractorBids; // Fewer bids = less competition
    }
    return 0;
  });

  // Get unique categories - removed since WorkOrder doesn't have category
  const _categories = ['all'];

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Type Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {(['all', 'bid', 'estimate'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  typeFilter === type
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {type === 'all' ? 'All Jobs' : type === 'bid' ? 'Bids' : 'Estimates'}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('recent')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'recent'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Clock className="h-4 w-4 inline mr-1" />
              Recent
            </button>
            <button
              onClick={() => setSortBy('budget')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'budget'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <DollarSign className="h-4 w-4 inline mr-1" />
              Budget
            </button>
            <button
              onClick={() => setSortBy('bids')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'bids'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <TrendingDown className="h-4 w-4 inline mr-1" />
              Low Competition
            </button>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      {sortedJobs.length === 0 ? (
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-12">
          <div className="text-center">
            <Briefcase className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Jobs Found</h3>
            <p className="text-gray-600">
              Try adjusting your filters or check back later for new opportunities.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedJobs.map((job) => {
            const hasBid = bidJobIds.has(job.id);
            const myBid = myBids.find((bid) => bid.jobId === job.id);
            const isExpiringSoon =
              job.bidDeadline &&
              new Date(job.bidDeadline).getTime() - Date.now() < 24 * 60 * 60 * 1000;

            return (
              <div
                key={job.id}
                className={`rounded-lg border-2 ${
                  hasBid
                    ? 'border-emerald-200 bg-emerald-50'
                    : isExpiringSoon
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-gray-200 bg-white'
                } hover:shadow-md transition-all p-5`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="text-lg font-semibold text-gray-900">{job.title}</h4>
                      {job.postingType === 'estimate' && (
                        <Badge className="bg-violet-100 text-violet-700">
                          Estimate Request
                        </Badge>
                      )}
                      <Badge className={priorityColors[job.priority]}>
                        {job.priority}
                      </Badge>
                      {hasBid && (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          ✓ {job.postingType === 'estimate' ? 'Estimate Sent' : 'Bid Submitted'}
                        </Badge>
                      )}
                      {isExpiringSoon && !hasBid && (
                        <Badge className="bg-amber-100 text-amber-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Expiring Soon
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {job.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span>{job.priority} priority</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>
                          {job._count.contractorBids} bid{job._count.contractorBids !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {job.bidDeadline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Deadline:{' '}
                            {formatDistanceToNow(new Date(job.bidDeadline), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {job.landlord.companyName && (
                      <p className="text-xs text-gray-500 mt-2">
                        Posted by {job.landlord.companyName}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500 mb-1">Budget Range</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(Number(job.budgetMin))} -{' '}
                      {formatCurrency(Number(job.budgetMax))}
                    </p>
                    {hasBid && myBid && (
                      <p className="text-sm text-emerald-600 font-medium mt-1">
                        Your bid: {formatCurrency(Number(myBid.bidAmount))}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t-2 border-gray-100">
                  <Link
                    href={`/contractor-dashboard/marketplace/${job.id}`}
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-2 border-gray-200"
                    >
                      View Details
                    </Button>
                  </Link>
                  {hasBid ? (
                    <Button
                      size="sm"
                      disabled
                      className="bg-emerald-500 text-white cursor-not-allowed"
                    >
                      {job.postingType === 'estimate' ? 'Estimate Sent' : 'Bid Submitted'}
                    </Button>
                  ) : (
                    <Link href={`/contractor-dashboard/marketplace/${job.id}/bid`}>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                      >
                        {job.postingType === 'estimate' ? 'Send Estimate' : 'Submit Bid'}
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Warning for expiring jobs */}
                {isExpiringSoon && !hasBid && (
                  <div className="mt-4 rounded-lg bg-amber-100 border border-amber-300 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        This job's bidding deadline is approaching. Submit your bid soon!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
