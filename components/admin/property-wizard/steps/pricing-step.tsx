'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign, Calendar, Clock, Video, View } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWizard } from '../wizard-context';

const rentalPricingSchema = z.object({
  rentAmount: z.number().min(1, 'Rent amount is required'),
  depositAmount: z.number().min(0).optional().nullable(),
  leaseTerm: z.number().min(1).max(60).optional().nullable(),
  availableFrom: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
  virtualTourUrl: z.string().url().optional().or(z.literal('')),
});

const salePricingSchema = z.object({
  salePrice: z.number().min(1, 'Sale price is required'),
  videoUrl: z.string().url().optional().or(z.literal('')),
  virtualTourUrl: z.string().url().optional().or(z.literal('')),
});

interface PricingStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function PricingStep({ setValidate }: PricingStepProps) {
  const { state, updateFormData } = useWizard();
  const isRental = state.listingType === 'rent';
  const isInitialMount = useRef(true);

  const schema = isRental ? rentalPricingSchema : salePricingSchema;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: isRental
      ? {
          rentAmount: state.formData.rentAmount ?? undefined,
          depositAmount: state.formData.depositAmount ?? null,
          leaseTerm: state.formData.leaseTerm ?? 12,
          availableFrom: state.formData.availableFrom ?? '',
          videoUrl: state.formData.videoUrl ?? '',
          virtualTourUrl: state.formData.virtualTourUrl ?? '',
        }
      : {
          salePrice: state.formData.salePrice ?? undefined,
          videoUrl: state.formData.videoUrl ?? '',
          virtualTourUrl: state.formData.virtualTourUrl ?? '',
        },
  });

  const { register, watch, setValue, formState: { errors }, trigger, getValues } = form;
  
  // Watch individual fields to avoid infinite loops
  const rentAmount = watch('rentAmount');
  const depositAmount = watch('depositAmount');
  const leaseTerm = watch('leaseTerm');
  const availableFrom = watch('availableFrom');
  const salePrice = watch('salePrice');
  const videoUrl = watch('videoUrl');
  const virtualTourUrl = watch('virtualTourUrl');

  // Update wizard state when values change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const data: Record<string, unknown> = {};
    if (isRental) {
      data.rentAmount = rentAmount;
      data.depositAmount = depositAmount === null ? undefined : depositAmount;
      data.leaseTerm = leaseTerm;
      data.availableFrom = availableFrom;
    } else {
      data.salePrice = salePrice;
    }
    data.videoUrl = videoUrl;
    data.virtualTourUrl = virtualTourUrl;
    
    updateFormData(data);
  }, [rentAmount, depositAmount, leaseTerm, availableFrom, salePrice, videoUrl, virtualTourUrl, isRental, updateFormData]);

  const validate = useCallback(() => {
    const values = getValues();
    const isValid = isRental 
      ? !!(values.rentAmount && values.rentAmount > 0)
      : !!(values.salePrice && values.salePrice > 0);
    return isValid;
  }, [getValues, isRental]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {isRental ? 'Rental Pricing & Terms' : 'Sale Price'}
        </h2>
        <p className="text-gray-700 mt-2">
          {isRental
            ? 'Set your rent amount, deposit, and lease terms'
            : 'Set your asking price for the property'}
        </p>
      </div>

      {isRental ? (
        /* Rental Pricing */
        <div className="space-y-6">
          {/* Rent & Deposit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-violet-400" />
                Monthly Rent
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="1,500"
                  className="pl-8 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                  {...register('rentAmount', { valueAsNumber: true })}
                />
              </div>
              {errors.rentAmount && (
                <p className="text-sm text-red-400">{errors.rentAmount.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-violet-400" />
                Security Deposit
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="Same as rent"
                  className="pl-8 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                  {...register('depositAmount', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Lease Term & Available Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-violet-400" />
                Lease Term
              </Label>
              <Select
                value={String(leaseTerm || 12)}
                onValueChange={(v) => setValue('leaseTerm', parseInt(v))}
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="1">Month-to-Month</SelectItem>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                  <SelectItem value="18">18 Months</SelectItem>
                  <SelectItem value="24">24 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-violet-400" />
                Available From
              </Label>
              <Input
                type="date"
                className="bg-white border-gray-200 text-gray-900"
                {...register('availableFrom')}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Sale Pricing */
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-gray-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Asking Price
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <Input
                type="number"
                min={0}
                placeholder="450,000"
                className="pl-8 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 text-lg"
                {...register('salePrice', { valueAsNumber: true })}
              />
            </div>
            {errors.salePrice && (
              <p className="text-sm text-red-400">{errors.salePrice.message as string}</p>
            )}
          </div>
        </div>
      )}

      {/* Video & Virtual Tour */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Media Links (Optional)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-700 flex items-center gap-2">
              <Video className="h-4 w-4 text-violet-400" />
              Video Tour URL
            </Label>
            <Input
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              {...register('videoUrl')}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 flex items-center gap-2">
              <View className="h-4 w-4 text-violet-400" />
              Virtual Tour URL
            </Label>
            <Input
              type="url"
              placeholder="https://matterport.com/..."
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              {...register('virtualTourUrl')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
