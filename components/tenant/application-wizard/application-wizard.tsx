'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApplicationWizardProvider, useApplicationWizard } from './wizard-context';
import { WizardProgress } from './wizard-progress';
import { WizardNavigation } from './wizard-navigation';
import { APPLICATION_STEPS } from './types';
import {
  PersonalStep,
  ContactStep,
  ResidenceStep,
  EmploymentStep,
  BackgroundStep,
  DocumentsStep,
  ReviewStep,
} from './steps';

interface ApplicationWizardProps {
  propertySlug?: string;
  propertyName?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

function WizardContent({ propertySlug, propertyName, onComplete, onCancel }: ApplicationWizardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { state, resetWizard, setApplicationId, updateFormData } = useApplicationWizard();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [validateFn, setValidateFn] = useState<{ fn: (() => boolean) | null }>({ fn: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasPrefilledData, setHasPrefilledData] = useState(false);

  const currentStepId = APPLICATION_STEPS[state.currentStep]?.id;

  // Pre-fill form data from session
  useEffect(() => {
    if (session?.user && !hasPrefilledData && !state.isDirty) {
      const userName = session.user.name;
      const userEmail = session.user.email;
      
      // Only pre-fill if name doesn't look like an email
      const isNameValid = userName && !userName.includes('@');
      
      updateFormData({
        fullName: isNameValid ? userName : '',
        email: userEmail || '',
      });
      setHasPrefilledData(true);
    }
  }, [session, hasPrefilledData, state.isDirty, updateFormData]);

  // Create draft application on mount
  useEffect(() => {
    const createDraftApplication = async () => {
      if (state.applicationId) return;
      
      try {
        const response = await fetch('/api/applications/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertySlug }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.applicationId) {
            setApplicationId(data.applicationId);
          }
        }
      } catch (error) {
        console.error('Failed to create draft application:', error);
      }
    };

    createDraftApplication();
  }, [propertySlug, state.applicationId, setApplicationId]);

  const handleCancel = () => {
    if (state.isDirty) {
      setShowExitDialog(true);
    } else {
      handleConfirmExit();
    }
  };

  const handleConfirmExit = () => {
    resetWizard();
    setShowExitDialog(false);
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!state.applicationId) return;

    setIsSubmitting(true);

    try {
      // Build notes from form data
      const notes = buildNotesFromFormData(state.formData);

      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: state.applicationId,
          propertySlug,
          fullName: state.formData.fullName,
          email: state.formData.email,
          phone: state.formData.phone,
          currentAddress: `${state.formData.currentAddress}, ${state.formData.currentCity}, ${state.formData.currentState} ${state.formData.currentZip}`,
          currentEmployer: state.formData.currentEmployer,
          monthlySalary: state.formData.monthlySalary,
          yearlySalary: state.formData.monthlySalary ? String(parseFloat(state.formData.monthlySalary.replace(/,/g, '')) * 12) : '',
          hasPets: state.formData.hasPets,
          petCount: state.formData.petDetails,
          ssn: state.formData.ssn,
          notes,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        if (onComplete) {
          setTimeout(() => onComplete(), 3000);
        } else {
          setTimeout(() => router.push('/user/dashboard'), 3000);
        }
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred while submitting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildNotesFromFormData = (formData: typeof state.formData): string => {
    const parts: string[] = [];

    if (formData.dateOfBirth) parts.push(`DOB: ${formData.dateOfBirth}`);
    if (formData.monthsAtCurrentAddress) parts.push(`Time at current address: ${formData.monthsAtCurrentAddress}`);
    if (formData.currentRent) parts.push(`Current rent: $${formData.currentRent}`);
    if (formData.currentLandlordName) parts.push(`Current landlord: ${formData.currentLandlordName} (${formData.currentLandlordPhone || 'no phone'})`);
    if (formData.reasonForLeaving) parts.push(`Reason for leaving: ${formData.reasonForLeaving}`);
    if (formData.previousAddress) parts.push(`Previous address: ${formData.previousAddress}`);
    if (formData.previousLandlordName) parts.push(`Previous landlord: ${formData.previousLandlordName} (${formData.previousLandlordPhone || 'no phone'})`);
    if (formData.employmentStatus) parts.push(`Employment status: ${formData.employmentStatus}`);
    if (formData.jobTitle) parts.push(`Job title: ${formData.jobTitle}`);
    if (formData.employerPhone) parts.push(`Employer phone: ${formData.employerPhone}`);
    if (formData.supervisorName) parts.push(`Supervisor: ${formData.supervisorName}`);
    if (formData.monthsEmployed) parts.push(`Time employed: ${formData.monthsEmployed}`);
    if (formData.otherIncomeSource) parts.push(`Other income: ${formData.otherIncomeSource} - $${formData.otherIncomeAmount}/mo`);
    if (formData.hasBeenEvicted) parts.push(`Has been evicted: ${formData.hasBeenEvicted}`);
    if (formData.hasBrokenLease) parts.push(`Has broken lease: ${formData.hasBrokenLease}`);
    if (formData.hasConvictions === 'yes') parts.push(`Has convictions: Yes - ${formData.convictionExplanation}`);
    if (formData.hasPets === 'yes') parts.push(`Has pets: Yes - ${formData.petDetails}`);
    if (formData.numberOfOccupants) parts.push(`Number of occupants: ${formData.numberOfOccupants}`);
    if (formData.occupantNames) parts.push(`Occupant names: ${formData.occupantNames}`);
    if (formData.numberOfVehicles) parts.push(`Vehicles: ${formData.numberOfVehicles} - ${formData.vehicleDetails || 'no details'}`);
    if (formData.emergencyContactName) parts.push(`Emergency contact: ${formData.emergencyContactName} (${formData.emergencyContactRelation || 'N/A'}) - ${formData.emergencyContactPhone}`);
    if (formData.desiredMoveInDate) parts.push(`Desired move-in: ${formData.desiredMoveInDate}`);
    if (formData.desiredLeaseTerm) parts.push(`Desired lease term: ${formData.desiredLeaseTerm} months`);
    if (formData.additionalNotes) parts.push(`Additional notes: ${formData.additionalNotes}`);

    return parts.join('\n');
  };

  // Helper to set validate function wrapped in object to avoid React treating it as updater
  const handleSetValidateFn = useCallback((fn: (() => boolean) | null) => {
    setValidateFn({ fn });
  }, []);

  // Render current step
  const renderStep = () => {
    switch (currentStepId) {
      case 'personal':
        return <PersonalStep setValidate={handleSetValidateFn} />;
      case 'contact':
        return <ContactStep setValidate={handleSetValidateFn} />;
      case 'residence':
        return <ResidenceStep setValidate={handleSetValidateFn} />;
      case 'employment':
        return <EmploymentStep setValidate={handleSetValidateFn} />;
      case 'background':
        return <BackgroundStep setValidate={handleSetValidateFn} />;
      case 'documents':
        return <DocumentsStep setValidate={handleSetValidateFn} />;
      case 'review':
        return <ReviewStep setValidate={handleSetValidateFn} />;
      default:
        return <PersonalStep setValidate={handleSetValidateFn} />;
    }
  };

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Application Submitted!</h1>
          <p className="text-slate-300">
            Thank you for applying{propertyName ? ` for ${propertyName}` : ''}. 
            The landlord will review your application and contact you shortly.
          </p>
          <div className="space-y-2 text-sm text-slate-400">
            <p>✓ Application received</p>
            <p>✓ Documents uploaded</p>
            <p>✓ Review typically takes 24-48 hours</p>
          </div>
          <p className="text-sm text-slate-500">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="z-50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">
                Rental Application
              </h1>
              {propertyName && (
                <p className="text-sm text-slate-400 mt-1">
                  Applying for: {propertyName}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <WizardProgress />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        {renderStep()}
        <WizardNavigation 
          onValidate={validateFn.fn || undefined} 
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Leave Application?
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              You have unsaved changes. Your progress will be lost if you leave now.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowExitDialog(false)}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              Continue Application
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmExit}
            >
              Leave Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ApplicationWizard(props: ApplicationWizardProps) {
  return (
    <ApplicationWizardProvider propertySlug={props.propertySlug}>
      <WizardContent {...props} />
    </ApplicationWizardProvider>
  );
}

export default ApplicationWizard;
