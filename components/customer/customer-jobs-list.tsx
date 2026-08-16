'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Calendar, DollarSign, Eye, MessageSquare, Star } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

type Job = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  estimatedCost: any;
  actualCost: any;
  estimatedStartDate: Date | null;
  estimatedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  createdAt: Date;
  contractor: {
    id: string;
    businessName: string | null;
    displayName: string | null;
    avgRating: any;
    phone: string | null;
    email: string | null;
  };
};

export function CustomerJobsList({ jobs }: { jobs: Job[] }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'active') {
      return ['approved', 'scheduled', 'in_progress'].includes(job.status);
    }
    if (filter === 'completed') {
      return job.status === 'completed';
    }
    if (filter === 'cancelled') {
      return job.status === 'cancelled';
    }
    return true;
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    scheduled: 'bg-violet-100 text-violet-700',
    in_progress: 'bg-cyan-100 text-cyan-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    on_hold: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'active'
              ? 'bg-cyan-100 text-cyan-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Active (
          {jobs.filter((j) => ['approved', 'scheduled', 'in_progress'].includes(j.status)).length}
          )
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'completed'
              ? 'bg-emerald-100 text-emerald-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Completed ({jobs.filter((j) => j.status === 'completed').length})
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'cancelled'
              ? 'bg-red-100 text-red-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Cancelled ({jobs.filter((j) => j.status === 'cancelled').length})
        </button>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 mb-4">No jobs found</p>
          <Link href="/contractor-marketplace">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
              Find Contractors
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-lg border-2 border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 truncate">
                      {job.title}
                    </h4>
                    <Badge className={statusColors[job.status]}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {job.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {job.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>
                        {job.contractor.businessName || job.contractor.displayName}
                      </span>
                    </div>
                    {job.contractor.avgRating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span>{Number(job.contractor.avgRating).toFixed(1)}</span>
                      </div>
                    )}
                    {job.actualStartDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Started {new Date(job.actualStartDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {job.actualCost ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Final Cost</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(Number(job.actualCost))}
                      </p>
                    </div>
                  ) : job.estimatedCost ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Estimated</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(Number(job.estimatedCost))}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t-2 border-gray-100">
                <Link href={`/customer/jobs/${job.id}`} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-2 border-gray-200"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </Link>
                <Link href={`/customer/messages?contractor=${job.contractor.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </Link>
                {job.status === 'completed' && (
                  <Link href={`/customer/reviews/new?job=${job.id}`}>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
