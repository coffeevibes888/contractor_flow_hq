'use client';

import { useState, useCallback } from 'react';
import {
  JobApplicationWizardState,
  JobApplicationWizardContextValue,
  JobApplicationFormData,
  JOB_APPLICATION_STEPS,
} from './types';

const initialFormData: Partial<JobApplicationFormData> = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  ssn: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  stateRegion: '',
  postalCode: '',
  workAuth: '',
  requiresSponsorship: false,
  yearsExperience: '',
  workHistory: [],
  skills: [],
  certifications: [],
  education: [],
  references: [],
  documents: [],
  coverLetter: '',
  backgroundCheckConsent: false,
  creditCheckConsent: false,
  certifyTruthful: false,
  signatureUrl: '',
  signedName: '',
};

export function useJobApplicationWizardState(
  jobId: string,
): JobApplicationWizardContextValue {
  const [state, setState] = useState<JobApplicationWizardState>({
    currentStep: 0,
    formData: initialFormData,
    completedSteps: new Set<number>(),
    isDirty: false,
    applicantId: null,
    jobId,
  });

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, JOB_APPLICATION_STEPS.length - 1)),
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      const newStep = Math.min(prev.currentStep + 1, JOB_APPLICATION_STEPS.length - 1);
      const newCompletedSteps = new Set(prev.completedSteps);
      newCompletedSteps.add(prev.currentStep);
      return { ...prev, currentStep: newStep, completedSteps: newCompletedSteps };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  }, []);

  const updateFormData = useCallback((data: Partial<JobApplicationFormData>) => {
    setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, ...data },
      isDirty: true,
    }));
  }, []);

  const markStepComplete = useCallback((step: number) => {
    setState((prev) => {
      const newCompletedSteps = new Set(prev.completedSteps);
      newCompletedSteps.add(step);
      return { ...prev, completedSteps: newCompletedSteps };
    });
  }, []);

  const setApplicantId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, applicantId: id }));
  }, []);

  const resetWizard = useCallback(() => {
    setState((prev) => ({
      currentStep: 0,
      formData: initialFormData,
      completedSteps: new Set<number>(),
      isDirty: false,
      applicantId: null,
      jobId: prev.jobId,
    }));
  }, []);

  return {
    state,
    goToStep,
    nextStep,
    prevStep,
    updateFormData,
    markStepComplete,
    setApplicantId,
    resetWizard,
  };
}
