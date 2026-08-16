'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { formatError } from '../utils';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { uploadToCloudinary } from '@/lib/cloudinary';

const brandingSchema = z.object({
  companyName: z.string().trim().min(1).max(120).optional(),
  companyEmail: z.string().trim().email().optional(),
  companyPhone: z.string().trim().max(40).optional(),
  companyAddress: z.string().trim().max(200).optional(),
  themeColor: z.enum(['violet', 'emerald', 'blue', 'rose', 'amber']).optional(),
  aboutBio: z.string().trim().max(800).optional(),
});

async function saveFiles(
  files: File[],
  dirParts: string[],
  maxCount: number,
  landlordId: string,
) {
  const stored: string[] = [];
  const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];

  for (const file of files.slice(0, maxCount)) {
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, SVG, or WebP');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 5MB');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = ['propertyflowhq', 'landlords', landlordId, ...dirParts]
      .filter(Boolean)
      .join('/');
    const publicId = `${landlordId}-${randomUUID()}`;

    let result;
    try {
      result = await uploadToCloudinary(buffer, {
        folder,
        public_id: publicId,
        resource_type: 'image',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cloudinary upload failed';
      throw new Error(message);
    }

    stored.push(result.secure_url);
  }

  return stored;
}

// Helper to serialize landlord object for client components (converts Decimal to number)
function serializeLandlord<T extends Record<string, unknown>>(landlord: T): T {
  const serialized = { ...landlord } as Record<string, unknown>;
  
  // Convert Decimal fields to numbers
  if (serialized.securityDepositMonths !== undefined && serialized.securityDepositMonths !== null) {
    serialized.securityDepositMonths = Number(serialized.securityDepositMonths);
  }
  if (serialized.petDepositAmount !== undefined && serialized.petDepositAmount !== null) {
    serialized.petDepositAmount = Number(serialized.petDepositAmount);
  }
  if (serialized.petRentAmount !== undefined && serialized.petRentAmount !== null) {
    serialized.petRentAmount = Number(serialized.petRentAmount);
  }
  if (serialized.cleaningFeeAmount !== undefined && serialized.cleaningFeeAmount !== null) {
    serialized.cleaningFeeAmount = Number(serialized.cleaningFeeAmount);
  }
  if (serialized.applicationFeeAmount !== undefined && serialized.applicationFeeAmount !== null) {
    serialized.applicationFeeAmount = Number(serialized.applicationFeeAmount);
  }
  
  return serialized as T;
}

export async function getOrCreateCurrentLandlord() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    const userId = session.user.id as string;
    const userName = session.user.name || 'My Properties';

    try {
      const teamMembership = await (prisma as any).teamMember?.findFirst?.({
        where: { userId, status: 'active' },
        select: { landlordId: true },
      });

      if (teamMembership?.landlordId) {
        const teamLandlord = await prisma.landlord.findUnique({
          where: { id: teamMembership.landlordId },
        });
        if (teamLandlord) {
          return { success: true as const, landlord: serializeLandlord(teamLandlord) };
        }
      }
    } catch {}

    let landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: userId },
    });

    if (!landlord) {
      // Verify the user exists before creating landlord
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!userExists) {
        throw new Error('User account not found. Please sign out and sign in again.');
      }

      const base =
        userName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'landlord';

      let subdomain = base;
      let suffix = 1;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const existing = await prisma.landlord.findUnique({ where: { subdomain } });
        if (!existing) break;
        subdomain = `${base}-${suffix++}`;
      }

      const trialStart = new Date();
      const trialEnd = new Date(trialStart);
      trialEnd.setDate(trialEnd.getDate() + 14);

      const landlordCreateData: any = {
        name: userName,
        companyName: userName,
        subdomain,
        ownerUserId: userId,
        // Start with a trialing status so SubscriptionGate grants access
        // immediately on first load. ensureLandlordTrialInitialized will
        // no-op (trialStartDate already set), preventing a double-write race.
        subscriptionStatus: 'trialing',
        trialStatus: 'trialing',
        trialStartDate: trialStart,
        trialEndDate: trialEnd,
      };

      landlord = await prisma.landlord.create({
        // Cast to any to satisfy types before Prisma client is regenerated with new fields
        data: landlordCreateData,
      });
    }

    return { success: true as const, landlord: serializeLandlord(landlord) };
  } catch (error) {
    return { success: false as const, message: formatError(error) };
  }
}

export async function updateLandlordBrandingProfile(formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    const parsed = brandingSchema.parse({
      companyName: formData.get('companyName')?.toString(),
      companyEmail: formData.get('companyEmail')?.toString(),
      companyPhone: formData.get('companyPhone')?.toString(),
      companyAddress: formData.get('companyAddress')?.toString(),
      themeColor: formData.get('themeColor')?.toString() as any,
      aboutBio: formData.get('aboutBio')?.toString(),
    });

    await prisma.landlord.update({
      where: { id: landlord.id },
      // cast because Prisma client may be outdated until regenerate
      data: {
        companyName: parsed.companyName,
        companyEmail: parsed.companyEmail,
        companyPhone: parsed.companyPhone,
        companyAddress: parsed.companyAddress,
        themeColor: (parsed.themeColor || 'violet') as any,
        aboutBio: parsed.aboutBio,
      } as any,
    });

    return { success: true as const };
  } catch (error) {
    return { success: false as const, message: formatError(error) };
  }
}

export async function updateCurrentLandlordSubdomain(formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    // Get current user's landlord
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    const subdomain = formData.get('subdomain') as string;

    if (!subdomain || subdomain.trim().length === 0) {
      throw new Error('Subdomain is required');
    }

    // Validate subdomain format
    const sanitized = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (sanitized.length < 3 || sanitized.length > 50) {
      throw new Error('Subdomain must be 3-50 characters, letters, numbers, and hyphens only');
    }

    // Check if subdomain is already taken
    const existing = await prisma.landlord.findUnique({
      where: { subdomain: sanitized },
    });

    if (existing && existing.id !== landlord.id) {
      throw new Error('Subdomain is already taken');
    }

    // Update landlord subdomain
    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { subdomain: sanitized },
    });

    return { success: true };
  } catch (error) {
    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Failed to update subdomain:', error instanceof Error ? error.message : 'Unknown error');
    }
    return { success: false, message: error instanceof Error ? error.message : 'Failed to update subdomain' };
  }
}

export async function uploadLandlordLogo(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    // Get current user's landlord
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    const file = formData.get('logo') as File;
    
    if (!file || file.size === 0) {
      throw new Error('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, SVG, or WebP');
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 5MB');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let result;
    try {
      result = await uploadToCloudinary(buffer, {
        folder: ['propertyflowhq', 'landlords', landlord.id, 'branding', 'logo'].join('/'),
        public_id: `${landlord.id}-logo-${randomUUID()}`,
        resource_type: 'image',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cloudinary upload failed';
      return { success: false, message };
    }

    const logoUrl = result.secure_url;
    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { logoUrl },
    });

    return { success: true, logoUrl };
  } catch (error) {
    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Failed to upload logo:', error instanceof Error ? error.message : 'Unknown error');
    }
    return { success: false, message: error instanceof Error ? error.message : 'Failed to upload logo' };
  }
}

export async function uploadLandlordHeroImages(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    const heroFiles = (formData.getAll('heroImages') as File[]).filter(f => f && f.size > 0);
    if (!heroFiles.length) {
      throw new Error('No files provided');
    }

    const stored = await saveFiles(heroFiles, ['branding', 'hero'], 3, landlord.id);

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { heroImages: { set: stored } },
    });

    return { success: true, heroImages: stored };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Failed to upload hero images:', error instanceof Error ? error.message : 'Unknown error');
    }
    return { success: false, message: error instanceof Error ? error.message : 'Failed to upload hero images' };
  }
}

export async function uploadLandlordAboutMedia(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    const aboutPhoto = formData.get('aboutPhoto') as File | null;
    const galleryFiles = (formData.getAll('aboutGallery') as File[]).filter(f => f && f.size > 0);

    const updates: any = {};

    if (aboutPhoto && aboutPhoto.size > 0) {
      const [photoUrl] = await saveFiles([aboutPhoto], ['branding', 'about'], 1, landlord.id);
      updates.aboutPhoto = photoUrl;
    }

    if (galleryFiles.length) {
      const galleryUrls = await saveFiles(galleryFiles, ['branding', 'about', 'gallery'], 6, landlord.id);
      updates.aboutGallery = galleryUrls;
    }

    if (!Object.keys(updates).length) {
      throw new Error('No files provided');
    }

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: updates,
    });

    return { success: true, ...updates };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Failed to upload about media:', error instanceof Error ? error.message : 'Unknown error');
    }
    return { success: false, message: error instanceof Error ? error.message : 'Failed to upload about media' };
  }
}

export async function deleteLandlordLogo() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { logoUrl: null },
    });

    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete logo' };
  }
}

export async function deleteLandlordHeroImage(imageUrl: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    const currentImages = (landlord as any).heroImages || [];
    const updatedImages = currentImages.filter((url: string) => url !== imageUrl);

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { heroImages: { set: updatedImages } },
    });

    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete hero image' };
  }
}

export async function deleteAllLandlordHeroImages() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { heroImages: { set: [] } },
    });

    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete hero images' };
  }
}

export async function deleteLandlordAboutPhoto() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { aboutPhoto: null } as any,
    });

    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete about photo' };
  }
}

export async function deleteLandlordAboutGalleryImage(imageUrl: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    const currentGallery = (landlord as any).aboutGallery || [];
    const updatedGallery = currentGallery.filter((url: string) => url !== imageUrl);

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { aboutGallery: updatedGallery } as any,
    });

    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete gallery image' };
  }
}

export async function deleteAllLandlordAboutGallery() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { aboutGallery: [] } as any,
    });

    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete gallery' };
  }
}

export async function updateCustomDomain(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    // Get current user's landlord
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    const customDomain = formData.get('customDomain') as string;

    if (!customDomain || customDomain.trim().length === 0) {
      // Remove custom domain
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: { customDomain: null },
      });
      return { success: true };
    }

    // Validate domain format
    const sanitized = customDomain.toLowerCase().trim();
    const domainRegex = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
    if (!domainRegex.test(sanitized)) {
      throw new Error('Invalid domain format');
    }

    // Check if domain is already taken
    const existing = await prisma.landlord.findUnique({
      where: { customDomain: sanitized },
    });

    if (existing && existing.id !== landlord.id) {
      throw new Error('Domain is already taken');
    }

    // Update landlord custom domain
    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { customDomain: sanitized },
    });

    return { success: true };
  } catch (error) {
    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Failed to update custom domain:', error instanceof Error ? error.message : 'Unknown error');
    }
    return { success: false, message: error instanceof Error ? error.message : 'Failed to update custom domain' };
  }
}

export async function getLandlordBySubdomain(subdomain: string) {
  try {
    const normalized = subdomain.trim().toLowerCase();

    if (!normalized) {
      throw new Error('Subdomain is required');
    }

    const landlord = await prisma.landlord.findUnique({
      where: { subdomain: normalized },
    });

    if (!landlord) {
      return { success: false as const, message: 'Landlord not found for this subdomain.' };
    }

    return { success: true as const, landlord: serializeLandlord(landlord) };
  } catch (error) {
    return { success: false as const, message: formatError(error) };
  }
}

// ========== PAYOUT METHODS ==========

import { savedPayoutMethodSchema } from '../validators';
import { revalidatePath } from 'next/cache';

// Add saved payout method (bank account or card)
export async function addSavedPayoutMethod(
  data: z.infer<typeof savedPayoutMethodSchema>
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    const validatedData = savedPayoutMethodSchema.parse(data);

    if (!landlord.stripeConnectAccountId) {
      return {
        success: false,
        needsOnboarding: true,
        message: 'Stripe account not connected. Complete onboarding first.',
      };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    });

    const externalAccount = await stripe.accounts.createExternalAccount(
      landlord.stripeConnectAccountId,
      {
        external_account: validatedData.stripePaymentMethodId,
        default_for_currency: validatedData.isDefault,
      }
    );

    if (validatedData.isDefault) {
      await prisma.savedPayoutMethod.updateMany({
        where: { landlordId: landlord.id },
        data: { isDefault: false },
      });
    }

    const payoutMethod = await prisma.savedPayoutMethod.create({
      data: {
        landlordId: landlord.id,
        stripePaymentMethodId: externalAccount.id,
        type: validatedData.type,
        accountHolderName: validatedData.accountHolderName,
        last4: validatedData.last4,
        bankName: validatedData.bankName,
        accountType: validatedData.accountType,
        routingNumber: validatedData.routingNumber,
        isDefault: validatedData.isDefault,
        isVerified: true,
      },
    });

    revalidatePath('/admin/payouts');

    return {
      success: true,
      message: 'Payout method saved successfully!',
      payoutMethodId: payoutMethod.id,
    };
  } catch (error) {
    console.error('Error saving payout method:', error);
    const message = formatError(error);
    return { success: false, message: message || 'Failed to save payout method' };
  }
}

// Get saved payout methods for current landlord
export async function getSavedPayoutMethods() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', methods: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, methods: [] };
    }

    const landlord = landlordResult.landlord;

    const methods = await prisma.savedPayoutMethod.findMany({
      where: { landlordId: landlord.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return {
      success: true,
      methods: methods.map(method => ({
        id: method.id,
        stripePaymentMethodId: method.stripePaymentMethodId,
        type: method.type,
        last4: method.last4,
        bankName: method.bankName,
        accountType: method.accountType,
        accountHolderName: method.accountHolderName,
        isDefault: method.isDefault,
        isVerified: method.isVerified,
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), methods: [] };
  }
}

// Delete saved payout method
export async function deleteSavedPayoutMethod(payoutMethodId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    const payoutMethod = await prisma.savedPayoutMethod.findUnique({
      where: { id: payoutMethodId },
    });

    if (!payoutMethod || payoutMethod.landlordId !== landlord.id) {
      return { success: false, message: 'Payout method not found' };
    }

    await prisma.savedPayoutMethod.delete({
      where: { id: payoutMethodId },
    });

    revalidatePath('/admin/payouts');

    return {
      success: true,
      message: 'Payout method deleted successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update saved payout method
export async function updateSavedPayoutMethod(
  payoutMethodId: string,
  data: z.infer<typeof savedPayoutMethodSchema>
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    const payoutMethod = await prisma.savedPayoutMethod.findUnique({
      where: { id: payoutMethodId },
    });

    if (!payoutMethod || payoutMethod.landlordId !== landlord.id) {
      return { success: false, message: 'Payout method not found' };
    }

    const validatedData = savedPayoutMethodSchema.parse(data);

    if (validatedData.isDefault) {
      await prisma.savedPayoutMethod.updateMany({
        where: { 
          landlordId: landlord.id,
          id: { not: payoutMethodId }
        },
        data: { isDefault: false },
      });
    }

    await prisma.savedPayoutMethod.update({
      where: { id: payoutMethodId },
      data: {
        stripePaymentMethodId: validatedData.stripePaymentMethodId,
        type: validatedData.type,
        accountHolderName: validatedData.accountHolderName,
        last4: validatedData.last4,
        bankName: validatedData.bankName,
        accountType: validatedData.accountType,
        routingNumber: validatedData.routingNumber,
        isDefault: validatedData.isDefault,
      },
    });

    revalidatePath('/admin/payouts');

    return {
      success: true,
      message: 'Payout method updated successfully',
    };
  } catch (error) {
    console.error('Error updating payout method:', error);
    return { success: false, message: formatError(error) };
  }
}