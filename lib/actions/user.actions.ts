'use server';

import {
  shippingAddressSchema,
  signInFormSchema,
  signUpFormSchema,
  paymentMethodSchema,
  updateUserSchema,
  updateAddressSchema,
  savedPaymentMethodSchema,
} from '../validators';
import { auth, signIn, signOut } from '@/auth';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { hash } from '../encrypt';
import { prisma } from '@/db/prisma';
import { formatError } from '../utils';
import { ShippingAddress } from '@/types';
import { z } from 'zod';
import { PAGE_SIZE } from '../constants';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { getMyCart } from './cart.actions';
import { sendVerificationEmailToken } from './auth.actions';
import { redirect } from 'next/navigation';
import { getOrCreateCurrentLandlord } from './landlord.actions';
import { getSubdomainRedirectUrl } from '../utils/subdomain-redirect';
import { notifyNewSignup } from '../services/admin-notifications';
import { logAuthEvent } from '@/lib/security/audit-logger';
import { requestContextFromHeaders } from '@/lib/security/request-context';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limiter';

// Sign in the user with credentials
export async function signInWithCredentials(
  prevState: unknown,
  formData: FormData
) {
  try {
    const user = signInFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    // Check if user exists
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, role: true, emailVerified: true },
    });

    if (!dbUser) {
      return { success: false, message: 'Invalid email or password' };
    }

    // Allow sign-in even if email not verified (verify later pattern)
    // Critical actions will be blocked in the app, not at sign-in

    // Sign in the user
    const result = await signIn('credentials', {
      ...user,
      redirect: false,
    });

    if (!result || result.error) {
      return { success: false, message: 'Invalid email or password' };
    }

    // Check if there's a specific callback URL provided (and it's not just '/')
    const rawCallbackUrl = formData.get('callbackUrl');
    const callbackUrl =
      typeof rawCallbackUrl === 'string' && 
      rawCallbackUrl.trim().startsWith('/') && 
      rawCallbackUrl.trim() !== '/'
        ? rawCallbackUrl.trim()
        : null;

    // If there's a specific callback URL, use it; otherwise use role-based redirect
    const redirectUrl = callbackUrl 
      ? callbackUrl 
      : await getSubdomainRedirectUrl(
          dbUser.role,
          dbUser.id
        );

    redirect(redirectUrl);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: 'Invalid email or password' };
  }
}

// Sign user out
export async function signOutUser() {
  // Get current session for audit logging
  const session = await auth();
  
  // get current users cart and delete it so it does not persist to next user
  const currentCart = await getMyCart();

  if (currentCart?.id) {
    await prisma.cart.delete({ where: { id: currentCart.id } });
  } else {
    console.warn('No cart found for deletion.');
  }

  // Log logout to audit trail (with request IP for forensics)
  if (session?.user?.id) {
    const ctx = await requestContextFromHeaders();
    logAuthEvent('AUTH_LOGOUT', {
      userId: session.user.id,
      email: session.user.email || undefined,
      success: true,
      ipAddress: ctx.ipAddress ?? undefined,
      userAgent: ctx.userAgent ?? undefined,
    }).catch(console.error);
  }

  await signOut();
}

// Sign up user
export async function signUpUser(prevState: unknown, formData: FormData) {
  try {
    // Rate limit signup by IP — max 5 signups per 15 minutes per IP
    const ctx = await requestContextFromHeaders();
    const signupRateKey = `signup:${ctx.ipAddress || 'unknown'}`;
    const rateCheck = checkRateLimit(signupRateKey, { windowMs: 15 * 60 * 1000, maxRequests: 5 });
    if (!rateCheck.allowed) {
      return { success: false, message: 'Too many signup attempts. Please try again later.' };
    }

    const user = signUpFormSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      phoneNumber: formData.get('phoneNumber'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    const plainPassword = user.password;

    user.password = await hash(user.password);

    // Normalize phone to E.164 (+15551234567) so SMS service can use it
    // without re-parsing. Strips formatting characters and prefixes +1 for
    // 10-digit US numbers.
    const phoneDigits = user.phoneNumber.replace(/\D/g, '');
    const normalizedPhone =
      phoneDigits.length === 10
        ? `+1${phoneDigits}`
        : phoneDigits.length === 11 && phoneDigits.startsWith('1')
        ? `+${phoneDigits}`
        : phoneDigits.startsWith('+')
        ? user.phoneNumber
        : `+${phoneDigits}`;

    const fromProperty = formData.get('fromProperty') === 'true' || Boolean(formData.get('propertySlug'));

    // Lease builder context — landlord came from the free public lease builder
    const leaseContextRaw = (formData.get('lease_context') as string | null) || '';
    const fromLeaseBuider = !!leaseContextRaw;

    // Invite code from QR / email invite — if present, the tenant came from a
    // landlord invite and should skip the role-picker onboarding entirely.
    const inviteCode = (formData.get('inviteCode') as string | null) || '';
    const fromInvite = !!inviteCode;

    const rawRole = formData.get('role');
    
    // Supported roles: user, tenant, landlord, property_manager, contractor, homeowner, agent
    const validRoles = ['user', 'tenant', 'landlord', 'property_manager', 'contractor', 'homeowner', 'agent'];
    // Lease builder signups always become landlords
    let roleValue = fromProperty || fromInvite
      ? 'tenant'
      : fromLeaseBuider
        ? 'landlord'
        : rawRole && validRoles.includes(rawRole as string)
          ? (rawRole as string)
          : 'user';

    const createdUser = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        phoneNumber: normalizedPhone,
        password: user.password,
        role: roleValue,
        // Beta testers skip onboarding entirely (they redeemed a code so we
        // know what they want; no need to walk through the role picker).
        // Property applicants also skip — they've declared intent already.
        // Tenants coming via a landlord invite code also skip.
        onboardingCompleted: fromProperty || fromInvite,
        // Enable 2FA by default for landlords and property managers
        twoFactorEnabled: roleValue === 'landlord' || roleValue === 'property_manager',
      },
    });

    // If coming from a landlord invite code, create the TenantLandlordLink now
    // so the landlord sees this tenant in their unassigned queue immediately.
    if (fromInvite && inviteCode) {
      try {
        const inviteCodeRecord = await prisma.landlordInviteCode.findFirst({
          where: {
            code: inviteCode,
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: { property: { select: { slug: true } } },
        });

        if (inviteCodeRecord) {
          const linkExists = await prisma.tenantLandlordLink.findUnique({
            where: {
              tenantId_landlordId: {
                tenantId: createdUser.id,
                landlordId: inviteCodeRecord.landlordId,
              },
            },
          });

          if (!linkExists) {
            await prisma.tenantLandlordLink.create({
              data: {
                tenantId: createdUser.id,
                landlordId: inviteCodeRecord.landlordId,
                signupMethod: 'invite_code',
                inviteCode,
                status: 'pending',
              },
            });
          }

          await prisma.landlordInviteCode.update({
            where: { id: inviteCodeRecord.id },
            data: { usageCount: { increment: 1 } },
          });
        }
      } catch (linkError) {
        // Non-fatal — the user is created; landlord link can be set up later
        console.error('Failed to create tenant-landlord link on signup:', linkError);
      }
    }

    // Notify admin of new signup — but only if the role is known at this
    // point (beta code, property application, or explicit ?role= on the
    // form). For "user" (i.e. someone who hasn't picked a role yet), defer
    // the notification until after onboarding so the email contains useful
    // context instead of firing the moment the password is set.
    const roleKnownAtSignup =
      fromProperty || fromInvite || roleValue !== 'user';
    if (roleKnownAtSignup) {
      notifyNewSignup({
        name: user.name,
        email: user.email,
        role: roleValue,
        signupMethod: 'Email',
      }).catch(console.error);
    }

    // Send verification email (non-blocking).
    // For lease-builder signups embed the from-lease destination as `next`
    // so the verification link works cross-device (different browser / mobile)
    // and always lands the user back at the property-creation page.
    const verifyNext = fromLeaseBuider
      ? `/admin/onboarding/from-lease?lc=${encodeURIComponent(leaseContextRaw)}`
      : undefined;
    sendVerificationEmailToken(user.email, verifyNext).catch(console.error);

    // Log signup event (with request IP so we can trace where it came from)
    const signupCtx = await requestContextFromHeaders();
    logAuthEvent('AUTH_SIGNUP', {
      userId: createdUser.id,
      email: user.email,
      role: roleValue,
      success: true,
      ipAddress: signupCtx.ipAddress ?? undefined,
      userAgent: signupCtx.userAgent ?? undefined,
    }).catch(console.error);

    // Sign in automatically and redirect to the right destination.
    // Priority order:
    //   1. Lease-builder context  → smart setup page (always wins for this flow)
    //   2. Invite-code tenant     → tenant dashboard
    //   3. Explicit callbackUrl   → honor it
    //   4. Default                → role picker / onboarding
    const callbackUrl = formData.get('callbackUrl') as string | null;
    const redirectTo = fromLeaseBuider
      ? `/admin/onboarding/from-lease?lc=${encodeURIComponent(leaseContextRaw)}`
      : fromInvite
        ? '/user/dashboard'
        : callbackUrl && callbackUrl.startsWith('/')
          ? callbackUrl
          : '/onboarding';

    await signIn('credentials', {
      email: user.email,
      password: plainPassword,
      redirect: true,
      redirectTo,
    });

    // This return won't be reached due to redirect, but needed for type safety
    return {
      success: true,
      message: 'Account created successfully!',
    };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: formatError(error) };
  }
}

// Get user by the ID
export async function getUserById(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId },
  });
  if (!user) throw new Error('User not found');
  return user;
}

// Update the user's address
export async function updateUserAddress(data: ShippingAddress) {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findFirst({
      where: { id: session?.user?.id },
    });

    if (!currentUser) throw new Error('User not found');

    const address = shippingAddressSchema.parse(data);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { shippingAddress: address },
    });

    revalidatePath('/shipping-address');

    return {
      success: true,
      message: 'User updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update user's payment method
export async function updateUserPaymentMethod(
  data: z.infer<typeof paymentMethodSchema>
) {
  try {
    const session = await auth();
    const currentUser = await prisma.user.findFirst({
      where: { id: session?.user?.id },
    });

    if (!currentUser) throw new Error('User not found');

    const paymentMethod = paymentMethodSchema.parse(data);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { paymentMethod: paymentMethod.type },
    });

    return {
      success: true,
      message: 'User updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update the user profile
export async function updateProfile(user: { name: string; email: string }) {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findFirst({
      where: {
        id: session?.user?.id,
      },
    });

    if (!currentUser) throw new Error('User not found');

    await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        name: user.name,
      },
    });

    return {
      success: true,
      message: 'User updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get all the users
export async function getAllUsers({
  limit = PAGE_SIZE,
  page,
  query,
}: {
  limit?: number;
  page: number;
  query: string;
}) {
  const queryFilter: Prisma.UserWhereInput =
    query && query !== 'all'
      ? {
          name: {
            contains: query,
            mode: 'insensitive',
          } as Prisma.StringFilter,
        }
      : {};

  const data = await prisma.user.findMany({
    where: {
      ...queryFilter,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      image: true,
    },
  });

  const dataCount = await prisma.user.count();

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Delete a user
export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } });

    revalidatePath('/admin/users');

    return {
      success: true,
      message: 'User deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
}

// Update a user (admin only — used from /admin/users)
export async function updateUser(user: z.infer<typeof updateUserSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    // Only admins and superAdmins can update other users
    const caller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (!caller || !['admin', 'superAdmin'].includes(caller.role)) {
      return { success: false, message: 'Unauthorized' };
    }

    // Prevent self-promotion to superAdmin
    if (user.id === session.user.id && user.role === 'superAdmin' && caller.role !== 'superAdmin') {
      return { success: false, message: 'Cannot promote yourself to superAdmin' };
    }

    // Role allowlist — never allow setting superAdmin through this action
    const ALLOWED_ROLES = ['user', 'tenant', 'landlord', 'property_manager', 'contractor', 'homeowner', 'agent', 'admin'];
    if (user.role && !ALLOWED_ROLES.includes(user.role)) {
      return { success: false, message: 'Invalid role' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name,
        role: user.role,
        // Phone is optional from the admin form. Empty string means "clear it",
        // null means "leave alone". Treat both as clear here.
        phoneNumber: user.phoneNumber ? user.phoneNumber : null,
      },
    });

    revalidatePath('/admin/users');

    return {
      success: true,
      message: 'User updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update user address
export async function updateUserProfileAddress(
  data: z.infer<typeof updateAddressSchema>
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const validatedAddress = updateAddressSchema.parse(data);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { address: validatedAddress },
    });

    revalidatePath('/user/profile');

    return {
      success: true,
      message: 'Address updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update user avatar
export async function updateUserAvatar(imageUrl: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
    });

    revalidatePath('/user/profile');

    return {
      success: true,
      message: 'Avatar updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Save payment method (Stripe tokenized)
export async function addSavedPaymentMethod(
  data: z.infer<typeof savedPaymentMethodSchema>
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const validatedData = savedPaymentMethodSchema.parse(data);

    if (validatedData.isDefault) {
      await prisma.savedPaymentMethod.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const paymentMethod = await prisma.savedPaymentMethod.create({
      data: {
        userId: session.user.id,
        stripePaymentMethodId: validatedData.stripePaymentMethodId,
        type: validatedData.type,
        cardholderName: validatedData.cardholderName,
        last4: validatedData.last4,
        expirationDate: validatedData.expirationDate,
        brand: validatedData.brand,
        billingAddress: validatedData.billingAddress,
        isDefault: validatedData.isDefault,
        isVerified: true,
      },
    });

    revalidatePath('/user/profile');

    return {
      success: true,
      message: 'Payment method saved successfully!',
      paymentMethodId: paymentMethod.id,
    };
  } catch (error) {
    console.error('Error saving payment method:', error);
    const message = formatError(error);
    return { success: false, message: message || 'Failed to save payment method' };
  }
}

// Get saved payment methods
export async function getSavedPaymentMethods() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, methods: [], message: 'Not authenticated' };
    }

    const methods = await prisma.savedPaymentMethod.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      methods,
      message: '',
    };
  } catch (error) {
    return { success: false, methods: [], message: formatError(error) };
  }
}

// Delete saved payment method
export async function deleteSavedPaymentMethod(paymentMethodId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const paymentMethod = await prisma.savedPaymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod || paymentMethod.userId !== session.user.id) {
      return { success: false, message: 'Payment method not found' };
    }

    await prisma.savedPaymentMethod.delete({
      where: { id: paymentMethodId },
    });

    revalidatePath('/user/profile');

    return {
      success: true,
      message: 'Payment method deleted successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Verify payment method
export async function verifyPaymentMethod(token: string) {
  try {
    const verificationToken =
      await prisma.paymentMethodVerificationToken.findUnique({
        where: { token },
      });

    if (!verificationToken) {
      return { success: false, message: 'Invalid or expired token' };
    }

    if (verificationToken.expires < new Date()) {
      await prisma.paymentMethodVerificationToken.delete({
        where: { id: verificationToken.id },
      });
      return { success: false, message: 'Token has expired' };
    }

    await prisma.savedPaymentMethod.update({
      where: { id: verificationToken.paymentMethodId },
      data: { isVerified: true },
    });

    await prisma.paymentMethodVerificationToken.delete({
      where: { id: verificationToken.id },
    });

    return { success: true, message: 'Payment method verified successfully' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update shipping address
export async function updateShippingAddress(
  data: z.infer<typeof updateAddressSchema>
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const validatedAddress = updateAddressSchema.parse(data);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { shippingAddress: validatedAddress },
    });

    revalidatePath('/user/profile');

    return {
      success: true,
      message: 'Shipping address updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update billing address
export async function updateBillingAddress(
  data: z.infer<typeof updateAddressSchema>
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const validatedAddress = updateAddressSchema.parse(data);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { billingAddress: validatedAddress },
    });

    revalidatePath('/user/profile');

    return {
      success: true,
      message: 'Billing address updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get saved payment method by ID (Stripe tokenized)
export async function getSavedPaymentMethodById(paymentMethodId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, method: null, message: 'Not authenticated' };
    }

    const method = await prisma.savedPaymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!method || method.userId !== session.user.id) {
      return { success: false, method: null, message: 'Payment method not found' };
    }

    return {
      success: true,
      method,
      message: '',
    };
  } catch (error) {
    return { success: false, method: null, message: formatError(error) };
  }
}

// Update saved payment method
export async function updateSavedPaymentMethod(
  paymentMethodId: string,
  data: z.infer<typeof savedPaymentMethodSchema>
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const paymentMethod = await prisma.savedPaymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod || paymentMethod.userId !== session.user.id) {
      return { success: false, message: 'Payment method not found' };
    }

    const validatedData = savedPaymentMethodSchema.parse(data);

    if (validatedData.isDefault) {
      await prisma.savedPaymentMethod.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    await prisma.savedPaymentMethod.update({
      where: { id: paymentMethodId },
      data: {
        cardholderName: validatedData.cardholderName,
        isDefault: validatedData.isDefault,
      },
    });

    revalidatePath('/user/profile');

    return {
      success: true,
      message: 'Payment method updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updatePhoneNumber(phoneNumber: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { phoneNumber },
    });

    revalidatePath('/user/profile');

    return {
      success: true,
      message: 'Phone number updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Roles that cannot be changed through onboarding - these are privileged system roles
const PROTECTED_ROLES = ['superAdmin', 'admin'];

export async function setUserRoleAndLandlordIntake(data: {
  role: 'tenant' | 'landlord' | 'homeowner';
  unitsEstimateRange?: '0-10' | '11-50' | '51-200' | '200+';
  ownsProperties?: boolean;
  managesForOthers?: boolean;
  useSubdomain?: boolean;
  // Homeowner-specific fields
  homeType?: string;
  interestedServices?: string[];
  projectTimeline?: string;
}) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const userId = session.user.id as string;

    // Check if user has a protected role that cannot be changed via onboarding
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, emailVerified: true, email: true },
    });

    if (currentUser && PROTECTED_ROLES.includes(currentUser.role)) {
      return { 
        success: false, 
        message: `Cannot change role for ${currentUser.role} accounts through onboarding. Please contact support if you need to change your account type.` 
      };
    }

    // NOTE: We intentionally do NOT require a verified email here. Email
    // verification used to hard-block the role picker, which created a
    // dead-end for fresh signups who had not yet clicked the verification
    // link (especially on mobile where switching apps loses the form state).
    // The real abuse gate is now the subscription picker — the user can't
    // reach /admin without either a Stripe customer record (card on file)
    // or a legitimate in-window trial granted via this conscious role
    // selection. Email verification is nudged from settings instead.
    // Still kick off a verification email so they have a one-click link
    // waiting in their inbox.
    if (data.role === 'landlord' && currentUser && !currentUser.emailVerified) {
      try {
        await sendVerificationEmailToken(currentUser.email);
      } catch {}
    }

    await prisma.user.update({
      where: { id: userId },
      data: { 
        role: data.role,
        onboardingCompleted: true,
        // Enable 2FA by default for landlords
        ...(data.role === 'landlord' && { twoFactorEnabled: true }),
      },
    });

    if (data.role === 'landlord') {
      const landlordResult = await getOrCreateCurrentLandlord();

      if (!landlordResult.success) {
        return {
          success: false,
          message: landlordResult.message || 'Unable to initialize landlord workspace',
        };
      }

      // Start a 14-day free trial automatically — no card required at signup.
      // The subscription gate reads these dates to grant access. The banner
      // in the admin layout prompts the user to add a card before expiry.
      // Trial dates are set once here; the Stripe webhook will overwrite them
      // when/if the user later starts a paid plan.
      const trialStart = new Date();
      const trialEnd = new Date(trialStart);
      trialEnd.setDate(trialEnd.getDate() + 14);

      let unitsEstimateMin: number | null = null;
      let unitsEstimateMax: number | null = null;

      switch (data.unitsEstimateRange) {
        case '0-10':
          unitsEstimateMin = 0;
          unitsEstimateMax = 10;
          break;
        case '11-50':
          unitsEstimateMin = 11;
          unitsEstimateMax = 50;
          break;
        case '51-200':
          unitsEstimateMin = 51;
          unitsEstimateMax = 200;
          break;
        case '200+':
          unitsEstimateMin = 200;
          unitsEstimateMax = null;
          break;
        default:
          break;
      }

      await prisma.landlord.update({
        where: { id: landlordResult.landlord.id },
        data: {
          unitsEstimateMin: unitsEstimateMin ?? undefined,
          unitsEstimateMax: unitsEstimateMax ?? undefined,
          ownsProperties: data.ownsProperties ?? false,
          managesForOthers: data.managesForOthers ?? false,
          useSubdomain: data.useSubdomain ?? true,
          // 14-day no-card trial — set once at onboarding, overwritten by
          // Stripe webhook when they subscribe.
          trialStartDate: trialStart,
          trialEndDate: trialEnd,
          trialStatus: 'trialing',
          subscriptionStatus: 'trialing',
        },
      });
    }
    
    if (data.role === 'homeowner') {
      // Create or update homeowner profile
      const existingHomeowner = await prisma.homeowner.findUnique({
        where: { userId },
      });
      
      if (existingHomeowner) {
        await prisma.homeowner.update({
          where: { userId },
          data: {
            homeType: data.homeType,
            interestedServices: data.interestedServices || [],
            projectTimeline: data.projectTimeline,
          },
        });
      } else {
        await prisma.homeowner.create({
          data: {
            userId,
            homeType: data.homeType,
            interestedServices: data.interestedServices || [],
            projectTimeline: data.projectTimeline,
          },
        });
      }
    }

    return { success: true, message: 'Onboarding preferences saved' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
