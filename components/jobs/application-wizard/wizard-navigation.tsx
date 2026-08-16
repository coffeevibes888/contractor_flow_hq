'use client';

import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJobApplicationWizard } from './wizard-context';
import { JOB_APPLICATION_STEPS } from './types';

interface Props {
  onValidate?: () => boolean;
  onSubmit?: () => Promise<void>;
  isSubmitting?: boolean;
}

export function JobWizardNavigation({ onValidate, onSubmit, isSubmitting = false }: Props) {
  const { state, nextStep, prevStep } = useJobApplicationWizard();
  const isFirstStep = state.currentStep === 0;
  const isLastStep = state.currentStep === JOB_APPLICATION_STEPS.length - 1;

  const handleNext = () => {
    if (onValidate) {
      const isValid = onValidate();
      if (!isValid) return;
    }
    nextStep();
  };

  const handleSubmit = async () => {
    if (onSubmit) await onSubmit();
  };

  return (
    <div className="flex justify-between items-center pt-8 mt-8 border-t border-slate-700/50 relative z-10">
      <Button
        variant="ghost"
        onClick={prevStep}
        disabled={isFirstStep || isSubmitting}
        className="text-slate-300 hover:text-white hover:bg-slate-700/50"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {isLastStep ? (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" /> Submit Application
            </>
          )}
        </Button>
      ) : (
        <Button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
          Continue <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
