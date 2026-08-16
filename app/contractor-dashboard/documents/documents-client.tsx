'use client';

import { useState, useMemo } from 'react';
import {
  FileText, Plus, Send, CheckCircle2, XCircle, Eye, Trash2,
  AlertTriangle, FolderOpen, Search, Receipt, FileSignature,
  Wand2, Upload, Loader2, Copy, ExternalLink, Download,
  Clock, Hammer, Camera, DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ContractBuilderModal from '@/components/contractor/contracts/contract-builder-modal';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface UploadedDocument {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  category: string;
  description: string | null;
  amount: number | null;
  vendor: string | null;
  expenseDate: string | null;
  expenseCategory: string | null;
  isTemplate: boolean;
  isDefault: boolean;
  createdAt: string;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: string;
  vendor: string | null;
  expenseDate: string;
  receiptUrl: string | null;
  status: string;
  createdAt: string;
  job: { title: string; jobNumber: string } | null;
}

interface Job { id: string; title: string; jobNumber: string; }

interface ContractorInfo {
  businessName: string;
  legalName: string;
  address: string;
  email: string;
  phone: string;
  licenseNumber?: string;
  insurancePolicy?: string;
}

interface Props {
  contracts: Contract[];
  documents: UploadedDocument[];
  expenses: Expense[];
  jobs: Job[];
  contractor: ContractorInfo;
  appUrl: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTRACT_STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', icon: FileText },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Viewed', className: 'bg-violet-100 text-violet-700', icon: Eye },
  signed: { label: 'Signed', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-700', icon: XCircle },
  expired: { label: 'Expired', className: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  void: { label: 'Void', className: 'bg-gray-100 text-gray-500', icon: XCircle },
};

const EXPENSE_CATEGORIES = [
  'Materials', 'Tools', 'Fuel', 'Permits', 'Subcontractor', 'Equipment', 'Insurance', 'Other',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContractorDocumentsClient({
  contracts: initialContracts,
  documents: initialDocuments,
  expenses: initialExpenses,
  jobs,
  contractor,
  appUrl,
}: Props) {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [documents, setDocuments] = useState<UploadedDocument[]>(initialDocuments);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [activeTab, setActiveTab] = useState('contracts');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [copied, setCopied] = useState(false);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '', category: 'other', description: '', isTemplate: false,
    file: null as File | null, jobId: '', amount: '', vendor: '',
    expenseDate: '', expenseCategory: 'Other',
  });

  // Receipt → expense dialog
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptDoc, setReceiptDoc] = useState<UploadedDocument | null>(null);
  const [receiptForm, setReceiptForm] = useState({
    amount: '', vendor: '', expenseDate: '', category: 'Other', description: '', jobId: '',
  });

  // Stats
  const stats = {
    totalContracts: contracts.length,
    draftContracts: contracts.filter(c => c.status === 'draft').length,
    sentContracts: contracts.filter(c => ['sent', 'viewed'].includes(c.status)).length,
    signedContracts: contracts.filter(c => c.status === 'signed').length,
    totalDocuments: documents.length,
    templates: documents.filter(d => d.isTemplate).length,
    totalExpenses: expenses.length,
    totalExpenseAmount: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
  };

  // Filtered data
  const filteredContracts = useMemo(() => contracts.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      c.contractNumber.toLowerCase().includes(q);
  }), [contracts, searchQuery]);

  const filteredDocuments = useMemo(() => documents.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q);
  }), [documents, searchQuery]);

  const filteredExpenses = useMemo(() => expenses.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return e.description.toLowerCase().includes(q) ||
      e.vendor?.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q);
  }), [expenses, searchQuery]);

  const contractTemplates = useMemo(() => documents.filter(d => d.isTemplate), [documents]);
  const receiptDocs = useMemo(() => documents.filter(d => d.category === 'receipt' || d.category === 'invoice'), [documents]);

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getSigningUrl(contract: Contract): string {
    return `${appUrl}/sign/contractor/${contract.id}`;
  }

  async function handleUpload() {
    if (!uploadForm.file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('name', uploadForm.name || uploadForm.file.name);
      formData.append('category', uploadForm.category);
      formData.append('description', uploadForm.description);
      formData.append('isTemplate', String(uploadForm.isTemplate));
      if (uploadForm.jobId) formData.append('jobId', uploadForm.jobId);
      if (uploadForm.amount) formData.append('amount', uploadForm.amount);
      if (uploadForm.vendor) formData.append('vendor', uploadForm.vendor);
      if (uploadForm.expenseDate) formData.append('expenseDate', uploadForm.expenseDate);
      if (uploadForm.expenseCategory) formData.append('expenseCategory', uploadForm.expenseCategory);

      const res = await fetch('/api/contractor/documents', { method: 'POST', body: formData });
      if (res.ok) {
        const { document } = await res.json();
        setDocuments(prev => [document, ...prev]);
        toast({ title: 'Document uploaded' });
        setUploadOpen(false);
        setUploadForm({
          name: '', category: 'other', description: '', isTemplate: false,
          file: null, jobId: '', amount: '', vendor: '',
          expenseDate: '', expenseCategory: 'Other',
        });
      } else {
        const err = await res.json();
        toast({ variant: 'destructive', title: 'Upload failed', description: err.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(id: string) {
    if (!confirm('Delete this document?')) return;
    const res = await fetch(`/api/contractor/documents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast({ title: 'Document deleted' });
    }
  }

  async function handleSetDefaultTemplate(id: string) {
    const res = await fetch(`/api/contractor/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      setDocuments(prev => prev.map(d => ({
        ...d,
        isDefault: d.id === id ? true : d.isTemplate ? false : d.isDefault,
      })));
      toast({ title: 'Default template updated' });
    }
  }

  async function handleConvertToExpense() {
    if (!receiptDoc || !receiptForm.amount) return;
    try {
      const res = await fetch('/api/contractor/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: receiptForm.category,
          description: receiptForm.description || receiptDoc.name,
          amount: parseFloat(receiptForm.amount),
          vendor: receiptForm.vendor || receiptDoc.vendor,
          expenseDate: receiptForm.expenseDate || new Date().toISOString(),
          jobId: receiptForm.jobId || receiptDoc.id,
          receiptUrl: receiptDoc.fileUrl,
        }),
      });
      if (res.ok) {
        toast({ title: 'Expense created from receipt' });
        setReceiptDialogOpen(false);
        setReceiptDoc(null);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to create expense' });
    }
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-cyan-500 font-medium">
            Documents
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black leading-tight flex items-center gap-2">
            <FolderOpen className="h-5 w-5 md:h-7 md:w-7 text-cyan-500 shrink-0" />
            Document Center
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Contracts, receipts, and templates for your business.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 h-11 md:h-12 text-sm md:text-base text-gray-800 placeholder:text-gray-400"
        />
      </div>

      {/* Free Contract Builder — Prominent CTA */}
      <div className="rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 p-5 md:p-6 shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-cyan-200/30 to-transparent rounded-bl-full" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shrink-0">
              <Wand2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">
                Free Contract Builder
              </h3>
              <p className="text-sm text-gray-600 mt-1 max-w-lg">
                Generate a state-aware, court-ready service agreement in minutes.
                Choose from 12 trade-specific templates with built-in legal provisions.
              </p>
              <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200 p-1 h-auto flex-wrap">
          <TabsTrigger value="contracts" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white gap-1.5 text-xs sm:text-sm">
            <FileSignature className="h-3.5 w-3.5" />
            Contracts
            <Badge className="ml-1 bg-cyan-100 text-cyan-700 text-[10px] px-1.5 py-0">{stats.totalContracts}</Badge>
          </TabsTrigger>
          <TabsTrigger value="receipts" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white gap-1.5 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5" />
            Receipts
            <Badge className="ml-1 bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">{receiptDocs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white gap-1.5 text-xs sm:text-sm">
            <Wand2 className="h-3.5 w-3.5" />
            Templates
            <Badge className="ml-1 bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0">{stats.templates}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Contracts Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Service agreements, proposals, and change orders.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setUploadForm(f => ({ ...f, category: 'other', isTemplate: false }));
                  setUploadOpen(true);
                }}
                variant="outline"
                className="border-cyan-200 text-cyan-600 hover:bg-cyan-50"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload
              </Button>
              <Button
                size="sm"
                onClick={() => setShowBuilder(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Contract
              </Button>
            </div>
          </div>

          {filteredContracts.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
              <FileSignature className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-1">No contracts yet</p>
              <p className="text-sm text-gray-500 mb-6">Build a contract or upload one to get started.</p>
              <Button onClick={() => setShowBuilder(true)} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                <Hammer className="h-4 w-4 mr-2" /> Build a Contract
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContracts.map(contract => {
                const cfg = CONTRACT_STATUS_CONFIG[contract.status] || CONTRACT_STATUS_CONFIG.draft;
                const StatusIcon = cfg.icon;
                const isExpiringSoon = contract.expiresAt && !['signed', 'void', 'declined', 'expired'].includes(contract.status) &&
                  new Date(contract.expiresAt).getTime() - Date.now() < 3 * 86_400_000;

                return (
                  <div key={contract.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 md:p-5 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {contract.status === 'draft' && (
                          <Button
                            type="button" size="sm"
                            onClick={() => handleSend(contract)}
                            disabled={sending === contract.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {sending === contract.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Send className="h-3.5 w-3.5 mr-1.5" />}
                            Send
                          </Button>
                        )}
                        {['sent', 'viewed'].includes(contract.status) && (
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
        </TabsContent>

        {/* ── Receipts Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="receipts" className="space-y-4">
          {/* Header card */}
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-4 md:p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shrink-0">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 mb-1">Receipts & Expenses</h3>
                <p className="text-sm text-gray-600">
                  Upload receipts from job sites. File them under the right job for easy expense tracking and tax prep.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setUploadForm(f => ({ ...f, category: 'receipt', isTemplate: false }));
                  setUploadOpen(true);
                }}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg text-white font-semibold shadow-md shrink-0 h-10 px-4"
              >
                <Camera className="h-4 w-4 mr-1.5" />
                Upload Receipt
              </Button>
            </div>
          </div>

          {/* Receipt stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Total Receipts</p>
              <p className="text-xl font-bold text-gray-900">{receiptDocs.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Logged Expenses</p>
              <p className="text-xl font-bold text-emerald-600">{stats.totalExpenses}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Total Spent</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalExpenseAmount)}</p>
            </div>
          </div>

          {/* Receipt documents */}
          {receiptDocs.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-1">No receipts yet</p>
              <p className="text-sm text-gray-500 mb-6">Upload a receipt to start tracking expenses.</p>
              <Button
                onClick={() => {
                  setUploadForm(f => ({ ...f, category: 'receipt', isTemplate: false }));
                  setUploadOpen(true);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Camera className="h-4 w-4 mr-2" /> Upload Receipt
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {receiptDocs.map(doc => (
                <div key={doc.id} className="rounded-lg border border-gray-200 bg-white p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <Receipt className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.fileSize)}
                      {doc.amount && ` · ${formatCurrency(doc.amount)}`}
                      {doc.vendor && ` · ${doc.vendor}`}
                      {' · '}{new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.amount ? (
                      <Badge className="bg-emerald-100 text-emerald-700">Expense logged</Badge>
                    ) : (
                      <Button
                        size="sm" variant="outline"
                        onClick={() => {
                          setReceiptDoc(doc);
                          setReceiptForm({
                            amount: '', vendor: doc.vendor || '',
                            expenseDate: doc.expenseDate || new Date().toISOString().split('T')[0],
                            category: doc.expenseCategory || 'Other',
                            description: doc.name, jobId: '',
                          });
                          setReceiptDialogOpen(true);
                        }}
                        className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs"
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Log Expense
                      </Button>
                    )}
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="text-gray-500 hover:text-gray-700">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Templates Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Uploaded contract templates. Set one as default to auto-populate new contracts.</p>
            <Button
              size="sm"
              onClick={() => {
                setUploadForm(f => ({ ...f, category: 'contract_template', isTemplate: true }));
                setUploadOpen(true);
              }}
              variant="outline"
              className="border-violet-200 text-violet-600 hover:bg-violet-50"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload Template
            </Button>
          </div>

          {contractTemplates.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
              <Wand2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-1">No templates yet</p>
              <p className="text-sm text-gray-500 mb-6">Upload a contract template or use the free builder.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowBuilder(true)} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                  <Hammer className="h-4 w-4 mr-2" /> Build a Contract
                </Button>
                <Button
                  onClick={() => {
                    setUploadForm(f => ({ ...f, category: 'contract_template', isTemplate: true }));
                    setUploadOpen(true);
                  }}
                  variant="outline"
                  className="border-violet-200 text-violet-600"
                >
                  <Upload className="h-4 w-4 mr-2" /> Upload Template
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {contractTemplates.map(doc => (
                <div key={doc.id} className={`rounded-lg border bg-white p-4 flex items-center gap-4 hover:shadow-sm transition-shadow ${doc.isDefault ? 'border-violet-300 ring-1 ring-violet-200' : 'border-gray-200'}`}>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${doc.isDefault ? 'bg-violet-100' : 'bg-gray-100'}`}>
                    <FileText className={`h-5 w-5 ${doc.isDefault ? 'text-violet-600' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{doc.name}</p>
                      {doc.isDefault && (
                        <Badge className="bg-violet-100 text-violet-700 text-[10px]">Default</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.fileSize)} · Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!doc.isDefault && (
                      <Button
                        size="sm" variant="outline"
                        onClick={() => handleSetDefaultTemplate(doc.id)}
                        className="border-violet-200 text-violet-600 hover:bg-violet-50 text-xs"
                      >
                        <Wand2 className="h-3 w-3 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="text-gray-500 hover:text-gray-700">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Signing URL Modal ───────────────────────────────────────────────── */}
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
              <Button onClick={() => copyLink(signingUrl)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                <Copy className="h-4 w-4 mr-2" /> {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button variant="outline" onClick={() => window.open(signingUrl, '_blank')} className="border-2 border-gray-200">
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setSigningUrl(null)} className="border-2 border-gray-200">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Dialog ───────────────────────────────────────────────────── */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {uploadForm.isTemplate ? 'Upload Contract Template' : 'Upload Document'}
              </h2>
              <button onClick={() => setUploadOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">File *</Label>
                <input
                  type="file"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setUploadForm(f => ({ ...f, file, name: f.name || file.name.replace(/\.[^/.]+$/, '') }));
                  }}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Name *</Label>
                <Input
                  value={uploadForm.name}
                  onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Document name"
                  className="rounded-lg border-2 border-gray-200"
                />
              </div>
              {!uploadForm.isTemplate && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Category</Label>
                    <Select value={uploadForm.category} onValueChange={v => setUploadForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="rounded-lg border-2 border-gray-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receipt">Receipt</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="license">License</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Link to Job</Label>
                    <Select value={uploadForm.jobId} onValueChange={v => setUploadForm(f => ({ ...f, jobId: v }))}>
                      <SelectTrigger className="rounded-lg border-2 border-gray-200"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {uploadForm.category === 'receipt' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Amount</Label>
                    <Input
                      type="number" value={uploadForm.amount}
                      onChange={e => setUploadForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00" className="rounded-lg border-2 border-gray-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Vendor</Label>
                    <Input
                      value={uploadForm.vendor}
                      onChange={e => setUploadForm(f => ({ ...f, vendor: e.target.value }))}
                      placeholder="Store name" className="rounded-lg border-2 border-gray-200"
                    />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Description</Label>
                <Textarea
                  value={uploadForm.description}
                  onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Optional notes..."
                  className="rounded-lg border-2 border-gray-200"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={uploading || !uploadForm.file || !uploadForm.name}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload
              </Button>
              <Button variant="outline" onClick={() => setUploadOpen(false)} className="border-2 border-gray-200">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt → Expense Dialog ────────────────────────────────────────── */}
      {receiptDialogOpen && receiptDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Log Expense from Receipt</h2>
              <button onClick={() => setReceiptDialogOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Creating expense from: <strong>{receiptDoc.name}</strong>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Amount *</Label>
                  <Input
                    type="number" value={receiptForm.amount}
                    onChange={e => setReceiptForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" className="rounded-lg border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Category</Label>
                  <Select value={receiptForm.category} onValueChange={v => setReceiptForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="rounded-lg border-2 border-gray-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Vendor</Label>
                  <Input
                    value={receiptForm.vendor}
                    onChange={e => setReceiptForm(f => ({ ...f, vendor: e.target.value }))}
                    placeholder="Store name" className="rounded-lg border-2 border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Date</Label>
                  <Input
                    type="date" value={receiptForm.expenseDate}
                    onChange={e => setReceiptForm(f => ({ ...f, expenseDate: e.target.value }))}
                    className="rounded-lg border-2 border-gray-200"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Link to Job</Label>
                <Select value={receiptForm.jobId} onValueChange={v => setReceiptForm(f => ({ ...f, jobId: v }))}>
                  <SelectTrigger className="rounded-lg border-2 border-gray-200"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button
                onClick={handleConvertToExpense}
                disabled={!receiptForm.amount}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Create Expense
              </Button>
              <Button variant="outline" onClick={() => setReceiptDialogOpen(false)} className="border-2 border-gray-200">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contract Builder Modal ──────────────────────────────────────────── */}
      <ContractBuilderModal
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        contractor={contractor}
        onContractGenerated={(contract) => {
          setContracts(prev => [contract, ...prev]);
          setShowBuilder(false);
          setActiveTab('contracts');
        }}
        jobs={jobs}
      />
    </div>
  );
}
