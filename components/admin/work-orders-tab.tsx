'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Plus, ClipboardList, Loader2, Building2, DollarSign, Calendar,
  User, Globe, Send, Users, Pencil, Upload, X, Image as ImageIcon, Video,
  MoreVertical, Trash2, Play, CheckCircle, CreditCard, AlertTriangle, Scale,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { UploadButton } from '@/lib/uploadthing';

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  agreedPrice: string;
  actualCost: string | null;
  scheduledDate: string | null;
  completedAt: string | null;
  notes: string | null;
  isOpenForBids: boolean;
  contractor: { id: string; name: string; email: string } | null;
  property: { id: string; name: string };
  unit: { id: string; name: string } | null;
  maintenanceTicket: { title: string } | null;
  mediaCount: number;
  createdAt: string;
  _count?: { bids: number };
  budgetMin?: string | null;
  budgetMax?: string | null;
}

interface Contractor { id: string; name: string; email: string; specialties: string[]; }
interface Property { id: string; name: string; units: { id: string; name: string }[]; }
interface MediaFile { url: string; type: 'image' | 'video'; name: string; }

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  open: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  assigned: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  in_progress: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  paid: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  open: 'Open for Bids',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export default function WorkOrdersTab() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [deleteWorkOrder, setDeleteWorkOrder] = useState<WorkOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    assignmentType: 'direct', contractorId: '', propertyId: '', unitId: '',
    title: '', description: '', priority: 'medium', agreedPrice: '',
    budgetMin: '', budgetMax: '', scheduledDate: '', notes: '', postingType: 'bid' as 'bid' | 'estimate',
  });

  const fetchWorkOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/work-orders?${params}`);
      const data = await res.json();
      if (data.workOrders) setWorkOrders(data.workOrders);
    } catch { toast({ title: 'Error', description: 'Failed to load work orders', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const fetchContractors = async () => {
    try { const res = await fetch('/api/contractors'); const data = await res.json(); if (data.contractors) setContractors(data.contractors); }
    catch (e) { console.error('Failed to fetch contractors:', e); }
  };

  const fetchProperties = async () => {
    try { const res = await fetch('/api/admin/properties'); const data = await res.json(); if (data.properties) setProperties(data.properties); }
    catch (e) { console.error('Failed to fetch properties:', e); }
  };

  useEffect(() => { fetchWorkOrders(); fetchContractors(); fetchProperties(); }, [statusFilter]);

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isMarketplace = formData.assignmentType === 'marketplace';
      const payload: any = {
        propertyId: formData.propertyId, unitId: formData.unitId || undefined,
        title: formData.title, description: formData.description, priority: formData.priority,
        scheduledDate: formData.scheduledDate || undefined, notes: formData.notes || undefined,
        isOpenForBids: isMarketplace, media: mediaFiles.map(m => ({ url: m.url, type: m.type })),
      };
      if (isMarketplace) {
        payload.budgetMin = formData.budgetMin ? parseFloat(formData.budgetMin) : undefined;
        payload.budgetMax = formData.budgetMax ? parseFloat(formData.budgetMax) : undefined;
        payload.postingType = formData.postingType;
        payload.status = 'open';
      } else {
        payload.contractorId = formData.contractorId;
        payload.agreedPrice = parseFloat(formData.agreedPrice);
        payload.status = 'assigned';
      }
      const res = editingWorkOrder
        ? await fetch(`/api/work-orders/${editingWorkOrder.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/work-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ title: 'Success', description: editingWorkOrder ? 'Work order updated' : isMarketplace ? 'Posted to marketplace' : 'Work order assigned' });
      setIsCreateOpen(false); setEditingWorkOrder(null); resetForm(); fetchWorkOrders();
    } catch (error) { toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setFormData({ assignmentType: 'direct', contractorId: '', propertyId: '', unitId: '', title: '', description: '', priority: 'medium', agreedPrice: '', budgetMin: '', budgetMax: '', scheduledDate: '', notes: '', postingType: 'bid' });
    setMediaFiles([]);
  };

  const removeMedia = (index: number) => setMediaFiles(prev => prev.filter((_, i) => i !== index));

  const updateStatus = async (workOrderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ title: 'Success', description: `Marked as ${newStatus.replace('_', ' ')}` });
      fetchWorkOrders();
    } catch (error) { toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' }); }
  };

  const handleDeleteWorkOrder = async () => {
    if (!deleteWorkOrder) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/work-orders/${deleteWorkOrder.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast({ title: 'Success', description: 'Work order deleted' });
      setDeleteWorkOrder(null);
      fetchWorkOrders();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const handleEditWorkOrder = (wo: WorkOrder) => {
    setEditingWorkOrder(wo);
    setFormData({
      assignmentType: wo.isOpenForBids ? 'marketplace' : 'direct',
      contractorId: wo.contractor?.id || '',
      propertyId: wo.property?.id || '',
      unitId: wo.unit?.id || '',
      title: wo.title,
      description: wo.description,
      priority: wo.priority,
      agreedPrice: wo.agreedPrice || '',
      budgetMin: wo.budgetMin || '',
      budgetMax: wo.budgetMax || '',
      scheduledDate: wo.scheduledDate ? new Date(wo.scheduledDate).toISOString().slice(0, 16) : '',
      notes: wo.notes || '',
      postingType: 'bid',
    });
    setIsCreateOpen(true);
  };

  const selectedProperty = properties.find((p) => p.id === formData.propertyId);
  const isMarketplace = formData.assignmentType === 'marketplace';

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-slate-900 border-slate-700 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="open">Open for Bids</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { resetForm(); setEditingWorkOrder(null); } }}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />New Work Order
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">{editingWorkOrder ? 'Edit Work Order' : 'Create Work Order'}</DialogTitle>
              <DialogDescription className="text-slate-400">
                {editingWorkOrder ? 'Update work order details' : 'Create a new job for contractors'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateWorkOrder} className="space-y-4">
              {/* Assignment Type */}
              <div className="space-y-3">
                <Label className="text-slate-300">How would you like to assign this job?</Label>
                <RadioGroup value={formData.assignmentType} onValueChange={(v) => setFormData({ ...formData, assignmentType: v, contractorId: '' })} className="grid grid-cols-2 gap-3">
                  <div className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.assignmentType === 'direct' ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}>
                    <RadioGroupItem value="direct" id="direct" className="border-slate-500" />
                    <Label htmlFor="direct" className="cursor-pointer flex items-center gap-2 text-slate-200">
                      <Send className="h-4 w-4 text-violet-400" />
                      <div><p className="font-medium">Direct Assign</p><p className="text-xs text-slate-400">Send to a contractor</p></div>
                    </Label>
                  </div>
                  <div className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.assignmentType === 'marketplace' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}>
                    <RadioGroupItem value="marketplace" id="marketplace" className="border-slate-500" />
                    <Label htmlFor="marketplace" className="cursor-pointer flex items-center gap-2 text-slate-200">
                      <Globe className="h-4 w-4 text-cyan-400" />
                      <div><p className="font-medium">Post for Bids</p><p className="text-xs text-slate-400">Let contractors bid</p></div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Posting Type (marketplace only) */}
              {isMarketplace && (
                <div className="space-y-2">
                  <Label className="text-slate-300">What are you looking for?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setFormData({ ...formData, postingType: 'bid' })} className={`p-3 rounded-lg border-2 text-left transition-all ${formData.postingType === 'bid' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}>
                      <p className="font-medium text-sm text-slate-200">Bids</p>
                      <p className="text-xs text-slate-400">Contractors submit a price & timeline</p>
                    </button>
                    <button type="button" onClick={() => setFormData({ ...formData, postingType: 'estimate' })} className={`p-3 rounded-lg border-2 text-left transition-all ${formData.postingType === 'estimate' ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}>
                      <p className="font-medium text-sm text-slate-200">Estimates</p>
                      <p className="text-xs text-slate-400">Contractors send detailed quotes with line items</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Contractor Selection */}
              {!isMarketplace && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Contractor *</Label>
                  {contractors.length === 0 ? (
                    <p className="text-sm text-amber-300 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">No contractors. Add contractors first or post to marketplace.</p>
                  ) : (
                    <Select value={formData.contractorId} onValueChange={(v) => setFormData({ ...formData, contractorId: v })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Select contractor" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        {contractors.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span>{c.name}</span>
                            {c.specialties?.length > 0 && <span className="text-xs text-slate-400 ml-2">{c.specialties.slice(0, 2).join(', ')}</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Property Selection */}
              <div className="space-y-2">
                <Label className="text-slate-300">Property *</Label>
                <Select value={formData.propertyId} onValueChange={(v) => setFormData({ ...formData, propertyId: v, unitId: '' })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {properties.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit Selection */}
              {selectedProperty && selectedProperty.units?.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Unit (optional)</Label>
                  <Select value={formData.unitId} onValueChange={(v) => setFormData({ ...formData, unitId: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Select unit" /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {selectedProperty.units.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Job Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-300">Job Title *</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Fix leaking faucet" className="bg-slate-800 border-slate-700 text-white" required />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">Description *</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the work needed..." rows={3} className="bg-slate-800 border-slate-700 text-white min-h-[80px]" required />
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <Label className="text-slate-300">Photos & Videos</Label>
                <p className="text-xs text-slate-400 mb-2">Add images or videos to help contractors understand the job</p>
                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 group">
                        {file.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800"><Video className="h-8 w-8 text-slate-400" /></div>
                        ) : (<img src={file.url} alt="" className="w-full h-full object-cover" />)}
                        <button type="button" onClick={() => removeMedia(index)} className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">{file.type === 'video' ? 'Video' : 'Image'}</div>
                      </div>
                    ))}
                  </div>
                )}
                <UploadButton
                  endpoint="workOrderMedia"
                  onClientUploadComplete={(res) => {
                    if (res) {
                      const newFiles = res.map(file => ({ url: file.ufsUrl || file.url, type: file.type?.startsWith('video') ? 'video' as const : 'image' as const, name: file.name }));
                      setMediaFiles(prev => [...prev, ...newFiles]);
                    }
                    setUploadingMedia(false);
                  }}
                  onUploadError={(error) => { toast({ title: 'Upload failed', description: error.message, variant: 'destructive' }); setUploadingMedia(false); }}
                  onUploadBegin={() => setUploadingMedia(true)}
                  appearance={{ button: "bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm px-4 py-2 rounded-lg border border-dashed border-slate-600", allowedContent: "text-xs text-slate-500" }}
                  content={{ button({ ready, isUploading }) { if (isUploading) return <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</>; if (ready) return <><Upload className="h-4 w-4 mr-2" />Upload Photos/Videos</>; return 'Getting ready...'; }, allowedContent: "Images & videos up to 16MB" }}
                />
              </div>

              {/* Priority and Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isMarketplace ? (
                  <div className="space-y-2">
                    <Label className="text-slate-300">Budget Range</Label>
                    <div className="flex gap-2">
                      <Input type="number" step="0.01" min="0" placeholder="Min" value={formData.budgetMin} onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                      <Input type="number" step="0.01" min="0" placeholder="Max" value={formData.budgetMax} onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="agreedPrice" className="text-slate-300">Agreed Price *</Label>
                    <Input id="agreedPrice" type="number" step="0.01" min="0" value={formData.agreedPrice} onChange={(e) => setFormData({ ...formData, agreedPrice: e.target.value })} className="bg-slate-800 border-slate-700 text-white" required={!isMarketplace} />
                  </div>
                )}
              </div>

              {/* Scheduled Date */}
              <div className="space-y-2">
                <Label htmlFor="scheduledDate" className="text-slate-300">Preferred Date (optional)</Label>
                <Input id="scheduledDate" type="datetime-local" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-slate-300">Additional Notes</Label>
                <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Special instructions or access details..." rows={2} className="bg-slate-800 border-slate-700 text-white" />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button>
                <Button type="submit" disabled={submitting || uploadingMedia || !formData.propertyId || !formData.title || (!isMarketplace && !formData.contractorId)} className={isMarketplace ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-violet-600 hover:bg-violet-700'}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isMarketplace ? <><Globe className="h-4 w-4 mr-2" />{formData.postingType === 'estimate' ? 'Post for Estimates' : 'Post for Bids'}</> : <><Send className="h-4 w-4 mr-2" />{editingWorkOrder ? 'Save Changes' : 'Assign'}</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>


      {/* Work Orders Grid */}
      {workOrders.length === 0 ? (
        <Card className="border-white/10 bg-gradient-to-r from-indigo-700 to-indigo-900">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No work orders yet</h3>
            <p className="text-slate-300 mb-4 text-sm">Create work orders to assign jobs to contractors or post them for bidding</p>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />Create Your First Work Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workOrders.map((wo) => (
            <Card key={wo.id} className="border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 hover:border-violet-500/30 transition-all group">
              <CardContent className="p-4 md:p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{wo.title}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mt-1">{wo.description}</p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700 flex-shrink-0 ml-2">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-white">
                      <DropdownMenuItem onClick={() => handleEditWorkOrder(wo)} className="text-slate-200 focus:text-white focus:bg-slate-700 cursor-pointer">
                        <Pencil className="h-4 w-4 mr-2" />Edit
                      </DropdownMenuItem>
                      {wo.status === 'assigned' && (
                        <DropdownMenuItem onClick={() => updateStatus(wo.id, 'in_progress')} className="text-slate-200 focus:text-white focus:bg-slate-700 cursor-pointer">
                          <Play className="h-4 w-4 mr-2" />Start Work
                        </DropdownMenuItem>
                      )}
                      {wo.status === 'in_progress' && (
                        <DropdownMenuItem onClick={() => updateStatus(wo.id, 'completed')} className="text-slate-200 focus:text-white focus:bg-slate-700 cursor-pointer">
                          <CheckCircle className="h-4 w-4 mr-2" />Mark Complete
                        </DropdownMenuItem>
                      )}
                      {wo.status === 'completed' && (
                        <DropdownMenuItem onClick={() => { window.location.href = `/admin/contractors?pay=${wo.id}`; }} className="text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10 cursor-pointer">
                          <CreditCard className="h-4 w-4 mr-2" />Pay Contractor
                        </DropdownMenuItem>
                      )}
                      {wo._count && wo._count.bids > 0 && (
                        <DropdownMenuItem onClick={() => { window.location.href = `/admin/work-orders/${wo.id}/bids`; }} className="text-cyan-400 focus:text-cyan-300 focus:bg-cyan-500/10 cursor-pointer">
                          <Users className="h-4 w-4 mr-2" />Review Bids ({wo._count.bids})
                        </DropdownMenuItem>
                      )}
                      {(wo.status === 'in_progress' || wo.status === 'completed' || wo.status === 'paid') && (
                        <DropdownMenuItem onClick={() => { window.location.href = `/admin/contractors/dispute?workOrderId=${wo.id}`; }} className="text-amber-400 focus:text-amber-300 focus:bg-amber-500/10 cursor-pointer">
                          <Scale className="h-4 w-4 mr-2" />File Dispute
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem onClick={() => setDeleteWorkOrder(wo)} className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer">
                        <Trash2 className="h-4 w-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <Badge variant="outline" className={`text-xs ${statusColors[wo.status]}`}>
                    {statusLabels[wo.status] || wo.status}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${priorityColors[wo.priority]}`}>
                    {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Building2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{wo.property.name}{wo.unit && ` - ${wo.unit.name}`}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    {wo.contractor ? (
                      <><User className="h-4 w-4 text-slate-500 flex-shrink-0" /><span className="truncate">{wo.contractor.name}</span></>
                    ) : wo.isOpenForBids ? (
                      <><Users className="h-4 w-4 text-cyan-400 flex-shrink-0" /><span className="text-cyan-300">{wo._count?.bids || 0} bid{(wo._count?.bids || 0) !== 1 ? 's' : ''}</span></>
                    ) : (
                      <><User className="h-4 w-4 text-slate-500 flex-shrink-0" /><span className="text-slate-500">Unassigned</span></>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <DollarSign className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span>{wo.agreedPrice ? formatCurrency(parseFloat(wo.agreedPrice)) : 'TBD'}</span>
                  </div>

                  {wo.scheduledDate && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span>{new Date(wo.scheduledDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Media indicator */}
                {wo.mediaCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>{wo.mediaCount} media file{wo.mediaCount !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="pt-3 border-t border-slate-700/50">
                  {wo.status === 'assigned' && (
                    <Button size="sm" onClick={() => updateStatus(wo.id, 'in_progress')} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                      <Play className="h-4 w-4 mr-2" />Start Work
                    </Button>
                  )}
                  {wo.status === 'in_progress' && (
                    <Button size="sm" onClick={() => updateStatus(wo.id, 'completed')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle className="h-4 w-4 mr-2" />Mark Complete
                    </Button>
                  )}
                  {wo.status === 'completed' && (
                    <Button size="sm" onClick={() => { window.location.href = `/admin/contractors?pay=${wo.id}`; }} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                      <CreditCard className="h-4 w-4 mr-2" />Pay Contractor
                    </Button>
                  )}
                  {wo._count && wo._count.bids > 0 && (
                    <Button size="sm" onClick={() => { window.location.href = `/admin/work-orders/${wo.id}/bids`; }} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
                      <Users className="h-4 w-4 mr-2" />Review {wo._count.bids} Bid{wo._count.bids !== 1 ? 's' : ''}
                    </Button>
                  )}
                  {wo.status === 'draft' && (
                    <Button size="sm" onClick={() => handleEditWorkOrder(wo)} variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                      <Pencil className="h-4 w-4 mr-2" />Edit Draft
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteWorkOrder} onOpenChange={(open) => !open && setDeleteWorkOrder(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              {deleteWorkOrder && ['assigned', 'in_progress', 'completed', 'approved', 'paid'].includes(deleteWorkOrder.status)
                ? 'Cannot Cancel Work Order'
                : 'Cancel Work Order'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {deleteWorkOrder && ['assigned', 'in_progress', 'completed', 'approved', 'paid'].includes(deleteWorkOrder.status) ? (
                <>
                  <strong className="text-white">"{deleteWorkOrder?.title}"</strong> has already been accepted by a contractor.
                  Please contact <strong className="text-white">Customer Service</strong> to cancel this work order.
                </>
              ) : (
                <>
                  Are you sure you want to cancel and delete <strong className="text-white">"{deleteWorkOrder?.title}"</strong>? 
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
              {deleteWorkOrder && ['assigned', 'in_progress', 'completed', 'approved', 'paid'].includes(deleteWorkOrder.status) ? 'Close' : 'Cancel'}
            </AlertDialogCancel>
            {deleteWorkOrder && !['assigned', 'in_progress', 'completed', 'approved', 'paid'].includes(deleteWorkOrder.status) && (
              <AlertDialogAction onClick={handleDeleteWorkOrder} className="bg-red-600 hover:bg-red-700 text-white" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
