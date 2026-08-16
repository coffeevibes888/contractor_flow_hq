'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

const applicationSchema = z.object({
  fullName: z.string().min(3, 'Name is required'),
  age: z.string().optional(),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Phone number is required'),
  currentAddress: z.string().min(5, 'Current address is required'),
  currentEmployer: z.string().min(2, 'Current employer is required'),
  monthlySalary: z.string().optional(),
  yearlySalary: z.string().optional(),
  hasPets: z.string().optional(),
  petCount: z.string().optional(),
  ssn: z.string().min(4, 'SSN is required'),
  notes: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface DraftApplication {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  propertySlug: string | null;
  status: string;
}

export default function CompleteApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [application, setApplication] = useState<DraftApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [showSsn, setShowSsn] = useState(false);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      fullName: '',
      age: '',
      email: '',
      phone: '',
      currentAddress: '',
      currentEmployer: '',
      monthlySalary: '',
      yearlySalary: '',
      hasPets: '',
      petCount: '',
      ssn: '',
      notes: '',
    },
  });

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setApplicationId(resolvedParams.id);
    }
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!applicationId) return;

    async function fetchApplication() {
      try {
        const res = await fetch(`/api/applications/${applicationId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Application not found');
          } else if (res.status === 403) {
            setError('You do not have permission to view this application');
          } else {
            setError('Failed to load application');
          }
          return;
        }

        const data = await res.json();
        setApplication(data.application);

        form.reset({
          fullName: data.application.fullName || '',
          email: data.application.email || '',
          phone: data.application.phone || '',
          age: '',
          currentAddress: '',
          currentEmployer: '',
          monthlySalary: '',
          yearlySalary: '',
          hasPets: '',
          petCount: '',
          ssn: '',
          notes: '',
        });
      } catch {
        setError('Failed to load application');
      } finally {
        setLoading(false);
      }
    }

    if (sessionStatus === 'authenticated') {
      fetchApplication();
    } else if (sessionStatus === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [applicationId, sessionStatus, router, form]);

  const onSubmit = async (values: ApplicationFormData) => {
    if (!applicationId) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/applications/${applicationId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          propertySlug: application?.propertySlug,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to submit application');
        return;
      }

      setSubmitted(true);
      setTimeout(() => {
        router.push('/user/dashboard');
      }, 2000);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <Loader2 className='h-8 w-8 animate-spin text-violet-400' />
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className='w-full max-w-2xl mx-auto px-4 py-8'>
        <Card className='border-red-200 bg-red-50'>
          <CardContent className='pt-6'>
            <p className='text-red-600 text-center'>{error}</p>
            <div className='mt-4 text-center'>
              <Link href='/user/dashboard'>
                <Button variant='outline'>Back to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className='w-full max-w-2xl mx-auto px-4 py-8'>
        <Card className='border-emerald-200 bg-emerald-50'>
          <CardContent className='pt-6'>
            <div className='flex flex-col items-center gap-4'>
              <CheckCircle2 className='h-12 w-12 text-emerald-500' />
              <h2 className='text-xl font-semibold text-emerald-700'>Application Submitted!</h2>
              <p className='text-emerald-600 text-center'>
                Your application has been submitted successfully. You will be redirected to your dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const propertyName = application?.propertySlug
    ? application.propertySlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Property';

  return (
    <div className='w-full max-w-2xl mx-auto px-4 py-8'>
      <Link
        href='/user/dashboard'
        className='inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-6'
      >
        <ArrowLeft className='h-4 w-4' />
        Back to Dashboard
      </Link>

      <Card className='border-white/10 bg-slate-900/60'>
        <CardHeader>
          <CardTitle className='text-slate-50'>Complete Your Application</CardTitle>
          <CardDescription className='text-slate-300/80'>
            Application for <span className='font-medium text-violet-300'>{propertyName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {error && (
              <div className='rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300'>
                {error}
              </div>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='fullName' className='text-slate-200'>Full Name *</Label>
                <Input
                  id='fullName'
                  {...form.register('fullName')}
                  className='bg-slate-800 border-slate-700 text-slate-50'
                />
                {form.formState.errors.fullName && (
                  <p className='text-xs text-red-400'>{form.formState.errors.fullName.message}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='age' className='text-slate-200'>Age</Label>
                <Input
                  id='age'
                  {...form.register('age')}
                  className='bg-slate-800 border-slate-700 text-slate-50'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='email' className='text-slate-200'>Email *</Label>
                <Input
                  id='email'
                  type='email'
                  {...form.register('email')}
                  className='bg-slate-800 border-slate-700 text-slate-50'
                />
                {form.formState.errors.email && (
                  <p className='text-xs text-red-400'>{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='phone' className='text-slate-200'>Phone *</Label>
                <Input
                  id='phone'
                  {...form.register('phone')}
                  className='bg-slate-800 border-slate-700 text-slate-50'
                />
                {form.formState.errors.phone && (
                  <p className='text-xs text-red-400'>{form.formState.errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='currentAddress' className='text-slate-200'>Current Address *</Label>
              <Input
                id='currentAddress'
                {...form.register('currentAddress')}
                className='bg-slate-800 border-slate-700 text-slate-50'
              />
              {form.formState.errors.currentAddress && (
                <p className='text-xs text-red-400'>{form.formState.errors.currentAddress.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='currentEmployer' className='text-slate-200'>Current Employer *</Label>
              <Input
                id='currentEmployer'
                {...form.register('currentEmployer')}
                className='bg-slate-800 border-slate-700 text-slate-50'
              />
              {form.formState.errors.currentEmployer && (
                <p className='text-xs text-red-400'>{form.formState.errors.currentEmployer.message}</p>
              )}
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='monthlySalary' className='text-slate-200'>Monthly Salary</Label>
                <Input
                  id='monthlySalary'
                  {...form.register('monthlySalary')}
                  placeholder='$'
                  className='bg-slate-800 border-slate-700 text-slate-50'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='yearlySalary' className='text-slate-200'>Yearly Salary</Label>
                <Input
                  id='yearlySalary'
                  {...form.register('yearlySalary')}
                  placeholder='$'
                  className='bg-slate-800 border-slate-700 text-slate-50'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='hasPets' className='text-slate-200'>Do you have pets?</Label>
                <Input
                  id='hasPets'
                  {...form.register('hasPets')}
                  placeholder='Yes/No'
                  className='bg-slate-800 border-slate-700 text-slate-50'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='petCount' className='text-slate-200'>Number of Pets</Label>
                <Input
                  id='petCount'
                  {...form.register('petCount')}
                  className='bg-slate-800 border-slate-700 text-slate-50'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='ssn' className='text-slate-200'>Social Security Number *</Label>
              <div className='relative'>
                <Input
                  id='ssn'
                  type={showSsn ? 'text' : 'password'}
                  {...form.register('ssn')}
                  placeholder='XXX-XX-XXXX'
                  className='bg-slate-800 border-slate-700 text-slate-50 pr-10'
                />
                <button
                  type='button'
                  onClick={() => setShowSsn(!showSsn)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors'
                  tabIndex={-1}
                >
                  {showSsn ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              </div>
              {form.formState.errors.ssn && (
                <p className='text-xs text-red-400'>{form.formState.errors.ssn.message}</p>
              )}
              <p className='text-xs text-slate-400'>Your SSN is encrypted and stored securely.</p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='notes' className='text-slate-200'>Additional Notes</Label>
              <Textarea
                id='notes'
                {...form.register('notes')}
                rows={3}
                className='bg-slate-800 border-slate-700 text-slate-50'
              />
            </div>

            <Button
              type='submit'
              disabled={submitting}
              className='w-full bg-violet-600 hover:bg-violet-700'
            >
              {submitting ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin mr-2' />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
