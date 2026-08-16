'use client';

export type ApplicationStep = 
  | 'personal'
  | 'contact'
  | 'residence'
  | 'employment'
  | 'background'
  | 'documents'
  | 'review';

export interface StepConfig {
  id: ApplicationStep;
  title: string;
  description: string;
}

export const APPLICATION_STEPS: StepConfig[] = [
  { id: 'personal', title: 'Personal Info', description: 'Basic information about you' },
  { id: 'contact', title: 'Contact', description: 'How to reach you' },
  { id: 'residence', title: 'Residence History', description: 'Current and previous housing' },
  { id: 'employment', title: 'Employment', description: 'Job and income details' },
  { id: 'background', title: 'Background', description: 'Additional screening info' },
  { id: 'documents', title: 'Documents', description: 'ID and income verification' },
  { id: 'review', title: 'Review', description: 'Review and submit' },
];

export interface ApplicationFormData {
  // Personal Info
  fullName: string;
  dateOfBirth: string;
  ssn: string;
  
  // Contact
  email: string;
  phone: string;
  
  // Residence History
  currentAddress: string;
  currentCity: string;
  currentState: string;
  currentZip: string;
  monthsAtCurrentAddress: string;
  currentRent: string;
  currentLandlordName: string;
  currentLandlordPhone: string;
  reasonForLeaving: string;
  previousAddress: string;
  previousLandlordName: string;
  previousLandlordPhone: string;
  
  // Employment
  employmentStatus: string;
  currentEmployer: string;
  jobTitle: string;
  employerPhone: string;
  supervisorName: string;
  monthsEmployed: string;
  monthlySalary: string;
  otherIncomeSource: string;
  otherIncomeAmount: string;
  
  // Co-Applicants / Additional Occupants
  coApplicants: CoApplicant[];
  
  // Background & Occupants
  hasBeenEvicted: string;
  hasBrokenLease: string;
  hasConvictions: string;
  convictionExplanation: string;
  hasPets: string;
  petDetails: string;
  numberOfOccupants: string;
  occupantNames: string;
  numberOfVehicles: string;
  vehicleDetails: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  
  // Move-in
  desiredMoveInDate: string;
  desiredLeaseTerm: string;
  
  // Notes
  additionalNotes: string;
}

export interface CoApplicant {
  id: string;
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  relationship: string; // spouse, partner, roommate, family member, etc.
  willBeOnLease: boolean;
}

export interface ApplicationWizardState {
  currentStep: number;
  formData: Partial<ApplicationFormData>;
  completedSteps: Set<number>;
  isDirty: boolean;
  applicationId: string | null;
  propertySlug: string;
}

export interface ApplicationWizardContextValue {
  state: ApplicationWizardState;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<ApplicationFormData>) => void;
  markStepComplete: (step: number) => void;
  setApplicationId: (id: string) => void;
  resetWizard: () => void;
}
