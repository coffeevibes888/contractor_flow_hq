'use client';

import { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Calendar,
  Hammer,
  Pause,
  ClipboardCheck,
  Receipt,
  DollarSign,
  XCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const STATUS_STEPS = [
  { key: 'quoted', label: 'Quoted', icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100' },
  { key: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-100' },
  { key: 'scheduled', label: 'Scheduled', icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  { key: 'in_progress', label: 'In Progress', icon: Hammer, color: 'text-amber-500', bg: 'bg-amber-100' },
  { key: 'completed', label: 'Completed', icon: ClipboardCheck, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  { key: 'invoiced', label: 'Invoiced', icon: Receipt, color: 'text-purple-500', bg: 'bg-purple-100' },
  { key: 'paid', label: 'Paid', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
];

const NEXT_STATUS: Record<string, string> = {
  quoted: 'approved',
  approved: 'scheduled',
  scheduled: 'in_progress',
  in_progress: 'completed',
  completed: 'invoiced',
  invoiced: 'paid',
};

const NEXT_ACTION_LABEL: Record<string, string> = {
  quoted: 'Approve Job',
  approved: 'Schedule Job',
  scheduled: 'Start Work',
  in_progress: 'Mark Complete',
  completed: 'Send Invoice',
  invoiced: 'Record Payment',
};

interface JobStatusPipelineProps {
  jobId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  readOnly?: boolean;
}

export function JobStatusPipeline({
  jobId,
  currentStatus,
  onStatusChange,
  readOnly = false,
}: JobStatusPipelineProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState(currentStatus);
  const [transitioning, setTransitioning] = useState(false);

  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === status);
  const isCanceled = status === 'canceled';
  const isOnHold = status === 'on_hold';

  const advanceStatus = async () => {
    const nextStatus = NEXT_STATUS[status];
    if (!nextStatus) return;

    setTransitioning(true);
    try {
      const response = await fetch(`/api/contractor/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (response.ok) {
        setStatus(nextStatus);
        onStatusChange?.(nextStatus);
        toast({
          title: 'Status Updated',
          description: `Job moved to "${STATUS_STEPS.find((s) => s.key === nextStatus)?.label}"`,
        });
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setTransitioning(false);
    }
  };

  const toggleHold = async () => {
    const newStatus = isOnHold ? 'in_progress' : 'on_hold';
    setTransitioning(true);
    try {
      const response = await fetch(`/api/contractor/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
        toast({
          title: isOnHold ? 'Job Resumed' : 'Job On Hold',
          description: isOnHold ? 'Work has resumed' : 'Job has been put on hold',
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setTransitioning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Pipeline visualization */}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-4 overflow-x-auto">
        <div className="flex items-center min-w-[600px]">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = step.key === status;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? `${step.bg} ${step.color} ring-2 ring-offset-2 ring-current`
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      isCompleted
                        ? 'text-emerald-600'
                        : isCurrent
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STATUS_STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 ${
                      index < currentIndex ? 'bg-emerald-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Special states */}
      {isCanceled && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-500" />
          <span className="text-sm font-medium text-red-700">This job has been canceled</span>
        </div>
      )}

      {isOnHold && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <Pause className="h-5 w-5 text-amber-500" />
          <span className="text-sm font-medium text-amber-700">This job is on hold</span>
        </div>
      )}

      {/* Actions */}
      {!readOnly && !isCanceled && (
        <div className="flex items-center gap-3">
          {NEXT_STATUS[status] && (
            <Button
              onClick={advanceStatus}
              disabled={transitioning}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              {transitioning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              {NEXT_ACTION_LABEL[status] || 'Next Step'}
            </Button>
          )}

          {(status === 'in_progress' || isOnHold) && (
            <Button
              onClick={toggleHold}
              disabled={transitioning}
              variant="outline"
              className="border-2 border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <Pause className="h-4 w-4 mr-2" />
              {isOnHold ? 'Resume Work' : 'Put On Hold'}
            </Button>
          )}

          {status === 'paid' && (
            <Badge className="bg-emerald-100 text-emerald-700 text-sm py-1.5 px-3">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Job Complete & Paid
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
