'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  UserCircle,
  Camera,
  Save,
  Loader2,
  Bell,
  Mail,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Phone,
  MapPin,
  Building2,
} from 'lucide-react';
import Image from 'next/image';

interface AccountSettingsClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    phoneNumber: string | null;
    notificationPreferences: Record<string, boolean> | null;
  };
  profile: {
    id: string;
    businessName: string;
    displayName: string;
    email: string;
    phone: string | null;
    profilePhoto: string | null;
    baseCity: string | null;
    baseState: string | null;
  } | null;
}

type Tab = 'profile' | 'password' | 'notifications' | 'data';

export default function AccountSettingsClient({ user, profile }: AccountSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    phoneNumber: user.phoneNumber || '',
    businessName: profile?.businessName || '',
    displayName: profile?.displayName || '',
    phone: profile?.phone || '',
    baseCity: profile?.baseCity || '',
    baseState: profile?.baseState || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const [notifications, setNotifications] = useState({
    emailJobs: user.notificationPreferences?.emailJobs ?? true,
    emailInvoices: user.notificationPreferences?.emailInvoices ?? true,
    emailMarketing: user.notificationPreferences?.emailMarketing ?? false,
    smsJobs: user.notificationPreferences?.smsJobs ?? false,
    smsReminders: user.notificationPreferences?.smsReminders ?? false,
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/contractor/settings/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', ...profileForm }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/contractor/settings/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', ...passwordForm }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to update password');
      setSaved(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/contractor/settings/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'notifications', ...notifications }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestData = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user/request-data', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to request data');
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Are you sure? This will permanently delete your account, all jobs, invoices, and data. This cannot be undone.');
    if (!confirmed) return;
    const doubleConfirmed = window.confirm('Final confirmation: delete everything permanently?');
    if (!doubleConfirmed) return;
    setSaving(true);
    try {
      await fetch('/api/user/delete-account', { method: 'DELETE' });
      window.location.href = '/';
    } catch (err: unknown) {
      setError('Failed to delete account. Please contact support@propertyflowhq.com');
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile & Contact', icon: <UserCircle className="h-4 w-4" /> },
    { id: 'password', label: 'Password', icon: <Lock className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'data', label: 'Data & Privacy', icon: <Lock className="h-4 w-4" /> },
  ];

  const avatarSrc = avatarPreview || profile?.profilePhoto || user.image;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-slate-400 mt-1">Manage your personal info, password, and notifications</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/60 rounded-xl p-1 border border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(null); setSaved(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Feedback */}
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-300 text-sm"
          >
            <CheckCircle2 className="h-4 w-4" /> Changes saved successfully
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Avatar */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5 text-rose-400" /> Profile Photo
              </h2>
              <div className="flex items-center gap-6">
                <div className="relative h-24 w-24 rounded-2xl overflow-hidden bg-slate-700 border-2 border-white/10 shrink-0">
                  {avatarSrc ? (
                    <Image src={avatarSrc} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <UserCircle className="h-12 w-12 text-slate-500" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">JPG, PNG or WebP. Max 5MB.</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg text-sm font-medium hover:bg-rose-500/30 transition-colors"
                  >
                    Upload Photo
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
              </div>
            </div>

            {/* Personal Info */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-rose-400" /> Personal Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-400">Full Name</label>
                  <input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-400">Account Email</label>
                  <input
                    value={user.email}
                    disabled
                    className="w-full bg-slate-800/30 border border-white/5 rounded-xl px-4 py-2.5 text-slate-500 text-sm cursor-not-allowed"
                    title="Email cannot be changed here"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-400 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Phone Number</label>
                  <input
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm(p => ({ ...p, phoneNumber: e.target.value }))}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Business Info */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-rose-400" /> Business Details
              </h2>
              <p className="text-sm text-slate-500">These appear on your invoices and internal records. To update your public marketplace profile, visit <a href="/contractor-dashboard/profile/branding" className="text-rose-400 hover:text-rose-300 underline">Public Profile</a>.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-400">Business Name</label>
                  <input
                    value={profileForm.businessName}
                    onChange={(e) => setProfileForm(p => ({ ...p, businessName: e.target.value }))}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                    placeholder="Your company name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-400">Display Name</label>
                  <input
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm(p => ({ ...p, displayName: e.target.value }))}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                    placeholder="How you appear to clients"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-400">Business Phone</label>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm text-slate-400 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Base Location</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={profileForm.baseCity}
                      onChange={(e) => setProfileForm(p => ({ ...p, baseCity: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                      placeholder="City"
                    />
                    <input
                      value={profileForm.baseState}
                      onChange={(e) => setProfileForm(p => ({ ...p, baseState: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                      placeholder="State (e.g. TX)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </motion.div>
        )}

        {/* ── Password Tab ── */}
        {activeTab === 'password' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-5"
          >
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-rose-400" /> Change Password
            </h2>
            {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => {
              const labels = { currentPassword: 'Current Password', newPassword: 'New Password', confirmPassword: 'Confirm New Password' };
              const showKey = field === 'currentPassword' ? 'current' : field === 'newPassword' ? 'new' : 'confirm';
              const show = showPasswords[showKey as keyof typeof showPasswords];
              return (
                <div key={field} className="space-y-1.5">
                  <label className="text-sm text-slate-400">{labels[field]}</label>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'}
                      value={passwordForm[field]}
                      onChange={(e) => setPasswordForm(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 pr-12 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, [showKey]: !p[showKey as keyof typeof p] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={handleSavePassword}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Update Password
            </button>
          </motion.div>
        )}

        {/* ── Notifications Tab ── */}
        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {[
              { section: 'Email Notifications', icon: <Mail className="h-5 w-5 text-rose-400" />, items: [
                { key: 'emailJobs', label: 'New jobs & work orders', desc: 'When a PM assigns or invites you to a job' },
                { key: 'emailInvoices', label: 'Invoice activity', desc: 'Payments received, overdue reminders' },
                { key: 'emailMarketing', label: 'Tips & product updates', desc: 'Monthly newsletter and feature announcements' },
              ]},
              { section: 'SMS Notifications', icon: <MessageSquare className="h-5 w-5 text-rose-400" />, items: [
                { key: 'smsJobs', label: 'Urgent job alerts', desc: 'Time-sensitive assignments and changes' },
                { key: 'smsReminders', label: 'Appointment reminders', desc: '1 hour before scheduled jobs' },
              ]},
            ].map(({ section, icon, items }) => (
              <div key={section} className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">{icon}{section}</h2>
                {items.map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm text-white font-medium">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications(n => ({ ...n, [key]: !n[key as keyof typeof n] }))}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${notifications[key as keyof typeof notifications] ? 'bg-rose-500' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${notifications[key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
            <button
              onClick={handleSaveNotifications}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Preferences
            </button>
          </motion.div>
        )}

        {/* ── Data & Privacy Tab ── */}
        {activeTab === 'data' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-rose-400" /> Request Your Data
              </h2>
              <p className="text-sm text-slate-400">
                Request a full export of all your personal data we hold. We will email it to <span className="text-white">{user.email}</span> within 30 days as required by law.
              </p>
              <button
                onClick={handleRequestData}
                disabled={saving}
                className="flex items-center gap-2 bg-slate-800 border border-white/10 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Request My Data Export
              </button>
            </div>

            <div className="bg-red-950/30 border border-red-500/20 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
              <p className="text-sm text-slate-400">
                Permanently delete your account, all jobs, invoices, team data, and associated records. <strong className="text-white">This cannot be undone.</strong>
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={saving}
                className="flex items-center gap-2 bg-red-600/20 border border-red-500/30 hover:bg-red-600/40 text-red-400 hover:text-red-300 px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              >
                Delete My Account Permanently
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
