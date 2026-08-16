'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, MapPin } from 'lucide-react';
import Image from 'next/image';

interface TimeEntry {
  id: string;
  clockIn: Date;
  clockOut?: Date | null;
  duration?: number | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    photo?: string | null;
  } | null;
  notes?: string | null;
  status: string;
}

interface JobTimeEntriesProps {
  jobId: string;
  timeEntries: TimeEntry[];
}

export function JobTimeEntries({ jobId, timeEntries }: JobTimeEntriesProps) {
  const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">Time Entries</CardTitle>
          <p className="text-sm text-white/70 mt-1">
            Total: {totalHours} hours logged
          </p>
        </div>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Log Time
        </Button>
      </CardHeader>
      <CardContent>
        {timeEntries.length === 0 ? (
          <p className="text-white/70 text-center py-8">No time entries yet</p>
        ) : (
          <div className="space-y-3">
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {entry.employee && (
                      <>
                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                          {entry.employee.photo ? (
                            <Image
                              src={entry.employee.photo}
                              alt={`${entry.employee.firstName} ${entry.employee.lastName}`}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold">
                              {entry.employee.firstName[0]}{entry.employee.lastName[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {entry.employee.firstName} {entry.employee.lastName}
                          </p>
                          <p className="text-sm text-white/60">
                            {new Date(entry.clockIn).toLocaleDateString()}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    {entry.duration ? (
                      <p className="text-lg font-semibold text-white">
                        {formatDuration(entry.duration)}
                      </p>
                    ) : (
                      <Badge className="bg-violet-500/30 text-violet-200">
                        In Progress
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-white/60">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(entry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {entry.clockOut && ` - ${new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                  </div>
                  {entry.status === 'pending' && (
                    <Badge className="bg-amber-500/30 text-amber-200 text-xs">
                      Pending Approval
                    </Badge>
                  )}
                </div>

                {entry.notes && (
                  <p className="text-sm text-white/70 mt-2">{entry.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
