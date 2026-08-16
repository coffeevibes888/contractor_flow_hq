'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  Eye,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  MapPin,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Filter,
  RefreshCw,
  Loader2,
  User,
  Phone,
  Mail,
  FileText,
  Star,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface Lead {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  projectType: string;
  projectTitle?: string;
  projectDescription: string;
  budgetMin?: number;
  budgetMax?: number;
  timeline?: string;
  urgency: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  propertyType?: string;
  leadScore: number;
  isExclusive: boolean;
  createdAt: string;
  expiresAt: string;
  matchStatus: string;
  matchId: string;
  leadCost?: number;
  viewedAt?: string;
  respondedAt?: string;
}

interface LeadsDashboardProps {
  contractorId: string;
}

export function LeadsDashboard({ contractorId }: LeadsDashboardProps) {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    newLeads: 0,
    responded: 0,
    won: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    loadLeads();
  }, [filter]);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ role: 'contractor' });
      if (filter !== 'all') params.append('status', filter);
      
      const res = await fetch(`/api/contractor/leads?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setLeads(data.leads);
        
        // Calculate stats
        const newLeads = data.leads.filter((l: Lead) => l.matchStatus === 'pending' || l.matchStatus === 'sent').length;
        const responded = data.leads.filter((l: Lead) => l.matchStatus === 'responded' || l.matchStatus === 'quoted').length;
        const won = data.leads.filter((l: Lead) => l.matchStatus === 'won').length;
        const totalSpent = data.leads.reduce((sum: number, l: Lead) => sum + (l.leadCost || 0), 0);
        
        setStats({ newLeads, responded, won, totalSpent });
      }
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsViewed = async (matchId: string) => {
    try {
      await fetch(`/api/contractor/leads/${matchId}/view`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to mark as viewed:', error);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    if (!lead.viewedAt) {
      markAsViewed(lead.matchId);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'urgent': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'normal': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'sent': return 'bg-violet-500/20 text-violet-400';
      case 'viewed': return 'bg-blue-500/20 text-blue-400';
      case 'responded':
      case 'quoted': return 'bg-amber-500/20 text-amber-400';
      case 'won': return 'bg-emerald-500/20 text-emerald-400';
      case 'lost': return 'bg-slate-500/20 text-slate-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-white/10">
        <div className="bg-violet-500/10 rounded-xl p-4 border border-violet-500/20">
          <div className="flex items-center gap-2 text-violet-400 mb-1">
            <Inbox className="h-4 w-4" />
            <span className="text-xs font-medium">New Leads</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.newLeads}</p>
        </div>
        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-medium">Responded</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.responded}</p>
        </div>
        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Jobs Won</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.won}</p>
        </div>
        <div className="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/20">
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-medium">Lead Spend</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalSpent)}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 p-4 border-b border-white/10">
        <Filter className="h-4 w-4 text-slate-400" />
        {['all', 'pending', 'responded', 'won', 'lost'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={loadLeads}
          className="text-slate-400"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lead List */}
        <div className="w-1/3 border-r border-white/10 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Inbox className="h-12 w-12 text-slate-600 mb-3" />
              <p className="text-slate-400">No leads yet</p>
              <p className="text-sm text-slate-500 mt-1">
                New leads will appear here when customers request your services
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                    selectedLead?.id === lead.id ? 'bg-white/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {!lead.viewedAt && (
                        <div className="h-2 w-2 rounded-full bg-violet-500" />
                      )}
                      <span className="font-medium text-white">
                        {lead.projectTitle || lead.projectType}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatTimeAgo(lead.createdAt)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                    {lead.projectDescription}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getUrgencyColor(lead.urgency)}>
                      {lead.urgency}
                    </Badge>
                    <Badge className={getStatusColor(lead.matchStatus)}>
                      {lead.matchStatus}
                    </Badge>
                    {lead.isExclusive && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <Star className="h-3 w-3 mr-1" />
                        Exclusive
                      </Badge>
                    )}
                    {lead.leadCost && (
                      <span className="text-xs text-slate-500">
                        ${lead.leadCost}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lead Detail */}
        <div className="flex-1 overflow-y-auto">
          {selectedLead ? (
            <LeadDetail 
              lead={selectedLead} 
              onUpdate={loadLeads}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <FileText className="h-12 w-12 text-slate-600 mb-3" />
              <p className="text-slate-400">Select a lead to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeadDetail({ lead, onUpdate }: { lead: Lead; onUpdate: () => void }) {
  const { toast } = useToast();
  const [isResponding, setIsResponding] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');

  const handleRespond = async () => {
    if (!responseMessage.trim()) {
      toast({ variant: 'destructive', title: 'Please enter a message' });
      return;
    }

    setIsResponding(true);
    try {
      const res = await fetch(`/api/contractor/leads/${lead.matchId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: responseMessage,
          quoteAmount: quoteAmount ? parseFloat(quoteAmount) : null,
        }),
      });

      if (res.ok) {
        toast({ title: 'Response sent!', description: 'The customer has been notified.' });
        setResponseMessage('');
        setQuoteAmount('');
        onUpdate();
      } else {
        throw new Error('Failed to send response');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to send response' });
    } finally {
      setIsResponding(false);
    }
  };

  const handleDecline = async () => {
    try {
      await fetch(`/api/contractor/leads/${lead.matchId}/decline`, { method: 'POST' });
      toast({ title: 'Lead declined' });
      onUpdate();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to decline lead' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            {lead.projectTitle || lead.projectType}
          </h2>
          <p className="text-slate-400 mt-1">
            Submitted {new Date(lead.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lead.isExclusive && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              <Star className="h-3 w-3 mr-1" />
              Exclusive Lead
            </Badge>
          )}
          {lead.leadCost && (
            <Badge className="bg-emerald-500/20 text-emerald-400">
              Lead Cost: ${lead.leadCost}
            </Badge>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Customer</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-slate-500" />
            <span className="text-white">{lead.customerName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-slate-500" />
            <a href={`mailto:${lead.customerEmail}`} className="text-violet-400 hover:underline">
              {lead.customerEmail}
            </a>
          </div>
          {lead.customerPhone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-slate-500" />
              <a href={`tel:${lead.customerPhone}`} className="text-violet-400 hover:underline">
                {lead.customerPhone}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Project Details */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Project Details</h3>
        <p className="text-white whitespace-pre-wrap">{lead.projectDescription}</p>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          {(lead.budgetMin || lead.budgetMax) && (
            <div>
              <span className="text-xs text-slate-500">Budget</span>
              <p className="text-white">
                {lead.budgetMin && lead.budgetMax
                  ? `${formatCurrency(lead.budgetMin)} - ${formatCurrency(lead.budgetMax)}`
                  : lead.budgetMax
                  ? `Up to ${formatCurrency(lead.budgetMax)}`
                  : `${formatCurrency(lead.budgetMin || 0)}+`}
              </p>
            </div>
          )}
          <div>
            <span className="text-xs text-slate-500">Timeline</span>
            <p className="text-white capitalize">{lead.timeline?.replace('_', ' ') || 'Flexible'}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Property Type</span>
            <p className="text-white capitalize">{lead.propertyType || 'Residential'}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Location</span>
            <p className="text-white">
              {[lead.propertyCity, lead.propertyState, lead.propertyZip].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Response Section */}
      {(lead.matchStatus === 'pending' || lead.matchStatus === 'sent' || lead.matchStatus === 'viewed') && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Send Response</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500">Your Message</label>
              <Textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Introduce yourself and explain how you can help..."
                className="mt-1 bg-slate-900 border-slate-700 text-white min-h-[100px]"
              />
            </div>
            
            <div>
              <label className="text-xs text-slate-500">Quote Amount (optional)</label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="number"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-9 bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleRespond}
                disabled={isResponding}
                className="flex-1 bg-violet-600 hover:bg-violet-700"
              >
                {isResponding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Response
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={handleDecline}
                className="text-slate-400 hover:text-red-400"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Already Responded */}
      {lead.respondedAt && (
        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Response Sent</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            You responded on {new Date(lead.respondedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
