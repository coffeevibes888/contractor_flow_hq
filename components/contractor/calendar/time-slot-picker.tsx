'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
}

interface TimeSlotPickerProps {
  contractorId: string;
  selectedDate: Date;
  serviceType: string;
  onSlotSelect: (slot: TimeSlot) => void;
  selectedSlot?: TimeSlot | null;
}

export default function TimeSlotPicker({
  contractorId,
  selectedDate,
  serviceType,
  onSlotSelect,
  selectedSlot,
}: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeSlots();
  }, [contractorId, selectedDate, serviceType]);

  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/contractor/calendar/slots?contractorId=${contractorId}&date=${selectedDate.toISOString()}&serviceType=${serviceType}`
      );

      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots.map((slot: any) => ({
          ...slot,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime),
        })));
      }
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableSlots = slots.filter(slot => slot.isAvailable);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading available times...</div>
        </CardContent>
      </Card>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No available time slots for this date</p>
            <p className="text-sm mt-1">Please select another date</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Available Times
        </CardTitle>
        <CardDescription>
          {format(selectedDate, 'EEEE, MMMM d, yyyy')} - {availableSlots.length} slots available
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {availableSlots.map((slot, index) => {
            const isSelected = selectedSlot && 
              slot.startTime.getTime() === selectedSlot.startTime.getTime();

            return (
              <Button
                key={index}
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  'h-auto py-3 flex flex-col items-center gap-1',
                  isSelected && 'ring-2 ring-primary'
                )}
                onClick={() => onSlotSelect(slot)}
              >
                {isSelected && <CheckCircle2 className="h-4 w-4" />}
                <span className="font-semibold">{format(slot.startTime, 'h:mm a')}</span>
                <span className="text-xs text-muted-foreground">
                  {format(slot.endTime, 'h:mm a')}
                </span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
