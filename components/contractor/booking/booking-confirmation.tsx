'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Booking {
  id: string;
  contractorId: string;
  customerId: string;
  serviceType: string;
  title: string;
  description?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  startTime: Date;
  endTime: Date;
  status: string;
  depositAmount?: number;
  depositPaid: boolean;
  depositPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Contractor {
  id: string;
  name: string;
  businessName?: string;
  email: string;
  phone?: string;
  image?: string;
  cancellationPolicy?: string;
  cancellationHours?: number;
}

interface BookingConfirmationProps {
  bookingId: string;
  showActions?: boolean;
  onCancel?: () => void;
}

export default function BookingConfirmation({
  bookingId,
  showActions = true,
  onCancel,
}: BookingConfirmationProps) {
  const { toast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contractor/booking/${bookingId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }

      const data = await response.json();
      
      // Convert string dates to Date objects
      const bookingData = {
        ...data.booking,
        startTime: new Date(data.booking.startTime),
        endTime: new Date(data.booking.endTime),
        createdAt: new Date(data.booking.createdAt),
        updatedAt: new Date(data.booking.updatedAt),
      };
      
      setBooking(bookingData);
      setContractor(data.contractor);
    } catch (err: any) {
      console.error('Error fetching booking:', err);
      setError(err.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setCancelling(true);
    try {
      const response = await fetch(`/api/contractor/booking/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Customer requested cancellation',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel booking');
      }

      const data = await response.json();
      
      // Show refund info if applicable
      if (data.refundAmount > 0) {
        toast({
          title: 'Booking cancelled',
          description: `A refund of $${data.refundAmount.toFixed(2)} will be processed.`,
        });
      } else {
        toast({
          title: 'Booking cancelled',
          description: data.message || 'Booking cancelled successfully.',
        });
      }

      // Refresh booking details
      await fetchBookingDetails();

      // Notify parent component
      if (onCancel) {
        onCancel();
      }
    } catch (err: any) {
      console.error('Cancellation error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to cancel booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      case 'no_show':
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
            <AlertCircle className="h-3 w-3 mr-1" />
            No Show
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
    }
  };

  const getCancellationPolicyText = () => {
    if (!contractor) return '';
    
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

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !booking || !contractor) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <p className="text-red-400 mb-4">{error || 'Booking not found'}</p>
            <Button variant="outline" onClick={fetchBookingDetails}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white text-2xl mb-2">
                {booking.title}
              </CardTitle>
              <p className="text-slate-400">Booking #{booking.id.slice(0, 8)}</p>
            </div>
            {getStatusBadge(booking.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date & Time */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <Calendar className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Date</p>
                <p className="font-medium text-white">
                  {format(booking.startTime, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Time</p>
                <p className="font-medium text-white">
                  {format(booking.startTime, 'h:mm a')} - {format(booking.endTime, 'h:mm a')}
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-violet-500/20 rounded-lg">
              <MapPin className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Location</p>
              <p className="font-medium text-white">{booking.address.street}</p>
              <p className="text-sm text-slate-300">
                {booking.address.city}, {booking.address.state} {booking.address.zip}
              </p>
            </div>
          </div>

          {/* Description/Notes */}
          {booking.description && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <FileText className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Notes</p>
                <p className="text-sm text-slate-300">{booking.description}</p>
              </div>
            </div>
          )}

          {/* Deposit Info */}
          {booking.depositAmount && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Deposit</p>
                <p className="font-medium text-white">
                  ${booking.depositAmount.toFixed(2)}
                  {booking.depositPaid ? (
                    <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/50">
                      Paid
                    </Badge>
                  ) : (
                    <Badge className="ml-2 bg-orange-500/20 text-orange-400 border-orange-500/50">
                      Pending
                    </Badge>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contractor Info Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Contractor Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {contractor.image ? (
              <img
                src={contractor.image}
                alt={contractor.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {contractor.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-semibold text-white text-lg">
                {contractor.businessName || contractor.name}
              </p>
              <p className="text-sm text-slate-400">{booking.serviceType}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-3 text-slate-300">
              <Mail className="h-4 w-4 text-slate-400" />
              <a href={`mailto:${contractor.email}`} className="hover:text-violet-400">
                {contractor.email}
              </a>
            </div>
            {contractor.phone && (
              <div className="flex items-center gap-3 text-slate-300">
                <Phone className="h-4 w-4 text-slate-400" />
                <a href={`tel:${contractor.phone}`} className="hover:text-violet-400">
                  {contractor.phone}
                </a>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-700">
            <Link href={`/contractors/${contractor.id}`}>
              <Button variant="outline" className="w-full">
                <User className="h-4 w-4 mr-2" />
                View Contractor Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Policy */}
      {booking.status === 'confirmed' && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-300">{getCancellationPolicyText()}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {showActions && booking.status === 'confirmed' && (
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleCancelBooking}
            disabled={cancelling}
            className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            {cancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Booking
              </>
            )}
          </Button>
        </div>
      )}

      {/* Booking Details Footer */}
      <div className="text-center text-sm text-slate-500">
        <p>Booked on {format(booking.createdAt, 'MMMM d, yyyy \'at\' h:mm a')}</p>
      </div>
    </div>
  );
}
