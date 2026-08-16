'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Play, Square, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TimeClockPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState('');

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  // Load active time entry and jobs
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load active time entry
      const entryRes = await fetch('/api/contractor/time-tracking/active');
      if (entryRes.ok) {
        const data = await entryRes.json();
        setCurrentEntry(data.entry);
      }

      // Load jobs
      const jobsRes = await fetch('/api/contractor/jobs?status=in_progress,scheduled');
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleClockIn = async () => {
    if (!selectedJob) {
      toast({
        title: 'Select a job',
        description: 'Please select a job to clock in',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/contractor/time-tracking/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJob,
          location,
        }),
      });

      if (!response.ok) throw new Error('Failed to clock in');

      const { entry } = await response.json();
      setCurrentEntry(entry);

      toast({
        title: 'Clocked In',
        description: 'Time tracking started',
      });
    } catch (error) {
      console.error('Error clocking in:', error);
      toast({
        title: 'Error',
        description: 'Failed to clock in',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;

    setLoading(true);
    try {
      const response = await fetch('/api/contractor/time-tracking/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: currentEntry.id,
          location,
        }),
      });

      if (!response.ok) throw new Error('Failed to clock out');

      setCurrentEntry(null);
      setSelectedJob('');

      toast({
        title: 'Clocked Out',
        description: 'Time tracking stopped',
      });
    } catch (error) {
      console.error('Error clocking out:', error);
      toast({
        title: 'Error',
        description: 'Failed to clock out',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getElapsedTime = () => {
    if (!currentEntry) return '0:00:00';
    const start = new Date(currentEntry.clockIn);
    const diff = currentTime.getTime() - start.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-blue-600">Time Clock</h1>
        <p className="text-gray-600 mt-1">Clock in and out of jobs</p>
      </div>

      {/* Current Time */}
      <Card className="border-2 border-gray-200 bg-white shadow-sm">
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto text-violet-600 mb-4" />
          <p className="text-5xl font-bold text-gray-900 mb-2">
            {currentTime.toLocaleTimeString()}
          </p>
          <p className="text-gray-600">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </CardContent>
      </Card>

      {/* Status */}
      <Card className="border-2 border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center justify-between">
            <span>Status</span>
            {currentEntry ? (
              <Badge className="bg-emerald-500/30 text-emerald-200">
                Clocked In
              </Badge>
            ) : (
              <Badge className="bg-gray-500/30 text-gray-200">
                Clocked Out
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentEntry ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Job</p>
                <p className="text-gray-900 font-semibold">
                  {jobs.find(j => j.id === currentEntry.jobId)?.title || 'Unknown Job'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Time Elapsed</p>
                <p className="text-3xl font-bold text-violet-600">
                  {getElapsedTime()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Clocked In At</p>
                <p className="text-gray-900">
                  {new Date(currentEntry.clockIn).toLocaleTimeString()}
                </p>
              </div>
              {location && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="h-4 w-4" />
                  <span>GPS Location Tracked</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-900 mb-2 font-bold">
                  Select Job
                </label>
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Choose a job...</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.jobNumber} - {job.title}
                    </option>
                  ))}
                </select>
              </div>
              {location && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <MapPin className="h-4 w-4" />
                  <span>GPS Location Ready</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border-2 border-gray-200 bg-white shadow-sm">
        <CardContent className="p-6">
          {currentEntry ? (
            <Button
              onClick={handleClockOut}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-gray-900 py-6 text-lg"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
              ) : (
                <Square className="h-6 w-6 mr-2" />
              )}
              Clock Out
            </Button>
          ) : (
            <Button
              onClick={handleClockIn}
              disabled={loading || !selectedJob}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-gray-900 py-6 text-lg"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
              ) : (
                <Play className="h-6 w-6 mr-2" />
              )}
              Clock In
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
