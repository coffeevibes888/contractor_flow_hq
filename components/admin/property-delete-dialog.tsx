'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, DollarSign, Users } from 'lucide-react';

interface DeleteResult {
  success: boolean;
  message: string;
  canForce?: boolean;
  warningType?: 'payments' | 'leases';
  uncreditedPaymentCount?: number;
  totalUncreditedAmount?: number;
  activeLeases?: number;
}

interface PropertyDeleteDialogProps {
  propertyId: string;
  action: (id: string, force?: boolean) => Promise<DeleteResult>;
}

export function PropertyDeleteDialog({ propertyId, action }: PropertyDeleteDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningData, setWarningData] = useState<{
    type: 'payments' | 'leases';
    message: string;
    count?: number;
    amount?: number;
  } | null>(null);

  const handleInitialDelete = () => {
    startTransition(async () => {
      try {
        const res = await action(propertyId, false);

        if (!res.success) {
          if (res.canForce) {
            // Show warning dialog with override option
            setWarningData({
              type: res.warningType!,
              message: res.message,
              count: res.uncreditedPaymentCount || res.activeLeases,
              amount: res.totalUncreditedAmount,
            });
            setConfirmOpen(false);
            setWarningOpen(true);
            return;
          }

          toast({
            variant: 'destructive',
            description: res.message,
          });
          return;
        }

        setConfirmOpen(false);
        toast({
          description: res.message,
        });
        router.refresh();
      } catch (err: any) {
        toast({
          variant: 'destructive',
          description:
            typeof err?.message === 'string' ? err.message : 'Failed to delete',
        });
      }
    });
  };

  const handleForceDelete = () => {
    startTransition(async () => {
      try {
        const res = await action(propertyId, true);

        if (!res.success) {
          toast({
            variant: 'destructive',
            description: res.message,
          });
          return;
        }

        setWarningOpen(false);
        toast({
          description: res.message,
        });
        router.refresh();
      } catch (err: any) {
        toast({
          variant: 'destructive',
          description:
            typeof err?.message === 'string' ? err.message : 'Failed to delete',
        });
      }
    });
  };

  return (
    <>
      {/* Initial Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive">
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The property will be archived and all
              historical records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleInitialDelete}
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning Dialog with Override Option */}
      <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Warning: Issues Detected
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-4">
            {warningData?.type === 'payments' && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Uncredited Payments</p>
                    <p className="text-sm text-amber-800 mt-1">
                      {warningData.message}
                    </p>
                    {warningData.amount !== undefined && (
                      <p className="text-sm font-semibold text-amber-900 mt-2">
                        Total: ${warningData.amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {warningData?.type === 'leases' && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Active Tenants</p>
                    <p className="text-sm text-amber-800 mt-1">
                      {warningData.message} These leases will be terminated if
                      you proceed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">
                <strong>Proceeding will:</strong>
              </p>
              <ul className="text-sm text-red-700 mt-2 list-disc list-inside space-y-1">
                {warningData?.type === 'payments' && (
                  <li>Archive the property with uncredited payments</li>
                )}
                {warningData?.type === 'leases' && (
                  <li>Terminate all active leases immediately</li>
                )}
                <li>Remove property from active listings</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel onClick={() => setWarningOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleForceDelete}
            >
              {isPending
                ? 'Deleting...'
                : `Delete Anyway - I Understand The Risks`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PropertyDeleteDialog;
