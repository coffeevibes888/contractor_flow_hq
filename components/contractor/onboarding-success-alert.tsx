'use client';

import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function OnboardingSuccessAlert() {
  const router = useRouter();

  useEffect(() => {
    // Remove query param after 5 seconds
    const timer = setTimeout(() => {
      router.replace('/contractor-dashboard/payouts');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Alert className="bg-emerald-50 border-emerald-200">
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      <AlertTitle className="text-emerald-900">Bank Account Connected!</AlertTitle>
      <AlertDescription className="text-emerald-700">
        Your bank account has been successfully connected. You can now receive payouts directly.
      </AlertDescription>
    </Alert>
  );
}
