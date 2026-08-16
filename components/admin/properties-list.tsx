'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import PropertyActions from '@/components/admin/property-actions';
import ScheduleHoursButton from '@/components/admin/schedule-hours-button';
import { PropertyUnitsList } from '@/components/admin/property-units-list';
import { Building2, ChevronRight, MapPin, Globe, GlobeLock } from 'lucide-react';

interface PropertyUnit {
  id: string;
  name: string;
  rentAmount: number;
  isAvailable: boolean;
  hasActiveLease?: boolean;
  tenantName?: string;
  leaseId?: string;
}

interface Property {
  id: string;
  name: string;
  type: string;
  isPublished: boolean;
  firstImage: string | null;
  lowestRent: number;
  availableUnitsCount: number;
  units: PropertyUnit[];
}

interface PropertiesListProps {
  properties: Property[];
}

export function PropertiesMobileList({ properties }: PropertiesListProps) {
  const router = useRouter();

  return (
    <div className='md:hidden space-y-3'>
      {properties.length === 0 ? (
        <div className='text-center text-gray-400 py-8 text-sm'>
          No properties found.
        </div>
      ) : (
        properties.map((property) => (
          <div
            key={property.id}
            onClick={() => router.push(`/admin/dashboard/properties/${property.id}/details`)}
            className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99]'
          >
            <div className='flex gap-3'>
              <div className='flex-shrink-0'>
                {property.firstImage ? (
                  <Image
                    src={property.firstImage}
                    alt={property.name}
                    width={72}
                    height={72}
                    className='rounded-lg object-cover w-[72px] h-[72px]'
                  />
                ) : (
                  <div className='w-[72px] h-[72px] bg-gray-100 rounded-lg flex items-center justify-center'>
                    <Building2 className='h-6 w-6 text-gray-300' />
                  </div>
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <h3 className='text-sm font-semibold text-gray-800 truncate'>{property.name}</h3>
                  {property.isPublished ? (
                    <span className='inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0'>
                      <Globe className='h-2.5 w-2.5' />
                      Live
                    </span>
                  ) : (
                    <span className='inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 shrink-0'>
                      <GlobeLock className='h-2.5 w-2.5' />
                      Draft
                    </span>
                  )}
                </div>
                <p className='text-[11px] text-gray-500 mt-0.5 capitalize'>{property.type}</p>
                <div className='flex items-center gap-3 mt-1.5'>
                  <span className='text-sm font-bold text-gray-900'>
                    {property.lowestRent > 0 ? formatCurrency(property.lowestRent) : '—'}
                    <span className='text-[10px] text-gray-400 font-normal'>/mo</span>
                  </span>
                  <span className='text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600'>
                    {property.availableUnitsCount} available
                  </span>
                </div>
              </div>
            </div>
            <div className='flex items-center gap-2 mt-3 pt-3 border-t border-gray-100' onClick={(e) => e.stopPropagation()}>
              <PropertyUnitsList propertyId={property.id} units={property.units} />
              <ScheduleHoursButton propertyId={property.id} />
              <Button
                variant='outline'
                size='sm'
                className='flex-1 h-8 text-xs'
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/admin/dashboard/properties/${property.id}`);
                }}
              >
                Edit
              </Button>
              <PropertyActions propertyId={property.id} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function PropertiesDesktopTable({ properties }: PropertiesListProps) {
  const router = useRouter();

  return (
    <div className='hidden md:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <div className='overflow-x-auto'>
      <table className='w-full min-w-[640px]'>
        <thead>
          <tr className='bg-gray-50/80'>
            <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 w-20'>Photo</th>
            <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Property</th>
            <th className='text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Rent</th>
            <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Type</th>
            <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Units</th>
            <th className='text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 w-44'>Actions</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-100'>
          {properties.length === 0 && (
            <tr>
              <td colSpan={6} className='text-center text-gray-400 py-12 text-sm'>
                No properties found.
              </td>
            </tr>
          )}
          {properties.map((property) => (
            <tr
              key={property.id}
              className='hover:bg-gray-50/50 transition-colors cursor-pointer group border-b border-gray-200 shadow-sm'
              onClick={() => router.push(`/admin/dashboard/properties/${property.id}/details`)}
            >
              <td className='px-4 py-4'>
                {property.firstImage ? (
                  <Image
                    src={property.firstImage}
                    alt={property.name}
                    width={56}
                    height={56}
                    className='rounded-lg object-cover w-14 h-14 group-hover:ring-2 group-hover:ring-cyan-400 transition-all'
                  />
                ) : (
                  <div className='w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center group-hover:ring-2 group-hover:ring-cyan-400 transition-all'>
                    <Building2 className='h-5 w-5 text-gray-300' />
                  </div>
                )}
              </td>
              <td className='px-4 py-4'>
                <div className='flex items-center gap-2'>
                  <p className='text-xs font-semibold text-gray-800'>{property.name}</p>
                  {property.isPublished ? (
                    <span className='inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0'>
                      <Globe className='h-2.5 w-2.5' />
                      Live
                    </span>
                  ) : (
                    <span className='inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 shrink-0'>
                      <GlobeLock className='h-2.5 w-2.5' />
                      Draft
                    </span>
                  )}
                </div>
                <p className='text-[10px] text-gray-500'>{property.units.length} units</p>
              </td>
              <td className='px-4 py-3 text-right'>
                <span className='text-xs font-bold text-gray-800'>
                  {property.lowestRent > 0 ? formatCurrency(property.lowestRent) : '—'}
                </span>
              </td>
              <td className='px-4 py-4'>
                <span className='text-xs text-gray-600 capitalize'>{property.type}</span>
              </td>
              <td className='px-4 py-3' onClick={(e) => e.stopPropagation()}>
                <PropertyUnitsList propertyId={property.id} units={property.units} />
              </td>
              <td className='px-4 py-3' onClick={(e) => e.stopPropagation()}>
                <div className='flex items-center justify-end gap-1.5'>
                  <ScheduleHoursButton propertyId={property.id} />
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 text-[11px] px-2'
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/dashboard/properties/${property.id}`);
                    }}
                  >
                    Edit
                  </Button>
                  <PropertyActions propertyId={property.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
