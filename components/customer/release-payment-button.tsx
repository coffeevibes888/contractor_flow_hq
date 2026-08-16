'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Loader2,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReleasePaymentButtonProps {
  milestoneId: string;
  milestoneTitle: string;
  amount: number;
  contractorName: string;
  verifications: {
    gpsVerified: boolean;
    photosUploaded: number;
    minPhotos: number;
    contractorSigned: boolean;
  };
  onSuccess: () => void;
}

export function ReleasePaymentButton({
  milestoneId,
  milestoneTitle,
  amount,
  contractorName,
  verifications,
  onSuccess
}: ReleasePaymentButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const allVerified = 
    verifications.gpsVerified &&
    verifications.photosUploaded >= verifications.minPhotos &&
    verifications.contractorSigned;

  const handleRelease = async () => {
    setIsReleasing(true);

    try {
      const response = await fetch(`/api/milestones/${milestoneId}/release`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to release payment');
      }

      toast({
        description: `✅ Payment of $${amount.toFixed(2)} released to ${contractorName}!`
      });

      setIsOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Release error:', error);
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Failed to release payment'
      });
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={!allVerified}
        className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
      >
        <DollarSign className="h-4 w-4 mr-2" />
        Release Payment
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              Release Payment
            </DialogTitle>
            <DialogDescription>
              Review the details before releasing payment to the contractor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Milestone Info */}
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-600">Milestone</p>
              <p className="font-semibold text-gray-900">{milestoneTitle}</p>
            </div>

            {/* Payment Amount */}
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Payment Amount</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${amount.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">To Contractor:</span>
                  <span className="font-semibold">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Platform Fee:</span>
                  <span className="font-semibold">$1.00</span>
                </div>
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-emerald-200">
                  <span className="font-semibold text-gray-900">Total Charge:</span>
                  <span className="font-bold text-emerald-600">${(amount + 1).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Contractor Info */}
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-gray-600">Paying To</p>
              <p className="font-semibold text-gray-900">{contractorName}</p>
            </div>

            {/* Verification Status */}
            <div className="p-4 rounded-lg bg-white border border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-3">Verification Status</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">GPS Verified</span>
                  {verifications.gpsVerified ? (
                    <Badge className="bg-emerald-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      Not Required
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Photos</span>
                  {verifications.photosUploaded >= verifications.minPhotos ? (
                    <Badge className="bg-emerald-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {verifications.photosUploaded} Uploaded
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      Not Required
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Contractor Signature</span>
                  {verifications.contractorSigned ? (
                    <Badge className="bg-emerald-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Signed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      Not Required
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold">Important</p>
                <p className="mt-1">
                  Once released, this payment cannot be reversed. Make sure you're satisfied
                  with the work before proceeding.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isReleasing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRelease}
              disabled={isReleasing}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
            >
              {isReleasing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Release
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
