'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Clock, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
  bufferMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function WorkingHoursManager({ contractorId }: { contractorId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<WorkingHours>({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '17:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00' },
    bufferMinutes: 30,
    minNoticeHours: 24,
    maxAdvanceDays: 60,
  });

  useEffect(() => {
    fetchWorkingHours();
  }, [contractorId]);

  const fetchWorkingHours = async () => {
    try {
      const res = await fetch(`/api/contractor/calendar/availability?contractorId=${contractorId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.availability) {
          setHours({
            monday: data.availability.weeklySchedule.monday,
            tuesday: data.availability.weeklySchedule.tuesday,
            wednesday: data.availability.weeklySchedule.wednesday,
            thursday: data.availability.weeklySchedule.thursday,
            friday: data.availability.weeklySchedule.friday,
            saturday: data.availability.weeklySchedule.saturday,
            sunday: data.availability.weeklySchedule.sunday,
            bufferMinutes: data.availability.bufferMinutes,
            minNoticeHours: data.availability.minNoticeHours,
            maxAdvanceDays: data.availability.maxAdvanceDays,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch working hours:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/contractor/calendar/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractorId, availability: hours }),
      });

      if (res.ok) {
        toast({ title: 'Working hours updated successfully' });
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      toast({ title: 'Failed to update working hours', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (day: string, field: keyof DaySchedule, value: any) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day as keyof WorkingHours] as DaySchedule, [field]: value }
    }));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card className="rounded-xl bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Clock className="h-5 w-5 text-amber-500" />
          Working Hours
        </CardTitle>
        <CardDescription className="text-gray-500">
          Set your availability schedule for customer bookings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekly Schedule */}
        <div className="space-y-2">
          {DAYS.map(({ key, label }) => {
            const day = hours[key as keyof WorkingHours] as DaySchedule;
            return (
              <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50/40">
                <div className="w-full sm:w-40">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={(checked) => updateDay(key, 'enabled', checked)}
                      className="data-[state=checked]:bg-amber-500"
                    />
                    <Label className="font-medium text-gray-900">{label}</Label>
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-3 flex-wrap">
                  <Input
                    type="time"
                    value={day.start}
                    onChange={(e) => updateDay(key, 'start', e.target.value)}
                    disabled={!day.enabled}
                    className="w-32 border-gray-200 text-gray-900 bg-white disabled:opacity-50"
                  />
                  <span className="text-gray-500 text-sm font-medium">to</span>
                  <Input
                    type="time"
                    value={day.end}
                    onChange={(e) => updateDay(key, 'end', e.target.value)}
                    disabled={!day.enabled}
                    className="w-32 border-gray-200 text-gray-900 bg-white disabled:opacity-50"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Booking Settings */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h4 className="font-bold text-gray-900 text-sm">Booking Window</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">Buffer Time (minutes)</Label>
              <Input
                type="number"
                value={hours.bufferMinutes}
                onChange={(e) => setHours(prev => ({ ...prev, bufferMinutes: parseInt(e.target.value) || 0 }))}
                min="0"
                max="120"
                className="border-gray-200 text-gray-900 bg-white"
              />
              <p className="text-[11px] text-gray-500">Time between appointments</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">Minimum Notice (hours)</Label>
              <Input
                type="number"
                value={hours.minNoticeHours}
                onChange={(e) => setHours(prev => ({ ...prev, minNoticeHours: parseInt(e.target.value) || 0 }))}
                min="1"
                max="168"
                className="border-gray-200 text-gray-900 bg-white"
              />
              <p className="text-[11px] text-gray-500">Advance booking required</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">Max Advance (days)</Label>
              <Input
                type="number"
                value={hours.maxAdvanceDays}
                onChange={(e) => setHours(prev => ({ ...prev, maxAdvanceDays: parseInt(e.target.value) || 1 }))}
                min="1"
                max="365"
                className="border-gray-200 text-gray-900 bg-white"
              />
              <p className="text-[11px] text-gray-500">How far ahead to book</p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Working Hours'}
        </Button>
      </CardContent>
    </Card>
  );
}
