'use client';

import { useState } from 'react';
import {
  FileText, Plus, Send, CheckCircle2, XCircle,
  Copy, ExternalLink, Trash2, Eye, AlertTriangle,
  Loader2, Filter, Search, FileSignature, Hammer, Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import ContractBuilderModal from './contract-builder-modal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Job { id: string; title: string; jobNumber: string; }

interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  type: string;
  status: string;
  customerName: string;
  customerEmail: string;
  contractAmount: string | null;
  sentAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  job: { title: string; jobNumber: string } | null;
}

interface Props {
  initialContracts: Contract[];
  jobs: Job[];
  appUrl: string;
  contractor: {
    businessName: string;
    legalName: string;
    address: string;
    email: string;
    phone: string;
    licenseNumber?: string;
    insurancePolicy?: string;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', icon: FileText },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Viewed', className: 'bg-violet-100 text-violet-700', icon: Eye },
  signed: { label: 'Signed', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-700', icon: XCircle },
  expired: { label: 'Expired', className: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  void: { label: 'Void', className: 'bg-gray-100 text-gray-500', icon: XCircle },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ContractsDashboard({ initialContracts, jobs, appUrl, contractor }: Props) {
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Stats
  const stats = {
    total: contracts.length,
    draft: contracts.filter(c => c.status === 'draft').length,
    sent: contracts.filter(c => ['sent', 'viewed'].includes(c.status)).length,
    signed: contracts.filter(c => c.status === 'signed').length,
    pending: contracts.filter(c => ['sent', 'viewed'].includes(c.status)).length,
  };

  const filtered = contracts.filter(c => {
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.contractNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleSend(contract: Contract) {
    setSending(contract.id);
    try {
      const res = await fetch(`/api/contractor/contracts/${contract.id}/send`, { method: 'POST' });
      if (res.ok) {
        const { signingUrl: url } = await res.json();
        setContracts(prev => prev.map(c =>
          c.id === contract.id ? { ...c, status: 'sent', sentAt: new Date().toISOString() } : c
        ));
        setSigningUrl(url);
        setSelectedContract({ ...contract, status: 'sent' });
      }
    } finally {
      setSending(null);
    }
  }

  async function handleVoid(contract: Contract) {
    if (!confirm('Void this contract? This cannot be undone.')) return;
    setVoiding(contract.id);
    try {
      const res = await fetch(`/api/contractor/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'void' }),
      });
      if (res.ok) {
        setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, status: 'void' } : c));
      }
    } finally {
      setVoiding(null);
    }
  }

  async function handleDelete(contract: Contract) {
    if (!confirm('Delete this draft contract?')) return;
    const res = await fetch(`/api/contractor/contracts/${contract.id}`, { method: 'DELETE' });
    if (res.ok) setContracts(prev => prev.filter(c => c.id !== contract.id));
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getSigningUrl(contract: Contract): string {
    return `${appUrl}/sign/contractor/${contract.id}`;
  }

  return (
    <div className="space-y-6">
      {/* Free Contract Builder Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-blue-50 to-violet-50 p-6 md:p-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 right-0 w-72 h-72 bg-cyan-200/30 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-10 w-56 h-56 bg-violet-200/30 rounded-full blur-[60px]" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shrink-0">
              <Wand2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Free Contract Builder</h3>
              <p className="text-sm text-gray-600 mt-1 max-w-lg">
                Generate a state-aware, court-ready {contractor.businessName ? '' : ''}service agreement in minutes. Choose from 12 trade-specific templates with built-in legal provisions for {contractor.businessName || 'your trade'}.
              </p>
              <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                This tool generates a template. Have a licensed attorney in your state review before use.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowBuilder(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-xl text-white font-bold shadow-lg shrink-0 h-12 px-6 text-sm"
          >
            <Hammer className="h-4 w-4 mr-2" />
            Build a Contract
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create, send, and track customer contracts</p>
        </div>
        <Button
          onClick={() => setShowBuilder(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-xl text-white font-bold shadow-lg shrink-0 h-12 px-6 text-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-100', text: 'text-gray-700' },
          { label: 'Awaiting Signature', value: stats.sent, color: 'bg-blue-100', text: 'text-blue-700' },
          { label: 'Signed', value: stats.signed, color: 'bg-emerald-100', text: 'text-emerald-700' },
          { label: 'Draft', value: stats.draft, color: 'bg-gray-100', text: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contracts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border-2 border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contract list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <FileSignature className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-1">No contracts yet</p>
          <p className="text-sm text-gray-500 mb-6">Create your first contract and send it for signing.</p>
          <Button onClick={() => setShowBuilder(true)} className="bg-cyan-500 hover:bg-cyan-600 text-white">
            <Plus className="h-4 w-4 mr-2" /> New Contract
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(contract => {
            const cfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
            const StatusIcon = cfg.icon;
            const isExpiringSoon = contract.expiresAt && !['signed', 'void', 'declined', 'expired'].includes(contract.status) &&
              new Date(contract.expiresAt).getTime() - Date.now() < 3 * 86_400_000;

            return (
              <div key={contract.id} className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900">{contract.title}</span>
                      <span className="text-xs text-gray-400">{contract.contractNumber}</span>
                      <Badge className={`${cfg.className} flex items-center gap-1`}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                      {isExpiringSoon && (
                        <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Expiring Soon
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {contract.customerName} · {contract.customerEmail}
                      {contract.contractAmount && ` · ${formatCurrency(Number(contract.contractAmount))}`}
                    </p>
                    {contract.job && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Job: {contract.job.title} ({contract.job.jobNumber})
                      </p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      <span>Created {new Date(contract.createdAt).toLocaleDateString()}</span>
                      {contract.sentAt && <span>Sent {new Date(contract.sentAt).toLocaleDateString()}</span>}
                      {contract.signedAt && <span className="text-emerald-600">Signed {new Date(contract.signedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {contract.status === 'draft' && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSend(contract)}
                          disabled={sending === contract.id}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {sending === contract.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Send className="h-3.5 w-3.5 mr-1.5" />}
                          Send
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          onClick={() => handleDelete(contract)}
                          className="border-red-200 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {['sent', 'viewed'].includes(contract.status) && (
                      <>
                        <Button
                          size="sm" variant="outline"
                          onClick={() => {
                            const url = signingUrl || getSigningUrl(contract);
                            copyLink(url);
                          }}
                          className="border-gray-200 text-sm"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          {copied ? 'Copied!' : 'Copy Link'}
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          onClick={() => handleVoid(contract)}
                          disabled={voiding === contract.id}
                          className="border-gray-200 text-gray-500"
                        >
                          {voiding === contract.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Void'}
                        </Button>
                      </>
                    )}
                    {contract.status === 'signed' && (
                      <Badge className="bg-emerald-100 text-emerald-700 flex items-center gap-1 px-3 py-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Signing URL modal */}
      {signingUrl && selectedContract && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="h-7 w-7 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Contract Sent!</h2>
            <p className="text-sm text-gray-500 text-center mb-5">
              Share this link with <strong>{selectedContract.customerName}</strong> to sign.
            </p>
            <div className="flex items-center gap-2 bg-gray-50 border-2 border-gray-200 rounded-lg p-3 mb-5">
              <p className="flex-1 text-sm text-gray-700 font-mono break-all">{signingUrl}</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => copyLink(signingUrl)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(signingUrl, '_blank')}
                className="border-2 border-gray-200"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setSigningUrl(null)} className="border-2 border-gray-200">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Builder Modal */}
      <ContractBuilderModal
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        contractor={contractor}
        onContractGenerated={(contract) => {
          setContracts(prev => [contract, ...prev]);
          setShowBuilder(false);
        }}
        jobs={jobs}
      />
    </div>
  );
}
