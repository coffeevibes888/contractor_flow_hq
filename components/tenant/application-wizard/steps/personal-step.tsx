'use client';

import { useEffect, useState, useCallback } from 'react';
import { User, Eye, EyeOff, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BirthdayPicker } from '@/components/ui/birthday-picker';
import { useApplicationWizard } from '../wizard-context';

interface PersonalStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function PersonalStep({ setValidate }: PersonalStepProps) {
  const { state, updateFormData } = useApplicationWizard();
  const [showSsn, setShowSsn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!state.formData.fullName?.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!state.formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    if (!state.formData.ssn?.trim()) {
      newErrors.ssn = 'SSN is required';
    } else if (!/^\d{3}-?\d{2}-?\d{4}$/.test(state.formData.ssn)) {
      newErrors.ssn = 'Invalid SSN format (XXX-XX-XXXX)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [state.formData.fullName, state.formData.dateOfBirth, state.formData.ssn]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  // Format SSN as user types
  const handleSsnChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 3) {
      formatted = digits.slice(0, 3) + '-' + digits.slice(3);
    }
    if (digits.length > 5) {
      formatted = digits.slice(0, 3) + '-' + digits.slice(3, 5) + '-' + digits.slice(5, 9);
    }
    updateFormData({ ssn: formatted });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/20 mb-4">
          <User className="h-8 w-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Personal Information</h2>
        <p className="text-slate-300 mt-2">
          Let's start with some basic information about you
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-slate-200">Full Legal Name *</Label>
          <Input
            value={state.formData.fullName || ''}
            onChange={(e) => updateFormData({ fullName: e.target.value })}
            placeholder="Enter your full legal name"
            className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
          />
          {errors.fullName && <p className="text-sm text-red-400">{errors.fullName}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">Date of Birth *</Label>
          <BirthdayPicker
            value={state.formData.dateOfBirth || ''}
            onChange={(date) => updateFormData({ dateOfBirth: date })}
            error={!!errors.dateOfBirth}
          />
          {errors.dateOfBirth && <p className="text-sm text-red-400">{errors.dateOfBirth}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">Social Security Number *</Label>
          <div className="relative">
            <Input
              type={showSsn ? 'text' : 'password'}
              value={state.formData.ssn || ''}
              onChange={(e) => handleSsnChange(e.target.value)}
              placeholder="XXX-XX-XXXX"
              maxLength={11}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12 pr-12 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowSsn(!showSsn)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
            >
              {showSsn ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.ssn && <p className="text-sm text-red-400">{errors.ssn}</p>}
          <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-slate-800/30 border border-slate-700">
            <Shield className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-400">
              Your SSN is encrypted and stored securely. We use it only for background and credit checks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
