'use client';

import { useEffect, useState, useCallback } from 'react';
import { Home, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useApplicationWizard } from '../wizard-context';

interface ResidenceStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function ResidenceStep({ setValidate }: ResidenceStepProps) {
  const { state, updateFormData } = useApplicationWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPrevious, setShowPrevious] = useState(false);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!state.formData.currentAddress?.trim()) {
      newErrors.currentAddress = 'Current address is required';
    }
    if (!state.formData.currentCity?.trim()) {
      newErrors.currentCity = 'City is required';
    }
    if (!state.formData.currentState?.trim()) {
      newErrors.currentState = 'State is required';
    }
    if (!state.formData.currentZip?.trim()) {
      newErrors.currentZip = 'ZIP code is required';
    }
    if (!state.formData.monthsAtCurrentAddress?.trim()) {
      newErrors.monthsAtCurrentAddress = 'Time at address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [state.formData.currentAddress, state.formData.currentCity, state.formData.currentState, state.formData.currentZip, state.formData.monthsAtCurrentAddress]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/20 mb-4">
          <Home className="h-8 w-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Residence History</h2>
        <p className="text-slate-300 mt-2">Tell us about your current and previous housing</p>
      </div>

      {/* Current Address Section */}
      <div className="space-y-4 p-5 rounded-xl bg-slate-800/30 border border-slate-700">
        <h3 className="text-lg font-semibold text-white">Current Address</h3>
        
        <div className="space-y-2">
          <Label className="text-slate-200">Street Address *</Label>
          <Input
            value={state.formData.currentAddress || ''}
            onChange={(e) => updateFormData({ currentAddress: e.target.value })}
            placeholder="123 Main Street, Apt 4B"
            className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
          />
          {errors.currentAddress && <p className="text-sm text-red-400">{errors.currentAddress}</p>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 space-y-2">
            <Label className="text-slate-200">City *</Label>
            <Input
              value={state.formData.currentCity || ''}
              onChange={(e) => updateFormData({ currentCity: e.target.value })}
              placeholder="City"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
            />
            {errors.currentCity && <p className="text-sm text-red-400">{errors.currentCity}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">State *</Label>
            <Input
              value={state.formData.currentState || ''}
              onChange={(e) => updateFormData({ currentState: e.target.value.toUpperCase() })}
              placeholder="CA"
              maxLength={2}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12 uppercase"
            />
            {errors.currentState && <p className="text-sm text-red-400">{errors.currentState}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">ZIP *</Label>
            <Input
              value={state.formData.currentZip || ''}
              onChange={(e) => updateFormData({ currentZip: e.target.value })}
              placeholder="90210"
              maxLength={10}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
            />
            {errors.currentZip && <p className="text-sm text-red-400">{errors.currentZip}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-200">How long at this address? *</Label>
            <Input
              value={state.formData.monthsAtCurrentAddress || ''}
              onChange={(e) => updateFormData({ monthsAtCurrentAddress: e.target.value })}
              placeholder="e.g., 2 years, 18 months"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
            />
            {errors.monthsAtCurrentAddress && <p className="text-sm text-red-400">{errors.monthsAtCurrentAddress}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Current Monthly Rent</Label>
            <Input
              value={state.formData.currentRent || ''}
              onChange={(e) => updateFormData({ currentRent: e.target.value })}
              placeholder="$1,500"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Current Landlord Name</Label>
            <Input
              value={state.formData.currentLandlordName || ''}
              onChange={(e) => updateFormData({ currentLandlordName: e.target.value })}
              placeholder="Landlord or property manager name"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Landlord Phone</Label>
            <Input
              value={state.formData.currentLandlordPhone || ''}
              onChange={(e) => updateFormData({ currentLandlordPhone: e.target.value })}
              placeholder="(555) 123-4567"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">Reason for Leaving</Label>
          <Textarea
            value={state.formData.reasonForLeaving || ''}
            onChange={(e) => updateFormData({ reasonForLeaving: e.target.value })}
            placeholder="Why are you moving?"
            className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 min-h-[80px]"
          />
        </div>
      </div>

      {/* Previous Address Section (Collapsible) */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowPrevious(!showPrevious)}
          className="w-full justify-between text-slate-300 hover:text-white hover:bg-slate-800/50 h-12"
        >
          <span>Previous Address (Optional)</span>
          {showPrevious ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </Button>

        {showPrevious && (
          <div className="space-y-4 p-5 rounded-xl bg-slate-800/30 border border-slate-700">
            <div className="space-y-2">
              <Label className="text-slate-200">Previous Address</Label>
              <Input
                value={state.formData.previousAddress || ''}
                onChange={(e) => updateFormData({ previousAddress: e.target.value })}
                placeholder="Full address"
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Previous Landlord Name</Label>
                <Input
                  value={state.formData.previousLandlordName || ''}
                  onChange={(e) => updateFormData({ previousLandlordName: e.target.value })}
                  placeholder="Landlord name"
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Previous Landlord Phone</Label>
                <Input
                  value={state.formData.previousLandlordPhone || ''}
                  onChange={(e) => updateFormData({ previousLandlordPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
