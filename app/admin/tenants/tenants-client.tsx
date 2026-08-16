'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Users,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Search,
  X,
  CheckCircle2,
  Clock,
  Archive,
  MessageCircle,
  UserPlus,
  Share2,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssignTenantDialog } from './unassigned/assign-tenant-dialog';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  leaseId: string;
  leaseStatus: string;
  unitName: string;
  propertyName: string;
  propertyId: string;
  rentAmount: number;
  startDate: Date;
  endDate: Date;
  rentPaidThisMonth?: boolean;
}

interface UnassignedTenant {
  linkId: string;
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    image: string | null;
    signupDate: string;
  };
  signupMethod: string | null;
  inviteCode: string | null;
  daysWaiting: number;
}

interface InviteBannerInfo {
  inviteCode: string;
  landlordEmail: string;
  pageUrl: string;
}

function TenantInviteBanner({ info }: { info: InviteBannerInfo }) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  if (dismissed) return null;

  function copyCode() {
    navigator.clipboard.writeText(info.inviteCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  function copyUrl() {
    navigator.clipboard.writeText(info.pageUrl).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    });
  }

  return (
    <div className='rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-blue-50 to-violet-50 p-4 sm:p-5'>
      <div className='flex items-start gap-3'>
        {/* Icon */}
        <div className='h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0 shadow-sm'>
          <Share2 className='h-4 w-4 text-white' />
        </div>

        {/* Content */}
        <div className='flex-1 min-w-0 space-y-3'>
          <div>
            <p className='text-slate-900 font-semibold text-sm'>
              Have existing tenants? Send them to your sign-up page.
            </p>
            <p className='text-slate-500 text-xs mt-0.5 leading-relaxed'>
              They can connect to your account by entering your{' '}
              <span className='text-slate-700 font-medium'>email ({info.landlordEmail})</span>,
              {' '}phone number, or this invite code when they sign up.
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            {/* Invite code pill */}
            <div className='flex items-center gap-2 bg-white border border-cyan-200 rounded-lg px-3 py-2 shadow-sm'>
              <KeyRound className='h-3.5 w-3.5 text-cyan-500 shrink-0' />
              <span className='text-xs text-slate-400 font-medium'>Invite Code</span>
              <span className='text-sm font-mono font-bold tracking-widest text-slate-900'>
                {info.inviteCode}
              </span>
              <button
                onClick={copyCode}
                title='Copy code'
                className='ml-0.5 text-slate-400 hover:text-cyan-600 transition-colors'
              >
                {codeCopied
                  ? <Check className='h-3.5 w-3.5 text-emerald-500' />
                  : <Copy className='h-3.5 w-3.5' />}
              </button>
            </div>

            {/* URL display + copy link */}
            <div className='flex items-center gap-0 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden'>
              <span className='pl-3 pr-2 py-2 text-xs font-mono text-slate-500 select-all truncate max-w-[180px] sm:max-w-xs'>
                {info.pageUrl}
              </span>
              <button
                onClick={copyUrl}
                title='Copy sign-up link'
                className='px-3 py-2 border-l border-slate-100 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors'
              >
                {urlCopied
                  ? <Check className='h-3.5 w-3.5 text-emerald-500' />
                  : <Copy className='h-3.5 w-3.5' />}
              </button>
            </div>

            {/* Preview button */}
            <a
              href={info.pageUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all shadow-sm'
            >
              <ExternalLink className='h-3.5 w-3.5' />
              Preview page
            </a>
          </div>

          {/* Collapsible how-it-works tip */}
          <div className='rounded-xl border border-blue-100 bg-white/70'>
            <button
              onClick={() => setTipOpen((o) => !o)}
              className='w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left'
            >
              <div className='flex items-center gap-1.5'>
                <Info className='h-3.5 w-3.5 text-blue-400 shrink-0' />
                <span className='text-xs font-semibold text-slate-700'>How does the tenant sign-up link work?</span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${tipOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {tipOpen && (
              <div className='px-3 pb-3 text-xs text-slate-500 leading-relaxed space-y-1.5 border-t border-blue-50'>
                <p className='pt-2'>
                  When a tenant visits <span className='font-mono text-slate-700 font-medium'>{info.pageUrl}</span> and
                  creates an account, they enter your <span className='font-medium text-slate-700'>email address</span>,{' '}
                  phone number, or invite code to connect their account to yours.
                </p>
                <p>
                  Once they sign up, they will appear in the{' '}
                  <span className='font-semibold text-amber-600'>Unassigned</span> tab on this page — they are not yet
                  linked to any property or unit.
                </p>
                <p>
                  From the <span className='font-semibold text-slate-700'>Unassigned</span> tab, click{' '}
                  <span className='font-semibold text-slate-700'>Assign</span> next to their name to assign them to a
                  specific property and unit so their lease and rent collection can begin.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className='text-slate-300 hover:text-slate-500 transition-colors shrink-0'
          title='Dismiss'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
}

interface TenantsClientProps {
  tenants: Tenant[];
  unassignedTenants: UnassignedTenant[];
  landlordId: string;
  inviteBanner?: InviteBannerInfo | null;
}

export function TenantsClient({ tenants, unassignedTenants, landlordId, inviteBanner }: TenantsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'unassigned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<UnassignedTenant | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const activeTenants = tenants.filter((t) => t.leaseStatus === 'active');

  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.phone && t.phone.toLowerCase().includes(q))
    );
  }, [tenants, searchQuery]);

  const handleAssign = (tenant: UnassignedTenant) => {
    setSelectedTenant(tenant);
    setAssignDialogOpen(true);
  };

  const handleArchive = async (linkId: string) => {
    if (!confirm('Archive this tenant? They will be moved to archived tenants.')) return;
    const res = await fetch(`/api/admin/tenants/unassigned/${linkId}/archive`, { method: 'POST' });
    if (res.ok) {
      router.refresh();
    } else {
      alert('Failed to archive tenant');
    }
  };

  return (
    <main className='w-full space-y-5'>
      {/* Tenant invite banner */}
      {inviteBanner && <TenantInviteBanner info={inviteBanner} />}

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Tenants</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Manage your tenants and their lease information
          </p>
        </div>
        <Link
          href='/admin/tenants/add'
          className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md hover:shadow-lg transition-all'
        >
          <Plus className='h-3.5 w-3.5' />
          Add Tenant
        </Link>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <StatCard label='Total Tenants' value={String(tenants.length)} />
        <StatCard label='Active Leases' value={String(activeTenants.length)} />
        <StatCard
          label='Unassigned'
          value={String(unassignedTenants.length)}
          highlight={unassignedTenants.length > 0}
        />
        <StatCard
          label='Monthly Revenue'
          value={`$${activeTenants.reduce((s, t) => s + t.rentAmount, 0).toLocaleString()}`}
        />
      </div>

      {/* Tabs */}
      <div className='flex items-center gap-2 border-b border-gray-200'>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'all' ? 'text-cyan-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All Tenants
          {activeTab === 'all' && (
            <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600' />
          )}
        </button>
        <button
          onClick={() => setActiveTab('unassigned')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === 'unassigned' ? 'text-cyan-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Unassigned
          {unassignedTenants.length > 0 && (
            <span className='inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-600 text-xs font-bold'>
              {unassignedTenants.length}
            </span>
          )}
          {activeTab === 'unassigned' && (
            <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600' />
          )}
        </button>
      </div>

      {/* Search bar — only on All Tenants tab */}
      {activeTab === 'all' && tenants.length > 0 && (
        <div className='relative flex items-center gap-2'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search by name, email, or phone…'
              className='w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all'
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            )}
          </div>
          <span className='text-xs text-gray-400 whitespace-nowrap'>
            {filteredTenants.length} of {tenants.length}
          </span>
        </div>
      )}

      {/* Content */}
      {activeTab === 'all' ? (
        tenants.length === 0 ? (
          <div className='rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm'>
            <Users className='mx-auto h-12 w-12 text-gray-300 mb-4' />
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>No Tenants Yet</h3>
            <p className='text-sm text-gray-500 mb-4 max-w-md mx-auto'>
              Add your first tenant to start managing leases and collecting rent.
            </p>
            <Link
              href='/admin/tenants/add'
              className='inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md hover:shadow-lg transition-all'
            >
              <Plus className='h-4 w-4' />
              Add Tenant
            </Link>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className='rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm'>
            <Search className='mx-auto h-10 w-10 text-gray-300 mb-3' />
            <p className='text-sm font-medium text-gray-600'>No tenants match &ldquo;{searchQuery}&rdquo;</p>
            <button
              onClick={() => setSearchQuery('')}
              className='mt-2 text-xs text-cyan-600 hover:text-cyan-700 font-medium'
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            {/* Desktop header */}
            <div className='hidden md:grid md:grid-cols-[2fr_2fr_1.2fr_1fr_auto] gap-4 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100'>
              <span className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider'>Tenant</span>
              <span className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider'>Contact</span>
              <span className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider'>Property / Unit</span>
              <span className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider'>Rent</span>
              <span className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-20 text-right'>Status</span>
            </div>
            <div className='divide-y divide-gray-100'>
              {filteredTenants.map((tenant) => (
                <TenantRow key={`${tenant.id}-${tenant.leaseId}`} tenant={tenant} />
              ))}
            </div>
          </div>
        )
      ) : (
        // Unassigned Tenants Tab
        unassignedTenants.length === 0 ? (
          <div className='rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm'>
            <UserPlus className='mx-auto h-12 w-12 text-gray-300 mb-4' />
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>No Unassigned Tenants</h3>
            <p className='text-sm text-gray-500 max-w-md mx-auto'>
              When tenants sign up using your email or invite code, they'll appear here.
            </p>
          </div>
        ) : (
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='divide-y divide-gray-100'>
              {unassignedTenants.map((item) => (
                <UnassignedTenantRow
                  key={item.linkId}
                  tenant={item}
                  onAssign={() => handleAssign(item)}
                  onArchive={() => handleArchive(item.linkId)}
                />
              ))}
            </div>
          </div>
        )
      )}

      {/* Assignment Dialog */}
      {selectedTenant && (
        <AssignTenantDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          tenant={selectedTenant}
          landlordId={landlordId}
          onSuccess={() => {
            setAssignDialogOpen(false);
            router.refresh();
          }}
        />
      )}
    </main>
  );
}

function TenantRow({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const isActive = tenant.leaseStatus === 'active';

  return (
    <div
      onClick={() => router.push(`/admin/dashboard/properties/${tenant.propertyId}/details`)}
      className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors cursor-pointer group'
    >
      {/* Avatar */}
      <div className='h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0'>
        {(tenant.name || '?')[0].toUpperCase()}
      </div>

      {/* Name + lease status — always visible */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold text-gray-800 truncate'>{tenant.name}</span>
          <span className={`hidden sm:inline text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${
            isActive ? 'bg-green-50 text-green-600' :
            tenant.leaseStatus === 'pending' ? 'bg-amber-50 text-amber-600' :
            'bg-gray-100 text-gray-500'
          }`}>
            {tenant.leaseStatus}
          </span>
        </div>
        {/* Contact — visible on mobile below name */}
        <div className='flex items-center gap-2 mt-0.5 md:hidden'>
          <Mail className='h-3 w-3 text-gray-400 shrink-0' />
          <span className='text-xs text-gray-500 truncate'>{tenant.email}</span>
        </div>
      </div>

      {/* Contact — desktop */}
      <div className='hidden md:flex flex-col gap-0.5 flex-1 min-w-0'>
        <div className='flex items-center gap-1.5 text-xs text-gray-600'>
          <Mail className='h-3 w-3 text-gray-400 shrink-0' />
          <span className='truncate'>{tenant.email}</span>
        </div>
        {tenant.phone && (
          <div className='flex items-center gap-1.5 text-xs text-gray-500'>
            <Phone className='h-3 w-3 text-gray-400 shrink-0' />
            <span>{tenant.phone}</span>
          </div>
        )}
      </div>

      {/* Property / Unit — desktop */}
      <div className='hidden md:flex items-center gap-1.5 flex-[1.2] min-w-0'>
        <MapPin className='h-3 w-3 text-gray-400 shrink-0' />
        <span className='text-xs text-gray-600 truncate'>{tenant.propertyName} · {tenant.unitName}</span>
      </div>

      {/* Rent */}
      <div className='hidden md:block w-20 text-right shrink-0'>
        <span className='text-xs font-bold text-gray-900'>${tenant.rentAmount.toLocaleString()}</span>
        <span className='text-[10px] text-gray-400'>/mo</span>
      </div>

      {/* Rent paid status — desktop */}
      <div className='hidden md:flex items-center justify-end w-20 shrink-0'>
        {tenant.rentPaidThisMonth ? (
          <span className='inline-flex items-center gap-1 text-[10px] font-semibold text-green-600'>
            <CheckCircle2 className='h-3.5 w-3.5' /> Paid
          </span>
        ) : (
          <span className='inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600'>
            <Clock className='h-3.5 w-3.5' /> Pending
          </span>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className='h-4 w-4 text-gray-300 group-hover:text-cyan-500 transition-colors shrink-0' />
    </div>
  );
}

function UnassignedTenantRow({
  tenant,
  onAssign,
  onArchive,
}: {
  tenant: UnassignedTenant;
  onAssign: () => void;
  onArchive: () => void;
}) {
  return (
    <div className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors'>
      {/* Avatar */}
      <div className='h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0'>
        {tenant.tenant.image ? (
          <img src={tenant.tenant.image} alt='' className='h-8 w-8 rounded-full object-cover' />
        ) : (
          tenant.tenant.name.charAt(0).toUpperCase()
        )}
      </div>

      {/* Name + signup */}
      <div className='flex-1 min-w-0'>
        <span className='text-sm font-semibold text-gray-800 truncate block'>{tenant.tenant.name}</span>
        <div className='flex items-center gap-2 mt-0.5'>
          <Mail className='h-3 w-3 text-gray-400 shrink-0' />
          <span className='text-xs text-gray-500 truncate'>{tenant.tenant.email}</span>
        </div>
      </div>

      {/* Phone — desktop */}
      {tenant.tenant.phone && (
        <div className='hidden sm:flex items-center gap-1.5 text-xs text-gray-500 shrink-0'>
          <Phone className='h-3 w-3 text-gray-400' />
          {tenant.tenant.phone}
        </div>
      )}

      {/* Days waiting badge */}
      <span className={`hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
        tenant.daysWaiting > 30 ? 'bg-red-100 text-red-700' :
        tenant.daysWaiting > 7 ? 'bg-amber-100 text-amber-700' :
        'bg-gray-100 text-gray-600'
      }`}>
        {tenant.daysWaiting}d waiting
      </span>

      {/* Actions */}
      <div className='flex items-center gap-1.5 shrink-0' onClick={(e) => e.stopPropagation()}>
        <Link href={`/admin/messages?tenant=${tenant.tenant.id}`}>
          <Button size='sm' variant='outline' className='h-7 px-2 text-xs hidden sm:flex items-center gap-1'>
            <MessageCircle className='h-3.5 w-3.5' />
            <span className='hidden md:inline'>Message</span>
          </Button>
        </Link>
        <Button
          size='sm'
          onClick={onAssign}
          className='h-7 px-2.5 text-xs bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
        >
          Assign
        </Button>
        <Button size='sm' variant='ghost' onClick={onArchive} title='Archive tenant' className='h-7 w-7 p-0'>
          <Archive className='h-3.5 w-3.5' />
        </Button>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-3 shadow-sm ${
      highlight ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200'
    }`}>
      <p className='text-[10px] text-gray-500 font-medium'>{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${highlight ? 'text-amber-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

// Made with Bob
