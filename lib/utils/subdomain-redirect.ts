import { headers } from 'next/headers';
import { prisma } from '@/db/prisma';

/**
 * PATH-BASED ROUTING (Vercel Hobby compatible)
 * 
 * Instead of subdomain.propertyflowhq.com, we use propertyflowhq.com/[landlord-slug]/...
 * This works on Vercel Hobby without wildcard domain support.
 * 
 * URL patterns:
 * - Tenant portal: /[landlord-slug]/ (public listings)
 * - Tenant sign-in on portal: /[landlord-slug]/sign-in
 * - Tenant dashboard: /user/dashboard (main domain, after login)
 * - Landlord admin: /admin/overview (main domain)
 */

/**
 * Extract landlord slug from the current request path
 * Returns null if on main domain routes (not a landlord portal path)
 */
async function getLandlordSlugFromPath(): Promise<string | null> {
  const headersList = await headers();
  // Check if middleware set the slug header
  const slugFromHeader = headersList.get('x-landlord-slug');
  if (slugFromHeader) {
    return slugFromHeader;
  }
  return null;
}

function normalizeUserRole(role: string | null | undefined): string {
  const raw = (role ?? '').trim();
  if (!raw) return 'user';

  const cleaned = raw
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z_]/g, '');

  switch (cleaned) {
    case 'superadmin':
      return 'superAdmin';
    case 'propertymanager':
    case 'pm':
      return 'property_manager';
    default:
      return cleaned;
  }
}

/**
 * Get redirect URL after login based on user role
 * Uses path-based routing instead of subdomain routing
 */
export async function getSubdomainRedirectUrl(userRole: string, userId: string): Promise<string> {
  try {
    const role = normalizeUserRole(userRole);

    if (role === 'user' && userId) {
      const landlordOwned = await prisma.landlord.findFirst({
        where: { ownerUserId: userId },
        select: { id: true },
      });
      if (landlordOwned) return '/admin/overview';
    }

    // Check if landlord needs to complete subscription
    if ((role === 'landlord' || role === 'property_manager') && userId) {
      const landlord = await prisma.landlord.findFirst({
        where: { ownerUserId: userId },
        select: {
          id: true,
          subscriptionStatus: true,
          stripeSubscriptionId: true,
          trialEndDate: true,
          subscription: {
            select: {
              status: true,
              stripeSubscriptionId: true,
            },
          },
        },
      });

      if (landlord) {
        const now = new Date();
        // A trialing status only counts as active if the trial end date is
        // still in the future. Once it lapses the DB status may lag behind
        // the real expiry (Stripe webhook hasn't fired yet), so we check
        // the date explicitly to avoid redirecting to the disabled
        // /onboarding/landlord/subscription page and entering a loop.
        const trialingActive =
          (landlord.subscriptionStatus === 'trialing' ||
            landlord.subscription?.status === 'trialing') &&
          !!landlord.trialEndDate &&
          landlord.trialEndDate > now;

        const hasActiveSubscription =
          !!landlord.stripeSubscriptionId ||
          !!landlord.subscription?.stripeSubscriptionId ||
          landlord.subscriptionStatus === 'active' ||
          landlord.subscription?.status === 'active' ||
          trialingActive;

        // Trial expired and no paid subscription → send straight to the
        // billing page (card wall) rather than the disabled onboarding page.
        if (!hasActiveSubscription) {
          return '/admin/billing?reason=trial_ended';
        }
      }
    }

    const currentSlug = await getLandlordSlugFromPath();

    // If user is on a landlord portal path (e.g., /love-your-god/sign-in)
    if (currentSlug) {
      const landlord = await prisma.landlord.findUnique({
        where: { subdomain: currentSlug },
      });

      if (landlord) {
        // Check if user is associated with this landlord
        const userAssociation = await prisma.user.findFirst({
          where: {
            id: userId || '',
            OR: [
              { id: landlord.ownerUserId || '' },
              {
                leasesAsTenant: {
                  some: {
                    unit: {
                      property: {
                        landlordId: landlord.id,
                      },
                    },
                  },
                },
              },
            ],
          },
        });

        if (userAssociation) {
          switch (role) {
            case 'landlord':
            case 'property_manager':
            case 'admin':
              return '/admin/overview';
            case 'tenant':
              // Tenant stays on main domain dashboard (simpler than path-based tenant routes)
              return '/user/dashboard';
            default:
              return '/';
          }
        } else {
          // User doesn't belong to this landlord's portal
          // Redirect based on role to their appropriate dashboard
          if (role === 'landlord' || role === 'property_manager' || role === 'admin') {
            return '/admin/overview';
          } else if (role === 'superAdmin') {
            return '/super-admin';
          }
          return '/user/dashboard';
        }
      } else {
        // Landlord slug doesn't exist, redirect based on role
        if (role === 'landlord' || role === 'property_manager' || role === 'admin') {
          return '/admin/overview';
        } else if (role === 'superAdmin') {
          return '/super-admin';
        }
        return '/user/dashboard';
      }
    }

    // Not on a landlord portal path, redirect based on role
    switch (role) {
      case 'admin':
      case 'landlord':
      case 'property_manager':
        return '/admin/overview';
      case 'superAdmin':
        return '/super-admin';
      case 'contractor':
        return '/contractor-dashboard';
      case 'homeowner':
        return '/homeowner/dashboard';
      case 'agent':
        return '/agent';
      case 'employee':
        return '/employee';
      case 'tenant':
      default:
        // All users go to their dashboard - no one goes to homepage after login
        return '/user/dashboard';
    }
  } catch (error) {
    console.error('Error determining redirect:', error);
    // Fallback based on role even if there's an error
    const role = normalizeUserRole(userRole);
    if (role === 'landlord' || role === 'property_manager' || role === 'admin') {
      return '/admin/overview';
    } else if (role === 'superAdmin') {
      return '/super-admin';
    }
    // Default to user dashboard for all other roles
    return '/user/dashboard';
  }
}

/**
 * Build a landlord portal URL (path-based)
 * Example: buildLandlordPortalUrl('love-your-god', '/') => '/love-your-god/'
 */
export function buildLandlordPortalUrl(landlordSlug: string, path: string = '/'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/${landlordSlug}${cleanPath}`;
}
