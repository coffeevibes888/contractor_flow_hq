'use client';

import { useEffect, useCallback } from 'react';
import { CheckCircle2, User, Phone, Home, Briefcase, Shield, FileText, Edit2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApplicationWizard } from '../wizard-context';

interface ReviewStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function ReviewStep({ setValidate }: ReviewStepProps) {
  const { state, goToStep } = useApplicationWizard();
  const { formData } = state;

  const validate = useCallback(() => true, []);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const Section = ({ 
    title, 
    icon: Icon, 
    stepIndex, 
    children 
  }: { 
    title: string; 
    icon: React.ElementType; 
    stepIndex: number;
    children: React.ReactNode;
  }) => (
    <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Icon className="h-5 w-5 text-violet-400" />
          {title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goToStep(stepIndex)}
          className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
        >
          <Edit2 className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </div>
      <div className="space-y-2 text-sm">
        {children}
      </div>
    </div>
  );

  const Field = ({ label, value }: { label: string; value?: string }) => (
    <div className="flex justify-between py-1">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  );

  const maskSSN = (ssn?: string) => {
    if (!ssn) return '—';
    return `***-**-${ssn.slice(-4)}`;
  };

  const coApplicants = formData.coApplicants || [];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Review Your Application</h2>
        <p className="text-slate-300 mt-2">Please review all information before submitting</p>
      </div>

      {/* Personal Info */}
      <Section title="Personal Information" icon={User} stepIndex={0}>
        <Field label="Full Name" value={formData.fullName} />
        <Field label="Date of Birth" value={formData.dateOfBirth} />
        <Field label="SSN" value={maskSSN(formData.ssn)} />
      </Section>

      {/* Contact */}
      <Section title="Contact Information" icon={Phone} stepIndex={1}>
        <Field label="Email" value={formData.email} />
        <Field label="Phone" value={formData.phone} />
      </Section>

      {/* Residence */}
      <Section title="Residence History" icon={Home} stepIndex={2}>
        <Field 
          label="Current Address" 
          value={formData.currentAddress ? `${formData.currentAddress}, ${formData.currentCity}, ${formData.currentState} ${formData.currentZip}` : undefined} 
        />
        <Field label="Time at Address" value={formData.monthsAtCurrentAddress} />
        <Field label="Current Rent" value={formData.currentRent ? `$${formData.currentRent}` : undefined} />
        <Field label="Current Landlord" value={formData.currentLandlordName} />
        <Field label="Reason for Leaving" value={formData.reasonForLeaving} />
      </Section>

      {/* Employment */}
      <Section title="Employment & Income" icon={Briefcase} stepIndex={3}>
        <Field label="Employment Status" value={formData.employmentStatus} />
        <Field label="Employer" value={formData.currentEmployer} />
        <Field label="Job Title" value={formData.jobTitle} />
        <Field label="Time Employed" value={formData.monthsEmployed} />
        <Field label="Monthly Income" value={formData.monthlySalary ? `$${formData.monthlySalary}` : undefined} />
        {formData.otherIncomeSource && (
          <Field label="Other Income" value={`${formData.otherIncomeSource}: $${formData.otherIncomeAmount}`} />
        )}
      </Section>

      {/* Co-Applicants */}
      {coApplicants.length > 0 && (
        <Section title="Additional Occupants" icon={Users} stepIndex={4}>
          {coApplicants.map((person, index) => (
            <div key={person.id} className="py-2 border-b border-slate-700 last:border-0">
              <div className="font-medium text-white">{person.fullName || `Person ${index + 2}`}</div>
              <div className="text-slate-400 text-xs mt-1">
                {person.relationship && <span className="capitalize">{person.relationship}</span>}
                {person.email && <span> • {person.email}</span>}
                {person.willBeOnLease && <span className="text-emerald-400"> • Will sign lease</span>}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Background */}
      <Section title="Background & Details" icon={Shield} stepIndex={4}>
        <Field label="Ever Evicted" value={formData.hasBeenEvicted === 'yes' ? 'Yes' : 'No'} />
        <Field label="Ever Broken Lease" value={formData.hasBrokenLease === 'yes' ? 'Yes' : 'No'} />
        <Field label="Felony Convictions" value={formData.hasConvictions === 'yes' ? 'Yes' : 'No'} />
        <Field label="Pets" value={formData.hasPets === 'yes' ? `Yes - ${formData.petDetails || 'Details not provided'}` : 'No'} />
        <Field label="Vehicles" value={formData.numberOfVehicles || '0'} />
        <Field label="Emergency Contact" value={formData.emergencyContactName ? `${formData.emergencyContactName} (${formData.emergencyContactRelation || 'N/A'})` : undefined} />
        <Field label="Desired Move-in" value={formData.desiredMoveInDate} />
        <Field label="Lease Term" value={formData.desiredLeaseTerm ? `${formData.desiredLeaseTerm} months` : undefined} />
      </Section>

      {/* Documents */}
      <Section title="Documents" icon={FileText} stepIndex={5}>
        <p className="text-slate-300">
          Documents have been uploaded and will be reviewed by the landlord.
        </p>
      </Section>

      {/* Terms */}
      <div className="p-5 rounded-xl bg-violet-500/10 border border-violet-500/30">
        <p className="text-sm text-slate-300">
          By submitting this application, I certify that all information provided is true and accurate. 
          I authorize the landlord to verify my employment, rental history, and conduct background/credit checks.
        </p>
      </div>
    </div>
  );
}
