'use client';

import { useEffect, useState, useCallback } from 'react';
import { Phone, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApplicationWizard } from '../wizard-context';

interface ContactStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function ContactStep({ setValidate }: ContactStepProps) {
  const { state, updateFormData } = useApplicationWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!state.formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!state.formData.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(\+1|1)?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(state.formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid phone format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [state.formData.email, state.formData.phone]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 0) {
      formatted = '(' + digits.slice(0, 3);
    }
    if (digits.length > 3) {
      formatted += ') ' + digits.slice(3, 6);
    }
    if (digits.length > 6) {
      formatted += '-' + digits.slice(6, 10);
    }
    updateFormData({ phone: formatted });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/20 mb-4">
          <Phone className="h-8 w-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Contact Information</h2>
        <p className="text-slate-300 mt-2">How can the landlord reach you?</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-slate-200">Email Address *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="email"
              value={state.formData.email || ''}
              onChange={(e) => updateFormData({ email: e.target.value })}
              placeholder="your@email.com"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12 pl-10"
            />
          </div>
          {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">Phone Number *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="tel"
              value={state.formData.phone || ''}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(555) 123-4567"
              maxLength={14}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12 pl-10"
            />
          </div>
          {errors.phone && <p className="text-sm text-red-400">{errors.phone}</p>}
        </div>
      </div>
    </div>
  );
}
