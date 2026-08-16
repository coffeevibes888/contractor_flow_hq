'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  DollarSign,
  Calendar,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Eye,
  Filter,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { QuoteDetailModal } from '@/components/homeowner/quote-detail-modal';

interface QuotesClientProps {
  quotes: any[];
}

export default function QuotesClient({ quotes }: QuotesClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedQuote, setSelectedQuote] = useState<any>(null);

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.contractor.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.lead.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' || quote.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: quotes.filter((q) => q.status === 'pending').length,
    viewed: quotes.filter((q) => q.status === 'viewed').length,
    accepted: quotes.filter((q) => q.status === 'accepted').length,
    total: quotes.length,
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      viewed: 'bg-blue-100 text-blue-700 border-blue-200',
      accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
      expired: 'bg-slate-100 text-slate-700 border-slate-200',
      counterOffered: 'bg-violet-100 text-violet-700 border-violet-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'viewed':
        return <Eye className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const isExpiringSoon = (validUntil: Date) => {
    const now = new Date();
    const expiryDate = new Date(validUntil);
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry > 0 && hoursUntilExpiry < 48;
  };

  const isExpired = (validUntil: Date) => {
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <FileText className="h-8 w-8" />
            My Quotes
          </h1>
          <p className="text-white/70 mt-1">Review and manage quotes from contractors</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <FileText className="h-5 w-5 text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-white/70">Total Quotes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-sm text-white/70">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Eye className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.viewed}</p>
                <p className="text-sm text-white/70">Viewed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.accepted}</p>
                <p className="text-sm text-white/70">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quotes..."
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('all')}
                className={selectedStatus === 'all' ? '' : 'border-white/20 text-white hover:bg-white/10'}
              >
                All
              </Button>
              <Button
                variant={selectedStatus === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('pending')}
                className={selectedStatus === 'pending' ? '' : 'border-white/20 text-white hover:bg-white/10'}
              >
                Pending
              </Button>
              <Button
                variant={selectedStatus === 'accepted' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('accepted')}
                className={selectedStatus === 'accepted' ? '' : 'border-white/20 text-white hover:bg-white/10'}
              >
                Accepted
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      <div className="space-y-4">
        {filteredQuotes.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="py-16">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto text-white/30 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No quotes found</h3>
                <p className="text-white/70">
                  {searchQuery || selectedStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Quotes from contractors will appear here'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredQuotes.map((quote) => {
            const expired = isExpired(quote.validUntil);
            const expiringSoon = isExpiringSoon(quote.validUntil);

            return (
              <Card
                key={quote.id}
                className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
                onClick={() => setSelectedQuote(quote)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Quote Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="font-bold text-xl text-white">{quote.title}</h3>
                            <Badge className={`${getStatusColor(quote.status)} border flex items-center gap-1`}>
                              {getStatusIcon(quote.status)}
                              {quote.status}
                            </Badge>
                            {expiringSoon && !expired && (
                              <Badge className="bg-orange-500 text-white border-0">
                                <Clock className="h-3 w-3 mr-1" />
                                Expiring Soon
                              </Badge>
                            )}
                            {expired && (
                              <Badge className="bg-red-500 text-white border-0">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Expired
                              </Badge>
                            )}
                          </div>
                          <p className="text-white/80 text-sm mb-2">
                            From: {quote.contractor.businessName || quote.contractor.user.name}
                          </p>
                        </div>
                      </div>

                      {quote.description && (
                        <p className="text-white/90 leading-relaxed">{quote.description}</p>
                      )}

                      <div className="grid md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-white/80">
                          <DollarSign className="h-4 w-4 text-emerald-400" />
                          <span className="font-semibold">{formatCurrency(Number(quote.totalPrice))}</span>
                        </div>
                        {quote.estimatedHours && (
                          <div className="flex items-center gap-2 text-white/80">
                            <Clock className="h-4 w-4 text-blue-400" />
                            <span>{quote.estimatedHours} hours</span>
                          </div>
                        )}
                        {quote.completionDate && (
                          <div className="flex items-center gap-2 text-white/80">
                            <Calendar className="h-4 w-4 text-violet-400" />
                            <span>{new Date(quote.completionDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {quote.deliverables && quote.deliverables.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <Sparkles className="h-4 w-4 text-amber-400" />
                          <span>{quote.deliverables.length} deliverables included</span>
                        </div>
                      )}

                      {quote._count.messages > 0 && (
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <MessageSquare className="h-4 w-4 text-blue-400" />
                          <span>{quote._count.messages} messages</span>
                        </div>
                      )}
                    </div>

                    {/* Price Card */}
                    <div className="lg:w-64">
                      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white">
                        <CardContent className="p-6 text-center">
                          <p className="text-sm text-white/80 mb-2">Total Quote</p>
                          <p className="text-4xl font-bold mb-4">
                            {formatCurrency(Number(quote.totalPrice))}
                          </p>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedQuote(quote);
                            }}
                            className="w-full bg-white text-emerald-600 hover:bg-white/90"
                          >
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <QuoteDetailModal
          quote={selectedQuote}
          open={!!selectedQuote}
          onOpenChange={(open: boolean) => {
            if (!open) setSelectedQuote(null);
          }}
          onQuoteUpdated={() => {
            setSelectedQuote(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
