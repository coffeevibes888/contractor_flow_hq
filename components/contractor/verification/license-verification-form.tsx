'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileCheck, Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface LicenseStatus {
  isVerified: boolean;
  licenseNumber: string | null;
  licenseState: string | null;
  licenseType: string | null;
  expiresAt: Date | null;
  verifiedAt: Date | null;
  status: 'active' | 'expired' | 'suspended' | 'revoked' | 'not_found' | 'pending';
  needsReverification: boolean;
}

interface LicenseVerificationFormProps {
  onVerificationComplete?: () => void;
}

const US_STATES = [
  { value: 'CA', label: 'California' },
  { value: 'TX', label: 'Texas' },
  { value: 'FL', label: 'Florida' },
  { value: 'NY', label: 'New York' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const LICENSE_TYPES = [
  { value: 'general', label: 'General Contractor' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'painting', label: 'Painting' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'other', label: 'Other' },
];

export function LicenseVerificationForm({ onVerificationComplete }: LicenseVerificationFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  
  // Form fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [state, setState] = useState('');
  const [licenseType, setLicenseType] = useState('');

  // Load current license status on mount
  useEffect(() => {
    loadLicenseStatus();
  }, []);

  const loadLicenseStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/contractor/verification/license');
      const data = await res.json();
      
      if (res.ok && data.status) {
        setLicenseStatus(data.status);
        
        // Pre-fill form if license exists
        if (data.status.licenseNumber) {
          setLicenseNumber(data.status.licenseNumber);
          setState(data.status.licenseState || '');
          setLicenseType(data.status.licenseType || '');
        }
      }
    } catch (error) {
      console.error('Failed to load license status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!licenseNumber.trim() || !state || !licenseType) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/contractor/verification/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseNumber: licenseNumber.trim(),
          state,
          type: licenseType,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.success) {
          toast({
            title: 'License Verified!',
            description: data.message || 'Your license has been successfully verified.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Verification Failed',
            description: data.message || 'Unable to verify license. Please check your information.',
          });
        }
        
        // Reload status to show updated badge
        await loadLicenseStatus();
        
        // Notify parent component
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('License verification error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to verify license. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!licenseStatus) return null;

    const { status, isVerified } = licenseStatus;

    if (isVerified && status === 'active') {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Licensed & Verified
        </Badge>
      );
    }

    if (status === 'expired') {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          License Expired
        </Badge>
      );
    }

    if (status === 'suspended' || status === 'revoked') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          License {status === 'suspended' ? 'Suspended' : 'Revoked'}
        </Badge>
      );
    }

    if (status === 'not_found') {
      return (
        <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Not Verified
        </Badge>
      );
    }

    return (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Pending Verification
      </Badge>
    );
  };

  const getStatusMessage = () => {
    if (!licenseStatus) return null;

    const { status, isVerified, expiresAt, needsReverification } = licenseStatus;

    if (isVerified && status === 'active') {
      const expirationDate = expiresAt ? new Date(expiresAt) : null;
      const daysUntilExpiration = expirationDate
        ? Math.floor((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      if (needsReverification) {
        return (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <RefreshCw className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-amber-400 font-medium">Reverification Needed</p>
              <p className="text-slate-400 mt-1">
                It's been 30 days since your last verification. Please reverify your license to maintain your badge.
              </p>
            </div>
          </div>
        );
      }

      if (daysUntilExpiration !== null && daysUntilExpiration <= 30) {
        return (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-amber-400 font-medium">License Expiring Soon</p>
              <p className="text-slate-400 mt-1">
                Your license expires in {daysUntilExpiration} days on{' '}
                {expirationDate?.toLocaleDateString()}. Please renew it to maintain your verified status.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-emerald-400 font-medium">License Verified</p>
            <p className="text-slate-400 mt-1">
              Your license is active and verified. Your "Licensed" badge is displayed on your profile.
              {expirationDate && ` Expires on ${expirationDate.toLocaleDateString()}.`}
            </p>
          </div>
        </div>
      );
    }

    if (status === 'expired') {
      return (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-red-400 font-medium">License Expired</p>
            <p className="text-slate-400 mt-1">
              Your license has expired. Please renew it with your state licensing board and update your information here.
            </p>
          </div>
        </div>
      );
    }

    if (status === 'not_found') {
      return (
        <div className="flex items-start gap-2 p-3 bg-slate-500/10 border border-slate-500/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-slate-400 font-medium">License Not Verified</p>
            <p className="text-slate-500 mt-1">
              We couldn't verify your license. Please check that your license number and state are correct.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

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
              <FileCheck className="h-5 w-5 text-violet-400" />
              License Verification
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              Verify your professional license to earn a "Licensed" badge on your profile
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Message */}
        {getStatusMessage()}

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="licenseNumber" className="text-slate-300">
              License Number *
            </Label>
            <Input
              id="licenseNumber"
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="Enter your license number"
              className="bg-slate-900 border-slate-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state" className="text-slate-300">
              State *
            </Label>
            <Select value={state} onValueChange={setState} required>
              <SelectTrigger
                id="state"
                className="bg-slate-900 border-slate-700 text-white"
              >
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {US_STATES.map((s) => (
                  <SelectItem
                    key={s.value}
                    value={s.value}
                    className="text-white hover:bg-slate-800"
                  >
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseType" className="text-slate-300">
              License Type *
            </Label>
            <Select value={licenseType} onValueChange={setLicenseType} required>
              <SelectTrigger
                id="licenseType"
                className="bg-slate-900 border-slate-700 text-white"
              >
                <SelectValue placeholder="Select license type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {LICENSE_TYPES.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    className="text-white hover:bg-slate-800"
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying License...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  {licenseStatus?.isVerified ? 'Reverify License' : 'Verify License'}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Info Note */}
        <div className="text-xs text-slate-500 space-y-1">
          <p>• Automated verification is available for CA, TX, FL, and NY</p>
          <p>• Other states may require manual verification</p>
          <p>• Licenses are automatically reverified every 30 days</p>
          <p>• You'll receive reminders 30 days before expiration</p>
        </div>
      </CardContent>
    </Card>
  );
}
