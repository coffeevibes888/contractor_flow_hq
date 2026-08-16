'use client';

export type JobApplicationStep =
  | 'personal'
  | 'experience'
  | 'education'
  | 'documents'
  | 'agreement'
  | 'review';

export interface StepConfig {
  id: JobApplicationStep;
  title: string;
  description: string;
}

export const JOB_APPLICATION_STEPS: StepConfig[] = [
  { id: 'personal', title: 'Personal', description: 'Your contact and identity info' },
  { id: 'experience', title: 'Experience', description: 'Work history and skills' },
  { id: 'education', title: 'Education', description: 'Education and references' },
  { id: 'documents', title: 'Documents', description: 'Resume and ID uploads' },
  { id: 'agreement', title: 'Agreement', description: 'Consents and signature' },
  { id: 'review', title: 'Review', description: 'Review and submit' },
];

export interface WorkHistoryEntry {
  id: string;
  employer: string;
  title: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  supervisorName: string;
  supervisorPhone: string;
  mayContact: boolean;
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string;
  graduationYear: string;
  gpa: string;
}

export interface ReferenceEntry {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  yearsKnown: string;
}

export interface JobApplicationFormData {
  // Personal / contact
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  ssn: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateRegion: string;
  postalCode: string;

  // Work authorization
  workAuth: string;
  requiresSponsorship: boolean;

  // Experience
  yearsExperience: string;
  workHistory: WorkHistoryEntry[];
  skills: string[];
  certifications: string[];

  // Education & references
  education: EducationEntry[];
  references: ReferenceEntry[];

  // Documents (id references back to uploaded files)
  documents: Array<{ id: string; type: string; url: string; name: string; uploadedAt: string }>;

  // Cover letter
  coverLetter: string;

  // Consents + signature
  backgroundCheckConsent: boolean;
  creditCheckConsent: boolean;
  certifyTruthful: boolean;
  signatureUrl: string;
  signedName: string;
}

export interface JobApplicationWizardState {
  currentStep: number;
  formData: Partial<JobApplicationFormData>;
  completedSteps: Set<number>;
  isDirty: boolean;
  applicantId: string | null;
  jobId: string;
}

export interface JobApplicationWizardContextValue {
  state: JobApplicationWizardState;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<JobApplicationFormData>) => void;
  markStepComplete: (step: number) => void;
  setApplicantId: (id: string) => void;
  resetWizard: () => void;
}
