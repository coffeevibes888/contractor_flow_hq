'use client';

import { useState } from 'react';
import { 
  DollarSign, FileText, Download, AlertTriangle,
  TrendingUp, Clock, Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { format } from 'date-fns';

interface Payment {
  id: string;
  paymentType: string;
  grossAmount: string;
  platformFee: string;
  netAmount: string;
  regularPay?: string | null;
  overtimePay?: string | null;
  bonusAmount?: string | null;
  description?: string | null;
  status: string;
  paidAt?: string | null;
  period?: {
    start: string;
    end: string;
    totalHours: string;
  } | null;
}

interface EarningsSummaryPageProps {
  companyName: string;
  compensation: {
    payType: string;
    hourlyRate?: string | null;
    salaryAmount?: string | null;
  } | null;
  payments: Payment[];
  ytdGross: number;
  ytdNet: number;
}

export function EarningsSummaryPage({
  companyName,
  compensation,
  payments,
  ytdGross,
}: EarningsSummaryPageProps) {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'bonus':
        return <Gift className="h-5 w-5 text-purple-400" />;
      case 'commission':
        return <TrendingUp className="h-5 w-5 text-emerald-400" />;
      default:
        return <DollarSign className="h-5 w-5 text-blue-400" />;
    }
  };

  const getPaymentBadge = (type: string) => {
    switch (type) {
      case 'bonus':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Bonus</Badge>;
      case 'commission':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Commission</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Payroll</Badge>;
    }
  };

  const lastPayment = payments[0];
  const lastPayAmount = lastPayment ? parseFloat(lastPayment.netAmount) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Earnings Summary</h1>
        <p className="text-slate-400 mt-1">{companyName}</p>
      </div>

      {/* Disclaimer Banner */}
      <Alert className="bg-amber-500/10 border-amber-500/30">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <AlertDescription className="text-amber-200">
          This is not official payroll documentation. These records are for tracking purposes only. 
          Please consult your employer&apos;s payroll provider for official tax documents (W-2, pay stubs, etc.).
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-white/10 bg-gradient-to-br from-emerald-600/20 to-teal-600/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Last Payment</p>
                <p className="text-3xl font-bold text-white mt-1">
                  ${lastPayAmount.toFixed(2)}
                </p>
                {lastPayment?.paidAt && (
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(lastPayment.paidAt), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <DollarSign className="h-8 w-8 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-800/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">YTD Gross</p>
                <p className="text-3xl font-bold text-white mt-1">
                  ${ytdGross.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date().getFullYear()} earnings
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/20">
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-800/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Pay Rate</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {compensation?.payType === 'hourly' 
                    ? `$${compensation.hourlyRate}/hr`
                    : compensation?.salaryAmount 
                      ? `$${parseFloat(compensation.salaryAmount).toLocaleString()}/yr`
                      : 'Not set'
                  }
                </p>
                <p className="text-xs text-slate-400 mt-1 capitalize">
                  {compensation?.payType || 'Unknown'} employee
                </p>
              </div>
              <div className="p-3 rounded-xl bg-violet-500/20">
                <Clock className="h-8 w-8 text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="border-white/10 bg-slate-800/60">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No earnings recorded yet</p>
              <p className="text-sm mt-1">Your earnings history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div 
                  key={payment.id}
                  onClick={() => setSelectedPayment(payment)}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-white/5 cursor-pointer hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-slate-800">
                      {getPaymentIcon(payment.paymentType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {payment.period 
                            ? `${format(new Date(payment.period.start), 'MMM d')} - ${format(new Date(payment.period.end), 'MMM d')}`
                            : payment.description || 'Payment'
                          }
                        </span>
                        {getPaymentBadge(payment.paymentType)}
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {payment.paidAt 
                          ? format(new Date(payment.paidAt), 'MMMM d, yyyy')
                          : 'Pending'
                        }
                        {payment.period && ` • ${parseFloat(payment.period.totalHours).toFixed(1)} hours`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      ${parseFloat(payment.netAmount).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Gross: ${parseFloat(payment.grossAmount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Detail Sheet */}
      <Sheet open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <SheetContent className="bg-slate-900 border-white/10 w-full sm:max-w-md">
          {selectedPayment && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Earnings Details
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Header */}
                <div className="text-center pb-6 border-b border-white/10">
                  <p className="text-sm text-slate-400">{companyName}</p>
                  {selectedPayment.period && (
                    <p className="text-white mt-1">
                      Pay Period: {format(new Date(selectedPayment.period.start), 'MMM d')} - {format(new Date(selectedPayment.period.end), 'MMM d, yyyy')}
                    </p>
                  )}
                  {selectedPayment.paidAt && (
                    <p className="text-sm text-slate-400 mt-1">
                      Paid: {format(new Date(selectedPayment.paidAt), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>

                {/* Earnings */}
                <div>
                  <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                    Earnings
                  </h4>
                  <div className="space-y-2">
                    {selectedPayment.regularPay && parseFloat(selectedPayment.regularPay) > 0 && (
                      <div className="flex justify-between text-white">
                        <span>Regular Pay</span>
                        <span className="font-mono">${parseFloat(selectedPayment.regularPay).toFixed(2)}</span>
                      </div>
                    )}
                    {selectedPayment.overtimePay && parseFloat(selectedPayment.overtimePay) > 0 && (
                      <div className="flex justify-between text-white">
                        <span>Overtime Pay</span>
                        <span className="font-mono">${parseFloat(selectedPayment.overtimePay).toFixed(2)}</span>
                      </div>
                    )}
                    {selectedPayment.bonusAmount && parseFloat(selectedPayment.bonusAmount) > 0 && (
                      <div className="flex justify-between text-white">
                        <span>Bonus</span>
                        <span className="font-mono">${parseFloat(selectedPayment.bonusAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white font-semibold pt-2 border-t border-white/10">
                      <span>Gross Pay</span>
                      <span className="font-mono">${parseFloat(selectedPayment.grossAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Pay */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-lg text-white font-semibold">Net Pay</span>
                    <span className="text-2xl font-bold text-emerald-400 font-mono">
                      ${parseFloat(selectedPayment.netAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Hours Summary */}
                {selectedPayment.period && (
                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                      Hours Summary
                    </h4>
                    <div className="flex justify-between text-white">
                      <span>Total Hours</span>
                      <span className="font-mono">{parseFloat(selectedPayment.period.totalHours).toFixed(1)}</span>
                    </div>
                  </div>
                )}

                {/* Export Button */}
                <Button 
                  variant="outline" 
                  className="w-full bg-white/5 border-white/10 hover:bg-white/10"
                  onClick={() => {
                    // In a real app, this would export to CSV/PDF
                    alert('Export coming soon!');
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Summary
                </Button>

                {/* Disclaimer in detail view */}
                <p className="text-xs text-slate-500 text-center mt-4">
                  This is not an official pay stub. Contact your payroll provider for tax documents.
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
