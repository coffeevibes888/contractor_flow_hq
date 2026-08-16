'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApplicationWizard } from './wizard-context';
import { APPLICATION_STEPS } from './types';

interface WizardNavigationProps {
  onValidate?: () => boolean;
  onSubmit?: () => Promise<void>;
  isSubmitting?: boolean;
}

export function WizardNavigation({ onValidate, onSubmit, isSubmitting = false }: WizardNavigationProps) {
  const { state, nextStep, prevStep } = useApplicationWizard();
  const isFirstStep = state.currentStep === 0;
  const isLastStep = state.currentStep === APPLICATION_STEPS.length - 1;

  const handleNext = () => {
    console.log('Continue clicked, validating...');
    if (onValidate) {
      const isValid = onValidate();
      console.log('Validation result:', isValid);
      if (!isValid) {
        return;
      }
    }
    nextStep();
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit();
    }
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
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Application
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={handleNext}
          className="bg-violet-600 hover:bg-violet-700 text-white px-8"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
