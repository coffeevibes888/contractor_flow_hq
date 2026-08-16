'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';

type Appointment = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduledDate: Date | null;
  actualStartDate: Date | null;
  address: string | null;
  contractor: {
    id: string;
    businessName: string | null;
    displayName: string | null;
    phone: string | null;
    email: string | null;
  };
};

export function CustomerAppointmentCalendar({
  appointments,
}: {
  appointments: Appointment[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('list');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => {
      const aptDate = apt.scheduledDate || apt.actualStartDate;
      return aptDate && isSameDay(new Date(aptDate), day);
    });
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    scheduled: 'bg-violet-100 text-violet-700',
    in_progress: 'bg-cyan-100 text-cyan-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = a.scheduledDate || a.actualStartDate;
    const dateB = b.scheduledDate || b.actualStartDate;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'list'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'calendar'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Calendar View
          </button>
        </div>

        {view === 'calendar' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Calendar View */}
      {view === 'calendar' ? (
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-600 py-2"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map((day) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] p-2 rounded-lg border-2 ${
                    isToday
                      ? 'border-blue-400 bg-blue-50'
                      : isSameMonth(day, currentMonth)
                      ? 'border-gray-200 bg-white'
                      : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.map((apt) => (
                      <Link
                        key={apt.id}
                        href={`/customer/jobs/${apt.id}`}
                        className="block text-xs p-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 truncate"
                      >
                        {apt.title}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              All Appointments
            </h3>
          </div>
          <div className="p-5">
            {sortedAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 mb-4">No appointments scheduled</p>
                <Link href="/contractor-marketplace">
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
                    Find Contractors
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedAppointments.map((apt) => {
                  const aptDate = apt.scheduledDate || apt.actualStartDate;
                  const isPast = aptDate && new Date(aptDate) < new Date();

                  return (
                    <div
                      key={apt.id}
                      className={`rounded-lg border-2 ${
                        isPast ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50'
                      } hover:shadow-md transition-all p-5`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900 truncate">
                              {apt.title}
                            </h4>
                            <Badge className={statusColors[apt.status]}>
                              {apt.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          {apt.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {apt.description}
                            </p>
                          )}
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>
                                {apt.contractor.businessName ||
                                  apt.contractor.displayName}
                              </span>
                            </div>
                            {aptDate && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(new Date(aptDate), 'PPP p')}
                                </span>
                              </div>
                            )}
                            {apt.address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{apt.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t-2 border-gray-100">
                        <Link href={`/customer/jobs/${apt.id}`} className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-2 border-gray-200"
                          >
                            View Details
                          </Button>
                        </Link>
                        {apt.contractor.phone && (
                          <a href={`tel:${apt.contractor.phone}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Call
                            </Button>
                          </a>
                        )}
                        {apt.contractor.email && (
                          <a href={`mailto:${apt.contractor.email}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2 border-gray-200"
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Email
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
