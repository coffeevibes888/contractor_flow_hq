'use client';

import { useEffect, useState, useCallback } from 'react';
import { Shield, Users, Car, UserPlus, PawPrint, Calendar, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useApplicationWizard } from '../wizard-context';
import { CoApplicant } from '../types';

interface BackgroundStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function BackgroundStep({ setValidate }: BackgroundStepProps) {
  const { state, updateFormData } = useApplicationWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const coApplicants = state.formData.coApplicants || [];

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!state.formData.hasBeenEvicted) {
      newErrors.hasBeenEvicted = 'Please answer this question';
    }
    if (!state.formData.hasBrokenLease) {
      newErrors.hasBrokenLease = 'Please answer this question';
    }
    if (!state.formData.hasConvictions) {
      newErrors.hasConvictions = 'Please answer this question';
    }
    if (state.formData.hasConvictions === 'yes' && !state.formData.convictionExplanation?.trim()) {
      newErrors.convictionExplanation = 'Please provide an explanation';
    }
    if (!state.formData.hasPets) {
      newErrors.hasPets = 'Please answer this question';
    }
    if (!state.formData.emergencyContactName?.trim()) {
      newErrors.emergencyContactName = 'Emergency contact is required';
    }
    if (!state.formData.emergencyContactPhone?.trim()) {
      newErrors.emergencyContactPhone = 'Emergency contact phone is required';
    }
    if (!state.formData.desiredMoveInDate) {
      newErrors.desiredMoveInDate = 'Move-in date is required';
    }
    if (!state.formData.desiredLeaseTerm) {
      newErrors.desiredLeaseTerm = 'Lease term is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [state.formData]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const addCoApplicant = () => {
    const newCoApplicant: CoApplicant = {
      id: Date.now().toString(),
      fullName: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      relationship: '',
      willBeOnLease: true,
    };
    updateFormData({ coApplicants: [...coApplicants, newCoApplicant] });
  };

  const removeCoApplicant = (id: string) => {
    updateFormData({ coApplicants: coApplicants.filter(c => c.id !== id) });
  };

  const updateCoApplicant = (id: string, field: keyof CoApplicant, value: string | boolean) => {
    updateFormData({
      coApplicants: coApplicants.map(c => 
        c.id === id ? { ...c, [field]: value } : c
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/20 mb-4">
          <Shield className="h-8 w-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Background & Details</h2>
        <p className="text-slate-300 mt-2">A few more questions to complete your application</p>
      </div>

      {/* Co-Applicants / Additional Occupants */}
      <div className="space-y-4 p-5 rounded-xl bg-slate-800/30 border border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-400" />
            Additional People on Lease
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCoApplicant}
            className="border-violet-500 text-violet-400 hover:bg-violet-500/10"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Person
          </Button>
        </div>
        
        <p className="text-sm text-slate-400">
          Add anyone else who will be living in the unit and/or signing the lease.
        </p>

        {coApplicants.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4 text-center">
            No additional occupants added. Click "Add Person" if others will be on the lease.
          </p>
        ) : (
          <div className="space-y-4">
            {coApplicants.map((person, index) => (
              <div key={person.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-600 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-violet-400">Person {index + 2}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCoApplicant(person.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Full Name</Label>
                    <Input
                      value={person.fullName}
                      onChange={(e) => updateCoApplicant(person.id, 'fullName', e.target.value)}
                      placeholder="Full legal name"
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Relationship</Label>
                    <Select
                      value={person.relationship}
                      onValueChange={(value) => updateCoApplicant(person.id, 'relationship', value)}
                    >
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white h-10">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="spouse">Spouse</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="roommate">Roommate</SelectItem>
                        <SelectItem value="family">Family Member</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Email</Label>
                    <Input
                      type="email"
                      value={person.email}
                      onChange={(e) => updateCoApplicant(person.id, 'email', e.target.value)}
                      placeholder="email@example.com"
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Phone</Label>
                    <Input
                      value={person.phone}
                      onChange={(e) => updateCoApplicant(person.id, 'phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-10"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`lease-${person.id}`}
                    checked={person.willBeOnLease}
                    onCheckedChange={(checked) => updateCoApplicant(person.id, 'willBeOnLease', !!checked)}
                  />
                  <Label htmlFor={`lease-${person.id}`} className="text-sm text-slate-300 cursor-pointer">
                    This person will sign the lease
                  </Label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Background Questions */}
      <div className="space-y-4 p-5 rounded-xl bg-slate-800/30 border border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-violet-400" />
          Background Questions
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Have you ever been evicted? *</Label>
            <Select
              value={state.formData.hasBeenEvicted || ''}
              onValueChange={(value) => updateFormData({ hasBeenEvicted: value })}
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white h-12">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
            {errors.hasBeenEvicted && <p className="text-sm text-red-400">{errors.hasBeenEvicted}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">Have you ever broken a lease? *</Label>
            <Select
              value={state.formData.hasBrokenLease || ''}
              onValueChange={(value) => updateFormData({ hasBrokenLease: value })}
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white h-12">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
            {errors.hasBrokenLease && <p className="text-sm text-red-400">{errors.hasBrokenLease}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">Have you ever been convicted of a felony? *</Label>
            <Select
              value={state.formData.hasConvictions || ''}
              onValueChange={(value) => updateFormData({ hasConvictions: value })}
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white h-12">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
            {errors.hasConvictions && <p className="text-sm text-red-400">{errors.hasConvictions}</p>}
          </div>

          {state.formData.hasConvictions === 'yes' && (
            <div className="space-y-2">
              <Label className="text-slate-200">Please explain *</Label>
              <Textarea
                value={state.formData.convictionExplanation || ''}
                onChange={(e) => updateFormData({ convictionExplanation: e.target.value })}
                placeholder="Provide details about the conviction"
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 min-h-[80px]"
              />
              {errors.convictionExplanation && <p className="text-sm text-red-400">{errors.convictionExplanation}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Pets */}
      <div className="space-y-4 p-5 rounded-xl bg-slate-800/30 border border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <PawPrint className="h-5 w-5 text-violet-400" />
          Pets
        </h3>

        <div className="space-y-2">
          <Label className="text-slate-200">Do you have any pets? *</Label>
          <Select
            value={state.formData.hasPets || ''}
            onValueChange={(value) => updateFormData({ hasPets: value })}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white h-12">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
            </SelectContent>
          </Select>
          {errors.hasPets && <p className="text-sm text-red-400">{errors.hasPets}</p>}
        </div>

        {state.formData.hasPets === 'yes' && (
          <div className="space-y-2">
            <Label className="text-slate-200">Pet Details</Label>
            <Textarea
              value={state.formData.petDetails || ''}
              onChange={(e) => updateFormData({ petDetails: e.target.value })}
              placeholder="Type, breed, weight, number of pets"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 min-h-[80px]"
            />
            <p className="text-xs text-amber-400">Note: Pet-friendly units may include an additional pet deposit.</p>
          </div>
        )}
      </div>

      {/* Vehicles */}
      <div className="space-y-4 p-5 rounded-xl bg-slate-800/30 border border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Car className="h-5 w-5 text-violet-400" />
          Vehicles
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Number of Vehicles</Label>
            <Input
              value={state.formData.numberOfVehicles || ''}
              onChange={(e) => updateFormData({ numberOfVehicles: e.target.value })}
              placeholder="0"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
            />
          </div>
        </div>

        {state.formData.numberOfVehicles && parseInt(state.formData.numberOfVehicles) > 0 && (
          <div className="space-y-2">
            <Label className="text-slate-200">Vehicle Details</Label>
            <Textarea
              value={state.formData.vehicleDetails || ''}
              onChange={(e) => updateFormData({ vehicleDetails: e.target.value })}
              placeholder="Make, model, year, license plate for each vehicle"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 min-h-[60px]"
            />
          </div>
        )}
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4 p-5 rounded-xl bg-slate-800/30 border border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-violet-400" />
          Emergency Contact
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Name *</Label>
            <Input
              value={state.formData.emergencyContactName || ''}
              onChange={(e) => updateFormData({ emergencyContactName: e.target.value })}
              placeholder="Contact name"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
            />
            {errors.emergencyContactName && <p className="text-sm text-red-400">{errors.emergencyContactName}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Phone *</Label>
            <Input
              value={state.formData.emergencyContactPhone || ''}
              onChange={(e) => updateFormData({ emergencyContactPhone: e.target.value })}
              placeholder="(555) 123-4567"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
            />
            {errors.emergencyContactPhone && <p className="text-sm text-red-400">{errors.emergencyContactPhone}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Relationship</Label>
            <Input
              value={state.formData.emergencyContactRelation || ''}
              onChange={(e) => updateFormData({ emergencyContactRelation: e.target.value })}
              placeholder="e.g., Parent, Spouse"
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-12"
            />
          </div>
        </div>
      </div>

      {/* Move-in Details */}
      <div className="space-y-4 p-5 rounded-xl bg-slate-800/30 border border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-violet-400" />
          Move-in Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Desired Move-in Date *</Label>
            <Input
              type="date"
              value={state.formData.desiredMoveInDate || ''}
              onChange={(e) => updateFormData({ desiredMoveInDate: e.target.value })}
              className="bg-slate-800/50 border-slate-600 text-white h-12"
            />
            {errors.desiredMoveInDate && <p className="text-sm text-red-400">{errors.desiredMoveInDate}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Desired Lease Term *</Label>
            <Select
              value={state.formData.desiredLeaseTerm || ''}
              onValueChange={(value) => updateFormData({ desiredLeaseTerm: value })}
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white h-12">
                <SelectValue placeholder="Select lease term" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
                <SelectItem value="18">18 Months</SelectItem>
                <SelectItem value="24">24 Months</SelectItem>
                <SelectItem value="month-to-month">Month-to-Month</SelectItem>
              </SelectContent>
            </Select>
            {errors.desiredLeaseTerm && <p className="text-sm text-red-400">{errors.desiredLeaseTerm}</p>}
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="space-y-2">
        <Label className="text-slate-200">Additional Notes (Optional)</Label>
        <Textarea
          value={state.formData.additionalNotes || ''}
          onChange={(e) => updateFormData({ additionalNotes: e.target.value })}
          placeholder="Anything else you'd like the landlord to know?"
          className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 min-h-[100px]"
        />
      </div>
    </div>
  );
}
