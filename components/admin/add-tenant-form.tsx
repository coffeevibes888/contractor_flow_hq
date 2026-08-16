'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addTenantToProperty } from '@/lib/actions/tenant.actions';
import { addTenantSchema, type AddTenantInput } from '@/lib/validators';
import { Loader2, User, Home, FileText, Info } from 'lucide-react';

type PropertyWithUnits = {
  id: string;
  name: string;
  address: unknown;
  units: {
    id: string;
    name: string;
    type: string;
    rentAmount: number;
    isAvailable: boolean;
    bedrooms: number | null;
    bathrooms: number | null;
  }[];
};

interface AddTenantFormProps {
  properties: PropertyWithUnits[];
  preselectedPropertyId?: string;
  preselectedUnitId?: string;
  /** Pre-fill from free lease builder onboarding */
  prefilledTenantName?: string;
  prefilledTenantEmail?: string;
  /** LegalDocument already uploaded to Cloudinary — attach to the lease */
  prebuiltLegalDocumentId?: string;
}

export function AddTenantForm({
  properties,
  preselectedPropertyId,
  preselectedUnitId,
  prefilledTenantName,
  prefilledTenantEmail,
  prebuiltLegalDocumentId,
}: AddTenantFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState(preselectedPropertyId || '');

  // Split pre-filled name into first/last
  const prefilledFirst = prefilledTenantName ? prefilledTenantName.split(' ')[0] || '' : '';
  const prefilledLast  = prefilledTenantName ? prefilledTenantName.split(' ').slice(1).join(' ') || '' : '';

  const form = useForm<AddTenantInput>({
    resolver: zodResolver(addTenantSchema),
    defaultValues: {
      firstName: prefilledFirst,
      lastName: prefilledLast,
      email: prefilledTenantEmail || '',
      phone: '',
      propertyId: preselectedPropertyId || '',
      unitId: preselectedUnitId || '',
      rentAmount: 0,
      securityDeposit: 0,
      leaseStartDate: new Date().toISOString().split('T')[0],
      leaseEndDate: '',
      billingDayOfMonth: 1,
      moveInDate: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      numberOfOccupants: 1,
      hasPets: false,
      petDetails: '',
      vehicleInfo: '',
      notes: '',
      sendInviteEmail: true,
      createLeaseImmediately: true,
      legalDocumentId: prebuiltLegalDocumentId || undefined,
    },
  });

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const availableUnits = selectedProperty?.units.filter(u => u.isAvailable) || [];
  const hasPets = form.watch('hasPets');

  // Update rent amount when unit is selected
  useEffect(() => {
    const unitId = form.watch('unitId');
    if (unitId && selectedProperty) {
      const unit = selectedProperty.units.find(u => u.id === unitId);
      if (unit) {
        form.setValue('rentAmount', unit.rentAmount);
      }
    }
  }, [form.watch('unitId'), selectedProperty]);

  const onSubmit = async (data: AddTenantInput) => {
    setIsSubmitting(true);
    try {
      // Always carry the pre-built document ID through — the schema field
      // is optional so it's safe to send even if undefined.
      const result = await addTenantToProperty({
        ...data,
        legalDocumentId: prebuiltLegalDocumentId || data.legalDocumentId || undefined,
      });
      
      if (result.success) {
        toast({ description: result.message });
        // If the lease was created as pending_signature, go straight to the
        // leases view so the PM can immediately send the signing invite.
        router.push(result.leaseId ? `/admin/leases/${result.leaseId}` : '/admin/leases');
        router.refresh();
      } else {
        toast({ variant: 'destructive', description: result.message });
      }
    } catch (error) {
      toast({ variant: 'destructive', description: 'Something went wrong' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <Home className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Properties Found</h3>
        <p className="text-slate-400 mb-4">You need to create a property before adding tenants.</p>
        <Button onClick={() => router.push('/admin/dashboard/properties/new')}>
          Create Property
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Tenant Information Section */}
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Tenant Information</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">First Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="John" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Last Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Doe" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Email *</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="tenant@example.com" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(555) 123-4567" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Property & Unit Selection */}
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Home className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Property & Unit</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Property *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedPropertyId(value);
                      form.setValue('unitId', '');
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-slate-800 border-white/10">
                        <SelectValue placeholder="Select a property" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="unitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Unit *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedPropertyId}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-slate-800 border-white/10">
                        <SelectValue placeholder={selectedPropertyId ? "Select a unit" : "Select property first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableUnits.length === 0 ? (
                        <SelectItem value="none" disabled>No available units</SelectItem>
                      ) : (
                        availableUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name} - {unit.type} (${unit.rentAmount}/mo)
                            {unit.bedrooms && ` • ${unit.bedrooms}BR`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedPropertyId && availableUnits.length === 0 && (
                    <FormDescription className="text-orange-400 text-xs">
                      All units in this property are occupied
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Lease Details */}
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Lease Details</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="rentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Monthly Rent *</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="securityDeposit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Security Deposit</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="billingDayOfMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Billing Day</FormLabel>
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-800 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="leaseStartDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Lease Start Date *</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="leaseEndDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Lease End Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormDescription className="text-xs text-slate-400">Leave empty for month-to-month</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="moveInDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Move-in Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Additional Information */}
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Additional Information</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="numberOfOccupants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Number of Occupants</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="1" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="emergencyContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Emergency Contact Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Jane Doe" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="emergencyContactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Emergency Contact Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(555) 987-6543" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="vehicleInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Vehicle Information</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="2020 Honda Civic, ABC-1234" className="bg-slate-800 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="hasPets"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-slate-200">Tenant has pets</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            {hasPets && (
              <FormField
                control={form.control}
                name="petDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200">Pet Details</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Type, breed, weight, etc."
                        className="bg-slate-800 border-white/10 min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Any additional notes about the tenant..."
                      className="bg-slate-800 border-white/10 min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Options */}
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Options</h2>
          
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="createLeaseImmediately"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-slate-200">Create lease immediately</FormLabel>
                    <FormDescription className="text-xs text-slate-400">
                      Creates a pending lease for this tenant. Uncheck to add tenant without a lease.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sendInviteEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-slate-200">Send invite email to tenant</FormLabel>
                    <FormDescription className="text-xs text-slate-400">
                      Sends an email inviting the tenant to create their account and sign the lease.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="border-white/10"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-500">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Tenant
          </Button>
        </div>
      </form>
    </Form>
  );
}
