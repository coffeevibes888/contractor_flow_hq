'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ContractorQuoteButtonProps {
  contractorSlug: string;
  contractorName: string;
  /** Variant style: 'default' for full-width, 'header' for compact header button */
  variant?: 'default' | 'header';
}

export function ContractorQuoteButton({ contractorSlug, contractorName, variant = 'default' }: ContractorQuoteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      customerName: formData.get('name'),
      customerEmail: formData.get('email'),
      customerPhone: formData.get('phone'),
      projectType: formData.get('projectType'),
      projectDescription: formData.get('description'),
      propertyAddress: formData.get('address'),
      propertyZip: formData.get('zipCode'),
      preselectedContractorSlug: contractorSlug,
    };

    try {
      const res = await fetch('/api/contractor/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to submit request');

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting quote request:', error);
      // Optional: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-4">
        <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
          <MessageSquare className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="font-medium text-emerald-600">Quote Request Sent!</p>
        <p className="text-sm text-slate-500 mt-1">
          {contractorName} will respond shortly.
        </p>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'header' ? (
          <Button className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-colors">
            <MessageSquare className="h-4 w-4 mr-2" />
            Get a Quote
          </Button>
        ) : (
          <Button className="w-full bg-violet-600 hover:bg-violet-700 text-lg py-6">
            <MessageSquare className="h-5 w-5 mr-2" />
            Get a Quote
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request a Quote from {contractorName}</DialogTitle>
          <DialogDescription>
            Describe your project and the contractor will get back to you with an estimate.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input id="name" name="name" required placeholder="John Smith" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="john@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" name="phone" type="tel" placeholder="(555) 123-4567" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectType">Type of Work</Label>
            <Input id="projectType" name="projectType" required placeholder="e.g., Plumbing repair, HVAC installation" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Project Description</Label>
            <Textarea 
              id="description" 
              name="description" 
              required 
              placeholder="Describe your project, including any relevant details about the scope of work, timeline, and budget..."
              className="min-h-[120px]"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="address">Property Address</Label>
              <Input id="address" name="address" placeholder="123 Main St" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input id="zipCode" name="zipCode" placeholder="89101" required />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Quote Request'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
