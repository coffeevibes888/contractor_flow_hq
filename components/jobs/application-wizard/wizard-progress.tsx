'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJobApplicationWizard } from './wizard-context';
import { JOB_APPLICATION_STEPS } from './types';

export function JobWizardProgress() {
  const { state, goToStep } = useJobApplicationWizard();
  const steps = JOB_APPLICATION_STEPS;

  return (
    <div className="w-full">
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = state.completedSteps.has(index);
            const isCurrent = index === state.currentStep;
            const isClickable = isCompleted || index <= state.currentStep;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => isClickable && goToStep(index)}
                  disabled={!isClickable}
                  className={cn(
                    'flex flex-col items-center gap-2 transition-all',
                    isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-600/30'
                        : 'bg-slate-700/50 text-slate-300',
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : index + 1}
                  </div>
                  <div className="text-center">
                    <p className={cn('text-xs font-medium', isCurrent ? 'text-white' : 'text-slate-300')}>
                      {step.title}
                    </p>
                  </div>
                </button>

                {index < steps.length - 1 && (
                  <div className="flex-1 mx-2">
                    <div
                      className={cn(
                        'h-0.5 transition-all',
                        isCompleted ? 'bg-emerald-500' : 'bg-slate-700/50',
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">
            Step {state.currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm font-medium text-white">{steps[state.currentStep]?.title}</span>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((state.currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
