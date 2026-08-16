'use client';

import { createContext, useContext, ReactNode } from 'react';
import { JobApplicationWizardContextValue } from './types';
import { useJobApplicationWizardState } from './use-wizard-state';

const JobApplicationWizardContext = createContext<JobApplicationWizardContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
  jobId: string;
}

export function JobApplicationWizardProvider({ children, jobId }: ProviderProps) {
  const wizardState = useJobApplicationWizardState(jobId);
  return (
    <JobApplicationWizardContext.Provider value={wizardState}>
      {children}
    </JobApplicationWizardContext.Provider>
  );
}

export function useJobApplicationWizard(): JobApplicationWizardContextValue {
  const ctx = useContext(JobApplicationWizardContext);
  if (!ctx) {
    throw new Error('useJobApplicationWizard must be used within JobApplicationWizardProvider');
  }
  return ctx;
}
