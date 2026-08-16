'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function StripeConnectButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsLoading(true);
    
    try {
      // Call the onboarding API
      const response = await fetch('/api/contractor/stripe/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/contractor/payouts?onboarding=complete`,
          refreshUrl: `${window.location.origin}/contractor/payouts?onboarding=refresh`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to start onboarding');
      }

      // Redirect to Stripe onboarding
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No onboarding URL received');
      }
    } catch (error: any) {
      console.error('Stripe Connect error:', error);
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: error.message || 'Failed to connect bank account. Please try again.',
      });
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleConnect}
      disabled={isLoading}
      className="bg-violet-600 hover:bg-violet-500"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <ArrowUpRight className="h-4 w-4 mr-2" />
          Connect Bank
        </>
      )}
    </Button>
  );
}
