'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { setPropertySchedule } from '@/lib/actions/schedule.actions';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ScheduleHoursButtonProps {
  propertyId: string;
  existingSchedule?: any;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ScheduleHoursButton({ propertyId, existingSchedule }: ScheduleHoursButtonProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [schedule, setSchedule] = useState<any>(
    existingSchedule?.schedule || {
      monday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
      tuesday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
      wednesday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
      thursday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
      friday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
      saturday: { enabled: false, slots: [{ start: '10:00', end: '16:00' }] },
      sunday: { enabled: false, slots: [{ start: '10:00', end: '16:00' }] },
    }
  );

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await setPropertySchedule(propertyId, schedule);
      
      if (result.success) {
        toast({
          title: 'Schedule Updated',
          description: 'Property viewing hours have been set successfully.',
        });
        setOpen(false);
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to update schedule',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setSchedule((prev: any) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const updateSlot = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setSchedule((prev: any) => {
      const newSlots = [...prev[day].slots];
      newSlots[index] = { ...newSlots[index], [field]: value };
      return {
        ...prev,
        [day]: { ...prev[day], slots: newSlots },
      };
    });
  };

  const addSlot = (day: string) => {
    setSchedule((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, { start: '09:00', end: '17:00' }],
      },
    }));
  };

  const removeSlot = (day: string, index: number) => {
    setSchedule((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_: any, i: number) => i !== index),
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Clock className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Set Schedule Hours</span>
          <span className="sm:hidden">Schedule</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Set Viewing Schedule</DialogTitle>
          <DialogDescription className="text-slate-300">
            Configure available days and hours for property viewings and appointments.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {DAYS.map((day) => (
            <div key={day} className="border border-white/10 rounded-lg p-4 space-y-3 bg-slate-800/50">
              <div className="flex items-center justify-between">
                <Label htmlFor={day} className="text-base font-semibold capitalize text-white">
                  {day}
                </Label>
                <Switch
                  id={day}
                  checked={schedule[day].enabled}
                  onCheckedChange={() => toggleDay(day)}
                />
              </div>
              {schedule[day].enabled && (
                <div className="space-y-2 pl-4">
                  {schedule[day].slots.map((slot: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateSlot(day, index, 'start', e.target.value)}
                        className="w-32 bg-slate-900/50 border-white/10 text-white"
                      />
                      <span className="text-slate-300">to</span>
                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateSlot(day, index, 'end', e.target.value)}
                        className="w-32 bg-slate-900/50 border-white/10 text-white"
                      />
                      {schedule[day].slots.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSlot(day, index)}
                          className="hover:bg-red-500/20"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSlot(day)}
                    className="mt-2 border-white/20 text-white hover:bg-violet-500/20 hover:border-violet-400"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Time Slot
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="border-white/20 text-white">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-violet-500 hover:bg-violet-600">
            {isLoading ? 'Saving...' : 'Save Schedule'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
