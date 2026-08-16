'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  MessageSquare,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Quote = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  totalPrice: any;
  validUntil: Date | null;
  createdAt: Date;
  contractor: {
    id: string;
    businessName: string | null;
    displayName: string | null;
    avgRating: any;
  };
};

export function CustomerQuotesList({ quotes }: { quotes: Quote[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [loading, setLoading] = useState<string | null>(null);

  const filteredQuotes = quotes.filter((quote) => {
    if (filter === 'pending') return quote.status === 'pending';
    if (filter === 'accepted') return quote.status === 'accepted';
    if (filter === 'rejected') return quote.status === 'rejected';
    return true;
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-700',
  };

  const handleAccept = async (quoteId: string) => {
    setLoading(quoteId);
    try {
      const response = await fetch(`/api/customer/quotes/${quoteId}/accept`, {
        method: 'POST',
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Error accepting quote:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (quoteId: string) => {
    if (!confirm('Are you sure you want to reject this quote?')) return;

    setLoading(quoteId);
    try {
      const response = await fetch(`/api/customer/quotes/${quoteId}/reject`, {
        method: 'POST',
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Error rejecting quote:', error);
    } finally {
      setLoading(null);
    }
  };

  const isExpired = (quote: Quote) => {
    return quote.validUntil && new Date(quote.validUntil) < new Date();
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
          All Quotes ({quotes.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'pending'
              ? 'bg-amber-100 text-amber-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Pending ({quotes.filter((q) => q.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('accepted')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'accepted'
              ? 'bg-emerald-100 text-emerald-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Accepted ({quotes.filter((q) => q.status === 'accepted').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'rejected'
              ? 'bg-red-100 text-red-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Rejected ({quotes.filter((q) => q.status === 'rejected').length})
        </button>
      </div>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 mb-4">No quotes found</p>
          <Link href="/contractor-marketplace">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
              Find Contractors
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => {
            const expired = isExpired(quote);
            const isPending = quote.status === 'pending' && !expired;

            return (
              <div
                key={quote.id}
                className={`rounded-lg border-2 ${
                  isPending
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-gray-200 bg-white'
                } hover:shadow-md transition-all p-5`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 truncate">
                        {quote.title}
                      </h4>
                      <Badge className={statusColors[expired ? 'expired' : quote.status]}>
                        {expired ? 'expired' : quote.status}
                      </Badge>
                      {isPending && (
                        <Badge className="bg-amber-100 text-amber-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Awaiting Response
                        </Badge>
                      )}
                    </div>
                    {quote.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {quote.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        {quote.contractor.businessName || quote.contractor.displayName}
                      </span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Sent {new Date(quote.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {quote.validUntil && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span className={expired ? 'text-red-600 font-medium' : ''}>
                            Valid until {new Date(quote.validUntil).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500 mb-1">Total Cost</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(Number(quote.totalPrice))}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t-2 border-gray-100">
                  <Link href={`/customer/quotes/${quote.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-2 border-gray-200"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                  {isPending && (
                    <>
                      <Button
                        onClick={() => handleAccept(quote.id)}
                        disabled={loading === quote.id}
                        size="sm"
                        className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {loading === quote.id ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button
                        onClick={() => handleReject(quote.id)}
                        disabled={loading === quote.id}
                        variant="outline"
                        size="sm"
                        className="border-2 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                  <Link href={`/customer/messages?contractor=${quote.contractor.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-gray-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
