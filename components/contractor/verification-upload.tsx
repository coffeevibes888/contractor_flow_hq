'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, FileText, AlertCircle } from 'lucide-react';

interface VerificationUploadProps {
  isOpen: boolean;
  onClose: () => void;
  verificationType: string;
  onSuccess?: () => void;
}

export function VerificationUpload({
  isOpen,
  onClose,
  verificationType,
  onSuccess,
}: VerificationUploadProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    licenseNumber: '',
    licenseState: '',
    licenseType: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceCoverageAmount: '',
    expiresAt: '',
    notes: '',
  });

  const getTitle = () => {
    switch (verificationType) {
      case 'identity':
        return 'Identity Verification';
      case 'license':
        return 'Business License Verification';
      case 'insurance':
        return 'Insurance Certificate';
      case 'background':
        return 'Background Check';
      case 'bank':
        return 'Bank Account Verification';
      default:
        return 'Verification';
    }
  };

  const getDescription = () => {
    switch (verificationType) {
      case 'identity':
        return 'Upload a government-issued ID (driver\'s license, passport, or state ID)';
      case 'license':
        return 'Upload your contractor license or professional certification';
      case 'insurance':
        return 'Upload your liability insurance certificate';
      case 'background':
        return 'Complete background check authorization';
      case 'bank':
        return 'Connect your bank account for secure payouts';
      default:
        return 'Upload verification documents';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please upload a file smaller than 10MB',
          variant: 'destructive',
        });
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a PDF or image file (JPG, PNG)',
          variant: 'destructive',
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file && verificationType !== 'bank' && verificationType !== 'background') {
      toast({
        title: 'File Required',
        description: 'Please upload a document',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const formDataToSend = new FormData();
      if (file) {
        formDataToSend.append('file', file);
      }
      formDataToSend.append('verificationType', verificationType);
      formDataToSend.append('data', JSON.stringify(formData));

      const response = await fetch('/api/contractor/verification/upload', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      toast({
        title: 'Upload Successful!',
        description: 'Your verification documents have been submitted for review',
      });

      if (onSuccess) onSuccess();
      onClose();
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* License-specific fields */}
          {verificationType === 'license' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="licenseNumber">License Number *</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, licenseNumber: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="licenseState">State *</Label>
                  <Input
                    id="licenseState"
                    value={formData.licenseState}
                    onChange={(e) =>
                      setFormData({ ...formData, licenseState: e.target.value })
                    }
                    placeholder="CA"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="licenseType">License Type *</Label>
                <Select
                  value={formData.licenseType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, licenseType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select license type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general_contractor">General Contractor</SelectItem>
                    <SelectItem value="plumber">Plumber</SelectItem>
                    <SelectItem value="electrician">Electrician</SelectItem>
                    <SelectItem value="hvac">HVAC</SelectItem>
                    <SelectItem value="roofer">Roofer</SelectItem>
                    <SelectItem value="painter">Painter</SelectItem>
                    <SelectItem value="carpenter">Carpenter</SelectItem>
                    <SelectItem value="landscaper">Landscaper</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Insurance-specific fields */}
          {verificationType === 'insurance' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insuranceProvider">Insurance Provider *</Label>
                  <Input
                    id="insuranceProvider"
                    value={formData.insuranceProvider}
                    onChange={(e) =>
                      setFormData({ ...formData, insuranceProvider: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="insurancePolicyNumber">Policy Number *</Label>
                  <Input
                    id="insurancePolicyNumber"
                    value={formData.insurancePolicyNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        insurancePolicyNumber: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="insuranceCoverageAmount">Coverage Amount *</Label>
                <Input
                  id="insuranceCoverageAmount"
                  type="number"
                  value={formData.insuranceCoverageAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      insuranceCoverageAmount: e.target.value,
                    })
                  }
                  placeholder="1000000"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum $1,000,000 required
                </p>
              </div>
            </>
          )}

          {/* Expiration date for license and insurance */}
          {(verificationType === 'license' || verificationType === 'insurance') && (
            <div>
              <Label htmlFor="expiresAt">Expiration Date *</Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
                required
              />
            </div>
          )}

          {/* File upload */}
          {verificationType !== 'bank' && verificationType !== 'background' && (
            <div>
              <Label htmlFor="file">Upload Document *</Label>
              <div className="mt-2">
                <label
                  htmlFor="file"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {file ? (
                      <>
                        <FileText className="h-8 w-8 text-blue-600 mb-2" />
                        <p className="text-sm text-gray-600">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, JPG, or PNG (max 10MB)
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    id="file"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Bank account redirect */}
          {verificationType === 'bank' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Stripe Connect Required
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    You'll be redirected to Stripe to securely connect your bank account
                    for payouts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Submit for Review
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
