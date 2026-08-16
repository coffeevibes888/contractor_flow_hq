'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { setUserRoleAndLandlordIntake } from './user.actions';

export async function roleOnboardingAction(prevState: unknown, formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', role: null };
    }

    const roleValue = formData.get('role') as string;
    let role: 'tenant' | 'landlord' | 'homeowner';
    
    if (roleValue === 'tenant') {
      role = 'tenant';
    } else if (roleValue === 'homeowner') {
      role = 'homeowner';
    } else {
      role = 'landlord';
    }

    const unitsEstimateRange = (formData.get('unitsEstimateRange') || undefined) as
      | '0-10'
      | '11-50'
      | '51-200'
      | '200+'
      | undefined;

    const ownsProperties = formData.get('ownsProperties') === 'on';
    const managesForOthers = formData.get('managesForOthers') === 'on';
    const useSubdomain = formData.get('useSubdomain') === 'on';
    
    // Homeowner-specific fields
    const homeType = (formData.get('homeType') || undefined) as string | undefined;
    const interestedServices = (formData.get('interestedServices') || '') as string;
    const projectTimeline = (formData.get('projectTimeline') || undefined) as string | undefined;

    const result = await setUserRoleAndLandlordIntake({
      role,
      unitsEstimateRange,
      ownsProperties,
      managesForOthers,
      useSubdomain,
      // Homeowner fields
      homeType,
      interestedServices: interestedServices ? interestedServices.split(',').filter(Boolean) : undefined,
      projectTimeline,
    });

    if (!result.success) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('setUserRoleAndLandlordIntake failed:', result.message);
      }
      return { success: false, message: result.message || 'Failed to save preferences', role };
    }

    if (role === 'tenant') {
      redirect('/user/applications');
    } else if (role === 'homeowner') {
      redirect('/homeowner/dashboard');
    } else {
      // Landlords go straight to dashboard — trial starts automatically,
      // no Stripe checkout required. Subscription page moved to /admin/billing.
      redirect('/admin/overview');
    }
  } catch (error) {
    // Re-throw redirect errors - they're not actual errors, just how Next.js handles redirects
    if (isRedirectError(error)) {
      throw error;
    }
    
    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Role onboarding error:', error instanceof Error ? error.message : 'Unknown error');
    }
    const errorMessage = error instanceof Error ? error.message : 'Something went wrong';
    return { success: false, message: errorMessage, role: null };
  }
}
