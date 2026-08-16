'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import slugify from 'slugify';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useWizard } from '../wizard-context';
import { LoadScript, Autocomplete } from '@react-google-maps/api';
import { CheckCircle2, AlertCircle, MapPin } from 'lucide-react';

const GOOGLE_LIBRARIES: ('places')[] = ['places'];

const basicInfoSchema = z.object({
  name: z.string().min(3, 'Min 3 characters'),
  slug: z.string().min(3, 'Min 3 characters').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  streetAddress: z.string().min(5, 'Enter a valid address'),
  city: z.string().min(2, 'Required'),
  state: z.string().min(2, 'Required'),
  zipCode: z.string().min(5, 'Enter a valid ZIP'),
  unitNumber: z.string().optional(),
});

type BasicInfoFormData = z.infer<typeof basicInfoSchema>;

interface BasicInfoStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function BasicInfoStep({ setValidate }: BasicInfoStepProps) {
  const { state, updateFormData } = useWizard();
  const isInitialMount = useRef(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const [addressVerified, setAddressVerified] = useState<boolean>(false);
  const [addressTouched, setAddressTouched] = useState<boolean>(false);

  const form = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: state.formData.name || '',
      slug: state.formData.slug || '',
      description: state.formData.description || '',
      streetAddress: state.formData.streetAddress || '',
      city: state.formData.city || '',
      state: state.formData.state || '',
      zipCode: state.formData.zipCode || '',
      unitNumber: state.formData.unitNumber || '',
    },
  });

  const { register, watch, setValue, getValues } = form;

  // Watch individual fields to avoid infinite loop
  const name = watch('name');
  const slug = watch('slug');
  const description = watch('description');
  const streetAddress = watch('streetAddress');
  const city = watch('city');
  const stateValue = watch('state');
  const zipCode = watch('zipCode');
  const unitNumber = watch('unitNumber');

  // Update wizard state when values change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    updateFormData({ name, slug, description, streetAddress, city, state: stateValue, zipCode, unitNumber });
  }, [name, slug, description, streetAddress, city, stateValue, zipCode, unitNumber, updateFormData]);

  // Set validation function
  useEffect(() => {
    const validateFn = (): boolean => {
      const values = getValues();
      return !!(values.name && values.streetAddress && values.city && values.state && values.zipCode);
    };
    setValidate(validateFn);
    return () => setValidate(null);
  }, [setValidate, getValues]);

  // Generate slug from name
  const generateSlug = () => {
    const name = watch('name');
    if (name) {
      const sanitized = name.replace(/[^a-zA-Z0-9\s-]/g, '');
      setValue('slug', slugify(sanitized, { lower: true, strict: true }));
    }
  };

  // Called when Google Places selects a place
  const handlePlaceChanged = () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place.address_components) return;

    let streetNumber = '';
    let route = '';
    let locality = '';
    let adminArea = '';
    let postalCode = '';

    for (const component of place.address_components) {
      const types = component.types;
      if (types.includes('street_number')) streetNumber = component.long_name;
      if (types.includes('route')) route = component.long_name;
      if (types.includes('locality')) locality = component.long_name;
      if (types.includes('administrative_area_level_1')) adminArea = component.short_name;
      if (types.includes('postal_code')) postalCode = component.long_name;
    }

    const street = [streetNumber, route].filter(Boolean).join(' ');

    setValue('streetAddress', street, { shouldValidate: true });
    setValue('city', locality, { shouldValidate: true });
    setValue('state', adminArea, { shouldValidate: true });
    setValue('zipCode', postalCode, { shouldValidate: true });

    // Sync to wizard
    updateFormData({
      streetAddress: street,
      city: locality,
      state: adminArea,
      zipCode: postalCode,
    });

    setAddressVerified(true);
    setAddressTouched(true);
  };

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
        <p className="text-gray-700 mt-2">
          Enter the property address and basic details
        </p>
      </div>

      <div className="grid gap-6">
        {/* Property Name & Slug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700">
              Property Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Sunset View Apartments"
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              {...register('name')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-gray-700">
              URL Slug <span className="text-red-400">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                placeholder="sunset-view-apartments"
                className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                {...register('slug')}
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateSlug}
                className="border-gray-300 text-gray-900 hover:bg-gray-50 shrink-0"
              >
                Generate
              </Button>
            </div>
          </div>
        </div>

        {/* Address with Google Places Autocomplete */}
        <div className="space-y-2">
          <Label htmlFor="streetAddress" className="text-gray-700 flex items-center gap-2">
            Street Address <span className="text-red-400">*</span>
            {addressTouched && (
              addressVerified ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-normal">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Address verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-400 font-normal">
                  <AlertCircle className="h-3.5 w-3.5" /> Select a suggestion to verify
                </span>
              )
            )}
          </Label>

          {apiKey ? (
            <LoadScript googleMapsApiKey={apiKey} libraries={GOOGLE_LIBRARIES}>
              <Autocomplete
                onLoad={(ac) => { autocompleteRef.current = ac; }}
                onPlaceChanged={handlePlaceChanged}
                options={{ types: ['address'], componentRestrictions: { country: 'us' } }}
              >
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="streetAddress"
                    placeholder="Start typing your address…"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pl-9"
                    {...register('streetAddress')}
                    onChange={(e) => {
                      register('streetAddress').onChange(e);
                      // If user manually edits, mark as unverified
                      setAddressVerified(false);
                      setAddressTouched(true);
                    }}
                  />
                </div>
              </Autocomplete>
            </LoadScript>
          ) : (
            <Input
              id="streetAddress"
              placeholder="123 Main Street"
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              {...register('streetAddress')}
            />
          )}
        </div>

        {/* City, State, ZIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2 col-span-2 md:col-span-2">
            <Label htmlFor="city" className="text-gray-700">
              City <span className="text-red-400">*</span>
            </Label>
            <Input
              id="city"
              placeholder="Las Vegas"
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              {...register('city')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state" className="text-gray-700">
              State <span className="text-red-400">*</span>
            </Label>
            <Input
              id="state"
              placeholder="NV"
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              {...register('state')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipCode" className="text-gray-700">
              ZIP Code <span className="text-red-400">*</span>
            </Label>
            <Input
              id="zipCode"
              placeholder="89101"
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              {...register('zipCode')}
            />
          </div>
        </div>

        {/* Unit Number (optional) */}
        <div className="space-y-2">
          <Label htmlFor="unitNumber" className="text-gray-700">
            Unit / Apt Number <span className="text-gray-400">(optional)</span>
          </Label>
          <Input
            id="unitNumber"
            placeholder="e.g., Apt 4B"
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 max-w-xs"
            {...register('unitNumber')}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-700">
            Description <span className="text-gray-400">(optional)</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Describe the property, neighborhood, and any special features..."
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 min-h-[120px]"
            {...register('description')}
          />
        </div>
      </div>
    </div>
  );
}
