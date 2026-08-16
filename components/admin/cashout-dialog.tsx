'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, ExternalLink, Landmark, ArrowRight } from 'lucide-react';

interface CashoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CashoutDialog({
  open,
  onOpenChange,
}: CashoutDialogProps) {
  const [loading, setLoading] = useState(false);

  const openStripeDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/landlord/stripe/dashboard-link', { method: 'POST' });
      const data = await res.json().catch(() => null) as { url?: string } | null;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-emerald-600" />
            Direct Deposit Active
          </DialogTitle>
          <DialogDescription>
            Rent payments go directly to your bank account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* How it works */}
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  No cash-out step needed
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  When a tenant pays rent, the money transfers directly into your connected bank account via Stripe. Nothing sits in a platform wallet.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  Card payments: 2 business days
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Standard Stripe payout schedule applies. ACH bank transfers take 1–5 business days to clear.
                </p>
              </div>
            </div>
          </div>

          {/* Payout schedule info */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Transfer model</span>
              <span className="font-semibold">Stripe Connect (direct)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Platform fee on rent</span>
              <span className="font-semibold text-emerald-600">None</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Stripe card processing</span>
              <span className="font-semibold">2.9% + 30¢</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Stripe ACH processing</span>
              <span className="font-semibold">0.8% (max $5)</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">
            To manage your payout schedule, bank account, or view transfer history, visit your Stripe Express dashboard.
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={openStripeDashboard}
              disabled={loading}
              className="flex-1 bg-[#635BFF] hover:bg-[#5851db] text-white"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {loading ? 'Opening...' : 'Stripe Dashboard'}
              {!loading && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
