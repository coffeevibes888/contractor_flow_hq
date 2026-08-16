'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2, CheckCircle2, XCircle, AlertTriangle, Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface InsuranceStatus {
  isVerified: boolean;
  certificateUrl: string | null;
  provider: string | null;
  coverageAmount: number | null;
  expiresAt: Date | null;
  isExpired: boolean;
  daysUntilExpiration: number | null;
  needsRenewal: boolean;
}

interface InsuranceUploadProps {
  onUploadComplete?: () => void;
}

export function InsuranceUpload({ onUploadComplete }: InsuranceUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [insuranceStatus, setInsuranceStatus] = useState<InsuranceStatus | null>(null);
  
  // Form fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [provider, setProvider] = useState('');
  const [coverageAmount, setCoverageAmount] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load current insurance status on mount
  useEffect(() => {
    loadInsuranceStatus();
  }, []);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const loadInsuranceStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/contractor/verification/insurance');
      const data = await res.json();
      
      if (res.ok && data.status) {
        setInsuranceStatus(data.status);
        
        // Pre-fill form if insurance exists
        if (data.status.provider) {
          setProvider(data.status.provider);
        }
        if (data.status.coverageAmount) {
          setCoverageAmount(data.status.coverageAmount.toString());
        }
        if (data.status.expiresAt) {
          // Format date for input (YYYY-MM-DD)
          const date = new Date(data.status.expiresAt);
          setExpirationDate(date.toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load insurance status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload a PDF, JPEG, or PNG file.',
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: 'Maximum file size is 10MB.',
      });
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'Missing File',
        description: 'Please select an insurance certificate to upload.',
      });
      return;
    }

    if (!expirationDate) {
      toast({
        variant: 'destructive',
        title: 'Missing Expiration Date',
        description: 'Please enter the insurance expiration date.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      if (provider.trim()) {
        formData.append('provider', provider.trim());
      }
      
      if (coverageAmount.trim()) {
        const amount = parseFloat(coverageAmount.trim());
        if (!isNaN(amount) && amount > 0) {
          formData.append('coverageAmount', amount.toString());
        }
      }
      
      if (expirationDate) {
        formData.append('expirationDate', new Date(expirationDate).toISOString());
      }

      const res = await fetch('/api/contractor/verification/insurance', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        if (data.success) {
          toast({
            title: 'Insurance Uploaded!',
            description: data.message || 'Your insurance certificate has been successfully uploaded.',
          });
          
          // Clear form
          handleRemoveFile();
          
          // Reload status to show updated badge
          await loadInsuranceStatus();
          
          // Notify parent component
          if (onUploadComplete) {
            onUploadComplete();
          }
        } else {
          toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: data.message || 'Unable to upload insurance certificate.',
          });
        }
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Insurance upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload insurance certificate. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!insuranceStatus) return null;

    const { isVerified, isExpired, needsRenewal } = insuranceStatus;

    if (isVerified && !isExpired) {
      if (needsRenewal) {
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Renewal Needed
          </Badge>
        );
      }
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Insured & Verified
        </Badge>
      );
    }

    if (isExpired) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Insurance Expired
        </Badge>
      );
    }

    return (
      <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Not Verified
      </Badge>
    );
  };

  const getStatusMessage = () => {
    if (!insuranceStatus) return null;

    const { isVerified, isExpired, expiresAt, daysUntilExpiration, needsRenewal } = insuranceStatus;

    if (isVerified && !isExpired) {
      const expirationDate = expiresAt ? new Date(expiresAt) : null;

      if (needsRenewal && daysUntilExpiration !== null) {
        return (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-amber-400 font-medium">Insurance Expiring Soon</p>
              <p className="text-slate-400 mt-1">
                Your insurance expires in {daysUntilExpiration} days on{' '}
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
            <p className="text-emerald-400 font-medium">Insurance Verified</p>
            <p className="text-slate-400 mt-1">
              Your insurance is active and verified. Your "Insured" badge is displayed on your profile.
              {expirationDate && ` Expires on ${expirationDate.toLocaleDateString()}.`}
            </p>
          </div>
        </div>
      );
    }

    if (isExpired) {
      return (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-red-400 font-medium">Insurance Expired</p>
            <p className="text-slate-400 mt-1">
              Your insurance has expired. Please renew it with your provider and upload the new certificate here.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-2 p-3 bg-slate-500/10 border border-slate-500/20 rounded-lg">
        <AlertTriangle className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="text-slate-400 font-medium">Insurance Not Verified</p>
          <p className="text-slate-500 mt-1">
            Upload your insurance certificate to earn an "Insured" badge on your profile.
          </p>
        </div>
      </div>
    );
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
              <Shield className="h-5 w-5 text-violet-400" />
              Insurance Certificate
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              Upload your insurance certificate to earn an "Insured" badge on your profile
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Message */}
        {getStatusMessage()}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label className="text-slate-300">
              Insurance Certificate * (PDF, JPEG, or PNG)
            </Label>
            
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:border-violet-500 transition-colors"
              >
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">
                  Click to upload or drag and drop
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  PDF, JPEG, or PNG (max 10MB)
                </p>
              </div>
            ) : (
              <div className="border border-slate-700 rounded-lg p-4 bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <FileText className="h-12 w-12 text-violet-400" />
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">
                        {selectedFile.name}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="provider" className="text-slate-300">
              Insurance Provider (Optional)
            </Label>
            <Input
              id="provider"
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g., State Farm, Allstate"
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>

          {/* Coverage Amount */}
          <div className="space-y-2">
            <Label htmlFor="coverageAmount" className="text-slate-300">
              Coverage Amount (Optional)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                $
              </span>
              <Input
                id="coverageAmount"
                type="number"
                value={coverageAmount}
                onChange={(e) => setCoverageAmount(e.target.value)}
                placeholder="1000000"
                className="bg-slate-900 border-slate-700 text-white pl-7"
                min="0"
                step="1000"
              />
            </div>
            <p className="text-xs text-slate-500">
              Enter the total coverage amount (e.g., $1,000,000)
            </p>
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label htmlFor="expirationDate" className="text-slate-300">
              Expiration Date *
            </Label>
            <Input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
              required
            />
            <p className="text-xs text-slate-500">
              You'll receive a reminder 14 days before expiration
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading || !selectedFile}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading Certificate...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {insuranceStatus?.isVerified ? 'Update Certificate' : 'Upload Certificate'}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Info Note */}
        <div className="text-xs text-slate-500 space-y-1">
          <p>• Accepted formats: PDF, JPEG, PNG (max 10MB)</p>
          <p>• Your certificate is stored securely and encrypted</p>
          <p>• You'll receive reminders 14 days before expiration</p>
          <p>• Update your certificate anytime by uploading a new one</p>
        </div>
      </CardContent>
    </Card>
  );
}
