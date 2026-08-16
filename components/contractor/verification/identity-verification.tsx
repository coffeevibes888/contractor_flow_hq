'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Loader2, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface IdentityStatus {
  isVerified: boolean;
  inquiryId: string | null;
  status: 'pending' | 'completed' | 'failed' | 'expired' | 'not_started';
  verifiedAt: Date | null;
}

interface IdentityVerificationProps {
  onVerificationComplete?: () => void;
}

export function IdentityVerification({ onVerificationComplete }: IdentityVerificationProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus | null>(null);
  const [inquiryUrl, setInquiryUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load current identity verification status on mount
  useEffect(() => {
    loadIdentityStatus();
  }, []);

  const loadIdentityStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/contractor/verification/identity');
      const data = await res.json();
      
      if (res.ok && data.status) {
        setIdentityStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to load identity verification status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleInitiateVerification = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/contractor/verification/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Identity Verification Initiated!',
          description: data.message || 'Please complete the verification process.',
        });
        
        // Store inquiry URL to display
        if (data.inquiry?.inquiryUrl) {
          setInquiryUrl(data.inquiry.inquiryUrl);
        }
        
        // Reload status
        await loadIdentityStatus();
        
        // Notify parent component
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      } else {
        throw new Error(data.message || 'Failed to initiate identity verification');
      }
    } catch (error) {
      console.error('Identity verification initiation error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to initiate identity verification. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    if (retryCount >= 1) {
      toast({
        variant: 'destructive',
        title: 'Manual Review Required',
        description: 'You have used your retry. Please contact support for manual review.',
      });
      return;
    }
    handleInitiateVerification();
  };

  const getStatusBadge = () => {
    if (!identityStatus) return null;

    const { status, isVerified } = identityStatus;

    if (isVerified && status === 'completed') {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Identity Verified
        </Badge>
      );
    }

    if (status === 'failed') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Verification Failed
        </Badge>
      );
    }

    if (status === 'expired') {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Verification Expired
        </Badge>
      );
    }

    if (status === 'pending') {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Verification In Progress
        </Badge>
      );
    }

    return (
      <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
        <UserCheck className="h-3 w-3 mr-1" />
        Not Started
      </Badge>
    );
  };

  const getStatusMessage = () => {
    if (!identityStatus) return null;

    const { status, isVerified, verifiedAt } = identityStatus;

    if (isVerified && status === 'completed') {
      return (
        <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-emerald-400 font-medium">Identity Verified</p>
            <p className="text-slate-400 mt-1">
              Your identity has been verified. Your "Identity Verified" badge is displayed on your profile.
              {verifiedAt && ` Verified on ${new Date(verifiedAt).toLocaleDateString()}.`}
            </p>
          </div>
        </div>
      );
    }

    if (status === 'pending') {
      return (
        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Loader2 className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0 animate-spin" />
          <div className="text-sm">
            <p className="text-blue-400 font-medium">Verification In Progress</p>
            <p className="text-slate-400 mt-1">
              Your identity verification is being processed. This typically takes a few minutes. 
              Please complete the verification at the link provided.
            </p>
          </div>
        </div>
      );
    }

    if (status === 'failed') {
      return (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-red-400 font-medium">Verification Failed</p>
            <p className="text-slate-400 mt-1">
              Your identity verification was unsuccessful. 
              {retryCount < 1 
                ? ' You can retry once before manual review is required.' 
                : ' Please contact support for manual review.'}
            </p>
          </div>
        </div>
      );
    }

    if (status === 'expired') {
      return (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-amber-400 font-medium">Verification Expired</p>
            <p className="text-slate-400 mt-1">
              Your verification link has expired. Please initiate a new verification below.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  // If identity is already verified, show simplified view
  if (identityStatus?.isVerified) {
    return (
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-violet-400" />
                Identity Verification
              </CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                Your identity has been verified
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {getStatusMessage()}
          
          <div className="text-xs text-slate-500 space-y-1">
            <p>• Identity verification is a one-time process</p>
            <p>• Your documents are stored securely and deleted after verification</p>
            <p>• Verified on {identityStatus.verifiedAt ? new Date(identityStatus.verifiedAt).toLocaleDateString() : 'N/A'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingStatus) {
    return (
      <Card className="bg-slate-800/50 border-white/10">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-white/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-violet-400" />
              Identity Verification
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              Verify your identity to earn an "Identity Verified" badge on your profile
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Message */}
        {getStatusMessage()}

        {/* Verification Link (if available) */}
        {inquiryUrl && identityStatus?.status === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg"
          >
            <p className="text-sm text-violet-400 font-medium mb-2">
              Complete Your Identity Verification
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Click the button below to complete your identity verification with our partner, Persona. 
              You'll need a government-issued ID and will take a selfie for comparison.
            </p>
            <Button
              onClick={() => window.open(inquiryUrl, '_blank')}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Complete Identity Verification
            </Button>
          </motion.div>
        )}

        {/* Initiation or Retry Button */}
        {(!identityStatus || identityStatus.status === 'not_started' || identityStatus.status === 'expired') && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-2">What You'll Need:</h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• A government-issued photo ID (driver's license, passport, or state ID)</li>
                <li>• A device with a camera (for selfie verification)</li>
                <li>• 2-3 minutes to complete the process</li>
              </ul>
            </div>

            <Button
              onClick={handleInitiateVerification}
              disabled={isLoading}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initiating Verification...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Start Identity Verification
                </>
              )}
            </Button>
          </div>
        )}

        {/* Retry Button (if failed and retry available) */}
        {identityStatus?.status === 'failed' && retryCount < 1 && (
          <Button
            onClick={handleRetry}
            disabled={isLoading}
            variant="outline"
            className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Retry Verification
              </>
            )}
          </Button>
        )}

        {/* Contact Support (if failed and no retries left) */}
        {identityStatus?.status === 'failed' && retryCount >= 1 && (
          <Button
            onClick={() => window.location.href = '/support'}
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Contact Support for Manual Review
          </Button>
        )}

        {/* Info Note */}
        <div className="text-xs text-slate-500 space-y-1">
          <p>• Identity verification is processed by Persona, a trusted third-party provider</p>
          <p>• Verification typically completes within minutes</p>
          <p>• Your documents are stored securely and raw images are deleted after verification</p>
          <p>• You can retry once if verification fails</p>
          <p>• All information is kept confidential and secure</p>
        </div>
      </CardContent>
    </Card>
  );
}
