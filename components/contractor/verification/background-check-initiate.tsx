'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface BackgroundCheckStatus {
  isVerified: boolean;
  checkId: string | null;
  status: 'pending' | 'clear' | 'consider' | 'suspended' | 'expired' | 'not_started';
  completedAt: Date | null;
  expiresAt: Date | null;
  needsRenewal: boolean;
  reportUrl?: string;
}

interface BackgroundCheckInitiateProps {
  onVerificationComplete?: () => void;
}

export function BackgroundCheckInitiate({ onVerificationComplete }: BackgroundCheckInitiateProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [checkStatus, setCheckStatus] = useState<BackgroundCheckStatus | null>(null);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [zipcode, setZipcode] = useState('');

  // Load current background check status on mount
  useEffect(() => {
    loadCheckStatus();
  }, []);

  const loadCheckStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/contractor/verification/background-check');
      const data = await res.json();
      
      if (res.ok && data.status) {
        setCheckStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to load background check status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/contractor/verification/background-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          dob: dob || undefined,
          zipcode: zipcode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Background Check Initiated!',
          description: data.message || 'Please complete the verification at the provided link.',
        });
        
        // Store invitation URL to display
        if (data.invitation?.invitationUrl) {
          setInvitationUrl(data.invitation.invitationUrl);
        }
        
        // Reload status
        await loadCheckStatus();
        
        // Notify parent component
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      } else {
        throw new Error(data.message || 'Failed to initiate background check');
      }
    } catch (error) {
      console.error('Background check initiation error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to initiate background check. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!checkStatus) return null;

    const { status, isVerified } = checkStatus;

    if (isVerified && status === 'clear') {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Background Checked
        </Badge>
      );
    }

    if (status === 'expired') {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Check Expired
        </Badge>
      );
    }

    if (status === 'consider' || status === 'suspended') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Check {status === 'consider' ? 'Under Review' : 'Suspended'}
        </Badge>
      );
    }

    if (status === 'pending') {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Check In Progress
        </Badge>
      );
    }

    return (
      <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
        <Shield className="h-3 w-3 mr-1" />
        Not Started
      </Badge>
    );
  };

  const getStatusMessage = () => {
    if (!checkStatus) return null;

    const { status, isVerified, expiresAt, needsRenewal, completedAt } = checkStatus;

    if (isVerified && status === 'clear') {
      const expirationDate = expiresAt ? new Date(expiresAt) : null;
      const daysUntilExpiration = expirationDate
        ? Math.floor((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      if (needsRenewal) {
        return (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-amber-400 font-medium">Renewal Needed</p>
              <p className="text-slate-400 mt-1">
                Your background check {daysUntilExpiration && daysUntilExpiration > 0 
                  ? `expires in ${daysUntilExpiration} days` 
                  : 'has expired'}. Please initiate a new check to maintain your badge.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-emerald-400 font-medium">Background Check Verified</p>
            <p className="text-slate-400 mt-1">
              Your background check passed. Your "Background Checked" badge is displayed on your profile.
              {expirationDate && ` Valid until ${expirationDate.toLocaleDateString()}.`}
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
            <p className="text-blue-400 font-medium">Check In Progress</p>
            <p className="text-slate-400 mt-1">
              Your background check is being processed. This typically takes 1-3 business days. 
              You'll receive an email when it's complete.
            </p>
          </div>
        </div>
      );
    }

    if (status === 'consider') {
      return (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-amber-400 font-medium">Under Review</p>
            <p className="text-slate-400 mt-1">
              Your background check requires additional review. Our team will contact you within 2 business days.
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
            <p className="text-red-400 font-medium">Check Expired</p>
            <p className="text-slate-400 mt-1">
              Your background check has expired (valid for 12 months). Please initiate a new check below.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  // If check is already verified and not expired, show simplified view
  if (checkStatus?.isVerified && !checkStatus.needsRenewal) {
    return (
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-violet-400" />
                Background Check
              </CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                Your background check is verified and active
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {getStatusMessage()}
          
          <div className="text-xs text-slate-500 space-y-1">
            <p>• Background checks are valid for 12 months</p>
            <p>• You'll receive a reminder 30 days before expiration</p>
            <p>• Completed on {checkStatus.completedAt ? new Date(checkStatus.completedAt).toLocaleDateString() : 'N/A'}</p>
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
              <Shield className="h-5 w-5 text-violet-400" />
              Background Check
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              Complete a background check to earn a "Background Checked" badge on your profile
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Message */}
        {getStatusMessage()}

        {/* Invitation Link (if available) */}
        {invitationUrl && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg"
          >
            <p className="text-sm text-violet-400 font-medium mb-2">
              Complete Your Background Check
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Click the button below to complete your background check with our partner, Checkr.
            </p>
            <Button
              onClick={() => window.open(invitationUrl, '_blank')}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Complete Background Check
            </Button>
          </motion.div>
        )}

        {/* Initiation Form (only show if not pending or if needs renewal) */}
        {(!checkStatus || checkStatus.status === 'not_started' || checkStatus.status === 'expired' || checkStatus.needsRenewal) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-slate-300">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="bg-slate-900 border-slate-700 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-slate-300">
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="bg-slate-900 border-slate-700 text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="bg-slate-900 border-slate-700 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">
                Phone Number (Optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob" className="text-slate-300">
                  Date of Birth (Optional)
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipcode" className="text-slate-300">
                  ZIP Code (Optional)
                </Label>
                <Input
                  id="zipcode"
                  type="text"
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value)}
                  placeholder="12345"
                  maxLength={5}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
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
                    Initiating Check...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Initiate Background Check
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Info Note */}
        <div className="text-xs text-slate-500 space-y-1">
          <p>• Background checks are processed by Checkr, a trusted third-party provider</p>
          <p>• Checks typically complete within 1-3 business days</p>
          <p>• Background checks are valid for 12 months</p>
          <p>• You'll receive reminders 30 days before expiration</p>
          <p>• All information is kept confidential and secure</p>
        </div>
      </CardContent>
    </Card>
  );
}
