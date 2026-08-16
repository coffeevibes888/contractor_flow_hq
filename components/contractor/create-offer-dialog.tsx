'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateOfferDialogProps {
  customerId: string;
  leadId: string;
  onOfferCreated?: () => void;
}

export function CreateOfferDialog({ customerId, leadId, onOfferCreated }: CreateOfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      customerId,
      leadId,
      title: formData.get('title'),
      description: formData.get('description'),
      basePrice: parseFloat(formData.get('price') as string),
      estimatedHours: parseFloat(formData.get('hours') as string),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days default
    };

    try {
      const res = await fetch('/api/contractor/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to create offer');

      toast.success('Custom offer sent successfully');
      setOpen(false);
      onOfferCreated?.();
    } catch (error) {
      console.error(error);
      toast.error('Failed to send offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
          <DollarSign className="h-4 w-4 mr-2" />
          Create Custom Offer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Offer</DialogTitle>
          <DialogDescription>
            Send a specific price and scope to the customer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Offer Title</Label>
            <Input id="title" name="title" placeholder="e.g. Full Bathroom Renovation" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Scope of Work</Label>
            <Textarea 
              id="description" 
              name="description" 
              placeholder="Describe exactly what is included..." 
              required 
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Total Price ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input id="price" name="price" type="number" min="0" step="0.01" className="pl-9" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Est. Hours</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input id="hours" name="hours" type="number" min="0" step="0.5" className="pl-9" required />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send Offer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
