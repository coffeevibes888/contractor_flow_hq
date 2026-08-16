'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Star,
  Calendar,
  DollarSign,
  Award,
  CheckCircle,
  XCircle,
  TrendingDown,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Bid = {
  id: string;
  bidAmount: any;
  bidMessage: string | null;
  deliveryDays: number | null;
  status: string;
  createdAt: Date;
  contractor: {
    id: string;
    businessName: string | null;
    displayName: string | null;
    avgRating: any;
    reviewCount: number;
    completedJobs: number;
    responseTime: string | null;
  };
};

export function BidComparison({
  bids,
  jobBudget,
  onAccept,
  onReject,
}: {
  bids: Bid[];
  jobBudget?: number;
  onAccept?: (bidId: string) => void;
  onReject?: (bidId: string) => void;
}) {
  const router = useRouter();
  const [selectedBids, setSelectedBids] = useState<string[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  // Filter active bids and sort by amount
  const activeBids = bids
    .filter((bid) => bid.status === 'active')
    .sort((a, b) => Number(a.bidAmount) - Number(b.bidAmount));

  // Toggle bid selection
  const toggleBid = (bidId: string) => {
    if (selectedBids.includes(bidId)) {
      setSelectedBids(selectedBids.filter((id) => id !== bidId));
    } else {
      if (selectedBids.length < 3) {
        setSelectedBids([...selectedBids, bidId]);
      }
    }
  };

  // Get selected bids for comparison
  const comparisonBids =
    selectedBids.length > 0
      ? activeBids.filter((bid) => selectedBids.includes(bid.id))
      : activeBids.slice(0, 3);

  // Calculate metrics
  const getMetrics = (bid: Bid) => {
    const savings = jobBudget ? jobBudget - Number(bid.bidAmount) : 0;
    const savingsPercent = jobBudget ? (savings / jobBudget) * 100 : 0;
    const priceRank =
      activeBids.findIndex((b) => b.id === bid.id) + 1;
    const ratingRank =
      [...activeBids]
        .sort((a, b) => Number(b.contractor.avgRating) - Number(a.contractor.avgRating))
        .findIndex((b) => b.id === bid.id) + 1;

    return { savings, savingsPercent, priceRank, ratingRank };
  };

  const handleAccept = async (bidId: string) => {
    setProcessing(bidId);
    if (onAccept) {
      await onAccept(bidId);
    }
    setProcessing(null);
  };

  const handleReject = async (bidId: string) => {
    setProcessing(bidId);
    if (onReject) {
      await onReject(bidId);
    }
    setProcessing(null);
  };

  if (activeBids.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No active bids to compare</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection Instructions */}
      {activeBids.length > 3 && (
        <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-4">
          <p className="text-sm text-blue-700">
            💡 Select up to 3 bids to compare side-by-side. Click on any bid card to
            select it.
          </p>
          {selectedBids.length > 0 && (
            <p className="text-xs text-blue-600 mt-2">
              {selectedBids.length} of 3 bids selected
            </p>
          )}
        </div>
      )}

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {comparisonBids.map((bid, index) => {
          const metrics = getMetrics(bid);
          const isLowest = index === 0;
          const isSelected = selectedBids.includes(bid.id);

          return (
            <div
              key={bid.id}
              onClick={() => activeBids.length > 3 && toggleBid(bid.id)}
              className={`rounded-xl border-2 ${
                isLowest
                  ? 'border-emerald-200 bg-emerald-50'
                  : isSelected
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-white'
              } shadow-sm p-5 ${
                activeBids.length > 3 ? 'cursor-pointer hover:shadow-md' : ''
              } transition-all`}
            >
              {/* Header */}
              <div className="mb-4">
                {isLowest && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 rounded-full bg-emerald-100">
                      <TrendingDown className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-emerald-700 uppercase">
                      Lowest Bid
                    </span>
                  </div>
                )}
                <h4 className="text-lg font-bold text-gray-900 truncate">
                  {bid.contractor.businessName || bid.contractor.displayName}
                </h4>
              </div>

              {/* Price */}
              <div className="mb-4 pb-4 border-b-2 border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Bid Amount</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(Number(bid.bidAmount))}
                </p>
                {metrics.savings > 0 && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    Save {formatCurrency(metrics.savings)} (
                    {metrics.savingsPercent.toFixed(0)}% off)
                  </p>
                )}
              </div>

              {/* Metrics */}
              <div className="space-y-3 mb-4">
                {/* Rating */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium">
                      {Number(bid.contractor.avgRating).toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {bid.contractor.reviewCount} reviews
                  </span>
                </div>

                {/* Completed Jobs */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Jobs</span>
                  </div>
                  <span className="text-sm font-medium">
                    {bid.contractor.completedJobs}
                  </span>
                </div>

                {/* Delivery Time */}
                {bid.deliveryDays && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-violet-600" />
                      <span className="text-sm">Timeline</span>
                    </div>
                    <span className="text-sm font-medium">
                      {bid.deliveryDays} days
                    </span>
                  </div>
                )}

                {/* Response Time */}
                {bid.contractor.responseTime && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Response</span>
                    </div>
                    <span className="text-sm font-medium">
                      {bid.contractor.responseTime}
                    </span>
                  </div>
                )}
              </div>

              {/* Rankings */}
              <div className="flex gap-2 mb-4">
                <Badge
                  className={
                    metrics.priceRank === 1
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-700'
                  }
                >
                  #{metrics.priceRank} Price
                </Badge>
                <Badge
                  className={
                    metrics.ratingRank === 1
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700'
                  }
                >
                  #{metrics.ratingRank} Rating
                </Badge>
              </div>

              {/* Proposal Preview */}
              {bid.bidMessage && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Proposal</p>
                  <p className="text-xs text-gray-700 line-clamp-3">
                    {bid.bidMessage}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t-2 border-gray-100">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccept(bid.id);
                  }}
                  disabled={processing === bid.id}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {processing === bid.id ? 'Accepting...' : 'Accept'}
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReject(bid.id);
                  }}
                  disabled={processing === bid.id}
                  variant="outline"
                  size="sm"
                  className="border-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Detailed Comparison
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                {comparisonBids.map((bid) => (
                  <th
                    key={bid.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {bid.contractor.businessName || bid.contractor.displayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Bid Amount
                </td>
                {comparisonBids.map((bid) => (
                  <td
                    key={bid.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold"
                  >
                    {formatCurrency(Number(bid.bidAmount))}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Rating
                </td>
                {comparisonBids.map((bid) => (
                  <td
                    key={bid.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    ⭐ {Number(bid.contractor.avgRating).toFixed(1)} (
                    {bid.contractor.reviewCount})
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Completed Jobs
                </td>
                {comparisonBids.map((bid) => (
                  <td
                    key={bid.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {bid.contractor.completedJobs}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Delivery Time
                </td>
                {comparisonBids.map((bid) => (
                  <td
                    key={bid.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {bid.deliveryDays ? `${bid.deliveryDays} days` : 'Not specified'}
                  </td>
                ))}
              </tr>
              {jobBudget && (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Savings
                  </td>
                  {comparisonBids.map((bid) => {
                    const metrics = getMetrics(bid);
                    return (
                      <td
                        key={bid.id}
                        className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-medium"
                      >
                        {metrics.savings > 0
                          ? `${formatCurrency(metrics.savings)} (${metrics.savingsPercent.toFixed(0)}%)`
                          : 'Over budget'}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
