'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createCashPayment, cancelCashPayment } from '@/lib/actions/cash-payment.actions';
import { toast } from '@/hooks/use-toast';
import {
  Banknote,
  Store,
  Clock,
  Copy,
  CheckCircle2,
  Loader2,
  MapPin,
  X,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface CashPaymentOptionProps {
  rentPaymentIds: string[];
  totalAmount: number;
}

interface CashPaymentData {
  id: string;
  referenceId: string;
  amount: number;
  fee: number;
  totalAmount: number;
  barcodeData: {
    format: string;
    value: string;
    imageUrl?: string;
    amount: string;
    displayText: string;
    paymentSlipUrl?: string;
    retailLocationsUrl?: string;
  };
  expiresAt: string;
  status: string;
  paymentSlipUrl?: string;
  retailLocationsUrl?: string;
}

const RETAIL_LOCATIONS = [
  { name: 'Walmart', icon: '🏪', count: '4,700+' },
  { name: '7-Eleven', icon: '🏪', count: '9,000+' },
  { name: 'CVS', icon: '💊', count: '8,000+' },
  { name: 'Family Dollar', icon: '💵', count: '8,000+' },
  { name: "Casey's", icon: '⛽', count: '2,400+' },
  { name: 'ACE Cash Express', icon: '💰', count: '950+' },
];

export default function CashPaymentOption({
  rentPaymentIds,
  totalAmount,
}: CashPaymentOptionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cashPayment, setCashPayment] = useState<CashPaymentData | null>(null);
  const [copied, setCopied] = useState(false);
  const barcodeRef = useRef<SVGSVGElement>(null);

  // Generate barcode when payment data is available
  useEffect(() => {
    if (cashPayment && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, cashPayment.referenceId, {
          format: 'CODE128',
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [cashPayment]);

  const handleGenerateBarcode = async () => {
    setIsLoading(true);
    try {
      const result = await createCashPayment(rentPaymentIds);

      if (result.success && result.cashPayment) {
        setCashPayment(result.cashPayment);
        toast({
          title: 'Barcode generated!',
          description: 'Show this barcode at any participating retail location.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to generate barcode',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate cash payment barcode',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReference = () => {
    if (cashPayment) {
      navigator.clipboard.writeText(cashPayment.referenceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied!',
        description: 'Reference number copied to clipboard',
      });
    }
  };

  const handleCancel = async () => {
    if (!cashPayment) return;

    setIsLoading(true);
    try {
      const result = await cancelCashPayment(cashPayment.id);
      if (result.success) {
        setCashPayment(null);
        setIsOpen(false);
        toast({
          title: 'Cancelled',
          description: 'Cash payment barcode has been cancelled',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel cash payment',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const expiresAt = cashPayment ? new Date(cashPayment.expiresAt) : null;
  const daysUntilExpiry = expiresAt
    ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
      >
        <Banknote className="w-4 h-4 mr-2" />
        Pay with Cash at Retail Store
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Store className="w-5 h-5 text-emerald-400" />
              Pay with Cash
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Pay your rent with cash at thousands of retail locations nationwide.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!cashPayment ? (
              <>
                {/* Payment Summary */}
                <div className="rounded-xl bg-slate-800/60 border border-white/10 p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Rent amount</span>
                    <span className="text-white">${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Cash payment fee</span>
                    <span className="text-white">$3.99</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between font-semibold">
                    <span className="text-white">Total to pay</span>
                    <span className="text-emerald-400">${(totalAmount + 3.99).toFixed(2)}</span>
                  </div>
                </div>

                {/* Participating Locations */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-300">Participating locations:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {RETAIL_LOCATIONS.map((loc) => (
                      <div
                        key={loc.name}
                        className="flex items-center gap-2 rounded-lg bg-slate-800/40 border border-white/5 px-3 py-2 text-xs text-slate-300"
                      >
                        <span>{loc.icon}</span>
                        <span>{loc.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* How it works */}
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 space-y-2">
                  <p className="text-sm font-medium text-blue-300">How it works:</p>
                  <ol className="text-xs text-blue-200/80 space-y-1 list-decimal list-inside">
                    <li>Generate your unique payment barcode</li>
                    <li>Visit any participating retail location</li>
                    <li>Show the barcode at checkout and pay with cash</li>
                    <li>Your rent is marked as paid within 1-2 hours</li>
                  </ol>
                </div>

                <Button
                  onClick={handleGenerateBarcode}
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Banknote className="w-4 h-4 mr-2" />
                      Generate Payment Barcode
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Barcode Display */}
                <div className="rounded-xl bg-white p-6 text-center">
                  <svg ref={barcodeRef} className="mx-auto" />
                  <p className="mt-2 text-sm font-mono text-slate-600">
                    Reference: {cashPayment.referenceId}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCopyReference}
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Ref #
                      </>
                    )}
                  </Button>
                  
                  {cashPayment.paymentSlipUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(cashPayment.paymentSlipUrl, '_blank')}
                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Payment Slip
                    </Button>
                  )}
                </div>

                {/* Payment Details */}
                <div className="rounded-xl bg-slate-800/60 border border-white/10 p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Amount to pay</span>
                    <span className="text-xl font-bold text-emerald-400">
                      ${cashPayment.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <Clock className="w-4 h-4" />
                    <span>
                      Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''} (
                      {expiresAt?.toLocaleDateString()})
                    </span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-300">
                        Visit any participating location
                      </p>
                      <p className="text-xs text-emerald-200/70 mt-1">
                        Show this barcode to the cashier and pay ${cashPayment.totalAmount.toFixed(2)} in cash.
                        Your payment will be processed within 1-2 hours.
                      </p>
                    </div>
                  </div>
                  
                  {cashPayment.retailLocationsUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(cashPayment.retailLocationsUrl, '_blank')}
                      className="w-full mt-2 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/20"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Find Nearby Locations
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  )}
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 text-xs text-amber-400/80">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Keep your receipt! If there are any issues with your payment, you&apos;ll need the
                    confirmation number from your receipt.
                  </p>
                </div>

                {/* Cancel Button */}
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel and Use Different Payment Method
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
