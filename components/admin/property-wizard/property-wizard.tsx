'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WizardProvider, useWizard } from './wizard-context';
import { WizardProgress } from './wizard-progress';
import { WizardNavigation } from './wizard-navigation';
import { getStepsForPropertyType } from './use-wizard-state';

// Step components
import {
  PropertyTypeSelector,
  BasicInfoStep,
  DetailsStep,
  PhotosStep,
  PricingStep,
  ReviewStep,
  RoomSetupStep,
  RoomDetailsStep,
  SharedSpacesStep,
  BuildingStructureStep,
  UnitTemplatesStep,
  UnitGeneratorStep,
  ComplexAmenitiesStep,
  CommercialDetailsStep,
  LandDetailsStep,
  LeaseSetupStep,
} from './steps';

interface PropertyWizardProps {
  draftId?: string;
  mode?: 'create' | 'edit';
  propertyId?: string;
  onComplete?: (propertyId: string) => void;
  onCancel?: () => void;
}

function WizardContent({ draftId, mode = 'create', propertyId, onComplete, onCancel }: PropertyWizardProps) {
  const router = useRouter();
  const { state, loadDraft, loadProperty, resetWizard } = useWizard();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [validateFn, setValidateFn] = useState<(() => boolean) | null>(null);

  const steps = getStepsForPropertyType(state.propertyType);
  const currentStepId = steps[state.currentStep]?.id;

  // Load draft if provided
  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId, loadDraft]);

  // Load existing property in edit mode
  useEffect(() => {
    if (mode === 'edit' && propertyId) {
      loadProperty(propertyId);
    }
  }, [mode, propertyId, loadProperty]);

  const handleCancel = () => {
    if (state.isDirty) {
      setShowExitDialog(true);
    } else {
      handleConfirmExit();
    }
  };

  const handleConfirmExit = () => {
    resetWizard();
    setShowExitDialog(false);
    if (onCancel) {
      onCancel();
    } else if (mode === 'edit' && propertyId) {
      router.push(`/admin/dashboard/properties/${propertyId}/details`);
    } else {
      router.push('/admin/dashboard/properties');
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStepId) {
      case 'type':
        return <PropertyTypeSelector />;
      case 'basic':
        return <BasicInfoStep setValidate={setValidateFn} />;
      case 'details':
        return <DetailsStep setValidate={setValidateFn} />;
      case 'photos':
        return <PhotosStep setValidate={setValidateFn} />;
      case 'pricing':
        return <PricingStep setValidate={setValidateFn} />;
      case 'review':
        return <ReviewStep onComplete={onComplete} />;
      // Room rental steps
      case 'room_setup':
        return <RoomSetupStep setValidate={setValidateFn} />;
      case 'room_details':
        return <RoomDetailsStep setValidate={setValidateFn} />;
      case 'shared_spaces':
        return <SharedSpacesStep setValidate={setValidateFn} />;
      // Apartment complex steps
      case 'building':
        return <BuildingStructureStep setValidate={setValidateFn} />;
      case 'templates':
        return <UnitTemplatesStep setValidate={setValidateFn} />;
      case 'units':
        return <UnitGeneratorStep setValidate={setValidateFn} />;
      case 'amenities':
        return <ComplexAmenitiesStep setValidate={setValidateFn} />;
      // Commercial steps
      case 'commercial':
        return <CommercialDetailsStep setValidate={setValidateFn} />;
      // Land steps
      case 'land_details':
        return <LandDetailsStep setValidate={setValidateFn} />;
      // Lease setup
      case 'lease':
        return <LeaseSetupStep setValidate={setValidateFn} />;
      default:
        return <PropertyTypeSelector />;
    }
  };

  const totalSteps = steps.length;
  const estimatedMinutes = totalSteps <= 7 ? 4 : totalSteps <= 9 ? 6 : 8;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
                <span className="text-violet-500 text-xs">🏠</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-tight">
                  {state.mode === 'edit'
                    ? 'Edit Property'
                    : state.draftId
                    ? 'Continue Property Setup'
                    : 'New Property Setup'}
                </h1>
                <p className="text-xs text-gray-400">
                  {state.mode !== 'edit' && `About ${estimatedMinutes} minutes · `}
                  {totalSteps} steps
                  {state.propertyType && ` · ${state.listingType === 'rent' ? 'For Rent' : 'For Sale'}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <WizardProgress />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-8">
          {state.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="h-10 w-10 border-4 border-violet-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading property details...</p>
              </div>
            </div>
          ) : (
            <>
              {renderStep()}
              <WizardNavigation onValidate={validateFn || undefined} onComplete={onComplete} />
            </>
          )}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              You have unsaved changes. Would you like to save your progress as a draft before leaving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowExitDialog(false)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Continue Editing
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmExit}
            >
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PropertyWizard(props: PropertyWizardProps) {
  return (
    <WizardProvider>
      <WizardContent {...props} />
    </WizardProvider>
  );
}

export default PropertyWizard;
