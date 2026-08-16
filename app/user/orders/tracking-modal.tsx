'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Package, MapPin, Calendar } from 'lucide-react';
import { getOrderTracking, updateOrderTracking } from '@/lib/actions/tracking.actions';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TrackingEvent {
  timestamp: string;
  location: string;
  status: string;
  description: string;
}

interface TrackingData {
  id: string;
  trackingNumber: string | null;
  trackingStatus: string | null;
  trackingEvents: TrackingEvent[];
  lastTrackingUpdate: Date | null;
  isPaid: boolean;
  isDelivered: boolean;
}

interface TrackingModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

const TrackingModal = ({ orderId, isOpen, onClose }: TrackingModalProps) => {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoPolling, setAutoPolling] = useState(true);
  const { toast } = useToast();

  const fetchTracking = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await getOrderTracking(orderId);

      if (res.success && res.data) {
        setTracking(res.data);
      } else {
        toast({
          variant: 'destructive',
          description: res.message || 'Failed to load tracking',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        description: 'Error loading tracking information',
      });
    } finally {
      if (showLoading) setIsLoading(false);
      else setIsRefreshing(false);
    }
  }, [orderId, toast]);

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await updateOrderTracking(orderId);

      if (res.success) {
        await fetchTracking(false);
        toast({
          description: 'Tracking updated successfully',
        });
      } else {
        toast({
          variant: 'destructive',
          description: res.message || 'Failed to update tracking',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        description: 'Error updating tracking',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [orderId, fetchTracking, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchTracking(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!autoPolling || !isOpen || !tracking?.trackingNumber) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPolling, isOpen, tracking?.trackingNumber]);

  if (!tracking) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Order Tracking</DialogTitle>
          </DialogHeader>
          {isLoading && (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Loading tracking information...
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  if (!tracking.trackingNumber) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Order Tracking</DialogTitle>
          </DialogHeader>
          <div className='py-8 text-center'>
            <p className='text-muted-foreground'>
              Tracking number not available yet. Please check back later.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('delivered')) return 'bg-green-500/20 text-green-700';
    if (lowerStatus.includes('out')) return 'bg-blue-500/20 text-blue-700';
    if (lowerStatus.includes('transit')) return 'bg-yellow-500/20 text-yellow-700';
    return 'bg-gray-500/20 text-gray-700';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center justify-between'>
            <span>Order Tracking</span>
            <Badge variant='outline'>{tracking.trackingNumber}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <Card className='backdrop-blur-md bg-white/10 border border-white/20'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h3 className='text-sm font-medium text-gray-400'>
                    Current Status
                  </h3>
                  <Badge className={getStatusColor(tracking.trackingStatus || '')}>
                    {tracking.trackingStatus || 'Unknown'}
                  </Badge>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Updating...
                    </>
                  ) : (
                    'Refresh'
                  )}
                </Button>
              </div>

              <div className='text-sm text-gray-400'>
                {tracking.lastTrackingUpdate && (
                  <p>
                    Last updated:{' '}
                    {formatDateTime(new Date(tracking.lastTrackingUpdate)).dateTime}
                  </p>
                )}
              </div>

              <label className='mt-4 flex items-center space-x-2 text-sm'>
                <input
                  type='checkbox'
                  checked={autoPolling}
                  onChange={(e) => setAutoPolling(e.target.checked)}
                  className='rounded'
                />
                <span className='text-gray-400'>
                  Auto-update every 5 minutes
                </span>
              </label>
            </CardContent>
          </Card>

          <Card className='backdrop-blur-md bg-white/10 border border-white/20'>
            <CardContent className='p-4'>
              <h3 className='font-semibold mb-4 flex items-center'>
                <Package className='mr-2 h-4 w-4' />
                Tracking History
              </h3>

              <div className='space-y-4'>
                {tracking.trackingEvents && tracking.trackingEvents.length > 0 ? (
                  tracking.trackingEvents.map((event, idx) => (
                    <div key={idx} className='flex gap-4 pb-4 border-b border-white/10 last:border-0'>
                      <div className='flex flex-col items-center'>
                        <div className='w-3 h-3 rounded-full bg-violet-500 mt-1.5' />
                        {idx < tracking.trackingEvents.length - 1 && (
                          <div className='w-0.5 h-12 bg-white/10 my-2' />
                        )}
                      </div>
                      <div className='flex-1'>
                        <div className='flex items-start justify-between'>
                          <div>
                            <p className='font-medium'>{event.status}</p>
                            <p className='text-sm text-gray-400 mt-1'>
                              {event.description}
                            </p>
                          </div>
                        </div>
                        <div className='flex gap-4 mt-2 text-xs text-gray-500'>
                          {event.location && (
                            <span className='flex items-center'>
                              <MapPin className='mr-1 h-3 w-3' />
                              {event.location}
                            </span>
                          )}
                          <span className='flex items-center'>
                            <Calendar className='mr-1 h-3 w-3' />
                            {formatDateTime(new Date(event.timestamp)).dateTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className='text-sm text-gray-400 text-center py-4'>
                    No tracking events yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrackingModal;
