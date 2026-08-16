'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VerificationStatusCardProps {
  applicationId: string;
  onComplete?: () => void;
}

export function VerificationStatusCard({ applicationId, onComplete }: VerificationStatusCardProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/applications/${applicationId}/verification/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        
        // Auto-complete if verification is done
        if (data.canSubmit && onComplete) {
          setTimeout(() => onComplete(), 2000);
        }
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Poll for status updates every 30 seconds (reduced from 5s to save CPU)
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [applicationId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load verification status</p>
      </div>
    );
  }

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'verified':
        return <CheckCircle2 className="w-6 h-6 text-green-600" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'needs_review':
        return <AlertCircle className="w-6 h-6 text-orange-600" />;
      default:
        return <Clock className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const getStatusText = (statusValue: string) => {
    switch (statusValue) {
      case 'verified':
        return 'Verified';
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'rejected':
        return 'Rejected';
      case 'needs_review':
        return 'Under Review';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'verified':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20';
      case 'pending':
      case 'processing':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
      case 'rejected':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20';
      case 'needs_review':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-950/20';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">
          Verification Status
        </h2>
        <p className="text-muted-foreground">
          We're processing your documents. This usually takes 2-5 minutes.
        </p>
      </div>

      {/* Overall Status */}
      {status.canSubmit ? (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-green-600 mb-2">
            Verification Complete!
          </h3>
          <p className="text-sm text-muted-foreground">
            All requirements have been met. You can now submit your application.
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-3 animate-spin" />
          <h3 className="text-xl font-semibold text-blue-600 mb-2">
            Processing Documents
          </h3>
          {status.estimatedProcessingTime && (
            <p className="text-sm text-muted-foreground">
              Estimated time: {status.estimatedProcessingTime}
            </p>
          )}
        </div>
      )}

      {/* Identity Status */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Identity Verification</h3>
        <div className={cn(
          'flex items-center justify-between p-4 rounded-lg',
          getStatusColor(status.identityStatus)
        )}>
          <div className="flex items-center gap-3">
            {getStatusIcon(status.identityStatus)}
            <div>
              <p className="font-medium">Government ID</p>
              <p className="text-sm opacity-80">
                {status.requiredDocuments.identity.verified ? 'Verified' : 'Required'}
              </p>
            </div>
          </div>
          <span className="font-semibold">
            {getStatusText(status.identityStatus)}
          </span>
        </div>
      </div>

      {/* Employment Status */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Income Verification</h3>
        <div className={cn(
          'flex items-center justify-between p-4 rounded-lg',
          getStatusColor(status.employmentStatus)
        )}>
          <div className="flex items-center gap-3">
            {getStatusIcon(status.employmentStatus)}
            <div>
              <p className="font-medium">Employment Documents</p>
              <p className="text-sm opacity-80">
                {status.requiredDocuments.employment.count} of {status.requiredDocuments.employment.requiredCount} documents verified
              </p>
            </div>
          </div>
          <span className="font-semibold">
            {getStatusText(status.employmentStatus)}
          </span>
        </div>

        {status.monthlyIncome && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Verified Monthly Income</p>
            <p className="text-2xl font-bold text-primary">
              ${status.monthlyIncome.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </>
          )}
        </Button>
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Status updates automatically every 30 seconds.
          If you experience any issues, please contact support.
        </p>
      </div>
    </div>
  );
}
