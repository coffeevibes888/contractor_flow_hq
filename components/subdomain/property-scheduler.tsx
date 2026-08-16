'use client';

/**
 * PropertyScheduler — Resy/OpenTable-style viewing-request flow.
 *
 * Replaces the old `<Calendar />`-driven layout with a horizontal day-chip
 * picker (next 14 dates) plus a clean time-slot grid. Clicking a time pulls
 * up an inline lead form. Booking still goes through `bookAppointment` so
 * the back-end pipeline (events, notifications, visitor email) is unchanged.
 *
 * Theming: white card, slate borders, blue/black gradient title to match
 * the rest of the PM admin and the new property page.
 */

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import {
  bookAppointment,
  getPropertySchedule,
  getPropertyAppointments,
} from '@/lib/actions/schedule.actions';
import { toast } from '@/hooks/use-toast';
import { addDays, addMinutes, format, isSameDay, parse } from 'date-fns';

interface PropertySchedulerProps {
  propertyId: string;
  propertyName: string;
}

const DAYS_TO_SHOW = 14;

export default function PropertyScheduler({ propertyId, propertyName }: PropertySchedulerProps) {
  const [schedule, setSchedule] = useState<any>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', notes: '' });

  // ── Initial schedule fetch ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const result = await getPropertySchedule(propertyId);
        if (!cancelled && result.success && result.schedule) {
          setSchedule(result.schedule);
        }
      } catch (err) {
        console.error('Failed to load schedule:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  // ── Compute slots for the picked date ─────────────────────────────────────
  useEffect(() => {
    if (!schedule || !date) {
      setAvailableSlots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsSlotsLoading(true);
      try {
        const dayName = format(date, 'EEEE').toLowerCase();
        const daySchedule = schedule.schedule?.[dayName];
        if (!daySchedule || !daySchedule.enabled) {
          if (!cancelled) setAvailableSlots([]);
          return;
        }

        const appointmentsResult = await getPropertyAppointments(propertyId, date);
        const appointments =
          appointmentsResult.success && Array.isArray(appointmentsResult.appointments)
            ? appointmentsResult.appointments
            : [];
        const booked = new Set(appointments.map((apt: any) => apt.startTime));
        const slotDuration = schedule.slotDuration || 30;

        const slots: { start: string; end: string }[] = [];
        for (const range of daySchedule.slots ?? []) {
          let cur = parse(range.start, 'HH:mm', date);
          const end = parse(range.end, 'HH:mm', date);
          while (cur < end) {
            const slotStart = format(cur, 'HH:mm');
            const next = addMinutes(cur, slotDuration);
            const slotEnd = format(next, 'HH:mm');
            if (!booked.has(slotStart)) {
              slots.push({ start: slotStart, end: slotEnd });
            }
            cur = next;
          }
        }

        if (!cancelled) setAvailableSlots(slots);
      } catch (err) {
        console.error('Failed to load slots:', err);
        if (!cancelled) setAvailableSlots([]);
      } finally {
        if (!cancelled) setIsSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schedule, date, propertyId]);

  // ── 14-day strip, paginated by week ───────────────────────────────────────
  const days = useMemo(() => {
    const start = addDays(new Date(), weekOffset * 7);
    return Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(start, i));
  }, [weekOffset]);

  const handleSlotSelect = (slot: { start: string; end: string }) => {
    setSelectedSlot(slot);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setIsSubmitting(true);
    try {
      const result = await bookAppointment({
        propertyId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        date,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        notes: formData.notes,
      });
      if (result.success) {
        toast({
          title: 'Appointment booked',
          description: "We've sent a confirmation to your email.",
        });
        setShowForm(false);
        setSelectedSlot(null);
        setFormData({ name: '', email: '', phone: '', notes: '' });
        // Refresh slots so the booked one falls off the grid
        setAvailableSlots((prev) => prev.filter((s) => s.start !== selectedSlot.start));
      } else {
        toast({
          title: 'Could not book',
          description: result.message || 'Please try again.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Could not book',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SectionShell>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      </SectionShell>
    );
  }

  if (!schedule || !schedule.schedule) {
    return (
      <SectionShell>
        <div className="py-12 text-center">
          <Clock className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-700 font-medium">Viewing schedule isn't set up yet.</p>
          <p className="text-sm text-slate-500 mt-1">Use the contact form below to request a tour.</p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell>
      <div className="px-5 sm:px-6 md:px-8 pt-5 sm:pt-6 md:pt-7">
        <Header propertyName={propertyName} />
      </div>

      {!showForm ? (
        <div className="px-5 sm:px-6 md:px-8 pb-5 sm:pb-6 md:pb-8 pt-4 sm:pt-5 space-y-5 sm:space-y-6">
          {/* Day-chip strip */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
              disabled={weekOffset === 0}
              aria-label="Previous week"
              className="grid h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5 sm:gap-2 min-w-max">
                {days.map((d) => {
                  const isSelected = isSameDay(d, date);
                  const isToday = isSameDay(d, new Date());
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      onClick={() => setDate(d)}
                      className={`flex flex-col items-center justify-center h-14 sm:h-16 w-12 sm:w-14 md:w-16 rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isSelected
                          ? 'border-blue-600 bg-gradient-to-b from-slate-900 to-blue-700 text-white shadow-lg'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`text-[10px] uppercase tracking-wider ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {format(d, 'EEE')}
                      </span>
                      <span className="text-lg font-semibold leading-tight">{format(d, 'd')}</span>
                      {isToday && !isSelected && (
                        <span className="text-[9px] font-medium text-blue-600">Today</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setWeekOffset((w) => Math.min(4, w + 1))}
              disabled={weekOffset >= 4}
              aria-label="Next week"
              className="grid h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Time-slot grid */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-3">
              Available times — {format(date, 'EEEE, MMM d')}
            </p>
            {isSlotsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking availability…
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm text-slate-600">No times open on this day.</p>
                <p className="text-xs text-slate-500 mt-1">Pick another date or send a contact request.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => handleSlotSelect(slot)}
                    className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl border border-slate-200 bg-white px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-700 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {formatTime(slot.start)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-5 sm:px-6 md:px-8 pb-5 sm:pb-6 md:pb-8 pt-4 sm:pt-5 space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Selected:</span>{' '}
              {format(date, 'EEEE, MMM d')} at {formatTime(selectedSlot!.start)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-700">Full name</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Doe"
                className="bg-white border-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@example.com"
                className="bg-white border-slate-300"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-slate-700">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
              className="bg-white border-slate-300"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-slate-700">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anything we should know?"
              rows={3}
              className="bg-white border-slate-300"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setSelectedSlot(null);
              }}
              className="flex-1 border-slate-300"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-slate-900 to-blue-700 text-white hover:from-slate-800 hover:to-blue-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Booking…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm tour
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </SectionShell>
  );
}

// ── Tiny presentational helpers ───────────────────────────────────────────────

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
      <div className="overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Header({ propertyName }: { propertyName: string }) {
  return (
    <header className="space-y-1">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-blue-700 bg-clip-text text-transparent inline-flex items-center gap-2">
        <CalendarIcon className="h-5 w-5 text-blue-600" />
        Schedule a viewing
      </h2>
      <p className="text-sm text-slate-600">Pick a day and time to tour {propertyName}.</p>
    </header>
  );
}

function formatTime(hhmm: string): string {
  // "13:30" -> "1:30 PM"
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}
