'use client';

import { useState } from 'react';
import { Shield, ShieldCheck, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface SecuritySettingsProps {
  initialEnabled: boolean;
}

export function SecuritySettings({ initialEnabled }: SecuritySettingsProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: 'Error', description: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/user/account-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', ...passwordForm }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast({ title: 'Success', description: 'Password updated successfully' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update password', variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/email-2fa/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsEnabled(enabled);
        toast({
          title: enabled ? '2FA Enabled' : '2FA Disabled',
          description: enabled 
            ? 'You will receive a verification code via email when signing in.'
            : 'Two-factor authentication has been disabled.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to update 2FA settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-black p-4 space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2"><Lock className="h-4 w-4" /> Change Password</h3>
        {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => {
          const labels = { currentPassword: 'Current Password', newPassword: 'New Password', confirmPassword: 'Confirm New Password' };
          const showKey = field === 'currentPassword' ? 'current' : field === 'newPassword' ? 'new' : 'confirm';
          const show = showPasswords[showKey as keyof typeof showPasswords];
          return (
            <div key={field} className="space-y-1">
              <label className="text-xs font-medium text-black">{labels[field]}</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={passwordForm[field]}
                  onChange={(e) => setPasswordForm(p => ({ ...p, [field]: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 pr-10 text-white placeholder:text-white/50 text-sm focus:outline-none focus:border-white/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, [showKey]: !p[showKey as keyof typeof p] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          );
        })}
        <button
          onClick={handleChangePassword}
          disabled={savingPassword}
          className="flex items-center gap-2 bg-white/20 border border-white/30 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
        >
          {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          Update Password
        </button>
      </div>

      <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-black p-2.5 sm:p-3 md:p-4 space-y-1 hover:border-slate-700 transition-colors shadow-2xl active:scale-[0.98]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`rounded-full p-2 border ${isEnabled ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-800 border-white/10'}`}>
              {isEnabled ? (
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              ) : (
                <Shield className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-white">Two-Factor Authentication</h3>
              <p className="text-sm text-black">
                {isEnabled 
                  ? 'Your account is protected with email verification codes.'
                  : 'Add an extra layer of security by requiring a verification code sent to your email when signing in.'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={isLoading}
            />
          </div>
        </div>

        {isEnabled && (
          <div className="rounded-lg border border-emerald-500/20 p-4">
            <p className="text-sm text-black text-semibold">
              When you sign in, we'll send a 6-digit code to your email. Enter this code to complete your login.
            </p>
          </div>
        )}

        {!isEnabled && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
            <p className="text-sm text-amber-200">
              We recommend enabling 2FA to protect your account, especially since you handle financial transactions and sensitive data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
