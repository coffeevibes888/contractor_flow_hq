'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Mail, QrCode, Check, Copy, Loader2, ChevronDown } from 'lucide-react';

type Mode = 'email' | 'qr';

interface Property {
  id: string;
  name: string;
}

interface TenantInviteFormProps {
  /** Pre-fetched landlord properties. If not provided, the QR mode fetches them lazily. */
  initialProperties?: Property[];
}

const TenantInviteForm = ({ initialProperties }: TenantInviteFormProps = {}) => {
  const { toast } = useToast();
  const router = useRouter();

  // ── shared state ──────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('email');

  // ── email mode ────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  // ── QR mode ───────────────────────────────────────────────────
  const [properties, setProperties] = useState<Property[]>(initialProperties ?? []);
  const [propertiesLoaded, setPropertiesLoaded] = useState(!!initialProperties?.length);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  // ── email submit ──────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      toast({
        variant: 'destructive',
        description: 'Please provide at least an email or phone number for the tenant.',
      });
      return;
    }

    setEmailSubmitting(true);
    try {
      const res = await fetch('/api/landlord/invite-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ variant: 'destructive', description: data.message || 'Unable to send invite. Please try again.' });
        return;
      }

      toast({ description: data.message || 'Tenant invite sent.' });
      setName('');
      setEmail('');
      setPhone('');
      router.refresh();
    } catch {
      toast({ variant: 'destructive', description: 'Something went wrong sending the invite.' });
    } finally {
      setEmailSubmitting(false);
    }
  };

  // ── QR: load properties lazily ────────────────────────────────
  const loadProperties = async () => {
    if (propertiesLoaded) return;
    try {
      const res = await fetch('/api/landlord/properties');
      const data = await res.json();
      if (res.ok && data.properties) {
        setProperties(data.properties);
      }
    } catch {
      // silently fail; user can still generate without a property
    } finally {
      setPropertiesLoaded(true);
    }
  };

  const handleSwitchToQr = () => {
    setMode('qr');
    loadProperties();
  };

  // ── QR: generate ─────────────────────────────────────────────
  const handleGenerateQr = async () => {
    setQrLoading(true);
    try {
      const body: { propertyId?: string } = {};
      if (selectedPropertyId) body.propertyId = selectedPropertyId;

      const res = await fetch('/api/landlord/invite-code/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ variant: 'destructive', description: data.message || 'Failed to generate QR code.' });
        return;
      }

      const url: string = data.joinUrl;
      setJoinUrl(url);
      // Use qrserver.com (same pattern as share-listing-card)
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`);
      setQrDialogOpen(true);
    } catch {
      toast({ variant: 'destructive', description: 'Failed to generate QR code.' });
    } finally {
      setQrLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseQrDialog = () => {
    setQrDialogOpen(false);
    setQrCodeUrl(null);
    setJoinUrl(null);
    setCopied(false);
  };

  // ── render ────────────────────────────────────────────────────
  return (
    <>
      {/* Mode toggle */}
      <div className='flex items-center gap-2 p-1 rounded-lg bg-slate-100 border border-slate-200 w-fit'>
        <button
          type='button'
          onClick={() => setMode('email')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'email'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Mail className='h-3.5 w-3.5' />
          Email invite
        </button>
        <button
          type='button'
          onClick={handleSwitchToQr}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'qr'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <QrCode className='h-3.5 w-3.5' />
          QR code
        </button>
      </div>

      {/* ── EMAIL MODE ── */}
      {mode === 'email' && (
        <form onSubmit={handleEmailSubmit} className='space-y-4 mt-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-1'>
              <label className='block text-xs font-medium text-slate-700'>Tenant full name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g. Jane Doe'
              />
            </div>
            <div className='space-y-1'>
              <label className='block text-xs font-medium text-slate-700'>Tenant email</label>
              <Input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='tenant@example.com'
              />
            </div>
          </div>
          <div className='space-y-1'>
            <label className='block text-xs font-medium text-slate-700'>Tenant mobile number (optional)</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder='(555) 000-0000'
            />
          </div>
          <p className='text-[11px] text-slate-500'>
            We&apos;ll send invites using your preferences from Settings (email and/or text when available).
          </p>
          <div className='pt-2 flex gap-3'>
            <Button type='submit' disabled={emailSubmitting}>
              {emailSubmitting ? 'Sending invite...' : 'Send invite'}
            </Button>
          </div>
        </form>
      )}

      {/* ── QR MODE ── */}
      {mode === 'qr' && (
        <div className='space-y-4 mt-4'>
          <p className='text-sm text-slate-600'>
            Generate a QR code your tenant can scan to sign up or connect their existing account.
            Pick a property so they land directly on it after joining.
          </p>

          {/* Property selector */}
          <div className='space-y-1'>
            <label className='block text-xs font-medium text-slate-700'>
              Property <span className='text-slate-400'>(optional — but recommended)</span>
            </label>
            <div className='relative'>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className='w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400'
              >
                <option value=''>No specific property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
            </div>
            {!propertiesLoaded && (
              <p className='text-[11px] text-slate-400 flex items-center gap-1'>
                <Loader2 className='h-3 w-3 animate-spin' /> Loading properties…
              </p>
            )}
          </div>

          <div className='rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5'>
            <p className='text-xs font-medium text-slate-700'>How it works</p>
            <ol className='text-[11px] text-slate-500 space-y-1 list-decimal list-inside'>
              <li>Click <strong>Generate QR code</strong> below.</li>
              <li>Print it, display it on your phone, or share the link.</li>
              <li>Tenant scans it and picks <em>Existing account</em> or <em>Create account</em>.</li>
              <li>
                Existing tenants skip onboarding and go straight to their dashboard.
                New tenants sign up and are linked to you automatically.
              </li>
            </ol>
          </div>

          <Button
            type='button'
            onClick={handleGenerateQr}
            disabled={qrLoading}
            className='gap-2'
          >
            {qrLoading ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                Generating…
              </>
            ) : (
              <>
                <QrCode className='h-4 w-4' />
                Generate QR code
              </>
            )}
          </Button>
        </div>
      )}

      {/* ── QR RESULT DIALOG ── */}
      <Dialog open={qrDialogOpen} onOpenChange={(open) => { if (!open) handleCloseQrDialog(); }}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <QrCode className='h-5 w-5 text-cyan-500' />
              Tenant QR Code
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            {qrCodeUrl && (
              <div className='flex justify-center'>
                <div className='rounded-xl border-4 border-cyan-500/20 overflow-hidden shadow'>
                  <img src={qrCodeUrl} alt='Tenant invite QR code' className='w-56 h-56' />
                </div>
              </div>
            )}

            <p className='text-xs text-slate-500 text-center'>
              Tenant scans this code and chooses to sign in (existing) or create a new account.
            </p>

            {joinUrl && (
              <div className='space-y-1.5'>
                <label className='text-xs font-medium text-slate-600'>Or share this link</label>
                <div className='flex gap-2'>
                  <Input readOnly value={joinUrl} className='bg-slate-50 text-sm' />
                  <Button size='sm' variant='outline' onClick={handleCopyLink} className='px-3 shrink-0'>
                    {copied ? <Check className='h-4 w-4 text-emerald-500' /> : <Copy className='h-4 w-4' />}
                  </Button>
                </div>
              </div>
            )}

            <Button className='w-full' onClick={handleCloseQrDialog}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TenantInviteForm;
