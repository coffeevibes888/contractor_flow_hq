'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBidWebSocket } from '@/hooks/use-bid-websocket';
import {
  Trophy,
  Star,
  Calendar,
  Clock,
  MessageSquare,
  CheckCircle,
  XCircle,
  Eye,
  TrendingDown,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

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
    totalReviews: number;
    completedJobs: number;
    responseRate: number;
  };
};

export function JobBiddingList({
  jobId,
  bids: initialBids,
  jobBudget,
}: {
  jobId: string;
  bids: Bid[];
  jobBudget?: number;
}) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'date'>('price');
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);
  const [rejectingBid, setRejectingBid] = useState<string | null>(null);
  const [bids, setBids] = useState<Bid[]>(initialBids);

  // Real-time WebSocket updates
  const {
    isConnected,
    subscribeToJob,
    unsubscribeFromJob,
    broadcastBidAccepted,
    broadcastBidRejected,
  } = useBidWebSocket({
    onNewBid: (newBid) => {
      // Add new bid to the list
      setBids((prevBids) => [...prevBids, newBid as any]);
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Bid Received!', {
          body: `${newBid.contractor.businessName || newBid.contractor.displayName} bid $${newBid.bidAmount.toLocaleString()}`,
          icon: '/icon.png',
        });
      }
    },
    onBidWithdrawn: (bidId) => {
      // Update bid status
      setBids((prevBids) =>
        prevBids.map((bid) =>
          bid.id === bidId ? { ...bid, status: 'withdrawn' } : bid
        )
      );
    },
  });

  // Subscribe to job updates on mount
  useEffect(() => {
    subscribeToJob(jobId);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      unsubscribeFromJob(jobId);
    };
  }, [jobId, subscribeToJob, unsubscribeFromJob]);

  // Filter active bids
  const activeBids = bids.filter((bid) => bid.status === 'active');

  // Sort bids
  const sortedBids = [...activeBids].sort((a, b) => {
    if (sortBy === 'price') {
      return Number(a.bidAmount) - Number(b.bidAmount);
    }
    if (sortBy === 'rating') {
      return Number(b.contractor.avgRating) - Number(a.contractor.avgRating);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const lowestBid = sortedBids[0];
  const otherBids = sortedBids.slice(1);

  // Calculate savings
  const calculateSavings = (bidAmount: number) => {
    if (!jobBudget) return null;
    const savings = jobBudget - bidAmount;
    const percentage = (savings / jobBudget) * 100;
    return { amount: savings, percentage };
  };

  const handleAcceptBid = async (bidId: string) => {
    if (!confirm('Are you sure you want to accept this bid? This will create a job with this contractor.')) {
      return;
    }

    setAcceptingBid(bidId);
    try {
      const response = await fetch(`/api/customer/bids/${bidId}/accept`, {
        method: 'POST',
      });

      if (response.ok) {
        // Broadcast via WebSocket
        broadcastBidAccepted(bidId, jobId);
        router.refresh();
        router.push(`/customer/jobs`);
      } else {
        alert('Failed to accept bid. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting bid:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setAcceptingBid(null);
    }
  };

  const handleRejectBid = async (bidId: string) => {
    if (!confirm('Are you sure you want to reject this bid?')) {
      return;
    }

    setRejectingBid(bidId);
    try {
      const response = await fetch(`/api/customer/bids/${bidId}/reject`, {
        method: 'POST',
      });

      if (response.ok) {
        // Broadcast via WebSocket
        broadcastBidRejected(bidId, jobId);
        // Update local state
        setBids((prevBids) =>
          prevBids.map((bid) =>
            bid.id === bidId ? { ...bid, status: 'rejected' } : bid
          )
        );
      } else {
        alert('Failed to reject bid. Please try again.');
      }
    } catch (error) {
      console.error('Error rejecting bid:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setRejectingBid(null);
    }
  };

  if (activeBids.length === 0) {
    return (
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-12">
        <div className="text-center">
          <Trophy className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Bids Yet
          </h3>
          <p className="text-gray-600 mb-4">
            Contractors will start bidding on your job soon. You'll be notified when bids come in.
          </p>
          <p className="text-sm text-gray-500">
            Average response time: 2-4 hours
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Sort */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {activeBids.length} Bid{activeBids.length !== 1 ? 's' : ''} Received
            </h3>
            {isConnected && (
              <Badge className="bg-emerald-100 text-emerald-700">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                Live
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Compare bids and select the best contractor for your job
            {isConnected && ' • Real-time updates enabled'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('price')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'price'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <TrendingDown className="h-4 w-4 inline mr-1" />
            Lowest Price
          </button>
          <button
            onClick={() => setSortBy('rating')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'rating'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Star className="h-4 w-4 inline mr-1" />
            Top Rated
          </button>
          <button
            onClick={() => setSortBy('date')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'date'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-1" />
            Most Recent
          </button>
        </div>
      </div>

      {/* Lowest Bid Highlight */}
      {lowestBid && (
        <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-full bg-emerald-100">
              <Trophy className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-sm font-bold text-emerald-700 uppercase tracking-wide">
                Lowest Bid
              </span>
              {jobBudget && Number(lowestBid.bidAmount) < jobBudget && (
                <span className="ml-2 text-xs text-emerald-600">
                  Save {formatCurrency(jobBudget - Number(lowestBid.bidAmount))} (
                  {calculateSavings(Number(lowestBid.bidAmount))?.percentage.toFixed(0)}% off)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start justify-between gap-6 mb-4">
            <div className="flex-1">
              <Link
                href={`/contractors/${lowestBid.contractor.id}`}
                className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {lowestBid.contractor.businessName || lowestBid.contractor.displayName}
              </Link>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="font-medium">
                    {Number(lowestBid.contractor.avgRating).toFixed(1)}
                  </span>
                  <span className="text-gray-500">
                    ({lowestBid.contractor.totalReviews} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-blue-600" />
                  <span>{lowestBid.contractor.completedJobs} jobs completed</span>
                </div>
                {lowestBid.deliveryDays && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{lowestBid.deliveryDays} days</span>
                  </div>
                )}
              </div>
              {lowestBid.bidMessage && (
                <p className="text-sm text-gray-700 mt-3 line-clamp-2">
                  {lowestBid.bidMessage}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-4xl font-bold text-emerald-600">
                {formatCurrency(Number(lowestBid.bidAmount))}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Bid {formatDistanceToNow(new Date(lowestBid.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t-2 border-emerald-200">
            <Button
              onClick={() => handleAcceptBid(lowestBid.id)}
              disabled={acceptingBid === lowestBid.id}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {acceptingBid === lowestBid.id ? 'Accepting...' : 'Accept Bid'}
            </Button>
            <Link href={`/contractors/${lowestBid.contractor.id}`} className="flex-1">
              <Button variant="outline" className="w-full border-2 border-emerald-200">
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </Link>
            <Link href={`/customer/messages?contractor=${lowestBid.contractor.id}`}>
              <Button variant="outline" className="border-2 border-emerald-200">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Other Bids */}
      {otherBids.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-900">
            Other Bids ({otherBids.length})
          </h4>
          {otherBids.map((bid) => {
            const savings = jobBudget ? calculateSavings(Number(bid.bidAmount)) : null;

            return (
              <div
                key={bid.id}
                className="rounded-lg border-2 border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all p-5"
              >
                <div className="flex items-start justify-between gap-6 mb-4">
                  <div className="flex-1">
                    <Link
                      href={`/contractors/${bid.contractor.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {bid.contractor.businessName || bid.contractor.displayName}
                    </Link>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span className="font-medium">
                          {Number(bid.contractor.avgRating).toFixed(1)}
                        </span>
                        <span className="text-gray-500">
                          ({bid.contractor.totalReviews})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4 text-blue-600" />
                        <span>{bid.contractor.completedJobs} jobs</span>
                      </div>
                      {bid.deliveryDays && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{bid.deliveryDays} days</span>
                        </div>
                      )}
                    </div>
                    {bid.bidMessage && (
                      <p className="text-sm text-gray-700 mt-3 line-clamp-2">
                        {bid.bidMessage}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(Number(bid.bidAmount))}
                    </p>
                    {savings && savings.amount > 0 && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">
                        Save {formatCurrency(savings.amount)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t-2 border-gray-100">
                  <Button
                    onClick={() => handleAcceptBid(bid.id)}
                    disabled={acceptingBid === bid.id}
                    size="sm"
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {acceptingBid === bid.id ? 'Accepting...' : 'Accept'}
                  </Button>
                  <Button
                    onClick={() => handleRejectBid(bid.id)}
                    disabled={rejectingBid === bid.id}
                    variant="outline"
                    size="sm"
                    className="border-2 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {rejectingBid === bid.id ? 'Rejecting...' : 'Reject'}
                  </Button>
                  <Link href={`/contractors/${bid.contractor.id}`}>
                    <Button variant="outline" size="sm" className="border-2 border-gray-200">
                      <Eye className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  <Link href={`/customer/messages?contractor=${bid.contractor.id}`}>
                    <Button variant="outline" size="sm" className="border-2 border-gray-200">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
