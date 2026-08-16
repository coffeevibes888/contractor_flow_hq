'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from '@stripe/react-connect-js';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  createConnectAccountSession,
  getConnectAccountStatus,
  createOnboardingLink,
} from '@/lib/actions/stripe-connect.actions';
import {
  CheckCircle2,
  Loader2,
  Shield,
  Building2,
  CreditCard,
  ArrowRight,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface ConnectStatus {
  hasAccount: boolean;
  isOnboarded: boolean;
  canReceivePayouts: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  bankAccountLast4?: string | null;
}

export default function StripeConnectOnboarding({ onComplete }: { onComplete?: () => void }) {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load account status
  const loadStatus = useCallback(async () => {
    try {
      const result = await getConnectAccountStatus();
      if (result.success && result.status) {
        setStatus(result.status);
      }
    } catch (err) {
      console.error('Error loading status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Initialize Stripe Connect
  const initializeStripeConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sessionResult = await createConnectAccountSession();

      if (!sessionResult.success || !sessionResult.clientSecret) {
        throw new Error(sessionResult.message || 'Failed to create session');
      }

      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        throw new Error('Stripe publishable key not configured');
      }

      const instance = await loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => sessionResult.clientSecret!,
        appearance: {
          overlays: 'dialog',
          variables: {
            colorPrimary: '#7c3aed',
            colorBackground: '#ffffff',
            colorText: '#1e293b',
            colorDanger: '#ef4444',
            borderRadius: '8px',
            fontFamily: 'system-ui, sans-serif',
            fontSizeBase: '14px',
            spacingUnit: '4px',
          },
        },
      });

      setStripeConnectInstance(instance);
      setShowOnboarding(true);
    } catch (err) {
      console.error('Error initializing Stripe Connect:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      
      // Fallback to hosted onboarding
      toast({
        variant: 'destructive',
        title: 'Loading issue',
        description: 'Opening setup in a new tab instead.',
      });
      
      const linkResult = await createOnboardingLink();
      if (linkResult.success && linkResult.url) {
        window.open(linkResult.url, '_blank');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    loadStatus();
    toast({
      title: 'Setup complete!',
      description: 'Your payout account is ready to receive funds.',
    });
    onComplete?.();
  };

  // Already onboarded - show success state
  if (status?.canReceivePayouts) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">
                Payouts Enabled
              </h3>
              <p className="text-sm text-muted-foreground">
                {status.bankAccountLast4
                  ? `Bank account ending in ${status.bankAccountLast4}`
                  : 'Your account is ready to receive payouts'}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Account exists but needs more verification
  if (status?.hasAccount && status?.isOnboarded && !status?.canReceivePayouts) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                Additional Verification Required
              </h3>
              <p className="text-sm text-muted-foreground">
                Stripe needs a bit more information to enable payouts
              </p>
            </div>
          </div>
          
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">What&apos;s needed:</p>
            <p className="text-xs">Full SSN verification is required by US banking regulations to send payouts.</p>
          </div>

          <Button
            type="button"
            onClick={() => {
              console.log('Complete Verification clicked');
              initializeStripeConnect();
            }}
            disabled={isLoading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Complete Verification
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show embedded onboarding
  if (showOnboarding && stripeConnectInstance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-500" />
            Complete Payout Setup
          </CardTitle>
          <CardDescription>
            Securely verify your identity to receive payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
            <ConnectAccountOnboarding
              onExit={() => {
                handleOnboardingComplete();
              }}
            />
          </ConnectComponentsProvider>
        </CardContent>
      </Card>
    );
  }

  // Initial state - show setup prompt
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Set Up Payouts</h2>
            <p className="text-violet-200 text-sm">Connect your bank to cash out collected rent</p>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Benefits */}
        <div className="grid gap-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Cash Out Anytime</p>
              <p className="text-xs text-muted-foreground">
                Transfer collected rent to your bank when you're ready
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Bank-Level Security</p>
              <p className="text-xs text-muted-foreground">
                256-bit encryption protects your information
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Quick Setup</p>
              <p className="text-xs text-muted-foreground">
                Takes about 2 minutes to complete
              </p>
            </div>
          </div>
        </div>

        {/* What you'll need */}
        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-4">
          <p className="text-sm font-medium mb-2">You&apos;ll need:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Legal name and date of birth</li>
            <li>• Last 4 digits of your SSN</li>
            <li>• Bank account and routing number</li>
          </ul>
        </div>

        {/* CTA Button */}
        <Button
          onClick={initializeStripeConnect}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white h-12"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Secured by Stripe</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" />
            <span>PCI Compliant</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
