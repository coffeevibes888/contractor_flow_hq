'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Download, 
  Users,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
  Receipt,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface Payment {
  id: string;
  amount: string;
  platformFee: string;
  netAmount: string;
  status: string;
  paidAt: string | null;
  contractor: { name: string; email: string };
  workOrder: { title: string };
  createdAt: string;
}

interface SpendingReport {
  contractor: { id: string; name: string; email: string } | undefined;
  totalSpent: string;
  paymentCount: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  processing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  failed: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  processing: <Loader2 className="h-3 w-3 animate-spin" />,
  completed: <CheckCircle className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
};

export default function ContractorPaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [spendingReport, setSpendingReport] = useState<SpendingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractorFilter, setContractorFilter] = useState<string>('all');
  const [contractors, setContractors] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams();
      if (contractorFilter !== 'all') params.set('contractorId', contractorFilter);
      const res = await fetch(`/api/contractor-payments?${params}`);
      const data = await res.json();
      if (data.payments) setPayments(data.payments);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load payments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSpendingReport = async () => {
    try {
      const res = await fetch('/api/contractors/reports/spending');
      const data = await res.json();
      if (data.report) setSpendingReport(data.report);
    } catch (error) {
      console.error('Failed to fetch spending report:', error);
    }
  };

  const fetchContractors = async () => {
    try {
      const res = await fetch('/api/contractors');
      const data = await res.json();
      if (data.contractors) {
        setContractors(data.contractors.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (error) {
      console.error('Failed to fetch contractors:', error);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchSpendingReport();
    fetchContractors();
  }, [contractorFilter]);

  const totalSpent = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const totalFees = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.platformFee), 0);

  const pendingPayments = payments.filter((p) => p.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-white/10 bg-gradient-to-br from-emerald-600/20 to-emerald-900/20">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-300/80">Total Spent</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalSpent)}</p>
                <p className="text-xs text-emerald-300/60 mt-1">
                  {payments.filter((p) => p.status === 'completed').length} payments
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-gradient-to-br from-violet-600/20 to-violet-900/20">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-violet-300/80">Platform Fees</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalFees)}</p>
                <p className="text-xs text-violet-300/60 mt-1">2.5% per payment</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-gradient-to-br from-blue-600/20 to-blue-900/20">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300/80">Contractors Paid</p>
                <p className="text-2xl font-bold text-white mt-1">{spendingReport.length}</p>
                <p className="text-xs text-blue-300/60 mt-1">unique contractors</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-gradient-to-br from-amber-600/20 to-amber-900/20">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-300/80">Pending</p>
                <p className="text-2xl font-bold text-white mt-1">{pendingPayments}</p>
                <p className="text-xs text-amber-300/60 mt-1">awaiting processing</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending by Contractor */}
      {spendingReport.length > 0 && (
        <Card className="border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80">
          <CardContent className="p-4 md:p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-violet-400" />
              Spending by Contractor
            </h3>
            <div className="space-y-3">
              {spendingReport.map((item, index) => (
                <div
                  key={item.contractor?.id || index}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                      {(item.contractor?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{item.contractor?.name || 'Unknown'}</p>
                      <p className="text-sm text-slate-400">
                        {item.paymentCount} payment{item.paymentCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-400">{formatCurrency(parseFloat(item.totalSpent))}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Payment History */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Receipt className="h-5 w-5 text-violet-400" />
            Payment History
          </h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={contractorFilter} onValueChange={setContractorFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Filter by contractor" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="all">All Contractors</SelectItem>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {payments.length === 0 ? (
          <Card className="border-white/10 bg-gradient-to-r from-indigo-700 to-indigo-900">
            <CardContent className="py-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No payments yet</h3>
              <p className="text-slate-300 text-sm">
                Payments will appear here after you pay contractors for completed work
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {payments.map((payment) => (
              <Card key={payment.id} className="border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 hover:border-violet-500/30 transition-all">
                <CardContent className="p-4 md:p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                        {payment.contractor.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{payment.contractor.name}</h3>
                        <p className="text-sm text-slate-400 truncate max-w-[150px]">{payment.workOrder.title}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs flex items-center gap-1 ${statusColors[payment.status]}`}>
                      {statusIcons[payment.status]}
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </Badge>
                  </div>

                  {/* Amount */}
                  <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Amount</span>
                      <span className="font-bold text-white text-lg">{formatCurrency(parseFloat(payment.amount))}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Platform Fee</span>
                      <span className="text-slate-400">-{formatCurrency(parseFloat(payment.platformFee))}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-slate-700">
                      <span className="text-slate-500">Net to Contractor</span>
                      <span className="text-emerald-400">{formatCurrency(parseFloat(payment.netAmount))}</span>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span>{new Date(payment.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}</span>
                    {payment.paidAt && (
                      <span className="text-emerald-400 text-xs ml-auto">
                        Paid {new Date(payment.paidAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
