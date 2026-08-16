'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Wrench, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  MoreVertical, 
  Pencil, 
  Trash2,
  Star,
  ClipboardList,
  DollarSign,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CONTRACTOR_SPECIALTIES } from '@/lib/validators';

interface Contractor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialties: string[];
  isPaymentReady: boolean;
  stripeOnboardingStatus: string | null;
  notes: string | null;
  workOrderCount: number;
  rating?: number;
  totalEarned?: number;
  createdAt: string;
}

const specialtyLabels: Record<string, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  hvac: 'HVAC',
  appliance_repair: 'Appliance Repair',
  carpentry: 'Carpentry',
  painting: 'Painting',
  flooring: 'Flooring',
  roofing: 'Roofing',
  landscaping: 'Landscaping',
  cleaning: 'Cleaning',
  pest_control: 'Pest Control',
  locksmith: 'Locksmith',
  general_handyman: 'General Handyman',
  other: 'Other',
};

const specialtyColors: Record<string, string> = {
  plumbing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  electrical: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  hvac: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  appliance_repair: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  carpentry: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  painting: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  flooring: 'bg-stone-500/20 text-stone-300 border-stone-500/30',
  roofing: 'bg-red-500/20 text-red-300 border-red-500/30',
  landscaping: 'bg-green-500/20 text-green-300 border-green-500/30',
  cleaning: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  pest_control: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
  locksmith: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  general_handyman: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  other: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

export default function ContractorDirectory() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteContractor, setDeleteContractor] = useState<Contractor | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialties: [] as string[],
    notes: '',
  });

  const fetchContractors = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      
      const res = await fetch(`/api/contractors?${params}`);
      const data = await res.json();
      
      if (data.contractors) {
        setContractors(data.contractors);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load contractors',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractors();
  }, [search]);

  const handleAddContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add contractor');
      }

      toast({ title: 'Success', description: 'Contractor added to directory' });
      setIsAddOpen(false);
      setFormData({ name: '', email: '', phone: '', specialties: [], notes: '' });
      fetchContractors();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add contractor',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const handleEditContractor = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setFormData({
      name: contractor.name,
      email: contractor.email,
      phone: contractor.phone || '',
      specialties: contractor.specialties,
      notes: contractor.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdateContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContractor) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/contractors/${editingContractor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update contractor');
      }

      toast({ title: 'Success', description: 'Contractor updated successfully' });
      setIsEditOpen(false);
      setEditingContractor(null);
      setFormData({ name: '', email: '', phone: '', specialties: [], notes: '' });
      fetchContractors();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update contractor',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContractor = async () => {
    if (!deleteContractor) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/contractors/${deleteContractor.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete contractor');
      }

      toast({ title: 'Success', description: 'Contractor removed from directory' });
      setDeleteContractor(null);
      fetchContractors();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete contractor',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const ContractorForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => void; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={isEdit ? 'edit-name' : 'name'} className="text-slate-300">Name *</Label>
          <Input
            id={isEdit ? 'edit-name' : 'name'}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
            placeholder="John Smith"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? 'edit-phone' : 'phone'} className="text-slate-300">Phone</Label>
          <Input
            id={isEdit ? 'edit-phone' : 'phone'}
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={isEdit ? 'edit-email' : 'email'} className="text-slate-300">Email *</Label>
        <Input
          id={isEdit ? 'edit-email' : 'email'}
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="bg-slate-800 border-slate-700 text-white"
          placeholder="contractor@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300">Specialties * <span className="text-slate-500 text-xs">(select all that apply)</span></Label>
        <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          {CONTRACTOR_SPECIALTIES.map((specialty) => (
            <Badge
              key={specialty}
              variant="outline"
              className={`cursor-pointer transition-all ${
                formData.specialties.includes(specialty)
                  ? specialtyColors[specialty] || 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                  : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:border-slate-500'
              }`}
              onClick={() => toggleSpecialty(specialty)}
            >
              {specialtyLabels[specialty]}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={isEdit ? 'edit-notes' : 'notes'} className="text-slate-300">Notes <span className="text-slate-500 text-xs">(optional)</span></Label>
        <Textarea
          id={isEdit ? 'edit-notes' : 'notes'}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
          placeholder="Any additional notes about this contractor..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => isEdit ? setIsEditOpen(false) : setIsAddOpen(false)}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={submitting || formData.specialties.length === 0}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Add Contractor'}
        </Button>
      </div>
    </form>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search contractors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-violet-500"
          />
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Contractor
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Add Contractor</DialogTitle>
              <DialogDescription className="text-slate-400">
                Add a new contractor to your directory
              </DialogDescription>
            </DialogHeader>
            <ContractorForm onSubmit={handleAddContractor} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Contractors Grid */}
      {contractors.length === 0 ? (
        <Card className="border-white/10 bg-gradient-to-r from-indigo-700 to-indigo-900">
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No contractors yet</h3>
            <p className="text-slate-300 mb-4 text-sm">
              Add contractors to your directory to assign work orders
            </p>
            <Button onClick={() => setIsAddOpen(true)} className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Contractor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contractors.map((contractor) => (
            <Card 
              key={contractor.id} 
              className="border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 hover:border-violet-500/30 transition-all group"
            >
              <CardContent className="p-4 md:p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                      {contractor.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{contractor.name}</h3>
                      {contractor.rating && (
                        <div className="flex items-center gap-1 text-xs text-amber-400">
                          <Star className="h-3 w-3 fill-current" />
                          <span>{contractor.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-white">
                      <DropdownMenuItem 
                        onClick={() => handleEditContractor(contractor)}
                        className="text-slate-200 focus:text-white focus:bg-slate-700 cursor-pointer"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => window.location.href = `mailto:${contractor.email}`}
                        className="text-slate-200 focus:text-white focus:bg-slate-700 cursor-pointer"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                      {contractor.phone && (
                        <DropdownMenuItem 
                          onClick={() => window.location.href = `tel:${contractor.phone}`}
                          className="text-slate-200 focus:text-white focus:bg-slate-700 cursor-pointer"
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem 
                        onClick={() => setDeleteContractor(contractor)}
                        className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <span className="truncate">{contractor.email}</span>
                  </div>
                  {contractor.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <span>{contractor.phone}</span>
                    </div>
                  )}
                </div>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {contractor.specialties.slice(0, 3).map((specialty) => (
                    <Badge 
                      key={specialty} 
                      variant="outline" 
                      className={`text-[10px] md:text-xs ${specialtyColors[specialty] || 'bg-slate-700/50 text-slate-300 border-slate-600'}`}
                    >
                      {specialtyLabels[specialty] || specialty}
                    </Badge>
                  ))}
                  {contractor.specialties.length > 3 && (
                    <Badge variant="outline" className="text-[10px] md:text-xs bg-slate-700/50 text-slate-400 border-slate-600">
                      +{contractor.specialties.length - 3} more
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                  <div className="flex items-center gap-1 text-sm">
                    <ClipboardList className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-300">{contractor.workOrderCount} jobs</span>
                  </div>
                  
                  {contractor.isPaymentReady ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Payment Ready
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-700/50 text-slate-400 border-slate-600 text-xs">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          setEditingContractor(null);
          setFormData({ name: '', email: '', phone: '', specialties: [], notes: '' });
        }
      }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Contractor</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update contractor information
            </DialogDescription>
          </DialogHeader>
          <ContractorForm onSubmit={handleUpdateContractor} isEdit />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteContractor} onOpenChange={(open) => !open && setDeleteContractor(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Contractor</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to remove <strong className="text-white">{deleteContractor?.name}</strong> from your directory? 
              This action cannot be undone.
              {deleteContractor?.workOrderCount && deleteContractor.workOrderCount > 0 && (
                <span className="block mt-2 text-amber-400">
                  ⚠️ This contractor has {deleteContractor.workOrderCount} work order(s) associated with them.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteContractor}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
