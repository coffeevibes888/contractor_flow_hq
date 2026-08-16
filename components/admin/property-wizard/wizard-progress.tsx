'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWizard } from './wizard-context';
import { getStepsForPropertyType } from './use-wizard-state';

export function WizardProgress() {
  const { state, goToStep } = useWizard();
  const steps = getStepsForPropertyType(state.propertyType);

  return (
    <div className="w-full">
      {/* Desktop Progress */}
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
                    'flex flex-col items-center gap-1.5 transition-all',
                    isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-violet-600 text-white ring-2 ring-violet-200'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="text-center">
                    <p
                      className={cn(
                        'text-xs font-medium',
                        isCurrent ? 'text-violet-600' : isCompleted ? 'text-emerald-600' : 'text-gray-400'
                      )}
                    >
                      {step.title}
                    </p>
                    {step.optional && !isCompleted && (
                      <p className="text-[10px] text-gray-300 leading-none mt-0.5">optional</p>
                    )}
                  </div>
                </button>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-2">
                    <div
                      className={cn(
                        'h-0.5 transition-all',
                        isCompleted ? 'bg-emerald-400' : 'bg-gray-200'
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Progress */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">
            Step {state.currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {steps[state.currentStep]?.title}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-violet-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((state.currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        {/* Step dots for mobile */}
        <div className="flex justify-center gap-2 mt-3">
          {steps.map((step, index) => {
            const isCompleted = state.completedSteps.has(index);
            const isCurrent = index === state.currentStep;

            return (
              <button
                key={step.id}
                onClick={() => (isCompleted || index <= state.currentStep) && goToStep(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  isCompleted
                    ? 'bg-emerald-500'
                    : isCurrent
                    ? 'bg-violet-500 w-4'
                    : 'bg-gray-300'
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
