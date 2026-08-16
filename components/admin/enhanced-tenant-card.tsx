'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { Users, ChevronRight, Phone, Mail, Calendar, FileText, FileSignature, Loader2, Receipt, X, ExternalLink, FileCheck, AlertCircle, Plus, Banknote,} from 'lucide-react';
import { TenantActionsMenu } from './tenant-actions-menu';
import { EvictionNoticeModal } from './eviction-notice-modal';
import { DepartureModal } from './departure-modal';
import { TerminateLeaseModal } from './terminate-lease-modal';
import { DepositDispositionModal } from './deposit-disposition-modal';
import { EvictionHistoryPanel } from './eviction-history-panel';
import { TenantDocumentsModal } from './tenant-documents-modal';
import { useToast } from '@/hooks/use-toast';
import { LeaseRecurringCharges } from './lease-recurring-charges';
import { consolidateMoveInPayments, getPaymentTypeLabel, getStatusLabel, type GroupedPayment,} from '@/lib/utils/payment-grouping';

interface EnhancedTenantCardProps {
  lease: any;
  isExpanded: boolean;
  onToggle: () => void;
  propertyId: string;
  onViewLease: () => void;
  onRefresh?: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    partially_paid: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
    pending: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    processing: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    overdue: 'bg-red-500/20 text-red-300 border-red-400/30',
    cancelled: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
  };
  return (
    <Badge className={`${styles[status] || styles.pending} text-[10px] sm:text-xs`}>
      {getStatusLabel(status)}
    </Badge>
  );
}

export function EnhancedTenantCard({
  lease,
  isExpanded,
  onToggle,
  propertyId,
  onViewLease,
  onRefresh,
}: EnhancedTenantCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const tenant = lease.tenant;
  const payments = lease.rentPayments || [];
  const paidPayments = payments.filter((p: any) => p.status === 'paid');
  const overduePayments = payments.filter((p: any) => p.status === 'overdue');
  const totalOwed = payments
    .filter((p: any) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  // Check if tenant has signed but landlord hasn't
  const tenantSignature = lease.signatureRequests?.find((sr: any) => sr.role === 'tenant');
  const landlordSignature = lease.signatureRequests?.find((sr: any) => sr.role === 'landlord');
  const initialTenantSigned = tenantSignature?.status === 'signed' || !!lease.tenantSignedAt;
  const initialLandlordSigned = landlordSignature?.status === 'signed' || !!lease.landlordSignedAt;
  const isPendingSignature = lease.status === 'pending_signature';

  // Get signed PDF URL from signature requests (initial value)
  const initialSignedPdfUrl = landlordSignature?.signedPdfUrl || tenantSignature?.signedPdfUrl;
  
  // Track signature states that can be updated from API responses
  const [tenantSigned, setTenantSigned] = useState(initialTenantSigned);
  const [landlordSigned, setLandlordSigned] = useState(initialLandlordSigned);
  const needsLandlordSignature = tenantSigned && !landlordSigned;
  
  // Use proxy URL for PDF access (handles authentication)
  // If there's a signed PDF, use the proxy endpoint
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(
    initialSignedPdfUrl ? `/api/leases/${lease.id}/pdf` : null
  );
  
  // Update signature states when lease prop changes
  useEffect(() => {
    setTenantSigned(tenantSignature?.status === 'signed' || !!lease.tenantSignedAt);
    setLandlordSigned(landlordSignature?.status === 'signed' || !!lease.landlordSignedAt);
    // Update PDF URL if signature status changes
    const hasSigned = landlordSignature?.signedPdfUrl || tenantSignature?.signedPdfUrl;
    setSignedPdfUrl(hasSigned ? `/api/leases/${lease.id}/pdf` : null);
  }, [lease.id, lease.tenantSignedAt, lease.landlordSignedAt, tenantSignature?.status, landlordSignature?.status, tenantSignature?.signedPdfUrl, landlordSignature?.signedPdfUrl]);

  // Modal states
  const [showEvictionModal, setShowEvictionModal] = useState(false);
  const [showDepartureModal, setShowDepartureModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);
  const [showLeaseViewer, setShowLeaseViewer] = useState(false);
  const [leaseHtml, setLeaseHtml] = useState<string | null>(null);
  const [loadingLeaseHtml, setLoadingLeaseHtml] = useState(false);

  // Invoice states
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceReason, setInvoiceReason] = useState('');
  const [invoiceDescription, setInvoiceDescription] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Tab state for expanded content
  const [activeTab, setActiveTab] = useState('overview');

  // Cash payment state
  const [showCashPaymentForm, setShowCashPaymentForm] = useState(false);
  const [cashPaymentAmount, setCashPaymentAmount] = useState('');
  const [cashPaymentNote, setCashPaymentNote] = useState('');
  const [submittingCashPayment, setSubmittingCashPayment] = useState(false);

  const handleRefresh = () => {
    onRefresh?.();
  };

  // Load invoices when invoices tab is selected
  useEffect(() => {
    if (activeTab === 'invoices' && invoices.length === 0 && !loadingInvoices) {
      loadInvoices();
    }
  }, [activeTab]);

  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch(`/api/invoices?leaseId=${lease.id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingInvoice(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: lease.id,
          tenantId: tenant?.id,
          propertyId,
          amount: parseFloat(invoiceAmount),
          reason: invoiceReason,
          description: invoiceDescription || undefined,
          dueDate: new Date(invoiceDueDate).toISOString(),
        }),
      });
      
      if (res.ok) {
        toast({ description: 'Invoice created successfully' });
        setInvoiceAmount('');
        setInvoiceReason('');
        setInvoiceDescription('');
        setInvoiceDueDate('');
        setShowInvoiceForm(false);
        loadInvoices();
      } else {
        const data = await res.json();
        toast({ variant: 'destructive', description: data.message || 'Failed to create invoice' });
      }
    } catch (error) {
      toast({ variant: 'destructive', description: 'Failed to create invoice' });
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleInvoiceAction = async (invoiceId: string, action: 'paid' | 'cancel') => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/${action}`, { method: 'POST' });
      if (res.ok) {
        toast({ description: action === 'paid' ? 'Invoice marked as paid' : 'Invoice cancelled' });
        loadInvoices();
      } else {
        toast({ variant: 'destructive', description: 'Action failed' });
      }
    } catch (error) {
      toast({ variant: 'destructive', description: 'Action failed' });
    }
  };

  // Handle cash payment recording
  const handleRecordCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashPaymentAmount || parseFloat(cashPaymentAmount) <= 0) {
      toast({ variant: 'destructive', description: 'Please enter a valid amount' });
      return;
    }

    setSubmittingCashPayment(true);
    try {
      const res = await fetch('/api/rent-payments/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: lease.id,
          amount: parseFloat(cashPaymentAmount),
          note: cashPaymentNote || 'Cash payment received',
        }),
      });

      if (res.ok) {
        toast({ description: 'Cash payment recorded successfully' });
        setCashPaymentAmount('');
        setCashPaymentNote('');
        setShowCashPaymentForm(false);
        handleRefresh();
      } else {
        const data = await res.json();
        toast({ variant: 'destructive', description: data.message || 'Failed to record payment' });
      }
    } catch (error) {
      toast({ variant: 'destructive', description: 'Failed to record payment' });
    } finally {
      setSubmittingCashPayment(false);
    }
  };

  // Load lease HTML for viewing
  const handleViewLeaseDocument = async () => {
    setShowLeaseViewer(true);
    setLoadingLeaseHtml(true);
    try {
      const res = await fetch(`/api/leases/${lease.id}/preview`);
      if (res.ok) {
        const data = await res.json();
        setLeaseHtml(data.html);
        // Update signedPdfUrl from API response if available
        if (data.signedPdfUrl) {
          setSignedPdfUrl(data.signedPdfUrl);
        }
        // Update signature states from API response
        if (data.tenantSigned !== undefined) {
          setTenantSigned(data.tenantSigned);
        }
        if (data.landlordSigned !== undefined) {
          setLandlordSigned(data.landlordSigned);
        }
        // If landlord has signed (from fresh API data), trigger a refresh
        if (data.landlordSigned && !landlordSigned) {
          handleRefresh();
        }
      }
    } catch (error) {
      console.error('Failed to load lease:', error);
    } finally {
      setLoadingLeaseHtml(false);
    }
  };

  // Handle landlord signing
  const handleSignLease = async () => {
    setSigningLoading(true);
    try {
      const res = await fetch(`/api/leases/${lease.id}/sign-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'landlord' }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Failed to initiate signing');
        return;
      }

      const data = await res.json();
      const token = data.token || '';
      if (!token) {
        alert('Signing link missing');
        return;
      }
      
      router.push(`/sign/${token}`);
    } catch (error) {
      console.error('Sign error:', error);
      alert('An error occurred while initiating signing');
    } finally {
      setSigningLoading(false);
    }
  };

  // Calculate deposit amount (from lease or default)
  const depositAmount = lease.securityDeposit || lease.rentAmount || 0;

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        {/* Header - Always visible */}
        <div className="w-full p-3 sm:p-4 flex items-center justify-between">
          <button
            onClick={onToggle}
            className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 flex items-center justify-center flex-shrink-0">
              {tenant?.image ? (
                <Image
                  src={tenant.image}
                  alt={tenant.name}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              ) : (
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              )}
            </div>
            <div className="text-left min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {tenant?.name || 'Unknown Tenant'}
              </p>
              <p className="text-xs text-gray-600">
                Unit {lease.unitName} • {formatCurrency(Number(lease.rentAmount))}/mo
              </p>
            </div>
          </button>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
            {overduePayments.length > 0 && (
              <Badge className="bg-red-500/20 text-red-300 border-red-400/30 text-[10px] sm:text-xs whitespace-nowrap">
                {formatCurrency(totalOwed)}{' '}
                <span className="hidden sm:inline">overdue</span>
              </Badge>
            )}
            {isPendingSignature && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px] sm:text-xs hidden sm:flex">
                {needsLandlordSignature ? 'Sign Now' : 'Pending'}
              </Badge>
            )}
            <TenantActionsMenu
              lease={lease}
              propertyId={propertyId}
              onStartEviction={() => setShowEvictionModal(true)}
              onRecordDeparture={() => setShowDepartureModal(true)}
              onTerminateLease={() => setShowTerminateModal(true)}
              onProcessDeposit={() => setShowDepositModal(true)}
              onViewNotices={() => setShowHistoryPanel(true)}
            />
            <button onClick={onToggle}>
              <ChevronRight
                className={`w-5 h-5 text-gray-600 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Expanded Content with Tabs */}
        {isExpanded && (
          <div className="border-t border-gray-200">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start bg-gray-50 rounded-none border-b border-gray-200 p-1 h-auto">
                <TabsTrigger
                  value="overview"
                  className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700"
                >
                  Payments
                </TabsTrigger>
                <TabsTrigger
                  value="recurring"
                  className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700"
                >
                  Recurring
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700"
                >
                  Documents
                </TabsTrigger>
                <TabsTrigger
                  value="invoices"
                  className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md text-gray-700"
                >
                  Invoices
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="p-4 space-y-4 mt-0">
                {/* Verification Status */}
                {tenant?.verification && (
                  <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Verified Tenant</p>
                          <p className="text-xs text-gray-600">
                            ID:{' '}
                            {tenant.verification.identityStatus === 'verified'
                              ? '✓'
                              : '○'}{' '}
                            • Income:{' '}
                            {tenant.verification.employmentStatus === 'verified'
                              ? '✓'
                              : '○'}
                          </p>
                        </div>
                      </div>
                      {tenant.verification.monthlyIncome && (
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Verified Income</p>
                          <p className="text-lg font-bold text-emerald-600">
                            ${tenant.verification.monthlyIncome.toLocaleString()}/mo
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">
                      {tenant?.email || 'No email'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    {(() => {
                      // Prefer application phone, fallback to user phone
                      const phone = tenant?.applicationPhone || tenant?.phoneNumber;
                      return phone ? (
                        <a
                          href={`tel:${phone}`}
                          className="text-gray-700 hover:text-cyan-600 transition-colors underline-offset-2 hover:underline"
                        >
                          {phone}
                        </a>
                      ) : (
                        <span className="text-gray-500">No phone</span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-700">
                      Move-in: {new Date(lease.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-700">
                      {lease.endDate
                        ? `Move-out: ${new Date(lease.endDate).toLocaleDateString()}`
                        : 'Month-to-month'}
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                      {paidPayments.length}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600">On Time</p>
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">
                      {overduePayments.length}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600">Late</p>
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {formatCurrency(totalOwed)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600">Balance</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {needsLandlordSignature ? (
                    <Button
                      size="sm"
                      onClick={handleSignLease}
                      disabled={signingLoading}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 text-xs sm:text-sm"
                    >
                      {signingLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin sm:mr-2" />
                      ) : (
                        <FileSignature className="w-4 h-4 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">Sign Lease Now</span>
                      <span className="sm:hidden">Sign</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleViewLeaseDocument}
                      className="bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 text-white hover:opacity-90 text-xs sm:text-sm"
                    >
                      <FileSignature className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">View Lease</span>
                      <span className="sm:hidden">Lease</span>
                    </Button>
                  )}
                  {tenant?.applicationId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDocumentsModal(true)}
                      className="border-white/10 text-black text-xs sm:text-sm"
                    >
                      <FileText className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">View ID & Documents</span>
                      <span className="sm:hidden">Docs</span>
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="p-4 space-y-4 mt-0">
                {/* Record Cash Payment Button */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">Payments</h4>
                  <Button
                    size="sm"
                    onClick={() => setShowCashPaymentForm(!showCashPaymentForm)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-xs"
                  >
                    <Banknote className="w-3 h-3 mr-1" />
                    Record Cash
                  </Button>
                </div>

                {/* Cash Payment Form */}
                {showCashPaymentForm && (
                  <form onSubmit={handleRecordCashPayment} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-gray-900">Record Cash Payment</span>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Amount ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={cashPaymentAmount}
                        onChange={(e) => setCashPaymentAmount(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900 text-sm h-9"
                        placeholder={formatCurrency(Number(lease.rentAmount))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Note (optional)</label>
                      <Input
                        value={cashPaymentNote}
                        onChange={(e) => setCashPaymentNote(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900 text-sm h-9"
                        placeholder="e.g. Cash received in person"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={submittingCashPayment}
                        className="bg-emerald-600 hover:bg-emerald-500"
                      >
                        {submittingCashPayment ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        Record Payment
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCashPaymentForm(false)}
                        className="border-gray-300 text-gray-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Payment History
                  </h4>
                  {(() => {
                    // Consolidate move-in payments for display
                    const groupedPayments = consolidateMoveInPayments(
                      payments.map((p: any) => ({
                        id: p.id,
                        amount: p.amount,
                        status: p.status,
                        dueDate: p.dueDate,
                        paidAt: p.paidAt,
                        metadata: p.metadata,
                        tenantName: tenant?.name,
                        propertyName: lease.unit?.property?.name,
                        unitName: lease.unitName,
                      }))
                    );
                    
                    return groupedPayments.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {groupedPayments.map((grouped: GroupedPayment) => (
                          <div key={grouped.id} className="text-xs sm:text-sm py-2 border-b border-gray-200 last:border-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-gray-600">
                                  {grouped.dueDate ? new Date(grouped.dueDate).toLocaleDateString() : '—'}
                                </span>
                                {grouped.type === 'move_in' && (
                                  <span className="text-[10px] text-cyan-600">Move-in Payment</span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-gray-900 font-medium">
                                  {formatCurrency(grouped.amount)}
                                </span>
                                {/* Show breakdown for move-in payments */}
                                {grouped.type === 'move_in' && grouped.breakdown && (
                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                    {grouped.breakdown.firstMonth && <span>1st: {formatCurrency(grouped.breakdown.firstMonth)}</span>}
                                    {grouped.breakdown.lastMonth && <span> • Last: {formatCurrency(grouped.breakdown.lastMonth)}</span>}
                                    {grouped.breakdown.securityDeposit && <span> • Dep: {formatCurrency(grouped.breakdown.securityDeposit)}</span>}
                                  </div>
                                )}
                              </div>
                              <StatusBadge status={grouped.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No payment history
                      </p>
                    );
                  })()}
                </div>
              </TabsContent>

              {/* Recurring Charges Tab */}
              <TabsContent value="recurring" className="mt-0">
                <LeaseRecurringCharges lease={lease} />
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="p-4 space-y-4 mt-0">
                <div className="space-y-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleViewLeaseDocument}
                    className="w-full justify-start border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <FileSignature className="w-4 h-4 mr-2" />
                    Lease Agreement
                    {signedPdfUrl && (
                      <Badge className="ml-auto bg-emerald-500/20 text-emerald-700 text-[10px]">Signed</Badge>
                    )}
                  </Button>
                  {tenant?.applicationId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDocumentsModal(true)}
                      className="w-full justify-start border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      ID & Income Documents
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* Invoices Tab */}
              <TabsContent value="invoices" className="p-4 space-y-4 mt-0">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">Invoices</h4>
                  <Button
                    size="sm"
                    onClick={() => setShowInvoiceForm(!showInvoiceForm)}
                    className="bg-violet-600 hover:bg-violet-500 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create Invoice
                  </Button>
                </div>

                {/* Invoice Creation Form */}
                {showInvoiceForm && (
                  <form onSubmit={handleCreateInvoice} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600">Amount ($)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={invoiceAmount}
                          onChange={(e) => setInvoiceAmount(e.target.value)}
                          className="bg-white border-gray-300 text-gray-900 text-sm h-9"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Due Date</label>
                        <Input
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={invoiceDueDate}
                          onChange={(e) => setInvoiceDueDate(e.target.value)}
                          className="bg-white border-gray-300 text-gray-900 text-sm h-9"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Reason</label>
                      <Input
                        required
                        value={invoiceReason}
                        onChange={(e) => setInvoiceReason(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900 text-sm h-9"
                        placeholder="e.g. Late fee, Repair charge"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Description (optional)</label>
                      <Textarea
                        value={invoiceDescription}
                        onChange={(e) => setInvoiceDescription(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900 text-sm resize-none"
                        rows={2}
                        placeholder="Additional details..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={submittingInvoice}
                        className="bg-violet-600 hover:bg-violet-500"
                      >
                        {submittingInvoice ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        Create
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowInvoiceForm(false)}
                        className="border-gray-300 text-gray-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {/* Invoice List */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {loadingInvoices ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    </div>
                  ) : invoices.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No invoices yet</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {invoices.map((invoice: any) => (
                        <div
                          key={invoice.id}
                          className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{invoice.reason}</p>
                              <p className="text-xs text-gray-600">
                                Due: {new Date(invoice.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(Number(invoice.amount))}
                              </p>
                              <InvoiceStatusBadge status={invoice.status} />
                            </div>
                          </div>
                          {invoice.status === 'pending' && (
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInvoiceAction(invoice.id, 'paid')}
                                className="text-xs h-7 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              >
                                Mark Paid
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleInvoiceAction(invoice.id, 'cancel')}
                                className="text-xs h-7 text-red-400 hover:bg-red-500/10"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Modals */}
      <EvictionNoticeModal
        isOpen={showEvictionModal}
        onClose={() => setShowEvictionModal(false)}
        lease={lease}
        propertyId={propertyId}
        onSuccess={handleRefresh}
      />

      <DepartureModal
        isOpen={showDepartureModal}
        onClose={() => setShowDepartureModal(false)}
        lease={lease}
        onSuccess={handleRefresh}
      />

      <TerminateLeaseModal
        isOpen={showTerminateModal}
        onClose={() => setShowTerminateModal(false)}
        lease={lease}
        onSuccess={handleRefresh}
      />

      <DepositDispositionModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        lease={lease}
        depositAmount={Number(depositAmount)}
        outstandingBalance={totalOwed}
        onSuccess={handleRefresh}
      />

      <EvictionHistoryPanel
        isOpen={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        leaseId={lease.id}
        tenantName={tenant?.name || 'Unknown'}
      />

      {tenant?.applicationId && (
        <TenantDocumentsModal
          isOpen={showDocumentsModal}
          onClose={() => setShowDocumentsModal(false)}
          applicationId={tenant.applicationId}
          tenantName={tenant?.name || 'Tenant'}
        />
      )}

      {/* Lease Viewer Modal */}
      {showLeaseViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowLeaseViewer(false)}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-slate-900">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  {(tenantSigned || landlordSigned) && <FileCheck className="w-5 h-5 text-emerald-400" />}
                  Lease Agreement
                </h2>
                <p className="text-sm text-slate-400">
                  {tenant?.name} • Unit {lease.unitName}
                </p>
              </div>
              <button 
                onClick={() => setShowLeaseViewer(false)}
                className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
              {loadingLeaseHtml ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Signature Status - only show if someone has signed */}
                  {(tenantSigned || landlordSigned) && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <FileCheck className="w-6 h-6 text-emerald-400" />
                        <h3 className="font-semibold text-white">
                          {tenantSigned && landlordSigned ? 'Fully Executed Lease' : 'Partially Signed'}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {tenantSigned && (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-500/20 text-emerald-300">Tenant</Badge>
                            <span className="text-slate-300">
                              Signed {tenantSignature?.signedAt ? new Date(tenantSignature.signedAt).toLocaleDateString() : lease.tenantSignedAt ? new Date(lease.tenantSignedAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                        )}
                        {landlordSigned && (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-500/20 text-emerald-300">Landlord</Badge>
                            <span className="text-slate-300">
                              Signed {landlordSignature?.signedAt ? new Date(landlordSignature.signedAt).toLocaleDateString() : lease.landlordSignedAt ? new Date(lease.landlordSignedAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      {signedPdfUrl && (
                        <div className="mt-4 pt-3 border-t border-emerald-500/20">
                          <a
                            href={signedPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Download Signed PDF
                          </a>
                          <p className="text-xs text-emerald-300/70 mt-2">
                            The PDF contains actual signatures and an audit log
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lease Content */}
                  {leaseHtml ? (
                    <div className="rounded-xl border border-white/10 bg-white p-6">
                      <div
                        className="prose prose-sm max-w-none text-gray-800"
                        style={{ fontSize: '14px', lineHeight: '1.6' }}
                        dangerouslySetInnerHTML={{ __html: leaseHtml }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">Lease Not Available</h3>
                      <p className="text-sm text-slate-400">
                        The lease document could not be loaded. Please try again later.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    paid: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    overdue: 'bg-red-500/20 text-red-300 border-red-400/30',
    cancelled: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
  };
  return (
    <Badge className={`${styles[status] || styles.pending} text-[10px]`}>
      {status}
    </Badge>
  );
}
