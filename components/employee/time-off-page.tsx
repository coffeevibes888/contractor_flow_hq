'use client';

import { useState, useTransition } from 'react';
import { 
  Umbrella, Plus, Calendar, Clock, 
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { requestTimeOff } from '@/lib/actions/team-operations.actions';
import { format, differenceInDays } from 'date-fns';

interface TimeOffRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

interface TimeOffPageProps {
  requests: TimeOffRequest[];
}

export function TimeOffPage({ requests }: TimeOffPageProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const deniedRequests = requests.filter(r => r.status === 'denied');

  const handleSubmit = async (formData: FormData) => {
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const reason = formData.get('reason') as string;

    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    startTransition(async () => {
      const result = await requestTimeOff({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason: reason || undefined,
      });

      if (result.success) {
        toast.success('Time off request submitted!');
        setIsCreateOpen(false);
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'denied':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Denied
          </Badge>
        );
      default:
        return null;
    }
  };

  const getDaysCount = (start: string, end: string) => {
    return differenceInDays(new Date(end), new Date(start)) + 1;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Time Off</h1>
          <p className="text-slate-400 mt-1">Request and manage your time off</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="h-4 w-4 mr-2" />
              Request Time Off
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Umbrella className="h-5 w-5 text-amber-400" />
                Request Time Off
              </DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Start Date</Label>
                  <Input 
                    type="date" 
                    name="startDate" 
                    required 
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="bg-white/5 border-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">End Date</Label>
                  <Input 
                    type="date" 
                    name="endDate" 
                    required 
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="bg-white/5 border-white/10" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Reason (optional)</Label>
                <Textarea 
                  name="reason" 
                  placeholder="Vacation, personal day, medical appointment, etc."
                  className="bg-white/5 border-white/10 min-h-[100px]" 
                />
              </div>

              <Button 
                type="submit" 
                disabled={isPending} 
                className="w-full bg-emerald-600 hover:bg-emerald-500"
              >
                {isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingRequests.length}</p>
                <p className="text-xs text-slate-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{approvedRequests.length}</p>
                <p className="text-xs text-slate-400">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{deniedRequests.length}</p>
                <p className="text-xs text-slate-400">Denied</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => (
              <div 
                key={request.id}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-900/60 border border-white/5"
              >
                <div>
                  <div className="flex items-center gap-2 text-white">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d, yyyy')}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {getDaysCount(request.startDate, request.endDate)} day(s)
                    {request.reason && ` • ${request.reason}`}
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Requests */}
      <Card className="border-white/10 bg-slate-800/60">
        <CardHeader>
          <CardTitle className="text-white">Request History</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Umbrella className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No time off requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div 
                  key={request.id}
                  className="p-4 rounded-lg bg-slate-900/60 border border-white/5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-white">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d, yyyy')}
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-sm text-slate-400">
                    {getDaysCount(request.startDate, request.endDate)} day(s)
                    {request.reason && ` • ${request.reason}`}
                  </p>
                  {request.reviewedAt && (
                    <div className="mt-2 pt-2 border-t border-white/5 text-xs text-slate-500">
                      Reviewed by {request.reviewedBy} on {format(new Date(request.reviewedAt), 'MMM d, yyyy')}
                      {request.reviewNotes && (
                        <p className="mt-1 italic">&quot;{request.reviewNotes}&quot;</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
