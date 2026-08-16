'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Lock, User, Phone } from 'lucide-react';

interface AccountSecurityProps {
  userName: string;
  userEmail: string;
  userPhone: string | null;
}

export default function AccountSecurity({ userName, userEmail, userPhone }: AccountSecurityProps) {
  const [profileForm, setProfileForm] = useState({ name: userName, phoneNumber: userPhone || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/account-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', ...profileForm }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showMsg('success', 'Profile updated successfully');
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMsg('error', 'New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showMsg('error', 'Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/user/account-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', ...passwordForm }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showMsg('success', 'Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-4'>
      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Profile */}
      <Card className='bg-white border-slate-200'>
        <CardHeader>
          <CardTitle className='text-slate-900 flex items-center gap-2 text-base'>
            <User className='h-4 w-4' /> Personal Info
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div>
            <label className='text-xs font-medium text-slate-500 mb-1 block'>Full Name</label>
            <input
              value={profileForm.name}
              onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
              className='w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-sky-400'
              placeholder='Your full name'
            />
          </div>
          <div>
            <label className='text-xs font-medium text-slate-500 mb-1 block'>Email</label>
            <input
              value={userEmail}
              disabled
              className='w-full border border-slate-100 rounded-lg px-3 py-2 text-sm text-slate-400 bg-slate-50 cursor-not-allowed'
            />
          </div>
          <div>
            <label className='text-xs font-medium text-slate-500 mb-1 flex items-center gap-1'><Phone className='h-3 w-3' /> Phone Number</label>
            <input
              value={profileForm.phoneNumber}
              onChange={(e) => setProfileForm(p => ({ ...p, phoneNumber: e.target.value }))}
              className='w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-sky-400'
              placeholder='+1 (555) 000-0000'
            />
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className='w-full bg-sky-600 hover:bg-sky-500 text-white rounded-lg py-2 text-sm font-semibold transition-colors disabled:opacity-50'
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className='bg-white border-slate-200'>
        <CardHeader>
          <CardTitle className='text-slate-900 flex items-center gap-2 text-base'>
            <Lock className='h-4 w-4' /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => {
            const labels = { currentPassword: 'Current Password', newPassword: 'New Password', confirmPassword: 'Confirm New Password' };
            const showKey = field === 'currentPassword' ? 'current' : field === 'newPassword' ? 'new' : 'confirm';
            const show = showPasswords[showKey as keyof typeof showPasswords];
            return (
              <div key={field} className='relative'>
                <label className='text-xs font-medium text-slate-500 mb-1 block'>{labels[field]}</label>
                <input
                  type={show ? 'text' : 'password'}
                  value={passwordForm[field]}
                  onChange={(e) => setPasswordForm(p => ({ ...p, [field]: e.target.value }))}
                  placeholder='••••••••'
                  className='w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm text-slate-900 focus:outline-none focus:border-sky-400'
                />
                <button
                  type='button'
                  onClick={() => setShowPasswords(p => ({ ...p, [showKey]: !p[showKey as keyof typeof p] }))}
                  className='absolute right-3 bottom-2 text-slate-400 hover:text-slate-600'
                >
                  {show ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                </button>
              </div>
            );
          })}
          <button
            onClick={handleChangePassword}
            disabled={saving}
            className='w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 text-sm font-semibold transition-colors disabled:opacity-50'
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
