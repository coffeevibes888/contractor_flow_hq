'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  MapPin, Bed, Bath, Square, Calendar, DollarSign, Dog,
  CheckCircle2, Edit2, Home, Building2, Layers, Globe, Lock, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWizard } from '../wizard-context';
import { PROPERTY_TYPE_INFO } from '../types';
import { getStepsForPropertyType } from '../use-wizard-state';
import { formatCurrency } from '@/lib/utils';

interface ReviewStepProps {
  onComplete?: (propertyId: string) => void;
}

export function ReviewStep({ onComplete }: ReviewStepProps) {
  const { state, goToStep, updateFormData } = useWizard();
  const [listPublicly, setListPublicly] = useState<boolean | null>(null);

  const { formData, propertyType, listingType } = state;
  const isRental = listingType === 'rent';
  const isApartmentComplex = propertyType === 'apartment_complex';

  // Get steps for current property type to find correct step indices
  const steps = getStepsForPropertyType(propertyType);
  const getStepIndex = (stepId: string) => steps.findIndex(s => s.id === stepId);

  const formatCurrency = (value: number | undefined) => {
    if (!value) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const isEditMode = state.mode === 'edit';

  const EditButton = ({ stepId }: { stepId: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => goToStep(getStepIndex(stepId))}
      className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
    >
      <Edit2 className="h-4 w-4 mr-1" />
      Edit
    </Button>
  );

  // Calculate totals for apartment complex
  const totalUnits = isApartmentComplex 
    ? (formData.totalBuildings || 1) * (formData.floorsPerBuilding || 1) * (formData.unitsPerFloor || 1)
    : 0;
  
  const templates = formData.unitTemplates || [];
  const minRent = templates.length > 0 ? Math.min(...templates.filter(t => t.baseRent).map(t => t.baseRent!)) : 0;
  const maxRent = templates.length > 0 ? Math.max(...templates.filter(t => t.baseRent).map(t => t.baseRent!)) : 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Review Your Changes' : 'Review Your Listing'}
        </h2>
        <p className="text-gray-700 mt-2">
          {isEditMode
            ? 'Confirm your updates before saving'
            : 'Make sure everything looks good before publishing'}
        </p>
      </div>

      {/* Property Type & Listing Type */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
              <span className="text-2xl">
                {propertyType ? PROPERTY_TYPE_INFO[propertyType].icon : '🏠'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {propertyType ? PROPERTY_TYPE_INFO[propertyType].label : 'Property'}
              </p>
              <Badge className={isRental ? 'bg-violet-600' : 'bg-emerald-600'}>
                {isRental ? 'For Rent' : 'For Sale'}
              </Badge>
            </div>
          </div>
          <EditButton stepId="type" />
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Basic Information</h3>
          <EditButton stepId="basic" />
        </div>
        
        <div className="space-y-3">
          <div>
            <p className="text-lg font-semibold text-gray-900">{formData.name || 'Untitled Property'}</p>
            <p className="text-sm text-gray-500">/{formData.slug || 'no-slug'}</p>
          </div>
          
          <div className="flex items-start gap-2 text-gray-700">
            <MapPin className="h-4 w-4 mt-1 text-gray-400 flex-shrink-0" />
            <div>
              <p>{formData.streetAddress || 'No address'}</p>
              <p>{formData.city}, {formData.state} {formData.zipCode}</p>
              {formData.unitNumber && <p>Unit: {formData.unitNumber}</p>}
            </div>
          </div>

          {formData.description && (
            <p className="text-sm text-gray-500 line-clamp-3">{formData.description}</p>
          )}
        </div>
      </div>

      {/* Apartment Complex: Building Structure & Floor Plans */}
      {isApartmentComplex && (
        <>
          {/* Building Structure */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Building Structure</h3>
              <EditButton stepId="building" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">Buildings</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{formData.totalBuildings || 1}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
                  <Layers className="h-4 w-4" />
                  <span className="text-sm">Floors</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{formData.floorsPerBuilding || 1}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
                  <Home className="h-4 w-4" />
                  <span className="text-sm">Total Units</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{totalUnits}</p>
              </div>
            </div>
          </div>

          {/* Floor Plans & Pricing */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Floor Plans & Pricing</h3>
              <EditButton stepId="templates" />
            </div>
            
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Bed className="h-4 w-4 text-gray-400" />
                      <span>{template.bedrooms === 0 ? 'Studio' : `${template.bedrooms}BR`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Bath className="h-4 w-4 text-gray-400" />
                      <span>{template.bathrooms}BA</span>
                    </div>
                    <span className="text-gray-900 font-medium">{template.name}</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">
                    {formatCurrency(template.baseRent)}/mo
                  </span>
                </div>
              ))}
            </div>

            {/* Rent Range Summary */}
            <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-emerald-300">Rent Range</span>
                <span className="text-emerald-400 font-semibold">
                  {formatCurrency(minRent)} - {formatCurrency(maxRent)}/mo
                </span>
              </div>
            </div>
          </div>

          {/* Complex Amenities */}
          {formData.complexAmenities && formData.complexAmenities.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Complex Amenities</h3>
                <EditButton stepId="amenities" />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.complexAmenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="bg-gray-100 text-gray-600">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Property Details (non-apartment complex) */}
      {!isApartmentComplex && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Property Details</h3>
            <EditButton stepId="details" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Bed className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">{formData.bedrooms ?? 0} Beds</span>
            </div>
            <div className="flex items-center gap-2">
              <Bath className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">{formData.bathrooms ?? 0} Baths</span>
            </div>
            {formData.sizeSqFt && (
              <div className="flex items-center gap-2">
                <Square className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{formData.sizeSqFt.toLocaleString()} sq ft</span>
              </div>
            )}
            {formData.yearBuilt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">Built {formData.yearBuilt}</span>
              </div>
            )}
          </div>

          {/* Pet Policy */}
          <div className="flex items-center gap-2">
            <Dog className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">
              {formData.petPolicy === 'allowed' && 'Pets Allowed'}
              {formData.petPolicy === 'not_allowed' && 'No Pets'}
              {formData.petPolicy === 'case_by_case' && 'Pets: Case by Case'}
            </span>
          </div>

          {/* Amenities */}
          {formData.amenities && formData.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.amenities.slice(0, 8).map((amenity) => (
                <Badge key={amenity} variant="secondary" className="bg-gray-100 text-gray-600">
                  {amenity}
                </Badge>
              ))}
              {formData.amenities.length > 8 && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                  +{formData.amenities.length - 8} more
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Photos */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Photos ({formData.images?.length || 0})
          </h3>
          <EditButton stepId="photos" />
        </div>
        
        {formData.images && formData.images.length > 0 ? (
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {formData.images.slice(0, 6).map((image, index) => (
              <div key={index} className="aspect-square relative rounded-lg overflow-hidden">
                <Image src={image} alt={`Photo ${index + 1}`} fill className="object-cover" />
                {index === 0 && (
                  <div className="absolute top-1 left-1 bg-violet-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                    Primary
                  </div>
                )}
              </div>
            ))}
            {formData.images.length > 6 && (
              <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                <span className="text-gray-500 text-sm">+{formData.images.length - 6}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No photos uploaded</p>
        )}
      </div>

      {/* Pricing (non-apartment complex only) */}
      {!isApartmentComplex && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Pricing</h3>
            <EditButton stepId="pricing" />
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            <span className="text-2xl font-bold text-gray-900">
              {isRental ? formatCurrency(formData.rentAmount) : formatCurrency(formData.salePrice)}
            </span>
            {isRental && <span className="text-gray-500">/month</span>}
          </div>

          {isRental && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Security Deposit</p>
                <p className="text-gray-900">{formatCurrency(formData.depositAmount)}</p>
              </div>
              <div>
                <p className="text-gray-500">Lease Term</p>
                <p className="text-gray-900">
                  {formData.leaseTerm === 1 ? 'Month-to-Month' : `${formData.leaseTerm} months`}
                </p>
              </div>
              {formData.availableFrom && (
                <div>
                  <p className="text-gray-500">Available From</p>
                  <p className="text-gray-900">
                    {new Date(formData.availableFrom).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── LIST PUBLICLY? ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-violet-500 flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Do you want tenants to find this property?</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              List it on the public page and interested tenants can view it and submit applications directly. You can toggle this off any time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setListPublicly(true); updateFormData({ listPublicly: true }); }}
            className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
              listPublicly === true
                ? 'border-violet-500 bg-white shadow-sm'
                : 'border-gray-200 bg-white/60 hover:border-violet-300'
            }`}
          >
            <Globe className={`h-5 w-5 flex-shrink-0 ${listPublicly === true ? 'text-violet-500' : 'text-gray-400'}`} />
            <div>
              <p className={`text-sm font-semibold ${listPublicly === true ? 'text-violet-900' : 'text-gray-700'}`}>
                Yes, list it publicly
              </p>
              <p className="text-[11px] text-gray-500">Appears on listings page immediately</p>
            </div>
            {listPublicly === true && (
              <CheckCircle2 className="h-4 w-4 text-violet-500 ml-auto flex-shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => { setListPublicly(false); updateFormData({ listPublicly: false }); }}
            className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
              listPublicly === false
                ? 'border-gray-400 bg-white shadow-sm'
                : 'border-gray-200 bg-white/60 hover:border-gray-300'
            }`}
          >
            <Lock className={`h-5 w-5 flex-shrink-0 ${listPublicly === false ? 'text-gray-600' : 'text-gray-400'}`} />
            <div>
              <p className={`text-sm font-semibold ${listPublicly === false ? 'text-gray-800' : 'text-gray-700'}`}>
                Not yet — save as draft
              </p>
              <p className="text-[11px] text-gray-500">You can toggle it live later</p>
            </div>
            {listPublicly === false && (
              <CheckCircle2 className="h-4 w-4 text-gray-500 ml-auto flex-shrink-0" />
            )}
          </button>
        </div>

        {listPublicly === true && (
          <div className="mt-3 flex items-center gap-2 bg-violet-100 border border-violet-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-violet-600 flex-shrink-0" />
            <p className="text-xs text-violet-700 font-medium">
              We'll toggle your listing live automatically after saving — no need to find the setting.
            </p>
          </div>
        )}
      </div>

      {/* Note: Submit is handled by WizardNavigation */}
    </div>
  );
}
