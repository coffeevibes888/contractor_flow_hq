import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
import {
  getOrCreateContractorProfile,
  updateContractorProfile,
  uploadContractorProfilePhoto,
  uploadContractorCoverPhoto,
  uploadContractorPortfolioImages,
} from '@/lib/actions/contractor-profile.actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Palette,
  Camera,
  Image as ImageIcon,
  User,
  MapPin,
  Star,
  Link2,
  Briefcase,
  Shield,
  Eye,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { ContractorSpecialtiesSelector } from '@/components/contractor/specialties-selector';
import { ContractorServiceAreasInput } from '@/components/contractor/service-areas-input';
import { PortfolioGallery } from '@/components/contractor/portfolio-gallery';

export const metadata: Metadata = {
  title: 'Branding & Profile | Contractor Dashboard',
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default async function ContractorBrandingPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return redirect('/sign-in');
    }

    if (session.user.role !== 'contractor') {
      return redirect('/');
    }

    const resolvedSearchParams = (await searchParams) || {};
    const errorMessage = resolvedSearchParams.error
      ? decodeURIComponent(resolvedSearchParams.error)
      : null;
    const successMessage = resolvedSearchParams.success
      ? decodeURIComponent(resolvedSearchParams.success)
      : null;

    let profileResult: Awaited<ReturnType<typeof getOrCreateContractorProfile>>;
    try {
      profileResult = await getOrCreateContractorProfile();
    } catch (profileError: unknown) {
      console.error('Error loading contractor profile:', profileError);
      profileResult = {
        success: false,
        message: getErrorMessage(profileError, 'Failed to load profile'),
      };
    }

    if (!profileResult.success || !profileResult.profile) {
      // Show a helpful error page instead of redirecting
      return (
        <main className='w-full px-4 py-8 md:px-0'>
          <div className='max-w-2xl mx-auto'>
            <Card className='bg-amber-500/10 border-amber-400/30'>
              <CardContent className='p-6 text-center'>
                <h1 className='text-2xl font-bold text-gray-900 mb-4'>
                  Profile Setup Required
                </h1>
                <p className='text-slate-300 mb-4'>
                  {profileResult.message ||
                    'Unable to load your contractor profile. This feature may require a database migration.'}
                </p>
                <p className='text-sm text-slate-400 mb-4'>
                  If you&apos;re a developer, run:{' '}
                  <code className='bg-slate-800 px-2 py-1 rounded'>
                    npx prisma migrate dev
                  </code>
                </p>
                <Link href='/contractor-dashboard'>
                  <Button className='mt-4'>Back to Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      );
    }

    const profile = profileResult.profile;
    const baseUrl =
      process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.propertyflowhq.com';
    const publicProfileUrl = `${baseUrl}/${profile.slug}`;
    const sectionClass =
      'rounded-xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm';
    const iconClass =
      'h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center';
    const inputClass =
      'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400';
    const helpTextClass = 'text-sm text-gray-500';

    const handleProfileUpdate = async (formData: FormData) => {
      'use server';
      const result = await updateContractorProfile(formData);
      if (!result.success) {
        redirect(
          `/contractor-dashboard/profile/branding?error=${encodeURIComponent(result.message || 'Failed to update')}`
        );
      }
      redirect(
        '/contractor-dashboard/profile/branding?success=Profile%20updated'
      );
    };

    const handleProfilePhotoUpload = async (formData: FormData) => {
      'use server';
      const result = await uploadContractorProfilePhoto(formData);
      if (!result.success) {
        redirect(
          `/contractor-dashboard/profile/branding?error=${encodeURIComponent(result.message || 'Failed to upload')}`
        );
      }
      redirect(
        '/contractor-dashboard/profile/branding?success=Photo%20updated'
      );
    };

    const handleCoverPhotoUpload = async (formData: FormData) => {
      'use server';
      const result = await uploadContractorCoverPhoto(formData);
      if (!result.success) {
        redirect(
          `/contractor-dashboard/profile/branding?error=${encodeURIComponent(result.message || 'Failed to upload')}`
        );
      }
      redirect(
        '/contractor-dashboard/profile/branding?success=Cover%20photo%20updated'
      );
    };

    const handlePortfolioUpload = async (formData: FormData) => {
      'use server';
      const result = await uploadContractorPortfolioImages(formData);
      if (!result.success) {
        redirect(
          `/contractor-dashboard/profile/branding?error=${encodeURIComponent(result.message || 'Failed to upload')}`
        );
      }
      redirect(
        '/contractor-dashboard/profile/branding?success=Portfolio%20images%20added'
      );
    };

    return (
      <main className='w-full px-4 py-8 md:px-0'>
        <div className='max-w-6xl mx-auto space-y-8'>
          {(errorMessage || successMessage) && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                errorMessage
                  ? 'border-red-500/30 bg-red-500/10 text-red-200'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
              }`}
            >
              {errorMessage || successMessage}
            </div>
          )}

          <div>
            <h1 className='text-3xl md:text-4xl font-bold text-gray-900 mb-2'>
              Branding & Profile
            </h1>
            <p className='text-sm text-gray-500'>
              Customize your public marketplace profile to attract more clients.
            </p>
          </div>

          {/* Public Profile Link - Featured Section */}
          <section className='rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-4 shadow-sm relative overflow-hidden'>
            <div className='absolute top-0 right-0 bg-amber-400 text-amber-950 text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1'>
              <Star className='h-3 w-3' />
              YOUR PUBLIC PROFILE
            </div>

            <div className='flex items-start gap-4'>
              <div className='h-12 w-12 rounded-xl bg-white text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-blue-200'>
                <Link2 className='h-6 w-6' />
              </div>
              <div className='flex-1 space-y-1'>
                <h2 className='text-xl font-bold text-gray-900'>
                  Your Marketplace Profile
                </h2>
                <p className='text-sm text-gray-600'>
                  This is your public profile where clients can view your work,
                  read reviews, and request quotes. Share this link to get more
                  business!
                </p>
              </div>
            </div>

            <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3'>
              <div className='flex-1 bg-white rounded-lg px-4 py-3 border border-blue-200'>
                <p className='text-gray-900 font-mono text-sm truncate'>
                  {publicProfileUrl}
                </p>
              </div>
              <div className='flex gap-2'>
                <Link
                  href={`/${profile.slug}`}
                  target='_blank'
                  className='inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-violet-600 hover:bg-violet-50 transition-colors'
                >
                  <Eye className='h-4 w-4' />
                  Preview
                </Link>
                <Button
                  variant='outline'
                  className='border-blue-200 text-gray-700 hover:bg-white'
                >
                  <ExternalLink className='h-4 w-4 mr-2' />
                  Copy Link
                </Button>
              </div>
            </div>

            {!profile.isPublic && (
              <div className='rounded-lg bg-amber-100 border border-amber-400/40 p-3'>
                <p className='text-sm text-amber-800 font-medium'>
                  ⚠️ Your profile is currently hidden. Enable public visibility
                  below to appear in the marketplace.
                </p>
              </div>
            )}
          </section>

          {/* Marketplace Visibility Status */}
          <section className={sectionClass}>
            <div className='flex items-start gap-4'>
              <div className={iconClass}>
                <Eye className='h-5 w-5' />
              </div>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  Marketplace Visibility
                </h2>
                <p className={helpTextClass}>
                  Control whether your profile appears in the contractor
                  marketplace.
                </p>
              </div>
            </div>

            <div
              className={`rounded-lg p-4 ${profile.isPublic && profile.acceptingNewWork ? 'bg-emerald-100 border border-emerald-400/30' : 'bg-amber-100 border border-amber-400/30'}`}
            >
              <div className='flex items-center gap-3 mb-3'>
                <div
                  className={`h-3 w-3 rounded-full ${profile.isPublic && profile.acceptingNewWork ? 'bg-emerald-400' : 'bg-amber-400'}`}
                />
                <span
                  className={`font-semibold ${profile.isPublic && profile.acceptingNewWork ? 'text-emerald-800' : 'text-amber-800'}`}
                >
                  {profile.isPublic && profile.acceptingNewWork
                    ? 'Visible in Marketplace'
                    : 'Hidden from Marketplace'}
                </span>
              </div>
              <div className='space-y-2 text-sm'>
                <div className='flex items-center gap-2'>
                  <span
                    className={
                      profile.isPublic ? 'text-emerald-600' : 'text-red-600'
                    }
                  >
                    {profile.isPublic ? '✓' : '✗'}
                  </span>
                  <span className='text-gray-700'>
                    Public Profile: {profile.isPublic ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <span
                    className={
                      profile.acceptingNewWork
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }
                  >
                    {profile.acceptingNewWork ? '✓' : '✗'}
                  </span>
                  <span className='text-gray-700'>
                    Accepting New Work:{' '}
                    {profile.acceptingNewWork ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              {(!profile.isPublic || !profile.acceptingNewWork) && (
                <p className='text-amber-800 text-sm mt-3'>
                  Both &quot;Public Profile&quot; and &quot;Accepting New
                  Work&quot; must be enabled for your profile to appear in the
                  marketplace.
                </p>
              )}
            </div>

            <form action={handleProfileUpdate} className='flex flex-wrap gap-4'>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input type='hidden' name='isPublic' value='false' />
                <input
                  type='checkbox'
                  name='isPublic'
                  value='true'
                  defaultChecked={profile.isPublic}
                  className='h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                />
                <span className='text-gray-900'>Public Profile</span>
              </label>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input type='hidden' name='acceptingNewWork' value='false' />
                <input
                  type='checkbox'
                  name='acceptingNewWork'
                  value='true'
                  defaultChecked={profile.acceptingNewWork}
                  className='h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                />
                <span className='text-gray-900'>Accepting New Work</span>
              </label>
              <Button
                type='submit'
                className='bg-blue-600 hover:bg-blue-700 text-white'
              >
                Update Visibility
              </Button>
            </form>
          </section>

          {/* Profile Photo Section */}
          <section className={sectionClass}>
            <div className='flex items-start gap-4'>
              <div className={iconClass}>
                <Camera className='h-5 w-5' />
              </div>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  Profile Photo{' '}
                  <span className='text-xs font-normal bg-white/20 text-gray-900 px-2 py-0.5 rounded-full ml-1'>
                    Small circle on card
                  </span>
                </h2>
                <p className='text-sm text-gray-500'>
                  Your face or owner photo — shows as the small circle on your
                  marketplace card and at the top of your profile page.
                </p>
              </div>
            </div>

            <div className='flex items-center gap-6'>
              <div className='relative h-24 w-24 rounded-full border-4 border-white overflow-hidden bg-gray-100 shadow-sm'>
                {profile.profilePhoto ? (
                  <img
                    src={profile.profilePhoto}
                    alt='Profile'
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <div className='h-full w-full flex items-center justify-center'>
                    <User className='h-10 w-10 text-slate-400' />
                  </div>
                )}
              </div>
              <form
                action={handleProfilePhotoUpload}
                className='flex-1 space-y-3'
              >
                <input
                  type='file'
                  name='profilePhoto'
                  accept='image/jpeg,image/png,image/webp'
                  className='block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
                  required
                />
                <Button
                  type='submit'
                  className='bg-blue-600 hover:bg-blue-700 text-white'
                >
                  Upload Photo
                </Button>
              </form>
            </div>
          </section>

          {/* Cover Photo Section */}
          <section className={sectionClass}>
            <div className='flex items-start gap-4'>
              <div className={iconClass}>
                <ImageIcon className='h-5 w-5' />
              </div>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  Cover Photo / Banner Ad{' '}
                  <span className='text-xs font-normal bg-white/20 text-gray-900 px-2 py-0.5 rounded-full ml-1'>
                    Big image on card
                  </span>
                </h2>
                <p className='text-sm text-gray-500'>
                  The large background image on your marketplace card — use your
                  logo, a flyer, or an ad. Also appears as the banner at the top
                  of your profile page. Recommended: 1200×630px.
                </p>
              </div>
            </div>

            <div className='space-y-4'>
              <div className='relative h-40 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden bg-gray-100'>
                {profile.coverPhoto ? (
                  <img
                    src={profile.coverPhoto}
                    alt='Cover'
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <div className='h-full w-full flex items-center justify-center'>
                    <p className='text-slate-400 text-sm'>No cover photo</p>
                  </div>
                )}
              </div>
              <form
                action={handleCoverPhotoUpload}
                className='flex items-center gap-3'
              >
                <input
                  type='file'
                  name='coverPhoto'
                  accept='image/jpeg,image/png,image/webp'
                  className='block flex-1 text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
                  required
                />
                <Button
                  type='submit'
                  className='bg-blue-600 hover:bg-blue-700 text-white'
                >
                  Upload Cover
                </Button>
              </form>
            </div>
          </section>

          {/* Business Info Section */}
          <section className={sectionClass}>
            <div className='flex items-start gap-4'>
              <div className={iconClass}>
                <Briefcase className='h-5 w-5' />
              </div>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  Business Information
                </h2>
                <p className='text-sm text-gray-500'>
                  Tell clients about your business and services.
                </p>
              </div>
            </div>

            <form
              action={handleProfileUpdate}
              className='grid gap-4 md:grid-cols-2'
            >
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  Business Name
                </label>
                <Input
                  name='businessName'
                  defaultValue={profile.businessName}
                  className={inputClass}
                  placeholder='Your Business Name'
                  required
                />
              </div>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  Display Name
                </label>
                <Input
                  name='displayName'
                  defaultValue={profile.displayName}
                  className={inputClass}
                  placeholder='How you want to be called'
                  required
                />
              </div>
              <div className='space-y-2 md:col-span-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  Tagline
                </label>
                <Input
                  name='tagline'
                  defaultValue={profile.tagline || ''}
                  className={inputClass}
                  placeholder='Licensed Plumber - 15 Years Experience'
                  maxLength={200}
                />
              </div>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  Email
                </label>
                <Input
                  name='email'
                  type='email'
                  defaultValue={profile.email}
                  className={inputClass}
                  required
                />
              </div>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  Phone
                </label>
                <Input
                  name='phone'
                  defaultValue={profile.phone || ''}
                  className={inputClass}
                  placeholder='(555) 123-4567'
                />
              </div>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  Website
                </label>
                <Input
                  name='website'
                  defaultValue={profile.website || ''}
                  className={inputClass}
                  placeholder='https://yourwebsite.com'
                />
              </div>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  Years of Experience
                </label>
                <Input
                  name='yearsExperience'
                  type='number'
                  defaultValue={profile.yearsExperience || ''}
                  className={inputClass}
                  min={0}
                  max={100}
                />
              </div>
              <div className='space-y-2 md:col-span-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  Bio
                </label>
                <Textarea
                  name='bio'
                  defaultValue={profile.bio || ''}
                  className={`${inputClass} min-h-[120px]`}
                  placeholder='Tell clients about your experience, specialties, and what makes you different...'
                  maxLength={2000}
                />
              </div>
              <div className='md:col-span-2'>
                <Button
                  type='submit'
                  className='bg-blue-600 hover:bg-blue-700 text-white'
                >
                  Save Business Info
                </Button>
              </div>
            </form>
          </section>

          {/* Location & Service Area */}
          <section className={sectionClass}>
            <div className='flex items-start gap-4'>
              <div className={iconClass}>
                <MapPin className='h-5 w-5' />
              </div>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  Location & Service Area
                </h2>
                <p className='text-sm text-gray-500'>
                  Where you&apos;re based and areas you serve.
                </p>
              </div>
            </div>

            <form
              action={handleProfileUpdate}
              className='grid gap-4 md:grid-cols-3'
            >
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  City
                </label>
                <Input
                  name='baseCity'
                  defaultValue={profile.baseCity || ''}
                  className={inputClass}
                  placeholder='Las Vegas'
                />
              </div>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  State
                </label>
                <Input
                  name='baseState'
                  defaultValue={profile.baseState || ''}
                  className={inputClass}
                  placeholder='NV'
                />
              </div>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  Service Radius (miles)
                </label>
                <Input
                  name='serviceRadius'
                  type='number'
                  defaultValue={profile.serviceRadius || ''}
                  className={inputClass}
                  min={0}
                  max={500}
                  placeholder='25'
                />
              </div>
              <div className='md:col-span-3'>
                <Button
                  type='submit'
                  className='bg-blue-600 hover:bg-blue-700 text-white'
                >
                  Save Location
                </Button>
              </div>
            </form>

            <div className='pt-4 border-t border-gray-200'>
              <ContractorServiceAreasInput
                currentAreas={profile.serviceAreas || []}
              />
            </div>
          </section>

          {/* Specialties */}
          <section className={sectionClass}>
            <div className='flex items-start gap-4'>
              <div className={iconClass}>
                <Palette className='h-5 w-5' />
              </div>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  Specialties
                </h2>
                <p className='text-sm text-gray-500'>
                  Select the services you offer.
                </p>
              </div>
            </div>

            <ContractorSpecialtiesSelector
              currentSpecialties={profile.specialties || []}
            />
          </section>

          {/* Credentials */}
          <section className={sectionClass}>
            <div className='flex items-start gap-4'>
              <div className={iconClass}>
                <Shield className='h-5 w-5' />
              </div>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  Credentials & Verification
                </h2>
                <p className='text-sm text-gray-500'>
                  Add your license and insurance info to build trust.
                </p>
              </div>
            </div>

            <form
              action={handleProfileUpdate}
              className='grid gap-4 md:grid-cols-2'
            >
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  License Number
                </label>
                <Input
                  name='licenseNumber'
                  defaultValue={profile.licenseNumber || ''}
                  className={inputClass}
                  placeholder='Enter your license number'
                />
              </div>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  License State
                </label>
                <Input
                  name='licenseState'
                  defaultValue={profile.licenseState || ''}
                  className={inputClass}
                  placeholder='NV'
                />
              </div>
              <div className='md:col-span-2 flex flex-wrap gap-3'>
                <div
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${profile.insuranceVerified ? 'bg-emerald-100 text-emerald-700 border border-emerald-400/30' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
                >
                  {profile.insuranceVerified
                    ? '✓ Insurance Verified'
                    : '○ Insurance Not Verified'}
                </div>
                <div
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${profile.backgroundChecked ? 'bg-emerald-100 text-emerald-700 border border-emerald-400/30' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
                >
                  {profile.backgroundChecked
                    ? '✓ Background Checked'
                    : '○ Background Not Checked'}
                </div>
                <div
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${profile.identityVerified ? 'bg-emerald-100 text-emerald-700 border border-emerald-400/30' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
                >
                  {profile.identityVerified
                    ? '✓ Identity Verified'
                    : '○ Identity Not Verified'}
                </div>
              </div>
              <div className='md:col-span-2'>
                <Button
                  type='submit'
                  className='bg-blue-600 hover:bg-blue-700 text-white'
                >
                  Save Credentials
                </Button>
              </div>
            </form>
          </section>

          {/* Portfolio Gallery */}
          <section className={sectionClass}>
            <div className='flex items-start gap-4'>
              <div className={iconClass}>
                <ImageIcon className='h-5 w-5' />
              </div>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  Portfolio Gallery
                </h2>
                <p className='text-sm text-gray-500'>
                  Showcase your best work to attract clients. Up to 12 images.
                </p>
              </div>
            </div>

            <PortfolioGallery items={profile.portfolioImages || []} />

            <form
              action={handlePortfolioUpload}
              className='flex items-center gap-3 pt-4 border-t border-gray-200'
            >
              <input
                type='file'
                name='portfolioImages'
                accept='image/jpeg,image/png,image/webp'
                multiple
                className='block flex-1 text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-gray-900 hover:file:bg-white/20'
                required
              />
              <Button
                type='submit'
                className='bg-blue-600 hover:bg-blue-700 text-white'
              >
                Add Images
              </Button>
            </form>
          </section>

          {/* Why Choose Me - Feature Cards */}
          <section className={sectionClass}>
            <div className='flex items-start gap-4'>
              <div className={iconClass}>
                <Star className='h-5 w-5' />
              </div>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  Why Choose Me? Cards
                </h2>
                <p className='text-sm text-gray-500'>
                  Customize the 6 feature cards that appear on your public
                  profile page. Tell clients why they should hire you!
                </p>
              </div>
            </div>

            <form action={handleProfileUpdate} className='space-y-6'>
              <div className='grid md:grid-cols-2 gap-6'>
                {/* Card 1 */}
                <div className='rounded-lg border border-gray-300 bg-gray-50 p-4 space-y-3'>
                  <p className='text-sm font-medium text-violet-700'>Card 1</p>
                  <Input
                    name='featureCard1Title'
                    defaultValue={
                      profile.featureCard1Title || 'Quality Workmanship'
                    }
                    className={inputClass}
                    placeholder='Title'
                  />
                  <Textarea
                    name='featureCard1Description'
                    defaultValue={
                      profile.featureCard1Description ||
                      'Professional results backed by years of experience.'
                    }
                    className={inputClass}
                    placeholder='Description'
                    rows={2}
                  />
                </div>
                {/* Card 2 */}
                <div className='rounded-lg border border-gray-300 bg-gray-50 p-4 space-y-3'>
                  <p className='text-sm font-medium text-violet-700'>Card 2</p>
                  <Input
                    name='featureCard2Title'
                    defaultValue={
                      profile.featureCard2Title || 'Transparent Pricing'
                    }
                    className={inputClass}
                    placeholder='Title'
                  />
                  <Textarea
                    name='featureCard2Description'
                    defaultValue={
                      profile.featureCard2Description ||
                      'Upfront quotes with no hidden fees.'
                    }
                    className={inputClass}
                    placeholder='Description'
                    rows={2}
                  />
                </div>
                {/* Card 3 */}
                <div className='rounded-lg border border-gray-300 bg-gray-50 p-4 space-y-3'>
                  <p className='text-sm font-medium text-violet-700'>Card 3</p>
                  <Input
                    name='featureCard3Title'
                    defaultValue={
                      profile.featureCard3Title || 'Licensed & Insured'
                    }
                    className={inputClass}
                    placeholder='Title'
                  />
                  <Textarea
                    name='featureCard3Description'
                    defaultValue={
                      profile.featureCard3Description ||
                      'Fully licensed and insured for your protection.'
                    }
                    className={inputClass}
                    placeholder='Description'
                    rows={2}
                  />
                </div>
                {/* Card 4 */}
                <div className='rounded-lg border border-gray-300 bg-gray-50 p-4 space-y-3'>
                  <p className='text-sm font-medium text-violet-700'>Card 4</p>
                  <Input
                    name='featureCard4Title'
                    defaultValue={
                      profile.featureCard4Title || 'On-Time Service'
                    }
                    className={inputClass}
                    placeholder='Title'
                  />
                  <Textarea
                    name='featureCard4Description'
                    defaultValue={
                      profile.featureCard4Description ||
                      'Punctual and reliable. We show up when promised.'
                    }
                    className={inputClass}
                    placeholder='Description'
                    rows={2}
                  />
                </div>
                {/* Card 5 */}
                <div className='rounded-lg border border-gray-300 bg-gray-50 p-4 space-y-3'>
                  <p className='text-sm font-medium text-violet-700'>Card 5</p>
                  <Input
                    name='featureCard5Title'
                    defaultValue={
                      profile.featureCard5Title || 'Easy Communication'
                    }
                    className={inputClass}
                    placeholder='Title'
                  />
                  <Textarea
                    name='featureCard5Description'
                    defaultValue={
                      profile.featureCard5Description ||
                      'Quick responses and clear updates throughout.'
                    }
                    className={inputClass}
                    placeholder='Description'
                    rows={2}
                  />
                </div>
                {/* Card 6 */}
                <div className='rounded-lg border border-gray-300 bg-gray-50 p-4 space-y-3'>
                  <p className='text-sm font-medium text-violet-700'>Card 6</p>
                  <Input
                    name='featureCard6Title'
                    defaultValue={
                      profile.featureCard6Title || 'Professional Service'
                    }
                    className={inputClass}
                    placeholder='Title'
                  />
                  <Textarea
                    name='featureCard6Description'
                    defaultValue={
                      profile.featureCard6Description ||
                      'Clean, courteous, and professional from start to finish.'
                    }
                    className={inputClass}
                    placeholder='Description'
                    rows={2}
                  />
                </div>
              </div>
              <Button
                type='submit'
                className='bg-blue-600 hover:bg-blue-700 text-white'
              >
                Save Feature Cards
              </Button>
            </form>
          </section>

          {/* Pricing */}
          <section className={sectionClass}>
            <div className='flex items-start gap-4'>
              <div className={iconClass}>
                <Star className='h-5 w-5' />
              </div>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  Pricing & Availability
                </h2>
                <p className='text-sm text-gray-500'>
                  Set your rates and availability status.
                </p>
              </div>
            </div>

            <form
              action={handleProfileUpdate}
              className='grid gap-4 md:grid-cols-2'
            >
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  Hourly Rate ($)
                </label>
                <Input
                  name='hourlyRate'
                  type='number'
                  defaultValue={
                    profile.hourlyRate ? Number(profile.hourlyRate) : ''
                  }
                  className={inputClass}
                  min={0}
                  step={0.01}
                  placeholder='75.00'
                />
              </div>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  Minimum Job Size ($)
                </label>
                <Input
                  name='minimumJobSize'
                  type='number'
                  defaultValue={
                    profile.minimumJobSize ? Number(profile.minimumJobSize) : ''
                  }
                  className={inputClass}
                  min={0}
                  step={0.01}
                  placeholder='100.00'
                />
              </div>
              <div className='space-y-2 md:col-span-2'>
                <label className='block text-sm font-medium text-gray-900'>
                  Availability Notes
                </label>
                <Textarea
                  name='availabilityNotes'
                  defaultValue={profile.availabilityNotes || ''}
                  className={inputClass}
                  placeholder='e.g., Available weekdays 8am-6pm, emergency calls accepted'
                  maxLength={500}
                />
              </div>
              <div className='md:col-span-2'>
                <Button
                  type='submit'
                  className='bg-blue-600 hover:bg-blue-700 text-white'
                >
                  Save Pricing
                </Button>
              </div>
            </form>
          </section>
        </div>
      </main>
    );
  } catch (error: unknown) {
    console.error('ContractorBrandingPage error:', error);
    return (
      <main className='w-full px-4 py-8 md:px-0'>
        <div className='max-w-2xl mx-auto'>
          <Card className='bg-red-500/10 border-red-400/30'>
            <CardContent className='p-6 text-center'>
              <h1 className='text-2xl font-bold text-gray-900 mb-4'>
                Something went wrong
              </h1>
              <p className='text-slate-300 mb-4'>
                {getErrorMessage(
                  error,
                  'An unexpected error occurred while loading the profile page.'
                )}
              </p>
              <Link href='/contractor-dashboard'>
                <Button className='mt-4'>Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }
}
