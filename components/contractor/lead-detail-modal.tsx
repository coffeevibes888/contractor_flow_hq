'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  TrendingUp,
  FileText,
  Send,
  CheckCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface LeadDetailModalProps {
  leadMatch: any;
  employees: any[];
  contractorId: string;
  isOpen: boolean;
  onClose: () => void;
  onStageChange: (matchId: string, newStage: string) => void;
}

export function LeadDetailModal({
  leadMatch,
  employees,
  contractorId,
  isOpen,
  onClose,
  onStageChange,
}: LeadDetailModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');
  const [quoteTimeline, setQuoteTimeline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { lead } = leadMatch;

  const handleCreateQuote = async () => {
    if (!quoteAmount) {
      toast({
        title: 'Error',
        description: 'Please enter a quote amount',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contractor/quotes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          amount: parseFloat(quoteAmount),
          description: quoteDescription,
          timeline: quoteTimeline,
          includesLabor: true,
          includesMaterials: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create quote');
      }

      toast({
        title: 'Success',
        description: 'Quote created successfully',
      });

      onClose();
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create quote',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertToJob = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contractor/jobs/create-from-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create job');
      }

      toast({
        title: 'Success',
        description: 'Job created successfully',
      });

      router.push(`/contractor-dashboard/jobs/${data.job.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create job',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-xl font-bold text-black'>
            {lead.projectTitle || lead.projectType}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Priority & Score */}
          <div className='flex items-center gap-2'>
            <Badge
              className={`border ${
                lead.priority === 'hot'
                  ? 'bg-red-100 text-red-700 border-red-300'
                  : lead.priority === 'warm'
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-blue-100 text-blue-700 border-blue-300'
              }`}
            >
              {lead.priority.toUpperCase()}
            </Badge>
            <Badge className='bg-violet-100 text-violet-700 border-violet-300'>
              Score: {lead.leadScore}
            </Badge>
            <Badge className='bg-gray-100 text-gray-700 border-gray-300'>
              {lead.stage.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Description */}
          <div>
            <h3 className='text-sm font-semibold text-black mb-2'>Project Description</h3>
            <p className='text-sm text-black/70'>{lead.projectDescription}</p>
          </div>

          {/* Customer Info */}
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-2'>
              <h3 className='text-sm font-semibold text-black'>Customer Information</h3>
              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-sm'>
                  <User className='h-4 w-4 text-black/60' />
                  <span className='text-black'>{lead.customerName}</span>
                </div>
                <div className='flex items-center gap-2 text-sm'>
                  <Mail className='h-4 w-4 text-black/60' />
                  <a
                    href={`mailto:${lead.customerEmail}`}
                    className='text-violet-600 hover:underline'
                  >
                    {lead.customerEmail}
                  </a>
                </div>
                {lead.customerPhone && (
                  <div className='flex items-center gap-2 text-sm'>
                    <Phone className='h-4 w-4 text-black/60' />
                    <a
                      href={`tel:${lead.customerPhone}`}
                      className='text-violet-600 hover:underline'
                    >
                      {lead.customerPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className='space-y-2'>
              <h3 className='text-sm font-semibold text-black'>Project Details</h3>
              <div className='space-y-1'>
                {lead.propertyCity && (
                  <div className='flex items-center gap-2 text-sm'>
                    <MapPin className='h-4 w-4 text-black/60' />
                    <span className='text-black'>
                      {lead.propertyCity}, {lead.propertyState} {lead.propertyZip}
                    </span>
                  </div>
                )}
                {(lead.budgetMin || lead.budgetMax) && (
                  <div className='flex items-center gap-2 text-sm'>
                    <DollarSign className='h-4 w-4 text-black/60' />
                    <span className='text-black font-semibold'>
                      {lead.budgetMin && formatCurrency(Number(lead.budgetMin))}
                      {lead.budgetMin && lead.budgetMax && ' - '}
                      {lead.budgetMax && formatCurrency(Number(lead.budgetMax))}
                    </span>
                  </div>
                )}
                {lead.timeline && (
                  <div className='flex items-center gap-2 text-sm'>
                    <Calendar className='h-4 w-4 text-black/60' />
                    <span className='text-black'>{lead.timeline}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Intelligence */}
          {(lead.emailOpens > 0 || lead.emailClicks > 0 || lead.estimateViews > 0) && (
            <div>
              <h3 className='text-sm font-semibold text-black mb-2'>Lead Intelligence</h3>
              <div className='flex gap-4 text-xs'>
                {lead.emailOpens > 0 && (
                  <div>
                    <span className='text-black/60'>Email Opens: </span>
                    <span className='font-semibold text-black'>{lead.emailOpens}</span>
                  </div>
                )}
                {lead.emailClicks > 0 && (
                  <div>
                    <span className='text-black/60'>Email Clicks: </span>
                    <span className='font-semibold text-black'>{lead.emailClicks}</span>
                  </div>
                )}
                {lead.estimateViews > 0 && (
                  <div>
                    <span className='text-black/60'>Estimate Views: </span>
                    <span className='font-semibold text-black'>{lead.estimateViews}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create Quote Section */}
          {!isCreatingQuote && lead.stage !== 'quoted' && lead.stage !== 'won' && (
            <Button
              onClick={() => setIsCreatingQuote(true)}
              className='w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-2 border-black'
            >
              <FileText className='h-4 w-4 mr-2' />
              Create Quote
            </Button>
          )}

          {isCreatingQuote && (
            <div className='space-y-3 p-4 rounded-lg border-2 border-black bg-gradient-to-r from-violet-50 to-purple-50'>
              <h3 className='text-sm font-semibold text-black'>Create Quote</h3>

              <div>
                <Label htmlFor='amount'>Quote Amount *</Label>
                <Input
                  id='amount'
                  type='number'
                  placeholder='5000'
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className='border-2 border-black'
                />
              </div>

              <div>
                <Label htmlFor='description'>Description</Label>
                <Textarea
                  id='description'
                  placeholder='Describe what is included in this quote...'
                  value={quoteDescription}
                  onChange={(e) => setQuoteDescription(e.target.value)}
                  className='border-2 border-black'
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor='timeline'>Timeline</Label>
                <Input
                  id='timeline'
                  placeholder='2-3 weeks'
                  value={quoteTimeline}
                  onChange={(e) => setQuoteTimeline(e.target.value)}
                  className='border-2 border-black'
                />
              </div>

              <div className='flex gap-2'>
                <Button
                  onClick={handleCreateQuote}
                  disabled={isSubmitting}
                  className='flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white'
                >
                  {isSubmitting ? 'Creating...' : 'Send Quote'}
                </Button>
                <Button
                  onClick={() => setIsCreatingQuote(false)}
                  variant='outline'
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Convert to Job */}
          {lead.stage === 'quoted' && (
            <Button
              onClick={handleConvertToJob}
              disabled={isSubmitting}
              className='w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-2 border-black'
            >
              <CheckCircle className='h-4 w-4 mr-2' />
              {isSubmitting ? 'Converting...' : 'Convert to Job'}
            </Button>
          )}

          {/* Stage Actions */}
          <div className='flex gap-2'>
            <Select
              value={lead.stage}
              onValueChange={(value) => onStageChange(leadMatch.id, value)}
            >
              <SelectTrigger className='border-2 border-black'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='new'>New</SelectItem>
                <SelectItem value='contacted'>Contacted</SelectItem>
                <SelectItem value='qualified'>Qualified</SelectItem>
                <SelectItem value='quoted'>Quoted</SelectItem>
                <SelectItem value='won'>Won</SelectItem>
                <SelectItem value='lost'>Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
