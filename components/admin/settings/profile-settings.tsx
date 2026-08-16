'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { UploadButton } from '@/lib/uploadthing';
import { EmailVerifyCard } from './email-verify-card';
import { AccountDangerZone } from './account-danger-zone';

interface ProfileSettingsProps {
  landlord: {
    id: string;
    name: string;
    companyName?: string | null;
    companyEmail?: string | null;
    companyPhone?: string | null;
    companyAddress?: string | null;
    logoUrl?: string | null;
    aboutPhoto?: string | null;
  };
  emailVerified?: boolean;
  userEmail?: string;
}

export function ProfileSettings({ landlord, emailVerified = false, userEmail = '' }: ProfileSettingsProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(landlord.aboutPhoto || '');
  const [formData, setFormData] = useState({
    name: landlord.name || '',
    companyName: landlord.companyName || '',
    companyEmail: landlord.companyEmail || '',
    companyPhone: landlord.companyPhone || '',
    companyAddress: landlord.companyAddress || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/landlord/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, aboutPhoto: avatarUrl }),
      });

      if (res.ok) {
        toast({ title: 'Profile updated successfully' });
      } else {
        toast({ title: 'Failed to update profile', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to update profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {userEmail && (
        <EmailVerifyCard emailVerified={emailVerified} email={userEmail} />
      )}

      <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-black p-2.5 sm:p-3 md:p-4 space-y-1 hover:border-slate-700 transition-colors shadow-2xl active:scale-[0.98]">
        <h3 className="text-sm font-semibold text-white mb-3">Profile Photo</h3>
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Profile"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover border-2 border-violet-500/30"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-dashed border-white/20 flex items-center justify-center">
                <Camera className="w-6 h-6 text-slate-500" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-black mb-2">
              Upload a profile photo. Recommended size: 200x200px
            </p>
            <UploadButton
              endpoint="imageUploader"
              onClientUploadComplete={(res) => {
                if (res?.[0]?.url) {
                  setAvatarUrl(res[0].url);
                  toast({ title: 'Photo uploaded' });
                }
              }}
              onUploadError={(error) => {
                toast({ title: error.message, variant: 'destructive' });
              }}
              appearance={{
                button: 'bg-violet-600 hover:bg-violet-500 text-white text-xs h-8 px-3',
                allowedContent: 'hidden',
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-black p-2.5 sm:p-3 md:p-4 space-y-1 hover:border-slate-700 transition-colors shadow-2xl active:scale-[0.98]">
        <h3 className="text-sm font-semibold text-white mb-3">Contact Information</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-slate-300">Display Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-9 text-sm mt-1"
              placeholder="Your name"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-300">Company Name</Label>
            <Input
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="h-9 text-sm mt-1"
              placeholder="ABC Property Management"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-300">Email</Label>
            <Input
              type="email"
              value={formData.companyEmail}
              onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
              className="h-9 text-sm mt-1"
              placeholder="contact@company.com"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-300">Phone</Label>
            <Input
              type="tel"
              value={formData.companyPhone}
              onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
              className="h-9 text-sm mt-1"
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-slate-300">Business Address</Label>
            <Textarea
              value={formData.companyAddress}
              onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
              className="text-sm mt-1 min-h-[60px]"
              placeholder="123 Main St, City, State 12345"
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-xs h-9">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
        Save Profile
      </Button>

      {/* ── Data & Account ──────────────────────────────────────────────── */}
      {userEmail && (
        <div className="pt-2">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Data &amp; Account</h3>
          <AccountDangerZone userEmail={userEmail} />
        </div>
      )}
    </div>
  );
}
