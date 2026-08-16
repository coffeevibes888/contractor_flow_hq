'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { getStreetViewImageUrl, getStaticMapImageUrl } from '@/lib/utils/google-maps-streetview';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Calendar, DollarSign, MapPin, Users } from 'lucide-react';

interface JobEmployee {
  id: string;
  firstName: string;
  lastName: string;
}

interface JobCustomer {
  name: string;
  email: string;
}

interface Job {
  id: string;
  jobNumber: string;
  title: string;
  status: string;
  estimatedCost: number | null;
  actualCost: number | null;
  estimatedStartDate: Date | null;
  estimatedEndDate: Date | null;
  address: string | null;
  city: string | null;
  state: string | null;
  beforePhotos: string[];
  afterPhotos: string[];
  customer: JobCustomer | null;
  assignedEmployees?: JobEmployee[];
}

interface JobsListProps {
  jobs: Job[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'scheduled':
      return 'bg-violet-100 text-violet-700 border-violet-300';
    case 'approved':
      return 'bg-cyan-100 text-cyan-700 border-cyan-300';
    case 'quoted':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'on_hold':
      return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'canceled':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export function JobsMobileList({ jobs }: JobsListProps) {
  const router = useRouter();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleCardClick = (jobId: string) => {
    router.push(`/contractor-dashboard/jobs/${jobId}`);
  };

  const handleImageError = (jobId: string) => {
    setImageErrors(prev => ({ ...prev, [jobId]: true }));
  };

  return (
    <div className='md:hidden space-y-3'>
      {jobs.length === 0 ? (
        <div className='text-center text-black/60 py-8 text-sm'>
          No jobs found. Start by responding to leads from the marketplace.
        </div>
      ) : (
        jobs.map((job) => {
          const firstPhoto = job.beforePhotos[0] || job.afterPhotos[0];
          const hasImageError = imageErrors[job.id];
          const streetViewUrl = !firstPhoto && !hasImageError ? getStreetViewImageUrl(job.address, job.city, job.state, '200x200') : null;
          const satelliteUrl = !firstPhoto && hasImageError ? getStaticMapImageUrl(job.address, job.city, job.state, '200x200', 18) : null;
          const jobCost = job.actualCost || job.estimatedCost;

          return (
            <div
              key={job.id}
              onClick={() => handleCardClick(job.id)}
              className='block rounded-xl border-2 border-black bg-gradient-to-r from-violet-100 to-purple-100 p-3 hover:border-violet-400 hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]'
            >
              <div className='flex gap-3'>
                <div className='flex-shrink-0'>
                  {firstPhoto ? (
                    <Image
                      src={firstPhoto}
                      alt={job.title}
                      width={72}
                      height={72}
                      className='rounded-lg object-cover w-[72px] h-[72px] border-2 border-black'
                    />
                  ) : satelliteUrl ? (
                    <Image
                      src={satelliteUrl}
                      alt={`Map of ${job.address}`}
                      width={72}
                      height={72}
                      className='rounded-lg object-cover w-[72px] h-[72px] border-2 border-black'
                      unoptimized
                    />
                  ) : streetViewUrl ? (
                    <Image
                      src={streetViewUrl}
                      alt={`Property at ${job.address}`}
                      width={72}
                      height={72}
                      className='rounded-lg object-cover w-[72px] h-[72px] border-2 border-black'
                      unoptimized
                      onError={() => handleImageError(job.id)}
                    />
                  ) : (
                    <div className='w-[72px] h-[72px] bg-white border-2 border-black rounded-lg flex items-center justify-center text-black/40'>
                      <Briefcase className='h-8 w-8' />
                    </div>
                  )}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-start justify-between gap-2'>
                    <h3 className='text-sm font-bold text-black truncate'>{job.title}</h3>
                    <Badge className={`text-[10px] px-1.5 py-0.5 border ${getStatusColor(job.status)}`}>
                      {formatStatus(job.status)}
                    </Badge>
                  </div>
                  <p className='text-xs text-black/60 mt-0.5'>#{job.jobNumber}</p>
                  {job.customer && (
                    <p className='text-xs text-black/70 mt-1'>
                      {job.customer.name}
                    </p>
                  )}
                  <div className='flex items-center gap-3 mt-2'>
                    {jobCost && (
                      <div className='text-sm font-bold text-emerald-600'>
                        {formatCurrency(Number(jobCost))}
                      </div>
                    )}
                    {job.city && job.state && (
                      <div className='text-xs text-black/60 flex items-center gap-1'>
                        <MapPin className='h-3 w-3' />
                        {job.city}, {job.state}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export function JobsDesktopTable({ jobs }: JobsListProps) {
  const router = useRouter();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleRowClick = (jobId: string) => {
    router.push(`/contractor-dashboard/jobs/${jobId}`);
  };

  const handleImageError = (jobId: string) => {
    setImageErrors(prev => ({ ...prev, [jobId]: true }));
  };

  return (
    <div className='hidden md:block overflow-x-auto'>
      <Table>
        <TableHeader>
          <TableRow className='border-b-2 border-black'>
            <TableHead className='text-black font-bold'>PHOTO</TableHead>
            <TableHead className='text-black font-bold'>JOB</TableHead>
            <TableHead className='text-black font-bold'>CUSTOMER</TableHead>
            <TableHead className='text-black font-bold'>LOCATION</TableHead>
            <TableHead className='text-black font-bold text-right'>VALUE</TableHead>
            <TableHead className='text-black font-bold'>STATUS</TableHead>
            <TableHead className='text-black font-bold'>SCHEDULE</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className='text-center text-black/60 py-8'>
                No jobs found. Start by responding to leads from the marketplace.
              </TableCell>
            </TableRow>
          )}
          {jobs.map((job) => {
            const firstPhoto = job.beforePhotos[0] || job.afterPhotos[0];
            const hasImageError = imageErrors[job.id];
            const streetViewUrl = !firstPhoto && !hasImageError ? getStreetViewImageUrl(job.address, job.city, job.state, '200x200') : null;
            const satelliteUrl = !firstPhoto && hasImageError ? getStaticMapImageUrl(job.address, job.city, job.state, '200x200', 18) : null;
            const jobCost = job.actualCost || job.estimatedCost;

            return (
              <TableRow
                key={job.id}
                className='group cursor-pointer hover:bg-violet-50 border-b border-black/10 transition-colors'
                onClick={() => handleRowClick(job.id)}
              >
                <TableCell>
                  {firstPhoto ? (
                    <Image
                      src={firstPhoto}
                      alt={job.title}
                      width={80}
                      height={80}
                      className='rounded-lg object-cover border-2 border-black group-hover:border-violet-400 transition-all'
                    />
                  ) : satelliteUrl ? (
                    <Image
                      src={satelliteUrl}
                      alt={`Map of ${job.address}`}
                      width={80}
                      height={80}
                      className='rounded-lg object-cover border-2 border-black group-hover:border-violet-400 transition-all'
                      unoptimized
                    />
                  ) : streetViewUrl ? (
                    <Image
                      src={streetViewUrl}
                      alt={`Property at ${job.address}`}
                      width={80}
                      height={80}
                      className='rounded-lg object-cover border-2 border-black group-hover:border-violet-400 transition-all'
                      unoptimized
                      onError={() => handleImageError(job.id)}
                    />
                  ) : (
                    <div className='w-20 h-20 bg-white border-2 border-black rounded-lg flex items-center justify-center text-black/40 group-hover:border-violet-400 transition-all'>
                      <Briefcase className='h-8 w-8' />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <p className='font-semibold text-black'>{job.title}</p>
                    <p className='text-xs text-black/60'>#{job.jobNumber}</p>
                  </div>
                </TableCell>
                <TableCell className='text-black'>
                  {job.customer ? (
                    <div>
                      <p className='font-medium'>
                        {job.customer.name}
                      </p>
                      <p className='text-xs text-black/60'>{job.customer.email}</p>
                    </div>
                  ) : (
                    <span className='text-black/40'>No customer</span>
                  )}
                </TableCell>
                <TableCell className='text-black'>
                  {job.city && job.state ? (
                    <div className='flex items-center gap-1'>
                      <MapPin className='h-4 w-4 text-black/60' />
                      <span>
                        {job.city}, {job.state}
                      </span>
                    </div>
                  ) : (
                    <span className='text-black/40'>—</span>
                  )}
                </TableCell>
                <TableCell className='text-right'>
                  {jobCost ? (
                    <span className='font-bold text-emerald-600'>
                      {formatCurrency(Number(jobCost))}
                    </span>
                  ) : (
                    <span className='text-black/40'>—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs px-2 py-1 border ${getStatusColor(job.status)}`}>
                    {formatStatus(job.status)}
                  </Badge>
                </TableCell>
                <TableCell className='text-black'>
                  {job.estimatedStartDate ? (
                    <div className='flex items-center gap-1 text-sm'>
                      <Calendar className='h-4 w-4 text-black/60' />
                      <span>
                        {new Date(job.estimatedStartDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  ) : (
                    <span className='text-black/40'>Not scheduled</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
