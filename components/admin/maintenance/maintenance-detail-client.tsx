'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  MapPin,
  User,
  Calendar,
  Clock,
  DollarSign,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Paperclip,
  Trash2,
  Save,
  Image as ImageIcon,
  Video,
  Eye,
  Lock,
  Truck,
  Send,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tenant {
  id: string;
  name: string | null;
  email: string;
}

interface Attachment {
  type: 'image' | 'video';
  url: string;
  filename: string;
  uploadedAt: string;
}

interface Comment {
  userId: string;
  userName: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

interface MaintenanceTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedToName: string | null;
  cost: number | null;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  estimatedCompletionDate: string | null;
  location: string | null;
  attachments: Attachment[];
  accessSchedule: string[];
  accessNotes: string | null;
  comments: Comment[];
  tenant: Tenant | null;
  propertyImage: string | null;
  propertyName: string;
  unitName: string;
  propertyId: string | undefined;
  unitId: string | undefined;
  address: string | null;
}

interface MaintenanceDetailClientProps {
  ticket: MaintenanceTicket;
}

// ─── Status pipeline ──────────────────────────────────────────────────────────

const STATUS_PIPELINE = [
  { key: 'open', label: 'Open', color: 'bg-blue-500' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-violet-500' },
  { key: 'contractor_on_the_way', label: 'On the Way', color: 'bg-amber-500' },
  { key: 'resolved', label: 'Resolved', color: 'bg-green-500' },
  { key: 'completed', label: 'Completed', color: 'bg-emerald-600' },
];

function StatusProgressBar({ current }: { current: string }) {
  const closedStatuses = ['closed'];
  if (closedStatuses.includes(current)) {
    return (
      <div className='flex items-center gap-2 p-3 rounded-lg bg-gray-100'>
        <X className='h-4 w-4 text-gray-500' />
        <span className='text-xs font-medium text-gray-600'>Closed</span>
      </div>
    );
  }

  const currentIdx = STATUS_PIPELINE.findIndex((s) => s.key === current);
  const effectiveIdx = currentIdx === -1 ? 0 : currentIdx;
  const progressPct = ((effectiveIdx + 1) / STATUS_PIPELINE.length) * 100;

  return (
    <div className='space-y-2'>
      <div className='flex justify-between items-center'>
        {STATUS_PIPELINE.map((step, i) => (
          <div key={step.key} className='flex flex-col items-center gap-1 flex-1'>
            <div
              className={`h-2 w-2 rounded-full border-2 transition-all ${
                i <= effectiveIdx
                  ? 'border-transparent ' + step.color
                  : 'bg-gray-200 border-gray-300'
              }`}
            />
            <span
              className={`text-[9px] leading-none text-center ${
                i === effectiveIdx ? 'font-bold text-gray-800' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
      <div className='relative h-1.5 bg-gray-100 rounded-full overflow-hidden'>
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${STATUS_PIPELINE[effectiveIdx]?.color ?? 'bg-blue-500'}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPriorityBadge(priority: string) {
  const map: Record<string, string> = {
    urgent: 'bg-red-50 text-red-700 border-red-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return map[priority] ?? map.low;
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-green-50 text-green-700 border-green-200',
    resolved: 'bg-green-50 text-green-700 border-green-200',
    in_progress: 'bg-violet-50 text-violet-700 border-violet-200',
    contractor_on_the_way: 'bg-amber-50 text-amber-700 border-amber-200',
    closed: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return map[status] ?? 'bg-blue-50 text-blue-700 border-blue-200';
}

const ACCESS_LABELS: Record<string, string> = {
  weekday_morning: 'Weekday mornings (8am–12pm)',
  weekday_afternoon: 'Weekday afternoons (12pm–5pm)',
  weekend: 'Weekends',
  anytime: 'Anytime',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MaintenanceDetailClient({ ticket: initialTicket }: MaintenanceDetailClientProps) {
  const router = useRouter();
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState(initialTicket);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Media lightbox
  const [lightbox, setLightbox] = useState<Attachment | null>(null);

  // Editing form state
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [assignedToName, setAssignedToName] = useState(ticket.assignedToName || '');
  const [cost, setCost] = useState(ticket.cost?.toString() || '');
  const [estimatedDate, setEstimatedDate] = useState(
    ticket.estimatedCompletionDate
      ? ticket.estimatedCompletionDate.slice(0, 10)
      : ''
  );

  // Comment state
  const [comments, setComments] = useState<Comment[]>(ticket.comments ?? []);
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // ── Save core fields ────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/maintenance-tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          priority,
          assignedToName: assignedToName.trim() || null,
          cost: cost ? parseFloat(cost) : null,
          estimatedCompletionDate: estimatedDate || null,
        }),
      });

      if (res.ok) {
        setTicket((t) => ({
          ...t,
          status,
          priority,
          assignedToName: assignedToName.trim() || null,
          cost: cost ? parseFloat(cost) : null,
          estimatedCompletionDate: estimatedDate ? new Date(estimatedDate).toISOString() : null,
        }));
        setIsEditing(false);
        router.refresh();
      } else {
        alert('Failed to save changes');
      }
    } catch {
      alert('Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Quick status update (no full edit mode) ─────────────────────────────────
  const handleQuickStatus = async (newStatus: string) => {
    const res = await fetch(`/api/maintenance-tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setTicket((t) => ({ ...t, status: newStatus }));
      setStatus(newStatus);
      router.refresh();
    }
  };

  // ── Send comment ────────────────────────────────────────────────────────────
  const handleSendComment = async () => {
    const msg = commentText.trim();
    if (!msg) return;
    setIsSendingComment(true);
    try {
      const res = await fetch(`/api/maintenance-tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: { message: msg, isInternal } }),
      });
      if (res.ok) {
        const newComment: Comment = {
          userId: 'staff',
          userName: 'You',
          message: msg,
          isInternal,
          createdAt: new Date().toISOString(),
        };
        setComments((c) => [...c, newComment]);
        setCommentText('');
      } else {
        alert('Failed to send comment');
      }
    } catch {
      alert('Error sending comment');
    } finally {
      setIsSendingComment(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/maintenance-tickets/${ticket.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/maintenance');
      } else {
        alert('Failed to delete ticket');
      }
    } catch {
      alert('Error deleting ticket');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <main className='w-full min-h-screen bg-gray-50'>
      {/* ── Header ── */}
      <div className='bg-white border-b border-gray-200 sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <Button variant='ghost' size='sm' className='gap-2' onClick={() => router.push('/admin/maintenance')}>
              <ArrowLeft className='h-4 w-4' />
              Back
            </Button>
            <div>
              <h1 className='text-lg font-bold text-gray-900 leading-tight'>{ticket.title}</h1>
              <p className='text-xs text-gray-500'>
                {ticket.propertyName} · Unit {ticket.unitName} · Created{' '}
                {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            {!isEditing ? (
              <>
                <Button variant='outline' size='sm' onClick={() => setIsEditing(true)}>Edit</Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-red-600 hover:text-red-700 hover:bg-red-50'
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </>
            ) : (
              <>
                <Button variant='outline' size='sm' onClick={() => { setIsEditing(false); setStatus(ticket.status); setPriority(ticket.priority); setAssignedToName(ticket.assignedToName || ''); setCost(ticket.cost?.toString() || ''); }}>
                  Cancel
                </Button>
                <Button size='sm' onClick={handleSave} disabled={isSaving} className='gap-2'>
                  <Save className='h-4 w-4' />
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='grid gap-6 lg:grid-cols-3'>

          {/* ── Left: main content ── */}
          <div className='lg:col-span-2 space-y-5'>

            {/* Progress bar */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-5'>
              <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>Progress</h3>
              <StatusProgressBar current={ticket.status} />

              {/* Quick status buttons — the most common one-click actions */}
              <div className='mt-4 flex flex-wrap gap-2'>
                {ticket.status !== 'in_progress' && ticket.status !== 'resolved' && ticket.status !== 'completed' && (
                  <button
                    onClick={() => handleQuickStatus('in_progress')}
                    className='inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors'
                  >
                    <Wrench className='h-3.5 w-3.5' />
                    Mark In Progress
                  </button>
                )}
                {ticket.status !== 'contractor_on_the_way' && ticket.status !== 'resolved' && ticket.status !== 'completed' && (
                  <button
                    onClick={() => handleQuickStatus('contractor_on_the_way')}
                    className='inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors'
                  >
                    <Truck className='h-3.5 w-3.5' />
                    Contractor On the Way
                  </button>
                )}
                {ticket.status !== 'resolved' && ticket.status !== 'completed' && (
                  <button
                    onClick={() => handleQuickStatus('resolved')}
                    className='inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors'
                  >
                    <CheckCircle2 className='h-3.5 w-3.5' />
                    Mark Resolved
                  </button>
                )}
                {ticket.status === 'resolved' && (
                  <button
                    onClick={() => handleQuickStatus('completed')}
                    className='inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors'
                  >
                    <CheckCircle2 className='h-3.5 w-3.5' />
                    Mark Completed
                  </button>
                )}
              </div>
            </div>

            {/* Issue details */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-3'>
              <div className='flex items-start justify-between gap-4'>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className={`inline-flex items-center border text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${getStatusBadge(ticket.status)}`}>
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                    <span className={`inline-flex items-center border text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${getPriorityBadge(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    {ticket.location && (
                      <span className='inline-flex items-center gap-1 border border-gray-200 text-xs px-2.5 py-1 rounded-full text-gray-600 bg-gray-50'>
                        <MapPin className='h-3 w-3' />
                        {ticket.location.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <h2 className='text-base font-semibold text-gray-900'>{ticket.title}</h2>
                </div>
              </div>
              <p className='text-sm text-gray-700 whitespace-pre-wrap leading-relaxed'>{ticket.description}</p>

              {/* Access schedule */}
              {ticket.accessSchedule.length > 0 && (
                <div className='pt-3 border-t border-gray-100'>
                  <p className='text-xs font-semibold text-gray-500 mb-1.5'>Preferred Access Times</p>
                  <div className='flex flex-wrap gap-1.5'>
                    {ticket.accessSchedule.map((s) => (
                      <span key={s} className='text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full'>
                        {ACCESS_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                  {ticket.accessNotes && (
                    <p className='text-xs text-gray-500 mt-1.5 italic'>"{ticket.accessNotes}"</p>
                  )}
                </div>
              )}
            </div>

            {/* Tenant-uploaded attachments */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-5'>
              <div className='flex items-center gap-2 mb-4'>
                <Paperclip className='h-4 w-4 text-gray-500' />
                <h3 className='text-sm font-semibold text-gray-900'>
                  Tenant Attachments
                  {ticket.attachments.length > 0 && (
                    <span className='ml-2 text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-normal'>
                      {ticket.attachments.length}
                    </span>
                  )}
                </h3>
              </div>

              {ticket.attachments.length === 0 ? (
                <div className='text-center py-8 text-gray-400'>
                  <ImageIcon className='h-10 w-10 text-gray-200 mx-auto mb-2' />
                  <p className='text-sm'>No attachments submitted</p>
                </div>
              ) : (
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
                  {ticket.attachments.map((att, i) => {
                    const isBlobUrl = att.url?.startsWith('blob:');
                    return (
                      <button
                        key={i}
                        onClick={() => !isBlobUrl && setLightbox(att)}
                        disabled={isBlobUrl}
                        className='group relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square hover:border-indigo-300 transition-colors disabled:cursor-not-allowed'
                      >
                        {att.type === 'image' && !isBlobUrl ? (
                          <Image
                            src={att.url}
                            alt={att.filename}
                            fill
                            sizes='(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw'
                            className='object-cover group-hover:scale-105 transition-transform duration-200'
                          />
                        ) : att.type === 'video' && !isBlobUrl ? (
                          <div className='h-full flex flex-col items-center justify-center gap-1 text-gray-400'>
                            <Video className='h-8 w-8' />
                            <span className='text-[10px]'>Video</span>
                          </div>
                        ) : (
                          <div className='h-full flex flex-col items-center justify-center gap-1 text-gray-300'>
                            <ImageIcon className='h-8 w-8' />
                            <span className='text-[10px] text-center px-2'>Preview unavailable</span>
                          </div>
                        )}
                        {!isBlobUrl && (
                          <div className='absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all'>
                            <Eye className='h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity' />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comments / response thread */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-5'>
              <div className='flex items-center gap-2 mb-4'>
                <MessageSquare className='h-4 w-4 text-gray-500' />
                <h3 className='text-sm font-semibold text-gray-900'>
                  Updates &amp; Messages
                  <span className='ml-1 text-xs text-gray-400 font-normal'>
                    (non-internal messages are visible to the tenant)
                  </span>
                </h3>
              </div>

              {/* Thread */}
              <div className='space-y-3 mb-4 max-h-80 overflow-y-auto pr-1'>
                {comments.length === 0 && (
                  <p className='text-sm text-gray-400 text-center py-6'>No updates yet.</p>
                )}
                {comments.map((c, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-3.5 py-2.5 text-sm ${
                      c.isInternal
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-blue-50 border border-blue-100'
                    }`}
                  >
                    <div className='flex items-center justify-between gap-2 mb-1'>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-xs font-semibold text-gray-700'>{c.userName}</span>
                        {c.isInternal && (
                          <span className='inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full'>
                            <Lock className='h-2.5 w-2.5' />
                            Internal
                          </span>
                        )}
                      </div>
                      <span className='text-[10px] text-gray-400'>
                        {new Date(c.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className='text-gray-700 whitespace-pre-wrap leading-relaxed text-sm'>{c.message}</p>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>

              {/* Compose */}
              <div className='space-y-2 border-t border-gray-100 pt-3'>
                <Textarea
                  placeholder='Add an update, note, or message to the tenant…'
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className='resize-none text-sm'
                />
                <div className='flex items-center justify-between gap-2'>
                  <label className='flex items-center gap-2 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className='rounded border-gray-300 text-amber-500 focus:ring-amber-400'
                    />
                    <span className='text-xs text-gray-600 flex items-center gap-1'>
                      <Lock className='h-3 w-3 text-amber-500' />
                      Internal only (not visible to tenant)
                    </span>
                  </label>
                  <Button
                    size='sm'
                    className='gap-1.5'
                    disabled={!commentText.trim() || isSendingComment}
                    onClick={handleSendComment}
                  >
                    <Send className='h-3.5 w-3.5' />
                    {isSendingComment ? 'Sending…' : isInternal ? 'Add Note' : 'Send to Tenant'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className='space-y-5'>

            {/* Status & Priority editing */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4'>
              <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Status &amp; Priority</h3>
              <div>
                <Label className='text-xs text-gray-600 mb-1.5 block'>Status</Label>
                {isEditing ? (
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='open'>Open</SelectItem>
                      <SelectItem value='in_progress'>In Progress</SelectItem>
                      <SelectItem value='contractor_on_the_way'>Contractor On the Way</SelectItem>
                      <SelectItem value='resolved'>Resolved</SelectItem>
                      <SelectItem value='completed'>Completed</SelectItem>
                      <SelectItem value='closed'>Closed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`inline-flex text-sm font-semibold px-3 py-1.5 rounded-full border capitalize ${getStatusBadge(ticket.status)}`}>
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <div>
                <Label className='text-xs text-gray-600 mb-1.5 block'>Priority</Label>
                {isEditing ? (
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='low'>Low</SelectItem>
                      <SelectItem value='medium'>Medium</SelectItem>
                      <SelectItem value='high'>High</SelectItem>
                      <SelectItem value='urgent'>Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`inline-flex text-sm font-semibold px-3 py-1.5 rounded-full border capitalize ${getPriorityBadge(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                )}
              </div>
            </div>

            {/* Assignment */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4'>
              <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Assignment</h3>
              <div>
                <Label className='text-xs text-gray-600 mb-1.5 block'>Assigned To</Label>
                {isEditing ? (
                  <Input
                    placeholder='Contractor or tech name'
                    value={assignedToName}
                    onChange={(e) => setAssignedToName(e.target.value)}
                  />
                ) : (
                  <div className='flex items-center gap-2'>
                    <User className='h-4 w-4 text-gray-400 shrink-0' />
                    <span className='text-sm text-gray-700'>{ticket.assignedToName || 'Unassigned'}</span>
                  </div>
                )}
              </div>
              <div>
                <Label className='text-xs text-gray-600 mb-1.5 block'>Est. Completion Date</Label>
                {isEditing ? (
                  <Input
                    type='date'
                    value={estimatedDate}
                    onChange={(e) => setEstimatedDate(e.target.value)}
                  />
                ) : (
                  <div className='flex items-center gap-2'>
                    <Calendar className='h-4 w-4 text-gray-400 shrink-0' />
                    <span className='text-sm text-gray-700'>
                      {ticket.estimatedCompletionDate
                        ? new Date(ticket.estimatedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Not set'}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <Label className='text-xs text-gray-600 mb-1.5 block'>Estimated Cost</Label>
                {isEditing ? (
                  <div className='relative'>
                    <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                    <Input type='number' step='0.01' placeholder='0.00' value={cost} onChange={(e) => setCost(e.target.value)} className='pl-9' />
                  </div>
                ) : (
                  <div className='flex items-center gap-2'>
                    <DollarSign className='h-4 w-4 text-gray-400 shrink-0' />
                    <span className='text-sm text-gray-700'>{ticket.cost ? `$${ticket.cost.toFixed(2)}` : 'Not estimated'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tenant */}
            {ticket.tenant && (
              <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-3'>
                <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Tenant</h3>
                <div className='flex items-center gap-3'>
                  <div className='h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold shrink-0'>
                    {(ticket.tenant.name || '?')[0].toUpperCase()}
                  </div>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-gray-900 truncate'>{ticket.tenant.name || 'Unknown'}</p>
                    <p className='text-xs text-gray-500 truncate'>{ticket.tenant.email}</p>
                  </div>
                </div>
                <Link
                  href={`/admin/messages?tenant=${ticket.tenant.id}`}
                  className='inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium'
                >
                  <MessageSquare className='h-3.5 w-3.5' />
                  Send Message
                </Link>
              </div>
            )}

            {/* Property */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              {ticket.propertyImage && (
                <div className='relative h-32 bg-gray-100'>
                  <Image src={ticket.propertyImage} alt={ticket.propertyName} fill sizes='(max-width: 1024px) 100vw, 33vw' className='object-cover' />
                </div>
              )}
              <div className='p-4 space-y-1'>
                <div className='flex items-center gap-2'>
                  <Building2 className='h-4 w-4 text-gray-400 shrink-0' />
                  <p className='text-sm font-semibold text-gray-900 truncate'>{ticket.propertyName}</p>
                </div>
                <p className='text-xs text-gray-500 pl-6'>Unit {ticket.unitName}</p>
                {ticket.address && (
                  <div className='flex items-start gap-2 pt-1'>
                    <MapPin className='h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5' />
                    <p className='text-xs text-gray-500'>{ticket.address}</p>
                  </div>
                )}
                {ticket.propertyId && (
                  <Link href={`/admin/dashboard/properties/${ticket.propertyId}/details`} className='text-xs text-blue-600 hover:underline pl-6 block pt-1'>
                    View Property →
                  </Link>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-5'>
              <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>Timeline</h3>
              <div className='space-y-3'>
                {[
                  { label: 'Created', date: ticket.createdAt, icon: Calendar, color: 'bg-blue-100 text-blue-600' },
                  { label: 'Last Updated', date: ticket.updatedAt, icon: Clock, color: 'bg-gray-100 text-gray-600' },
                  ...(ticket.estimatedCompletionDate ? [{ label: 'Est. Completion', date: ticket.estimatedCompletionDate, icon: Calendar, color: 'bg-indigo-100 text-indigo-600' }] : []),
                  ...(ticket.resolvedAt ? [{ label: 'Resolved', date: ticket.resolvedAt, icon: CheckCircle2, color: 'bg-green-100 text-green-600' }] : []),
                ].map(({ label, date, icon: Icon, color }) => (
                  <div key={label} className='flex items-start gap-2.5'>
                    <div className={`h-7 w-7 rounded-full ${color} flex items-center justify-center shrink-0`}>
                      <Icon className='h-3.5 w-3.5' />
                    </div>
                    <div>
                      <p className='text-xs font-medium text-gray-700'>{label}</p>
                      <p className='text-[11px] text-gray-400'>
                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Media lightbox ── */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className='max-w-3xl p-2' aria-describedby={undefined}>
          <DialogHeader className='px-3 pt-2 pb-1'>
            <DialogTitle className='text-sm font-semibold truncate'>{lightbox?.filename}</DialogTitle>
          </DialogHeader>
          {lightbox?.type === 'image' ? (
            <div className='relative w-full h-[60vh]'>
              <Image src={lightbox.url} alt={lightbox.filename} fill sizes='100vw' className='object-contain rounded-lg' />
            </div>
          ) : lightbox?.type === 'video' ? (
            <video src={lightbox.url} controls className='w-full rounded-lg max-h-[60vh]' />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Maintenance Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The request and all associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className='bg-red-600 hover:bg-red-700'>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
