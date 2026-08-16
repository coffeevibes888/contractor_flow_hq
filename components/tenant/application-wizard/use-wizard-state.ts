'use client';

import { useState, useCallback } from 'react';
import {
  ApplicationWizardState,
  ApplicationWizardContextValue,
  ApplicationFormData,
  APPLICATION_STEPS,
} from './types';

const initialFormData: Partial<ApplicationFormData> = {
  fullName: '',
  dateOfBirth: '',
  ssn: '',
  email: '',
  phone: '',
  currentAddress: '',
  currentCity: '',
  currentState: '',
  currentZip: '',
  monthsAtCurrentAddress: '',
  currentRent: '',
  currentLandlordName: '',
  currentLandlordPhone: '',
  reasonForLeaving: '',
  previousAddress: '',
  previousLandlordName: '',
  previousLandlordPhone: '',
  employmentStatus: '',
  currentEmployer: '',
  jobTitle: '',
  employerPhone: '',
  supervisorName: '',
  monthsEmployed: '',
  monthlySalary: '',
  otherIncomeSource: '',
  otherIncomeAmount: '',
  coApplicants: [],
  hasBeenEvicted: '',
  hasBrokenLease: '',
  hasConvictions: '',
  convictionExplanation: '',
  hasPets: '',
  petDetails: '',
  numberOfOccupants: '1',
  numberOfVehicles: '',
  vehicleDetails: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  desiredMoveInDate: '',
  desiredLeaseTerm: '',
  additionalNotes: '',
};

const initialState: ApplicationWizardState = {
  currentStep: 0,
  formData: initialFormData,
  completedSteps: new Set(),
  isDirty: false,
  applicationId: null,
  propertySlug: '',
};

export function useApplicationWizardState(propertySlug: string = ''): ApplicationWizardContextValue {
  const [state, setState] = useState<ApplicationWizardState>({
    ...initialState,
    propertySlug,
  });

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, APPLICATION_STEPS.length - 1)),
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      const newStep = Math.min(prev.currentStep + 1, APPLICATION_STEPS.length - 1);
      const newCompletedSteps = new Set(prev.completedSteps);
      newCompletedSteps.add(prev.currentStep);
      return {
        ...prev,
        currentStep: newStep,
        completedSteps: newCompletedSteps,
      };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  }, []);

  const updateFormData = useCallback((data: Partial<ApplicationFormData>) => {
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
      return {
        ...prev,
        completedSteps: newCompletedSteps,
      };
    });
  }, []);

  const setApplicationId = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      applicationId: id,
    }));
  }, []);

  const resetWizard = useCallback(() => {
    setState({ ...initialState, propertySlug: state.propertySlug });
  }, [state.propertySlug]);

  return {
    state,
    goToStep,
    nextStep,
    prevStep,
    updateFormData,
    markStepComplete,
    setApplicationId,
    resetWizard,
  };
}
