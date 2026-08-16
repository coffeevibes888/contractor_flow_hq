'use client';

import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  AlertCircle,
  Loader2,
  CheckCircle,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import AvailabilityCalendar from './availability-calendar';

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  serviceTypes?: string[];
}

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface Contractor {
  id: string;
  name: string;
  businessName?: string;
  image?: string;
  depositRequired: boolean;
  depositAmount?: number;
  cancellationPolicy?: string;
  cancellationHours?: number;
}

interface InstantBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor: Contractor;
  serviceType: string;
  onBookingComplete?: (bookingId: string) => void;
}

export default function InstantBookingModal({
  open,
  onOpenChange,
  contractor,
  serviceType,
  onBookingComplete,
}: InstantBookingModalProps) {
  const [step, setStep] = useState<'calendar' | 'details' | 'confirm' | 'success'>('calendar');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [address, setAddress] = useState<Address>({
    street: '',
    city: '',
    state: '',
    zip: '',
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleContinueToDetails = () => {
    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }
    setError(null);
    setStep('details');
  };

  const handleContinueToConfirm = () => {
    // Validate address
    if (!address.street || !address.city || !address.state || !address.zip) {
      setError('Please fill in all address fields');
      return;
    }
    setError(null);
    setStep('confirm');
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/contractor/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId: contractor.id,
          serviceType,
          startTime: selectedSlot.startTime.toISOString(),
          endTime: selectedSlot.endTime.toISOString(),
          address,
          notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create booking');
      }

      const data = await response.json();
      setBookingId(data.booking.id);
      setStep('success');

      // If deposit is required, redirect to payment
      if (contractor.depositRequired && data.booking.depositAmount) {
        // Handle deposit payment flow
        // This would typically redirect to a payment page or open a payment modal
        console.log('Deposit required:', data.booking.depositAmount);
      }

      // Notify parent component
      if (onBookingComplete) {
        onBookingComplete(data.booking.id);
      }
    } catch (err: any) {
      console.error('Booking error:', err);
      setError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setStep('calendar');
    setSelectedSlot(null);
    setAddress({ street: '', city: '', state: '', zip: '' });
    setNotes('');
    setError(null);
    setBookingId(null);
    onOpenChange(false);
  };

  const getCancellationPolicyText = () => {
    const policy = contractor.cancellationPolicy || 'moderate';
    const hours = contractor.cancellationHours || 24;

    switch (policy) {
      case 'flexible':
        return '50% refund for any cancellation';
      case 'moderate':
        return `Full refund if cancelled ${hours}+ hours in advance`;
      case 'strict':
        return 'No refunds for cancellations';
      default:
        return 'Standard cancellation policy applies';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white">
            {step === 'calendar' && 'Select Date & Time'}
            {step === 'details' && 'Booking Details'}
            {step === 'confirm' && 'Confirm Booking'}
            {step === 'success' && 'Booking Confirmed!'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'calendar' && `Book ${serviceType} with ${contractor.businessName || contractor.name}`}
            {step === 'details' && 'Provide the service location and any additional details'}
            {step === 'confirm' && 'Review your booking details before confirming'}
            {step === 'success' && 'Your appointment has been scheduled'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Calendar */}
        {step === 'calendar' && (
          <>
            <AvailabilityCalendar
              contractorId={contractor.id}
              serviceType={serviceType}
              onSlotSelect={handleSlotSelect}
              selectedSlot={selectedSlot}
            />
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleContinueToDetails}
                disabled={!selectedSlot}
                className="bg-violet-500 hover:bg-violet-600"
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Details */}
        {step === 'details' && selectedSlot && (
          <>
            <div className="space-y-6">
              {/* Selected Time Display */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-5 w-5 text-violet-400" />
                  <span className="font-medium">
                    {format(selectedSlot.startTime, 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-violet-400" />
                  <span className="font-medium">
                    {format(selectedSlot.startTime, 'h:mm a')} - {format(selectedSlot.endTime, 'h:mm a')}
                  </span>
                </div>
              </div>

              {/* Address Form */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-violet-400" />
                  <Label className="text-white font-medium">Service Location</Label>
                </div>
                
                <div>
                  <Label htmlFor="street" className="text-slate-300">Street Address</Label>
                  <Input
                    id="street"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    placeholder="123 Main St"
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-slate-300">City</Label>
                    <Input
                      id="city"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="City"
                      className="bg-slate-800 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-slate-300">State</Label>
                    <Input
                      id="state"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      placeholder="CA"
                      maxLength={2}
                      className="bg-slate-800 border-slate-700 text-white mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="zip" className="text-slate-300">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={address.zip}
                    onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                    placeholder="12345"
                    maxLength={10}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-slate-300">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any specific instructions or details..."
                    rows={4}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('calendar')}>
                Back
              </Button>
              <Button
                onClick={handleContinueToConfirm}
                className="bg-violet-500 hover:bg-violet-600"
              >
                Review Booking
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && selectedSlot && (
          <>
            <div className="space-y-6">
              {/* Booking Summary */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 space-y-4">
                <h3 className="font-semibold text-lg text-white mb-4">Booking Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-violet-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-400">Date & Time</p>
                      <p className="font-medium">
                        {format(selectedSlot.startTime, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-slate-300">
                        {format(selectedSlot.startTime, 'h:mm a')} - {format(selectedSlot.endTime, 'h:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-violet-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-400">Location</p>
                      <p className="font-medium">{address.street}</p>
                      <p className="text-sm text-slate-300">
                        {address.city}, {address.state} {address.zip}
                      </p>
                    </div>
                  </div>

                  {notes && (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-violet-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-400">Notes</p>
                        <p className="text-sm text-slate-300">{notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Deposit Info */}
              {contractor.depositRequired && contractor.depositAmount && (
                <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-400">Deposit Required — ${contractor.depositAmount.toFixed(2)}</p>
                      <p className="text-sm text-slate-300 mt-1">
                        This deposit secures your appointment and will be charged when you confirm.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 text-sm">
                    <p className="font-medium text-white flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      Your payment is protected by escrow
                    </p>
                    <ul className="space-y-1 text-slate-400 ml-6">
                      <li>Your deposit is held securely by PropertyFlowHQ — not sent directly to the contractor.</li>
                      <li>After the job is completed, you have 3 days to confirm the work or file a dispute.</li>
                      <li>If the contractor cancels or doesn't show up, you get a full automatic refund.</li>
                      <li>Funds are only released to the contractor after you approve or the review window closes.</li>
                    </ul>
                    <p className="text-slate-500 text-xs mt-1 pt-1 border-t border-slate-700">
                      A $1.00 booking fee applies to help keep the platform running.
                    </p>
                  </div>
                </div>
              )}

              {/* No-deposit escrow note */}
              {!contractor.depositRequired && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <p className="text-sm text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    No deposit required — you won't be charged until the job is complete.
                  </p>
                </div>
              )}

              {/* Cancellation Policy */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2">
                <p className="text-sm font-medium text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-slate-400" />
                  Cancellation Policy
                </p>
                <p className="text-sm text-slate-300">{getCancellationPolicyText()}</p>
                {contractor.depositRequired && (
                  <p className="text-xs text-slate-500 pt-1 border-t border-slate-700">
                    If the contractor cancels for any reason, you receive a full refund automatically.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('details')}>
                Back
              </Button>
              <Button
                onClick={handleConfirmBooking}
                disabled={loading}
                className="bg-violet-500 hover:bg-violet-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 4: Success */}
        {step === 'success' && selectedSlot && (
          <>
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h3>
              <p className="text-slate-400 mb-6">
                Your appointment has been scheduled with {contractor.businessName || contractor.name}
              </p>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-left max-w-md mx-auto space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-violet-400" />
                  <div>
                    <p className="text-sm text-slate-400">Date</p>
                    <p className="font-medium">{format(selectedSlot.startTime, 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-violet-400" />
                  <div>
                    <p className="text-sm text-slate-400">Time</p>
                    <p className="font-medium">
                      {format(selectedSlot.startTime, 'h:mm a')} - {format(selectedSlot.endTime, 'h:mm a')}
                    </p>
                  </div>
                </div>
                {contractor.depositRequired && contractor.depositAmount && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-sm text-slate-400">Deposit</p>
                      <p className="font-medium">${contractor.depositAmount.toFixed(2)} held in escrow</p>
                    </div>
                  </div>
                )}
              </div>

              {/* What happens next */}
              <div className="bg-slate-800 rounded-lg p-5 border border-slate-700 text-left max-w-md mx-auto mt-4">
                <p className="font-medium text-white text-sm mb-3">What happens next</p>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">1</span>
                    <p className="text-slate-400">The contractor will be notified and may reach out to confirm details.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">2</span>
                    <p className="text-slate-400">On the scheduled date, the contractor arrives and completes the work.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">3</span>
                    <p className="text-slate-400">
                      {contractor.depositRequired
                        ? 'Once the job is done, confirm completion to release the deposit. You have 3 days to review or file a dispute.'
                        : 'Once the job is done, you can leave a review and settle payment directly with the contractor.'}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-500 mt-4">
                A confirmation email has been sent to your email address.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="bg-violet-500 hover:bg-violet-600 w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
