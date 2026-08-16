import { Badge } from '@/components/ui/badge';

interface JobStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  quoted: { label: 'Quoted', className: 'bg-amber-500/30 text-amber-200 border-amber-400/30' },
  approved: { label: 'Approved', className: 'bg-green-500/30 text-green-200 border-green-400/30' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-500/30 text-blue-200 border-blue-400/30' },
  in_progress: { label: 'In Progress', className: 'bg-violet-500/30 text-violet-200 border-violet-400/30' },
  on_hold: { label: 'On Hold', className: 'bg-orange-500/30 text-orange-200 border-orange-400/30' },
  completed: { label: 'Completed', className: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30' },
  invoiced: { label: 'Invoiced', className: 'bg-cyan-500/30 text-cyan-200 border-cyan-400/30' },
  paid: { label: 'Paid', className: 'bg-green-600/30 text-green-300 border-green-500/30' },
  canceled: { label: 'Canceled', className: 'bg-red-500/30 text-red-200 border-red-400/30' },
};

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-500/30 text-gray-200' };
  
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
}
