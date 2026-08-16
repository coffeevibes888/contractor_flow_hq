'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  MapPin,
  Calendar,
  TrendingUp,
  Phone,
  Mail,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { LeadDetailModal } from './lead-detail-modal';
import { useToast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  projectType: string;
  projectTitle: string | null;
  projectDescription: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  propertyCity: string | null;
  propertyState: string | null;
  budgetMin: number | string | null;
  budgetMax: number | string | null;
  priority: string;
  stage: string;
  leadScore: number;
  createdAt: string;
}

interface LeadMatch {
  id: string;
  status: string;
  matchScore: number;
  lead: Lead;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
}

export type { Lead, LeadMatch, Employee };

interface LeadsKanbanProps {
  leadMatches: LeadMatch[];
  employees: Employee[];
  contractorId: string;
}

const stages = [
  { id: 'new', label: 'New', icon: AlertCircle, color: 'from-blue-500 to-cyan-500' },
  { id: 'contacted', label: 'Contacted', icon: Phone, color: 'from-violet-500 to-purple-500' },
  { id: 'qualified', label: 'Qualified', icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
  { id: 'quoted', label: 'Quoted', icon: DollarSign, color: 'from-amber-500 to-orange-500' },
  { id: 'won', label: 'Won', icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
  { id: 'lost', label: 'Lost', icon: XCircle, color: 'from-red-500 to-rose-500' },
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'hot':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'warm':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'cold':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export function LeadsKanban({ leadMatches, employees, contractorId }: LeadsKanbanProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedLead, setSelectedLead] = useState<LeadMatch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLeadClick = (leadMatch: LeadMatch) => {
    setSelectedLead(leadMatch);
    setIsModalOpen(true);
  };

  // The stage endpoint is keyed off the lead-match id (the row that joins
  // a contractor to a lead), NOT the lead id. Earlier the modal passed
  // `lead.id` here and every stage change 404'd silently.
  const handleStageChange = async (matchId: string, newStage: string) => {
    try {
      const response = await fetch(`/api/contractor/leads/${matchId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update stage');
      }

      toast({
        title: 'Success',
        description: 'Lead stage updated',
      });

      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update lead stage',
        variant: 'destructive',
      });
    }
  };

  // Group leads by stage
  const leadsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = leadMatches.filter((match) => match.lead.stage === stage.id);
    return acc;
  }, {} as Record<string, LeadMatch[]>);

  return (
    <>
      {/* Desktop Kanban */}
      <div className='hidden lg:block'>
        <div className='grid grid-cols-6 gap-4'>
          {stages.map((stage) => {
            const Icon = stage.icon;
            const stageLeads = leadsByStage[stage.id] || [];

            return (
              <div key={stage.id} className='flex flex-col'>
                {/* Column Header */}
                <div className='relative rounded-xl border-2 border-black shadow-xl overflow-hidden mb-3'>
                  <div className={`absolute inset-0 bg-gradient-to-r ${stage.color}`} />
                  <div className='relative p-3 text-center'>
                    <Icon className='h-5 w-5 mx-auto text-white mb-1' />
                    <h3 className='text-sm font-bold text-white'>{stage.label}</h3>
                    <p className='text-xs text-white/80'>{stageLeads.length}</p>
                  </div>
                </div>

                {/* Cards */}
                <div className='space-y-2 flex-1'>
                  {stageLeads.map((match) => (
                    <div
                      key={match.id}
                      onClick={() => handleLeadClick(match)}
                      className='rounded-lg border-2 border-black bg-white p-3 hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]'
                    >
                      <div className='flex items-start justify-between mb-2'>
                        <h4 className='text-sm font-bold text-black line-clamp-1'>
                          {match.lead.projectTitle || match.lead.projectType}
                        </h4>
                        <Badge className={`text-[10px] px-1.5 py-0.5 border ${getPriorityColor(match.lead.priority)}`}>
                          {match.lead.priority}
                        </Badge>
                      </div>

                      <p className='text-xs text-black/70 mb-2 line-clamp-2'>
                        {match.lead.projectDescription}
                      </p>

                      <div className='space-y-1'>
                        <div className='flex items-center gap-1 text-xs text-black/60'>
                          <User className='h-3 w-3' />
                          <span className='truncate'>{match.lead.customerName}</span>
                        </div>

                        {match.lead.propertyCity && (
                          <div className='flex items-center gap-1 text-xs text-black/60'>
                            <MapPin className='h-3 w-3' />
                            <span className='truncate'>
                              {match.lead.propertyCity}, {match.lead.propertyState}
                            </span>
                          </div>
                        )}

                        {(match.lead.budgetMin || match.lead.budgetMax) && (
                          <div className='flex items-center gap-1 text-xs font-semibold text-emerald-600'>
                            <DollarSign className='h-3 w-3' />
                            <span>
                              {match.lead.budgetMin && formatCurrency(Number(match.lead.budgetMin))}
                              {match.lead.budgetMin && match.lead.budgetMax && ' - '}
                              {match.lead.budgetMax && formatCurrency(Number(match.lead.budgetMax))}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className='mt-2 pt-2 border-t border-black/10 flex items-center justify-between'>
                        <span className='text-[10px] text-black/60'>
                          Score: {match.lead.leadScore}
                        </span>
                        <span className='text-[10px] text-black/60'>
                          {new Date(match.lead.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className='text-center py-8 text-xs text-black/40'>
                      No leads in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile List */}
      <div className='lg:hidden space-y-3'>
        {leadMatches.length === 0 ? (
          <div className='relative rounded-xl border-2 border-black shadow-xl overflow-hidden'>
            <div className='absolute inset-0 bg-gradient-to-r from-violet-100 to-purple-100' />
            <div className='relative p-8 text-center'>
              <AlertCircle className='h-12 w-12 mx-auto text-violet-600 mb-3' />
              <h3 className='text-lg font-bold text-black mb-2'>No leads yet</h3>
              <p className='text-sm text-black/70'>
                Leads from the marketplace will appear here
              </p>
            </div>
          </div>
        ) : (
          leadMatches.map((match) => {
            const stage = stages.find((s) => s.id === match.lead.stage);
            const Icon = stage?.icon || AlertCircle;

            return (
              <div
                key={match.id}
                onClick={() => handleLeadClick(match)}
                className='rounded-xl border-2 border-black bg-gradient-to-r from-violet-100 to-purple-100 p-4 hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]'
              >
                <div className='flex items-start justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <div className={`p-1.5 rounded-lg bg-gradient-to-r ${stage?.color} border border-black`}>
                      <Icon className='h-4 w-4 text-white' />
                    </div>
                    <div>
                      <h4 className='text-sm font-bold text-black'>
                        {match.lead.projectTitle || match.lead.projectType}
                      </h4>
                      <p className='text-xs text-black/60'>{stage?.label}</p>
                    </div>
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0.5 border ${getPriorityColor(match.lead.priority)}`}>
                    {match.lead.priority}
                  </Badge>
                </div>

                <p className='text-xs text-black/70 mb-3 line-clamp-2'>
                  {match.lead.projectDescription}
                </p>

                <div className='grid grid-cols-2 gap-2 text-xs'>
                  <div className='flex items-center gap-1 text-black/60'>
                    <User className='h-3 w-3' />
                    <span className='truncate'>{match.lead.customerName}</span>
                  </div>
                  {match.lead.propertyCity && (
                    <div className='flex items-center gap-1 text-black/60'>
                      <MapPin className='h-3 w-3' />
                      <span className='truncate'>
                        {match.lead.propertyCity}, {match.lead.propertyState}
                      </span>
                    </div>
                  )}
                  {(match.lead.budgetMin || match.lead.budgetMax) && (
                    <div className='flex items-center gap-1 font-semibold text-emerald-600'>
                      <DollarSign className='h-3 w-3' />
                      <span>
                        {match.lead.budgetMin && formatCurrency(Number(match.lead.budgetMin))}
                        {match.lead.budgetMin && match.lead.budgetMax && ' - '}
                        {match.lead.budgetMax && formatCurrency(Number(match.lead.budgetMax))}
                      </span>
                    </div>
                  )}
                  <div className='flex items-center gap-1 text-black/60'>
                    <TrendingUp className='h-3 w-3' />
                    <span>Score: {match.lead.leadScore}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          leadMatch={selectedLead}
          employees={employees}
          contractorId={contractorId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedLead(null);
          }}
          onStageChange={handleStageChange}
        />
      )}
    </>
  );
}
