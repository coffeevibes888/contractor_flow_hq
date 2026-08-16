'use client';

import { useEffect, useState, useCallback } from 'react';
import { Briefcase, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApplicationWizard } from '../wizard-context';

interface EmploymentStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function EmploymentStep({ setValidate }: EmploymentStepProps) {
  const { state, updateFormData } = useApplicationWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOtherIncome, setShowOtherIncome] = useState(false);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!state.formData.employmentStatus?.trim()) {
      newErrors.employmentStatus = 'Employment status is required';
    }
    
    const status = state.formData.employmentStatus;
    if (status === 'employed' || status === 'part-time' || status === 'self-employed') {
      if (!state.formData.currentEmployer?.trim()) {
        newErrors.currentEmployer = 'Employer name is required';
      }
    }
    
    if (!state.formData.monthlySalary?.trim()) {
      newErrors.monthlySalary = 'Monthly income is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [state.formData.employmentStatus, state.formData.currentEmployer, state.formData.monthlySalary]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const isEmployed = ['employed', 'part-time', 'self-employed'].includes(state.formData.employmentStatus || '');

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/20 mb-4">
          <Briefcase className="h-8 w-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Employment & Income</h2>
        <p className="text-slate-300 mt-2">Help us verify your ability to pay rent</p>
      </div>

      <div className="space-y-5">
        {/* Employment Status */}
        <div className="space-y-2">
          <Label className="text-slate-200">Employment Status *</Label>
          <Select
            value={state.formData.employmentStatus || ''}
            onValueChange={(value) => updateFormData({ employmentStatus: value })}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white h-12">
              <SelectValue placeholder="Select your employment status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="employed">Employed Full-Time</SelectItem>
              <SelectItem value="part-time">Employed Part-Time</SelectItem>
              <SelectItem value="self-employed">Self-Employed</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="unemployed">Unemployed</SelectItem>
            </SelectContent>
          </Select>
          {errors.employmentStatus && <p className="text-sm text-red-400">{errors.employmentStatus}</p>}
        </div>

        {/* Employment Details (shown if employed) */}
        {isEmployed && (
          <div className="space-y-4 p-5 rounded-xl bg-slate-800/30 border border-slate-700">
            <h3 className="text-lg font-semibold text-white">Employment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">
                  {state.formData.employmentStatus === 'self-employed' ? 'Business Name *' : 'Employer Name *'}
                </Label>
                <Input
                  value={state.formData.currentEmployer || ''}
                  onChange={(e) => updateFormData({ currentEmployer: e.target.value })}
                  placeholder={state.formData.employmentStatus === 'self-employed' ? 'Your business name' : 'Company name'}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
                />
                {errors.currentEmployer && <p className="text-sm text-red-400">{errors.currentEmployer}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Job Title</Label>
                <Input
                  value={state.formData.jobTitle || ''}
                  onChange={(e) => updateFormData({ jobTitle: e.target.value })}
                  placeholder="Your position"
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Employer Phone</Label>
                <Input
                  value={state.formData.employerPhone || ''}
                  onChange={(e) => updateFormData({ employerPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Supervisor Name</Label>
                <Input
                  value={state.formData.supervisorName || ''}
                  onChange={(e) => updateFormData({ supervisorName: e.target.value })}
                  placeholder="Manager or supervisor"
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">How long at this job?</Label>
              <Input
                value={state.formData.monthsEmployed || ''}
                onChange={(e) => updateFormData({ monthsEmployed: e.target.value })}
                placeholder="e.g., 3 years, 6 months"
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
              />
            </div>
          </div>
        )}

        {/* Monthly Income */}
        <div className="space-y-2">
          <Label className="text-slate-200">Monthly Gross Income *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              value={state.formData.monthlySalary || ''}
              onChange={(e) => updateFormData({ monthlySalary: e.target.value })}
              placeholder="5,000"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12 pl-10"
            />
          </div>
          {errors.monthlySalary && <p className="text-sm text-red-400">{errors.monthlySalary}</p>}
          <p className="text-xs text-slate-400">Before taxes and deductions</p>
        </div>

        {/* Other Income (Collapsible) */}
        <div className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowOtherIncome(!showOtherIncome)}
            className="w-full justify-between text-slate-300 hover:text-white hover:bg-slate-800/50 h-12"
          >
            <span>Additional Income Sources (Optional)</span>
            {showOtherIncome ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>

          {showOtherIncome && (
            <div className="space-y-4 p-5 rounded-xl bg-slate-800/30 border border-slate-700">
              <p className="text-sm text-slate-400">
                Include any additional income such as alimony, child support, investments, rental income, etc.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">Income Source</Label>
                  <Input
                    value={state.formData.otherIncomeSource || ''}
                    onChange={(e) => updateFormData({ otherIncomeSource: e.target.value })}
                    placeholder="e.g., Investments, Alimony"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">Monthly Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      value={state.formData.otherIncomeAmount || ''}
                      onChange={(e) => updateFormData({ otherIncomeAmount: e.target.value })}
                      placeholder="500"
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12 pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
