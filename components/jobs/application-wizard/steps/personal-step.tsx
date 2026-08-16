'use client';

import { useEffect, useState, useCallback } from 'react';
import { User, Mail, Phone, Eye, EyeOff, Shield, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useJobApplicationWizard } from '../wizard-context';

interface Props {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function PersonalStep({ setValidate }: Props) {
  const { state, updateFormData } = useJobApplicationWizard();
  const [showSsn, setShowSsn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const d = state.formData;

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!d.fullName?.trim()) e.fullName = 'Full name is required';
    if (!d.email?.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = 'Invalid email';
    if (!d.phone?.trim()) e.phone = 'Phone is required';
    if (!d.addressLine1?.trim()) e.addressLine1 = 'Address is required';
    if (!d.city?.trim()) e.city = 'City is required';
    if (!d.stateRegion?.trim()) e.stateRegion = 'State is required';
    if (!d.postalCode?.trim()) e.postalCode = 'Postal code is required';
    if (!d.workAuth) e.workAuth = 'Work authorization is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [d.fullName, d.email, d.phone, d.addressLine1, d.city, d.stateRegion, d.postalCode, d.workAuth]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const handleSsnChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 3) formatted = digits.slice(0, 3) + '-' + digits.slice(3);
    if (digits.length > 5) formatted = digits.slice(0, 3) + '-' + digits.slice(3, 5) + '-' + digits.slice(5, 9);
    updateFormData({ ssn: formatted });
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let f = digits;
    if (digits.length > 0) f = '(' + digits.slice(0, 3);
    if (digits.length > 3) f += ') ' + digits.slice(3, 6);
    if (digits.length > 6) f += '-' + digits.slice(6, 10);
    updateFormData({ phone: f });
  };

  const inputCls = 'bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-11';

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
          <User className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Personal Information</h2>
        <p className="text-slate-300 mt-2">Tell us about yourself</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label className="text-slate-200">Full Legal Name *</Label>
          <Input
            value={d.fullName || ''}
            onChange={(e) => updateFormData({ fullName: e.target.value })}
            placeholder="Enter your full legal name"
            className={inputCls}
          />
          {errors.fullName && <p className="text-sm text-red-400">{errors.fullName}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">Email *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="email"
              value={d.email || ''}
              onChange={(e) => updateFormData({ email: e.target.value })}
              placeholder="you@example.com"
              className={inputCls + ' pl-10'}
            />
          </div>
          {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">Phone *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="tel"
              value={d.phone || ''}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(555) 123-4567"
              maxLength={14}
              className={inputCls + ' pl-10'}
            />
          </div>
          {errors.phone && <p className="text-sm text-red-400">{errors.phone}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">Date of Birth</Label>
          <Input
            type="date"
            value={d.dateOfBirth || ''}
            onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
            className={inputCls}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">SSN (for background check)</Label>
          <div className="relative">
            <Input
              type={showSsn ? 'text' : 'password'}
              value={d.ssn || ''}
              onChange={(e) => handleSsnChange(e.target.value)}
              placeholder="XXX-XX-XXXX"
              maxLength={11}
              className={inputCls + ' pr-12 font-mono'}
            />
            <button
              type="button"
              onClick={() => setShowSsn(!showSsn)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              {showSsn ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-800/30 border border-slate-700">
        <Shield className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-400">
          SSN is encrypted and only used for background/credit checks if you consent in the Agreement step.
        </p>
      </div>

      {/* Address */}
      <div className="pt-4 border-t border-slate-700/50">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Mailing Address</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-slate-200">Street Address *</Label>
            <Input
              value={d.addressLine1 || ''}
              onChange={(e) => updateFormData({ addressLine1: e.target.value })}
              placeholder="123 Main St"
              className={inputCls}
            />
            {errors.addressLine1 && <p className="text-sm text-red-400">{errors.addressLine1}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-slate-200">Apt / Suite (optional)</Label>
            <Input
              value={d.addressLine2 || ''}
              onChange={(e) => updateFormData({ addressLine2: e.target.value })}
              placeholder="Apt 4B"
              className={inputCls}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">City *</Label>
            <Input
              value={d.city || ''}
              onChange={(e) => updateFormData({ city: e.target.value })}
              className={inputCls}
            />
            {errors.city && <p className="text-sm text-red-400">{errors.city}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-slate-200">State *</Label>
              <Input
                value={d.stateRegion || ''}
                onChange={(e) => updateFormData({ stateRegion: e.target.value })}
                maxLength={2}
                className={inputCls}
              />
              {errors.stateRegion && <p className="text-sm text-red-400">{errors.stateRegion}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">ZIP *</Label>
              <Input
                value={d.postalCode || ''}
                onChange={(e) => updateFormData({ postalCode: e.target.value })}
                className={inputCls}
              />
              {errors.postalCode && <p className="text-sm text-red-400">{errors.postalCode}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Work auth */}
      <div className="pt-4 border-t border-slate-700/50">
        <Label className="text-slate-200 mb-3 block">Work Authorization *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { v: 'us_citizen', label: 'U.S. Citizen' },
            { v: 'perm_resident', label: 'Permanent Resident' },
            { v: 'work_visa', label: 'Work Visa' },
            { v: 'requires_sponsorship', label: 'Requires Sponsorship' },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() =>
                updateFormData({
                  workAuth: opt.v,
                  requiresSponsorship: opt.v === 'requires_sponsorship',
                })
              }
              className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                d.workAuth === opt.v
                  ? 'bg-emerald-500/20 border-emerald-500 text-white'
                  : 'bg-slate-800/30 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {errors.workAuth && <p className="text-sm text-red-400 mt-2">{errors.workAuth}</p>}
      </div>
    </div>
  );
}
