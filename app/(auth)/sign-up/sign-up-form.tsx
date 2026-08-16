'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUpDefaultValues } from '@/lib/constants';
import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { signUpUser } from '@/lib/actions/user.actions';
import { useSearchParams, usePathname } from 'next/navigation';
import OAuthButtons from '@/components/auth/oauth-buttons';
import { Building2 } from 'lucide-react';

// Decode the lease context blob passed from the free lease builder sign-up CTA.
function decodeLeaseContext(raw: string | null): {
  landlordName: string;
  landlordEmail: string;
  propertyAddress: string;
  state: string;
  tenantName: string;
  tenantEmail: string;
  monthlyRent: string;
} | null {
  if (!raw) return null;
  try {
    return JSON.parse(atob(raw));
  } catch {
    return null;
  }
}

// Reserved top-level routes that are NOT landlord subdomains. Kept in sync with
// `middleware.ts` so that `/sign-up` at the root domain resolves subdomain=""
// rather than thinking "sign-up" is a landlord slug.
const RESERVED_ROUTES = new Set([
  'admin', 'user', 'super-admin', 'onboarding', 'sign-in', 'sign-up',
  'verify-email', 'forgot-password', 'reset-password', 'unauthorized',
  'about', 'blog', 'contact', 'cart', 'checkout', 'products', 'product',
  'search', 'order', 'shipping-address', 'place-order', 'payment-method',
  'verify-payment-method', 'application', 'chat', 'agent', 'contractor',
  'employee', 'team', 'listings', 'marketplace', 'contractors', 'homeowner',
  'dispute-center', 'faq', 'docs',
]);

const SignUpForm = () => {
  const [data, action] = useActionState(signUpUser, {
    success: false,
    message: '',
  });

  const searchParams = useSearchParams();
  const pathname = usePathname();

  // ── Lease-builder context (from free lease builder sign-up CTA) ──────────
  const rawLc = searchParams.get('lc') || (() => {
    try { return sessionStorage.getItem('pf_lc') || ''; } catch { return ''; }
  })();
  const leaseCtx = decodeLeaseContext(rawLc);
  const fromLease = !!leaseCtx;

  // Ensure pf_lc stays in sessionStorage for the verify-email page to pick
  // up when the user clicks their verification link (which doesn't carry
  // the lc= param). Re-stash on mount so it survives the email-verification
  // redirect even if the original sessionStorage write happened on a
  // different tab load.
  useEffect(() => {
    if (rawLc) {
      try { sessionStorage.setItem('pf_lc', rawLc); } catch { /* incognito / SSR */ }
    }
  }, [rawLc]);

  const callbackUrl = searchParams.get('callbackUrl') || '/admin/overview';

  // Derive subdomain from pathname when the sign-up page is mounted under
  // /[subdomain]/sign-up. Empty string means "root domain".
  const firstSegment = pathname?.split('/').filter(Boolean)[0] || '';
  const subdomain = firstSegment && !RESERVED_ROUTES.has(firstSegment) ? firstSegment : '';
  const subdomainPrefix = subdomain ? `/${subdomain}` : '';

  // Check if user is coming from a property application
  const fromProperty = searchParams.get('fromProperty') === 'true';
  const propertySlug = searchParams.get('propertySlug') || '';
  const applicationCallback = `${subdomainPrefix}/application?property=${encodeURIComponent(propertySlug)}`;

  // Invite code — passed by QR / email invite links so the tenant is
  // automatically linked to the landlord after sign-up
  const inviteCode = searchParams.get('inviteCode') || '';
  
  // Check if user is coming from pricing page (skip onboarding flow)
  const plan = searchParams.get('plan') || '';
  const role = searchParams.get('role') || '';
  const skipOnboarding = searchParams.get('skipOnboarding') === 'true';

  // If the user is coming from a pricing/ad flow with an *explicit* role
  // AND plan, build a subscription URL directly and skip the generic
  // onboarding role picker. We deliberately do NOT trigger this path when
  // role is missing — in that case the user gets routed to /onboarding
  // and picks their own role, which is the safe default.
  const pricingCallback =
    role && plan
      ? (role === 'contractor'
          ? `/onboarding/contractor/subscription?plan=${plan}${skipOnboarding ? '&skipOnboarding=true' : ''}`
          : role === 'landlord' || role === 'property_manager'
            ? `/onboarding/landlord/subscription?plan=${plan}${skipOnboarding ? '&skipOnboarding=true' : ''}`
            : null)
      : null;
  
  const SignUpButton = () => {
    const { pending } = useFormStatus();

    return (
      <Button type='submit' disabled={pending} className='w-full' variant='default'>
        {pending ? 'Creating account...' : 'Create Account'}
      </Button>
    );
  };

  return (
    <div className='space-y-4'>
      {/* ── Lease-builder context banner ── */}
      {fromLease && leaseCtx && (
        <div className='rounded-lg bg-sky-500/10 border border-sky-400/30 p-4 mb-2'>
          <div className='flex items-start gap-2.5'>
            <Building2 className='h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-sm font-semibold text-white leading-tight'>
                Your lease for {leaseCtx.propertyAddress || 'your property'} is saved.
              </p>
              <p className='text-xs text-sky-200 mt-0.5'>
                Create your account and we&apos;ll set up your property automatically — no re-entry needed.
                {leaseCtx.tenantName ? ` We'll also prep an invite for ${leaseCtx.tenantName}.` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Show context message if coming from property application */}
      {fromProperty && (
        <div className='rounded-lg bg-violet-500/10 border border-violet-400/30 p-4 mb-4'>
          <p className='text-sm text-violet-100'>
            <strong className='text-white'>Almost there!</strong> Create an account to complete your rental application.
          </p>
        </div>
      )}

      {/* Show context message if coming from pricing page */}
      {role && plan && (
        <div className='rounded-lg bg-violet-500/10 border border-violet-400/30 p-4 mb-4'>
          <p className='text-sm text-violet-100'>
            <strong className='text-white'>Great choice!</strong> Create your account to review your plan selection.
          </p>
        </div>
      )}
      
      <OAuthButtons callbackUrl={
        fromProperty 
          ? applicationCallback
          : pricingCallback || callbackUrl
      } />
      
      <form action={action}>
        <input type='hidden' name='callbackUrl' value={
          fromProperty
            ? applicationCallback
            : pricingCallback || callbackUrl
        } />
        {/* Pass lease context so the server action can auto-create the property */}
        {fromLease && rawLc && (
          <input type='hidden' name='lease_context' value={rawLc} />
        )}
        {/* Pass property application params to the server action */}
        {fromProperty && (
          <>
            <input type='hidden' name='fromProperty' value='true' />
            <input type='hidden' name='propertySlug' value={propertySlug} />
            <input type='hidden' name='role' value='tenant' />
          </>
        )}
        {/* Pass role through to the server action only when the URL has an
            explicit ?role=. We do NOT default to landlord just because plan
            or skipOnboarding is present — that previously caused tenants
            who clicked an ad to be silently created as landlords and pushed
            into a subscription picker. If the user hasn't declared a role,
            they go to /onboarding and pick one. */}
        {!fromProperty && role && (
          <input type='hidden' name='role' value={role} />
        )}
        {/* Invite code from QR / email invite — links the tenant to a landlord */}
        {inviteCode && (
          <input type='hidden' name='inviteCode' value={inviteCode} />
        )}
        
        <div className='space-y-6'>
          <div>
            <Label htmlFor='name'>Name</Label>
            <Input
              id='name'
              name='name'
              type='text'
              autoComplete='name'
              defaultValue={leaseCtx?.landlordName || signUpDefaultValues.name}
              className='bg-white text-gray-900 border-gray-300'
              placeholder='Your full name'
            />
          </div>
          <div>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              name='email'
              type='email'
              autoComplete='email'
              defaultValue={leaseCtx?.landlordEmail || signUpDefaultValues.email}
              className='bg-white text-gray-900 border-gray-300'
              placeholder='you@example.com'
            />
          </div>
          <div>
            <Label htmlFor='phoneNumber'>Phone number</Label>
            <Input
              id='phoneNumber'
              name='phoneNumber'
              type='tel'
              autoComplete='tel'
              defaultValue={signUpDefaultValues.phoneNumber}
              className='bg-white text-gray-900 border-gray-300'
              placeholder='(555) 123-4567'
              required
            />
            <p className='text-[11px] text-gray-400 mt-1'>
              For rent reminders, security alerts, and verification codes. Never sold.
            </p>
          </div>
          <div>
            <Label htmlFor='password'>Password</Label>
            <Input
              id='password'
              name='password'
              type='password'
              required
              autoComplete='new-password'
              defaultValue={signUpDefaultValues.password}
              className='bg-white text-gray-900 border-gray-300'
              placeholder='Create a password'
            />
          </div>
          <div>
            <Label htmlFor='confirmPassword'>Confirm Password</Label>
            <Input
              id='confirmPassword'
              name='confirmPassword'
              type='password'
              required
              autoComplete='new-password'
              defaultValue={signUpDefaultValues.confirmPassword}
              className='bg-white text-gray-900 border-gray-300'
              placeholder='Confirm your password'
            />
          </div>
          <div>
            <SignUpButton />
          </div>

          {data && !data.success && (
            <div className='text-center text-destructive'>{data.message}</div>
          )}

          <div className='text-sm text-center text-muted-foreground'>
            Already have an account?{' '}
            <Link
              href={
                fromProperty && propertySlug
                  ? `${subdomainPrefix}/sign-in?fromProperty=true&propertySlug=${encodeURIComponent(propertySlug)}`
                  : `${subdomainPrefix}/sign-in`
              }
              target='_self'
              className='link'
            >
              Sign In
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SignUpForm;
