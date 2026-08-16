'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { AlertTriangle, Download, Trash2, Loader2, ShieldAlert, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface AccountDangerZoneProps {
  userEmail: string;
}

type DeleteStep = 'idle' | 'confirm-intent' | 'awaiting-code' | 'deleting';

export function AccountDangerZone({ userEmail }: AccountDangerZoneProps) {
  const { toast } = useToast();

  // ── Data export ──────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/landlord/export-data');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `propertyflow-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Export downloaded', description: 'Your data has been saved as a JSON file.' });
    } catch (err: unknown) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // ── Account deletion ──────────────────────────────────────────────────────
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle');
  const [sendingCode, setSendingCode] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const handleRequestCode = async () => {
    setSendingCode(true);
    try {
      const res = await fetch('/api/landlord/delete-account/send-code', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to send code');
      setDeleteStep('awaiting-code');
      toast({ title: 'Code sent', description: `A 6-digit confirmation code was sent to ${userEmail}.` });
    } catch (err: unknown) {
      toast({
        title: 'Could not send code',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!code.trim()) {
      setCodeError('Please enter the 6-digit code.');
      return;
    }
    setCodeError('');
    setDeleteStep('deleting');
    try {
      const res = await fetch('/api/landlord/delete-account/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setDeleteStep('awaiting-code');
        setCodeError(data.message || 'Invalid code. Please try again.');
        return;
      }
      // Success — clear the JWT session cookie first, then redirect.
      // Without signOut() the stale JWT stays alive and causes an auth loop.
      toast({ title: 'Account deleted', description: 'Your account and data have been permanently removed.' });
      await signOut({ callbackUrl: '/sign-in?deleted=true', redirect: true });
    } catch {
      setDeleteStep('awaiting-code');
      setCodeError('Something went wrong. Please try again.');
    }
  };

  const handleCancel = () => {
    setDeleteStep('idle');
    setCode('');
    setCodeError('');
  };

  return (
    <div className="space-y-4">
      {/* ── Data Export ──────────────────────────────────────────────────── */}
      <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-black p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Download className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm">Download Your Data</h4>
            <p className="text-xs text-black mt-0.5">
              Export all your account data — properties, leases, payments, expenses, documents — as a JSON file you can keep for your records.
            </p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting}
          size="sm"
          className="bg-white/20 hover:bg-white/30 border border-white/40 text-white text-xs h-8 gap-1.5"
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {exporting ? 'Preparing export…' : 'Download All Data'}
        </Button>
      </div>

      {/* ── Danger Zone: Delete Account ───────────────────────────────────── */}
      <div className="rounded-lg sm:rounded-xl border border-red-500/50 bg-red-950/40 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h4 className="font-semibold text-red-400 text-sm">Delete Account</h4>
            <p className="text-xs text-red-200 mt-0.5">
              Permanently delete your account and all associated data. <strong>This cannot be undone.</strong> Any data you have not downloaded will be lost forever.
            </p>
          </div>
        </div>

        {/* Step 1: idle — show delete button */}
        {deleteStep === 'idle' && (
          <Button
            onClick={() => setDeleteStep('confirm-intent')}
            size="sm"
            variant="destructive"
            className="text-xs h-8 gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete My Account
          </Button>
        )}

        {/* Step 2: Confirm intent */}
        {deleteStep === 'confirm-intent' && (
          <div className="rounded-lg border border-red-500/40 bg-red-900/30 p-4 space-y-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-300">Are you absolutely sure?</p>
                <ul className="text-xs text-red-200 list-disc list-inside space-y-1">
                  <li>All properties, units, and leases will be deleted</li>
                  <li>All payment history and financial records will be deleted</li>
                  <li>All tenant data linked to your account will be removed</li>
                  <li>Your subscription will be cancelled immediately</li>
                  <li>This action is <strong>permanent and irreversible</strong></li>
                </ul>
                <p className="text-xs text-red-200 mt-2">
                  We strongly recommend <button onClick={handleExport} className="underline hover:no-underline font-medium" type="button">downloading your data</button> before proceeding.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRequestCode}
                disabled={sendingCode}
                size="sm"
                variant="destructive"
                className="text-xs h-8 gap-1.5"
              >
                {sendingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                {sendingCode ? 'Sending code…' : `Send confirmation code to ${userEmail}`}
              </Button>
              <Button onClick={handleCancel} size="sm" variant="outline" className="text-xs h-8 border-red-500/40 text-red-300 hover:bg-red-900/30">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Enter the emailed code */}
        {(deleteStep === 'awaiting-code' || deleteStep === 'deleting') && (
          <div className="rounded-lg border border-red-500/40 bg-red-900/30 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-200">
                We sent a 6-digit code to <strong>{userEmail}</strong>. Enter it below to permanently delete your account. The code expires in 15 minutes.
              </p>
            </div>
            <div>
              <Input
                value={code}
                onChange={(e) => { setCode(e.target.value); setCodeError(''); }}
                placeholder="000000"
                maxLength={6}
                className="h-9 text-sm w-40 tracking-widest text-center border-red-500/50 bg-red-950/50 text-white placeholder:text-red-400/50"
                disabled={deleteStep === 'deleting'}
              />
              {codeError && <p className="text-xs text-red-400 mt-1">{codeError}</p>}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleConfirmDelete}
                disabled={deleteStep === 'deleting' || code.length < 6}
                size="sm"
                variant="destructive"
                className="text-xs h-8 gap-1.5"
              >
                {deleteStep === 'deleting' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {deleteStep === 'deleting' ? 'Deleting account…' : 'Permanently Delete Account'}
              </Button>
              <Button onClick={handleCancel} size="sm" variant="outline" className="text-xs h-8 border-red-500/40 text-red-300 hover:bg-red-900/30" disabled={deleteStep === 'deleting'}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleRequestCode}
                disabled={sendingCode || deleteStep === 'deleting'}
                className="text-xs text-red-400 hover:underline disabled:opacity-50"
              >
                {sendingCode ? 'Resending…' : 'Resend code'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
