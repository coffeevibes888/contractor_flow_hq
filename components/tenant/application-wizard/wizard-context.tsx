'use client';

import { createContext, useContext, ReactNode } from 'react';
import { ApplicationWizardContextValue } from './types';
import { useApplicationWizardState } from './use-wizard-state';

const WizardContext = createContext<ApplicationWizardContextValue | null>(null);

interface WizardProviderProps {
  children: ReactNode;
  propertySlug?: string;
}

export function ApplicationWizardProvider({ children, propertySlug = '' }: WizardProviderProps) {
  const wizardState = useApplicationWizardState(propertySlug);

  return (
    <WizardContext.Provider value={wizardState}>
      {children}
    </WizardContext.Provider>
  );
}

export function useApplicationWizard(): ApplicationWizardContextValue {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useApplicationWizard must be used within an ApplicationWizardProvider');
  }
  return context;
}
