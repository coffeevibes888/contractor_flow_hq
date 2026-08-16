'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface StripeStatus {
  isOnboarded: boolean;
  canReceivePayouts: boolean;
  status: string;
}

export function StripeStatusChecker() {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/contractor/stripe/status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Failed to check Stripe status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  if (isLoading) {
    return (
      <Alert className="bg-slate-50 border-slate-200">
        <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
        <AlertDescription className="text-slate-600">
          Checking payment setup status...
        </AlertDescription>
      </Alert>
    );
  }

  if (!status) return null;

  if (status.isOnboarded && status.canReceivePayouts) {
    return (
      <Alert className="bg-emerald-50 border-emerald-200">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-emerald-700">
          Payment setup complete. You can receive payouts.
        </AlertDescription>
      </Alert>
    );
  }

  if (status.isOnboarded && !status.canReceivePayouts) {
    return (
      <Alert className="bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          Payment setup in progress. Stripe is reviewing your information.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
