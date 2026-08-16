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
import { JobApplicationWizardProvider, useJobApplicationWizard } from './wizard-context';
import { JobWizardProgress } from './wizard-progress';
import { JobWizardNavigation } from './wizard-navigation';
import { JOB_APPLICATION_STEPS } from './types';
import {
  PersonalStep,
  ExperienceStep,
  EducationStep,
  DocumentsStep,
  AgreementStep,
  ReviewStep,
} from './steps';

interface JobApplicationWizardProps {
  jobId: string;
  jobTitle: string;
  companyName?: string | null;
  onComplete?: () => void;
  onCancel?: () => void;
}

function WizardContent({ jobId, jobTitle, companyName, onComplete, onCancel }: JobApplicationWizardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { state, resetWizard, setApplicantId, updateFormData } = useJobApplicationWizard();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [validateFn, setValidateFn] = useState<{ fn: (() => boolean) | null }>({ fn: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);

  const currentStepId = JOB_APPLICATION_STEPS[state.currentStep]?.id;

  // Pre-fill form from session
  useEffect(() => {
    if (session?.user && !hasPrefilled && !state.isDirty) {
      const userName = session.user.name;
      const userEmail = session.user.email;
      const isNameValid = userName && !userName.includes('@');
      updateFormData({
        fullName: isNameValid ? userName : '',
        email: userEmail || '',
      });
      setHasPrefilled(true);
    }
  }, [session, hasPrefilled, state.isDirty, updateFormData]);

  // Create or resume draft applicant on mount
  useEffect(() => {
    const createDraft = async () => {
      if (state.applicantId) return;
      try {
        const res = await fetch('/api/jobs/applicants/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        });
        const data = await res.json();
        if (res.ok && data.applicantId) {
          setApplicantId(data.applicantId);
          // Hydrate saved draft
          if (data.draft) {
            updateFormData(data.draft);
          }
        }
      } catch (err) {
        console.error('Failed to create draft', err);
      }
    };
    createDraft();
  }, [jobId, state.applicantId, setApplicantId, updateFormData]);

  const handleSetValidateFn = useCallback((fn: (() => boolean) | null) => {
    setValidateFn({ fn });
  }, []);

  const handleCancel = () => {
    if (state.isDirty) setShowExitDialog(true);
    else confirmExit();
  };

  const confirmExit = () => {
    resetWizard();
    setShowExitDialog(false);
    if (onCancel) onCancel();
    else router.back();
  };

  const handleSubmit = async () => {
    if (!state.applicantId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/applicants/${state.applicantId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: state.formData }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        if (onComplete) setTimeout(() => onComplete(), 2500);
        else setTimeout(() => router.push('/user/dashboard/jobs'), 2500);
      } else {
        alert(data.error || 'Failed to submit');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while submitting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStepId) {
      case 'personal':
        return <PersonalStep setValidate={handleSetValidateFn} />;
      case 'experience':
        return <ExperienceStep setValidate={handleSetValidateFn} />;
      case 'education':
        return <EducationStep setValidate={handleSetValidateFn} />;
      case 'documents':
        return <DocumentsStep setValidate={handleSetValidateFn} />;
      case 'agreement':
        return <AgreementStep setValidate={handleSetValidateFn} />;
      case 'review':
        return <ReviewStep setValidate={handleSetValidateFn} />;
      default:
        return <PersonalStep setValidate={handleSetValidateFn} />;
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Application Submitted!</h1>
          <p className="text-slate-300">
            Your application for <strong>{jobTitle}</strong>
            {companyName ? ` at ${companyName}` : ''} has been sent. You'll hear back soon.
          </p>
          <div className="space-y-2 text-sm text-slate-400">
            <p>✓ Application received</p>
            <p>✓ Documents uploaded</p>
            <p>✓ Employer will review and reach out</p>
          </div>
          <p className="text-sm text-slate-500">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="z-50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Job Application</h1>
              <p className="text-sm text-slate-400 mt-1">
                Applying for: {jobTitle}
                {companyName ? ` @ ${companyName}` : ''}
              </p>
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
          <JobWizardProgress />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        {renderStep()}
        <JobWizardNavigation
          onValidate={validateFn.fn || undefined}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Leave Application?
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Your progress is saved as a draft and you can resume later.
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
            <Button variant="destructive" onClick={confirmExit}>
              Save & Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function JobApplicationWizard(props: JobApplicationWizardProps) {
  return (
    <JobApplicationWizardProvider jobId={props.jobId}>
      <WizardContent {...props} />
    </JobApplicationWizardProvider>
  );
}
