import { requireAdmin } from '@/lib/auth-guard';
import {
  getOrCreateCurrentLandlord,
  uploadLandlordLogo,
  updateLandlordBrandingProfile,
  uploadLandlordHeroImages,
  uploadLandlordAboutMedia,
} from '@/lib/actions/landlord.actions';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SubdomainForm from '@/components/admin/subdomain-form';
import { Palette, Sparkles, UserCircle, Link2, Star } from 'lucide-react';
import {
  DeleteLogoButton,
  DeleteHeroImageButton,
  DeleteAllHeroImagesButton,
  DeleteAboutPhotoButton,
  DeleteAboutGalleryImageButton,
  DeleteAllAboutGalleryButton,
} from '@/components/admin/branding-image-delete';

export const metadata: Metadata = {
  title: 'Branding & Domain',
};

const AdminBrandingPage = async (props: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) => {
  await requireAdmin();

  const resolvedSearchParams = (await props.searchParams) || {};
  const errorMessage = resolvedSearchParams.error ? decodeURIComponent(resolvedSearchParams.error) : null;
  const successMessage = resolvedSearchParams.success ? decodeURIComponent(resolvedSearchParams.success) : null;

  const landlordResult = await getOrCreateCurrentLandlord();

  if (!landlordResult.success) {
    redirect(`/admin?error=${encodeURIComponent(landlordResult.message || 'Unable to determine landlord')}`);
  }

  const landlord = landlordResult.landlord as typeof landlordResult.landlord & {
    companyName?: string | null;
    companyEmail?: string | null;
    companyPhone?: string | null;
    companyAddress?: string | null;
    themeColor?: string | null;
    heroImages?: string[] | null;
    aboutBio?: string | null;
    aboutPhoto?: string | null;
    aboutGallery?: string[] | null;
  };
  
  // Base URL for production (path-based routing, not subdomain)
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'https://www.propertyflowhq.com';
  let baseUrl = 'https://www.propertyflowhq.com';
  try {
    const normalizedRaw = rawBaseUrl.startsWith('http') ? rawBaseUrl : `https://${rawBaseUrl}`;
    const parsed = new URL(normalizedRaw);
    baseUrl = parsed.origin;
  } catch {
    // fallback to default
  }

  const handleLogoUpload = async (formData: FormData) => {
    'use server';
    const result = await uploadLandlordLogo(formData);
    if (!result.success) {
      redirect(`/admin/branding?error=${encodeURIComponent(result.message || 'Failed to upload logo')}`);
    }
    redirect('/admin/branding?success=Logo%20updated');
  };

  const handleHeroImagesUpload = async (formData: FormData) => {
    'use server';
    const result = await uploadLandlordHeroImages(formData);
    if (!result.success) {
      redirect(`/admin/branding?error=${encodeURIComponent(result.message || 'Failed to upload hero images')}`);
    }
    redirect('/admin/branding?success=Hero%20images%20updated');
  };

  const handleAboutMediaUpload = async (formData: FormData) => {
    'use server';
    const result = await uploadLandlordAboutMedia(formData);
    if (!result.success) {
      redirect(`/admin/branding?error=${encodeURIComponent(result.message || 'Failed to upload about media')}`);
    }
    redirect('/admin/branding?success=About%20media%20updated');
  };

  const handleBrandingProfileUpdate = async (formData: FormData) => {
    'use server';
    const result = await updateLandlordBrandingProfile(formData);
    if (!result.success) {
      redirect(`/admin/branding?error=${encodeURIComponent(result.message || 'Failed to update branding profile')}`);
    }
    redirect('/admin/branding?success=Profile%20updated');
  };

  return (
    <main className='w-full px-4 py-8 md:px-0'>
      <div className='max-w-6xl mx-auto space-y-8'>
        {(errorMessage || successMessage) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              errorMessage
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {errorMessage || successMessage}
          </div>
        )}
        <div>
          <h1 className='text-3xl md:text-4xl font-bold font-large text-black mb-2'>Branding & Domain</h1>
          <p className='text-sm text-black font-bold'>
            Everything here appears on your <strong>public property listing page</strong> — the page tenants see when they view your property, apply, or schedule a showing.
          </p>
          {landlord.subdomain && (
            <p className='text-xs text-gray-600 mt-1'>
              Preview your live page: <a href={`${baseUrl}/${landlord.subdomain}`} target='_blank' rel='noopener noreferrer' className='text-blue-600 underline'>{baseUrl}/{landlord.subdomain}</a>
            </p>
          )}
        </div>

        {/* YOUR TENANT PORTAL - Featured Section at Top */}
        <section className='rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 border-2 border-violet-400/50 p-6 space-y-4 backdrop-blur-sm shadow-2xl drop-shadow-2xl relative overflow-hidden'>
          {/* Featured badge */}
          <div className='absolute top-0 right-0 bg-amber-500 text-amber-950 text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1'>
            <Star className='h-3 w-3' />
            KEY FEATURE
          </div>
          
          <div className='flex items-start gap-4'>
            <div className='h-12 w-12 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0 ring-2 ring-white/20'>
              <Link2 className='h-6 w-6' />
            </div>
            <div className='flex-1 space-y-1'>
              <h2 className='text-xl font-bold text-white'>Your Tenant Portal</h2>
              <p className='text-sm text-violet-100'>
                This is your branded website where tenants can browse your listings, submit applications, sign leases, and pay rent online. Share this link everywhere!
              </p>
            </div>
          </div>

          <SubdomainForm currentSubdomain={landlord.subdomain} baseUrl={baseUrl} />
          
          {!landlord.subdomain && (
            <div className='rounded-lg bg-amber-500/20 border border-amber-400/40 p-3'>
              <p className='text-sm text-amber-100 font-medium'>
                ⚡ Set up your portal URL to start accepting online applications and rent payments!
              </p>
            </div>
          )}
        </section>

        {/* Logo Section */}
        <section data-tour="logo-upload" className='rounded-xl bg-gradient-to-r from-sky-500 via-cyan-200 to-sky-500 border-2 border-black p-4 space-y-4 hover:border-slate-700 transition-colors shadow-2xl drop-shadow-2xl'>
          <div className='flex-1 space-y-4'>
            <div className='space-y-1'>
              <h2 className='text-lg font-semibold text-black'>Company Logo</h2>
              <p className='text-sm text-black'>
                Your logo appears on your tenant portal, emails, and documents.
              </p>
            </div>

            {/* Current Logo Preview */}
            <div className='flex items-center gap-4 p-4 rounded-lg bg-white/50 border-2 border-black'>
              <div className='relative h-20 w-20 rounded-lg border-2 border-dashed border-slate-300 overflow-hidden bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#e2e8f0_0%_50%)] bg-[length:16px_16px] flex items-center justify-center'>
                {landlord.logoUrl ? (
                  <img
                    src={landlord.logoUrl}
                    alt={`${landlord.name} logo`}
                    className='h-full w-full object-contain'
                  />
                ) : (
                  <span className='text-xs text-slate-500 text-center px-2'>No logo</span>
                )}
              </div>
              <div className='flex-1'>
                <p className='font-medium text-black text-sm'>Current logo</p>
                <p className='text-xs text-black'>
                  {landlord.logoUrl ? 'Displayed on your tenant portal' : 'Upload a logo to brand your portal'}
                </p>
                {landlord.logoUrl && (
                  <div className='mt-2'>
                    <DeleteLogoButton />
                  </div>
                )}
              </div>
            </div>

            {/* Requirements Box */}
            <div className='rounded-lg bg-amber-50 border-2 border-amber-600 p-4 space-y-2'>
              <p className='text-sm font-semibold text-amber-900'>📋 Logo Requirements</p>
              <ul className='text-xs text-amber-800 space-y-1.5'>
                <li className='flex items-start gap-2'>
                  <span className='text-amber-600'>✓</span>
                  <span><strong>Transparent background</strong> — PNG or SVG format works best</span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-amber-600'>✓</span>
                  <span><strong>Recommended size:</strong> 400×400 pixels (square) or 600×200 pixels (wide)</span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-amber-600'>✓</span>
                  <span><strong>Max file size:</strong> 5MB</span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-slate-600'>💡</span>
                  <span>Tip: A transparent PNG ensures your logo looks great on any background color</span>
                </li>
              </ul>
            </div>

            <form action={handleLogoUpload} className='space-y-3'>
              <div>
                <label className='block text-sm font-medium text-black mb-2'>Upload New Logo</label>
                <input
                  type='file'
                  name='logo'
                  accept='image/png,image/svg+xml,image/webp'
                  className='block w-full text-sm text-black file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/50 file:text-black file:ring-1 file:ring-slate-200 hover:file:bg-white/80 file:cursor-pointer cursor-pointer'
                  required
                />
                <p className='text-xs text-black mt-1'>Accepts PNG, SVG, or WebP (transparent background recommended)</p>
              </div>
              <div className='flex flex-wrap items-center gap-3'>
                <button
                  type='submit'
                  className='inline-flex items-center justify-center rounded-full bg-violet-500 px-5 py-2 text-sm font-medium text-white hover:bg-violet-400 transition-colors'
                >
                  Upload logo
                </button>
              </div>
            </form>

            {/* Custom Logo Design Upsell */}
            <div className='rounded-lg bg-emerald-50 border-2 border-emerald-600 p-4 space-y-2'>
              <p className='text-sm font-semibold text-emerald-900'>🎨 Need a professional logo?</p>
              <p className='text-xs text-emerald-800'>
                We'll design a custom logo for your brand with transparent background, multiple sizes, and 1 revision included. Delivered within 3 business days.
              </p>
              <button
                type='button'
                className='inline-flex items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-200 transition-colors'
              >
                Request custom logo design — $99
              </button>
            </div>
          </div>
        </section>

        {/* Company Profile Section */}
        <section className='rounded-xl bg-gradient-to-r from-sky-500 via-cyan-200 to-sky-500 border-2 border-black p-4 space-y-2 hover:border-slate-700 transition-colors shadow-2xl drop-shadow-2xl'>
          <div className='h-9 w-9 rounded-lg bg-white/20 text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-slate-200'>
            <Palette className='h-4 w-4' />
          </div>
          <div className='flex-1 space-y-4'>
            <div className='space-y-1'>
              <h2 className='text-sm font-semibold text-black'>Company profile</h2>
              <p className='text-xs text-black'>
                This profile powers your tenant portal brand (APP_NAME) and hero content. Use your management company info, not the owner.
              </p>
            </div>
            <form action={handleBrandingProfileUpdate} className='grid gap-4 md:grid-cols-2 text-sm'>
              <div className='space-y-2'>
                <label className='block text-xs font-medium text-black font-bold'>Management company name</label>
                <input
                  name='companyName'
                  defaultValue={landlord.companyName || ''}
                  className='w-full rounded-md border-2 border-black bg-white px-3 py-2 text-black placeholder:text-slate-500 focus:border-violet-600 focus:ring-2 focus:ring-violet-400'
                  placeholder='Acme Property Management LLC'
                  required
                />
              </div>
              <div className='space-y-2'>
                <label className='block text-xs font-medium text-black font-bold'>Primary contact email</label>
                <input
                  name='companyEmail'
                  defaultValue={landlord.companyEmail || ''}
                  className='w-full rounded-md border-2 border-black bg-white px-3 py-2 text-black placeholder:text-slate-500 focus:border-violet-600 focus:ring-2 focus:ring-violet-400'
                  placeholder='leasing@company.com'
                  type='email'
                />
              </div>
              <div className='space-y-2'>
                <label className='block text-xs font-medium text-black font-bold'>Office phone</label>
                <input
                  name='companyPhone'
                  defaultValue={landlord.companyPhone || ''}
                  className='w-full rounded-md border-2 border-black bg-white px-3 py-2 text-black placeholder:text-slate-500 focus:border-violet-600 focus:ring-2 focus:ring-violet-400'
                  placeholder='(555) 123-4567'
                />
              </div>
              <div className='space-y-2 md:col-span-2'>
                <label className='block text-xs font-medium text-black font-bold'>Office address</label>
                <input
                  name='companyAddress'
                  defaultValue={landlord.companyAddress || ''}
                  className='w-full rounded-md border-2 border-black bg-white px-3 py-2 text-black placeholder:text-slate-500 focus:border-violet-600 focus:ring-2 focus:ring-violet-400'
                  placeholder='Street, city, state, ZIP'
                />
              </div>
              <div className='md:col-span-2 flex flex-wrap gap-3'>
                <button
                  type='submit'
                  className='inline-flex items-center justify-center rounded-full bg-violet-500 px-5 py-2 text-sm font-medium text-white hover:bg-violet-400 transition-colors'
                >
                  Save profile
                </button>
                <p className='text-xs text-black'>
                  Used across your tenant portal headers, hero, and metadata.
                </p>
              </div>
            </form>
          </div>
        </section>

        {/* Hero Media Section */}
        <section className='rounded-xl bg-gradient-to-r from-sky-500 via-cyan-200 to-sky-500 border-2 border-black p-4 space-y-2 hover:border-slate-700 transition-colors shadow-2xl drop-shadow-2xl'>
          <div className='h-9 w-9 rounded-lg bg-white/20 text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-slate-200'>
            <Sparkles className='h-4 w-4' />
          </div>
          <div className='flex-1 space-y-4'>
            <div className='space-y-1'>
              <h2 className='text-sm font-semibold text-black'>Hero images</h2>
              <p className='text-xs text-black'>
                Upload up to 3 hero images for your public portal hero section. JPG, PNG, SVG, or WebP up to 5MB each.
              </p>
            </div>

            {landlord.heroImages?.length ? (
              <div className='space-y-3'>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                  {landlord.heroImages.map((src, idx) => (
                    <div key={idx} className='relative h-32 rounded-lg border border-slate-200 overflow-hidden bg-white/50 group'>
                      <img src={src} alt={`Hero ${idx + 1}`} className='h-full w-full object-cover' />
                      <DeleteHeroImageButton imageUrl={src} />
                    </div>
                  ))}
                </div>
                <DeleteAllHeroImagesButton />
              </div>
            ) : (
              <p className='text-xs text-slate-500'>No hero images yet.</p>
            )}

            <form action={handleHeroImagesUpload} className='space-y-3'>
              <div>
                <label className='block text-sm font-medium text-black mb-2'>Upload hero images</label>
                <input
                  type='file'
                  name='heroImages'
                  accept='image/jpeg,image/png,image/svg+xml,image/webp'
                  multiple
                  className='block w-full text-sm text-black file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/50 file:text-black file:ring-1 file:ring-slate-200 hover:file:bg-white/80'
                  required
                />
                <p className='text-[11px] text-slate-500 mt-1'>Max 3 images. Larger uploads will be ignored.</p>
              </div>
              <button
                type='submit'
                className='inline-flex items-center justify-center rounded-full bg-violet-500 px-5 py-2 text-sm font-medium text-white hover:bg-violet-400 transition-colors'
              >
                Save hero images
              </button>
            </form>
          </div>
        </section>

        {/* About Me Section */}
        <section className='rounded-xl bg-gradient-to-r from-sky-500 via-cyan-200 to-sky-500 border-2 border-black p-4 space-y-2 hover:border-slate-700 transition-colors shadow-2xl drop-shadow-2xl'>
          <div className='h-9 w-9 rounded-lg bg-white/20 text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-slate-200'>
            <UserCircle className='h-4 w-4' />
          </div>
          <div className='flex-1 space-y-4'>
            <div className='space-y-1'>
              <h2 className='text-sm font-semibold text-black'>About me / team</h2>
              <p className='text-xs text-black'>
                This appears on your public property listing page in the &quot;About&quot; section. Tenants see your headshot, bio, and gallery when viewing your property. It helps build trust before they apply.
              </p>
            </div>

            <form action={handleBrandingProfileUpdate} className='space-y-3 text-sm'>
              <div className='space-y-2'>
                <label className='block text-xs font-medium text-black font-bold'>About bio</label>
                <textarea
                  name='aboutBio'
                  defaultValue={landlord.aboutBio || ''}
                  className='w-full rounded-md border-2 border-black bg-white px-3 py-2 text-black placeholder:text-slate-500 focus:border-violet-600 focus:ring-2 focus:ring-violet-400'
                  rows={4}
                  placeholder='Share your story, specialties, and what tenants can expect.'
                />
              </div>
              <button
                type='submit'
                className='inline-flex items-center justify-center rounded-full bg-violet-500 px-5 py-2 text-sm font-medium text-white hover:bg-violet-400 transition-colors'
              >
                Save bio
              </button>
            </form>

            <div className='space-y-3'>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                <div className='rounded-lg border-2 border-black bg-white/50 p-3'>
                  <p className='text-xs text-black font-bold mb-2'>Primary photo</p>
                  <div className='relative h-32 rounded-md overflow-hidden border-2 border-black bg-slate-50'>
                    {landlord.aboutPhoto ? (
                      <>
                        <img src={landlord.aboutPhoto} alt='About photo' className='h-full w-full object-cover' />
                        <DeleteAboutPhotoButton />
                      </>
                    ) : (
                      <div className='h-full w-full flex items-center justify-center text-slate-500 text-xs'>No photo</div>
                    )}
                  </div>
                </div>
                <div className='sm:col-span-2 rounded-lg border-2 border-black bg-white/50 p-3'>
                  <p className='text-xs text-black font-bold mb-2'>Gallery</p>
                  {landlord.aboutGallery?.length ? (
                    <div className='space-y-3'>
                      <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                        {landlord.aboutGallery.map((src, idx) => (
                          <div key={idx} className='relative h-24 rounded-md overflow-hidden border border-slate-200 bg-slate-50 group'>
                            <img src={src} alt={`Gallery ${idx + 1}`} className='h-full w-full object-cover' />
                            <DeleteAboutGalleryImageButton imageUrl={src} />
                          </div>
                        ))}
                      </div>
                      <DeleteAllAboutGalleryButton />
                    </div>
                  ) : (
                    <p className='text-xs text-slate-500'>No gallery images yet.</p>
                  )}
                </div>
              </div>

              <form action={handleAboutMediaUpload} className='space-y-3'>
                <div className='grid gap-3 md:grid-cols-2 text-sm'>
                  <div>
                    <label className='block text-sm font-medium text-black mb-2'>Upload primary photo</label>
                    <input
                      type='file'
                      name='aboutPhoto'
                      accept='image/jpeg,image/png,image/svg+xml,image/webp'
                      className='block w-full text-sm text-black file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/50 file:text-black file:ring-1 file:ring-slate-200 hover:file:bg-white/80'
                    />
                    <p className='text-[11px] text-slate-500 mt-1'>Optional. Replaces existing headshot.</p>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-black mb-2'>Upload gallery images</label>
                    <input
                      type='file'
                      name='aboutGallery'
                      accept='image/jpeg,image/png,image/svg+xml,image/webp'
                      multiple
                      className='block w-full text-sm text-black file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/50 file:text-black file:ring-1 file:ring-slate-200 hover:file:bg-white/80'
                    />
                    <p className='text-[11px] text-slate-500 mt-1'>Up to 6 images. Larger uploads will be ignored.</p>
                  </div>
                </div>
                <button
                  type='submit'
                  className='inline-flex items-center justify-center rounded-full bg-violet-500 px-5 py-2 text-sm font-medium text-white hover:bg-violet-400 transition-colors'
                >
                  Save about media
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default AdminBrandingPage;
