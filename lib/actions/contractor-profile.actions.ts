'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { uploadToCloudinary } from '@/lib/cloudinary';
import type { Prisma } from '@prisma/client';

// Schema for profile updates. Individual profile sections submit partial
// forms, so the action validates only the fields that were actually posted.
const profileSchema = z.object({
  businessName: z.string().trim().min(1).max(120),
  displayName: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(200).optional(),
  bio: z.string().trim().max(2000).optional(),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  website: z.string().trim().url().optional().or(z.literal('')),
  baseCity: z.string().trim().max(100).optional(),
  baseState: z.string().trim().max(50).optional(),
  serviceRadius: z.number().min(0).max(500).optional(),
  yearsExperience: z.number().min(0).max(100).optional(),
  licenseNumber: z.string().trim().max(100).optional(),
  licenseState: z.string().trim().max(50).optional(),
  hourlyRate: z.number().min(0).optional(),
  minimumJobSize: z.number().min(0).optional(),
  isAvailable: z.boolean().optional(),
  acceptingNewWork: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  availabilityNotes: z.string().trim().max(500).optional(),
  // Subdomain & branding
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]*$/)
    .max(50)
    .optional(),
  // Feature cards for "Why Choose Me" section
  featureCard1Title: z.string().trim().max(100).optional(),
  featureCard1Description: z.string().trim().max(300).optional(),
  featureCard2Title: z.string().trim().max(100).optional(),
  featureCard2Description: z.string().trim().max(300).optional(),
  featureCard3Title: z.string().trim().max(100).optional(),
  featureCard3Description: z.string().trim().max(300).optional(),
  featureCard4Title: z.string().trim().max(100).optional(),
  featureCard4Description: z.string().trim().max(300).optional(),
  featureCard5Title: z.string().trim().max(100).optional(),
  featureCard5Description: z.string().trim().max(300).optional(),
  featureCard6Title: z.string().trim().max(100).optional(),
  featureCard6Description: z.string().trim().max(300).optional(),
});

const partialProfileSchema = profileSchema.partial();

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  const suffix = randomUUID().slice(0, 8);
  return `${base}-${suffix}`;
}

async function saveFiles(
  files: File[],
  dirParts: string[],
  maxCount: number,
  profileId: string
): Promise<string[]> {
  const stored: string[] = [];
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/webp',
  ];

  for (const file of files.slice(0, maxCount)) {
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        'Invalid file type. Please upload JPEG, PNG, SVG, or WebP'
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 5MB');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = ['propertyflowhq', 'contractors', profileId, ...dirParts]
      .filter(Boolean)
      .join('/');
    const publicId = `${profileId}-${randomUUID()}`;

    let result;
    try {
      result = await uploadToCloudinary(buffer, {
        folder,
        public_id: publicId,
        resource_type: 'image',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Cloudinary upload failed';
      console.error('Cloudinary upload error:', error);
      throw new Error(message);
    }

    stored.push(result.secure_url);
  }

  return stored;
}

function revalidateContractorMarketplace(
  slug?: string | null,
  subdomain?: string | null
) {
  revalidatePath('/contractor-dashboard/profile');
  revalidatePath('/contractor-dashboard/profile/branding');
  revalidatePath('/contractor-marketplace');

  if (slug) {
    revalidatePath(`/contractors/${slug}`);
    revalidatePath(`/contractor-marketplace/${slug}`);
    revalidatePath(`/${slug}`);
  }

  if (subdomain) {
    revalidatePath(`/c/${subdomain}`);
  }
}

export async function getOrCreateContractorProfile() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    if (session.user.role !== 'contractor') {
      return {
        success: false,
        message: 'Not a contractor. Your role is: ' + session.user.role,
      };
    }

    const userId = session.user.id;

    // Check if profile exists
    let profile;
    try {
      profile = await prisma.contractorProfile.findUnique({
        where: { userId },
      });
    } catch (dbError: unknown) {
      const dbMessage = dbError instanceof Error ? dbError.message : '';
      const dbCode =
        typeof dbError === 'object' && dbError && 'code' in dbError
          ? (dbError as { code?: string }).code
          : undefined;
      // Table might not exist yet
      if (dbCode === 'P2021' || dbMessage.includes('does not exist')) {
        return {
          success: false,
          message:
            'ContractorProfile table not found. Please run database migrations.',
        };
      }
      throw dbError;
    }

    if (!profile) {
      // Get user info for defaults
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, image: true },
      });

      // Create new profile with 30-day new-member visibility boost
      const newMemberBoostUntil = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      );
      profile = await prisma.contractorProfile.create({
        data: {
          userId,
          slug: generateSlug(user?.name || 'contractor'),
          businessName: user?.name || 'My Business',
          displayName: user?.name || 'Contractor',
          email: user?.email || '',
          profilePhoto: user?.image,
          isPublic: true,
          acceptingNewWork: true,
          isAvailable: true,
          newContractorBoostUntil: newMemberBoostUntil,
          lastActiveAt: new Date(),
        },
      });
    }

    return { success: true, profile };
  } catch (error: unknown) {
    console.error('Failed to get/create contractor profile:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to load profile',
    };
  }
}

export async function updateContractorProfile(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return { success: false, message: 'Not authorized' };
    }

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    const data: Record<string, unknown> = {};
    const textFields = [
      'businessName',
      'displayName',
      'tagline',
      'bio',
      'email',
      'phone',
      'website',
      'baseCity',
      'baseState',
      'licenseNumber',
      'licenseState',
      'availabilityNotes',
      'featureCard1Title',
      'featureCard1Description',
      'featureCard2Title',
      'featureCard2Description',
      'featureCard3Title',
      'featureCard3Description',
      'featureCard4Title',
      'featureCard4Description',
      'featureCard5Title',
      'featureCard5Description',
      'featureCard6Title',
      'featureCard6Description',
    ];

    for (const field of textFields) {
      if (formData.has(field)) {
        data[field] = (formData.get(field) as string) || undefined;
      }
    }

    const numericFields = [
      'serviceRadius',
      'yearsExperience',
      'hourlyRate',
      'minimumJobSize',
    ];
    for (const field of numericFields) {
      if (formData.has(field)) {
        const value = formData.get(field) as string;
        data[field] = value ? Number(value) : undefined;
      }
    }

    for (const field of ['isPublic', 'acceptingNewWork', 'isAvailable']) {
      if (formData.has(field)) {
        const values = formData.getAll(field);
        data[field] = values[values.length - 1] === 'true';
      }
    }

    const validated = partialProfileSchema.parse(data);

    if (Object.keys(validated).length === 0) {
      return { success: false, message: 'No profile changes submitted' };
    }

    // Check subdomain uniqueness if provided
    if (validated.subdomain && validated.subdomain !== profile.subdomain) {
      const existing = await prisma.contractorProfile.findUnique({
        where: { subdomain: validated.subdomain },
      });
      if (existing && existing.id !== profile.id) {
        return { success: false, message: 'This subdomain is already taken' };
      }
    }

    await prisma.contractorProfile.update({
      where: { id: profile.id },
      data: validated,
    });

    revalidateContractorMarketplace(profile.slug, profile.subdomain);
    if (validated.subdomain && validated.subdomain !== profile.subdomain) {
      revalidateContractorMarketplace(profile.slug, validated.subdomain);
    }
    return { success: true, message: 'Profile updated' };
  } catch (error) {
    console.error('Failed to update profile:', error);
    return { success: false, message: 'Failed to update profile' };
  }
}

export async function updateContractorSpecialties(specialties: string[]) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return { success: false, message: 'Not authorized' };
    }

    const profile = await prisma.contractorProfile.update({
      where: { userId: session.user.id },
      data: { specialties },
      select: { slug: true, subdomain: true },
    });

    revalidateContractorMarketplace(profile.slug, profile.subdomain);
    return { success: true };
  } catch (error) {
    console.error('Failed to update specialties:', error);
    return { success: false, message: 'Failed to update specialties' };
  }
}

export async function updateContractorServiceAreas(serviceAreas: string[]) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return { success: false, message: 'Not authorized' };
    }

    const profile = await prisma.contractorProfile.update({
      where: { userId: session.user.id },
      data: { serviceAreas },
      select: { slug: true, subdomain: true },
    });

    revalidateContractorMarketplace(profile.slug, profile.subdomain);
    return { success: true };
  } catch (error) {
    console.error('Failed to update service areas:', error);
    return { success: false, message: 'Failed to update service areas' };
  }
}

export async function uploadContractorProfilePhoto(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return { success: false, message: 'Not authorized' };
    }

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    const file = formData.get('profilePhoto') as File;
    if (!file || file.size === 0) {
      return { success: false, message: 'No file provided' };
    }

    const urls = await saveFiles([file], ['profile'], 1, profile.id);

    await prisma.contractorProfile.update({
      where: { id: profile.id },
      data: { profilePhoto: urls[0] },
    });

    revalidateContractorMarketplace(profile.slug, profile.subdomain);
    return { success: true, message: 'Profile photo updated' };
  } catch (error) {
    console.error('Failed to upload profile photo:', error);
    return { success: false, message: 'Failed to upload photo' };
  }
}

export async function uploadContractorCoverPhoto(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return { success: false, message: 'Not authorized' };
    }

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    const file = formData.get('coverPhoto') as File;
    if (!file || file.size === 0) {
      return { success: false, message: 'No file provided' };
    }

    const urls = await saveFiles([file], ['cover'], 1, profile.id);

    await prisma.contractorProfile.update({
      where: { id: profile.id },
      data: { coverPhoto: urls[0] },
    });

    revalidateContractorMarketplace(profile.slug, profile.subdomain);
    return { success: true, message: 'Cover photo updated' };
  } catch (error) {
    console.error('Failed to upload cover photo:', error);
    return { success: false, message: 'Failed to upload photo' };
  }
}

export async function uploadContractorPortfolioImages(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return { success: false, message: 'Not authorized' };
    }

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    const files = formData.getAll('portfolioImages') as File[];
    if (!files.length) {
      return { success: false, message: 'No files provided' };
    }

    // Limit to 12 total portfolio images
    const currentCount = profile.portfolioImages?.length || 0;
    const maxNew = Math.max(0, 12 - currentCount);

    if (maxNew === 0) {
      return { success: false, message: 'Portfolio limit reached (12 images)' };
    }

    const urls = await saveFiles(
      files.slice(0, maxNew),
      ['portfolio'],
      maxNew,
      profile.id
    );

    await prisma.contractorProfile.update({
      where: { id: profile.id },
      data: {
        portfolioImages: [...(profile.portfolioImages || []), ...urls],
      },
    });

    revalidateContractorMarketplace(profile.slug, profile.subdomain);
    return { success: true, message: 'Portfolio images added' };
  } catch (error) {
    console.error('Failed to upload portfolio images:', error);
    return { success: false, message: 'Failed to upload images' };
  }
}

export async function deleteContractorPortfolioImage(imageUrl: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return { success: false, message: 'Not authorized' };
    }

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    await prisma.contractorProfile.update({
      where: { id: profile.id },
      data: {
        portfolioImages: profile.portfolioImages.filter(
          (url) => url !== imageUrl
        ),
      },
    });

    revalidateContractorMarketplace(profile.slug, profile.subdomain);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete portfolio image:', error);
    return { success: false, message: 'Failed to delete image' };
  }
}

export async function toggleContractorAvailability(isAvailable: boolean) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return { success: false, message: 'Not authorized' };
    }

    await prisma.contractorProfile.update({
      where: { userId: session.user.id },
      data: { isAvailable, acceptingNewWork: isAvailable },
    });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { slug: true, subdomain: true },
    });

    revalidateContractorMarketplace(profile?.slug, profile?.subdomain);
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle availability:', error);
    return { success: false, message: 'Failed to update availability' };
  }
}

export async function toggleContractorPublicProfile(isPublic: boolean) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return { success: false, message: 'Not authorized' };
    }

    await prisma.contractorProfile.update({
      where: { userId: session.user.id },
      data: { isPublic },
    });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { slug: true, subdomain: true },
    });

    revalidateContractorMarketplace(profile?.slug, profile?.subdomain);
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle public profile:', error);
    return { success: false, message: 'Failed to update visibility' };
  }
}

// Public marketplace queries
export async function getContractorProfileBySlug(slug: string) {
  try {
    const profile = await prisma.contractorProfile.findUnique({
      where: { slug, isPublic: true },
      include: {
        user: {
          select: { name: true, image: true },
        },
        reviewsReceived: {
          where: { status: 'published' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            customer: {
              select: { name: true, image: true },
            },
          },
        },
      },
    });

    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    return { success: true, profile };
  } catch (error) {
    console.error('Failed to get contractor profile:', error);
    return { success: false, message: 'Failed to load profile' };
  }
}

export async function getMarketplaceContractors(options?: {
  specialty?: string;
  city?: string;
  state?: string;
  minRating?: number;
  sortBy?: 'rank' | 'rating' | 'reviews' | 'price_low' | 'price_high';
  limit?: number;
  offset?: number;
}) {
  try {
    const {
      specialty,
      city,
      state,
      minRating = 0,
      sortBy = 'rank',
      limit = 20,
      offset = 0,
    } = options || {};

    const where: Prisma.ContractorProfileWhereInput = {
      isPublic: true,
      acceptingNewWork: true,
      avgRating: { gte: minRating },
    };

    if (specialty) {
      where.specialties = { has: specialty };
    }

    if (city) {
      where.OR = [
        { baseCity: { contains: city, mode: 'insensitive' } },
        { serviceAreas: { has: city } },
      ];
    }

    if (state) {
      where.baseState = { equals: state, mode: 'insensitive' };
    }

    const orderBy: Prisma.ContractorProfileOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'rating':
        orderBy.avgRating = 'desc';
        break;
      case 'reviews':
        orderBy.totalReviews = 'desc';
        break;
      case 'price_low':
        orderBy.hourlyRate = 'asc';
        break;
      case 'price_high':
        orderBy.hourlyRate = 'desc';
        break;
      default:
        orderBy.rankScore = 'desc';
    }

    const [contractors, total] = await Promise.all([
      prisma.contractorProfile.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        select: {
          id: true,
          slug: true,
          businessName: true,
          displayName: true,
          tagline: true,
          profilePhoto: true,
          coverPhoto: true,
          portfolioImages: true,
          specialties: true,
          baseCity: true,
          baseState: true,
          yearsExperience: true,
          hourlyRate: true,
          avgRating: true,
          totalReviews: true,
          completedJobs: true,
          isAvailable: true,
          insuranceVerified: true,
          backgroundChecked: true,
          licenseNumber: true,
        },
      }),
      prisma.contractorProfile.count({ where }),
    ]);

    return { success: true, contractors, total };
  } catch (error) {
    console.error('Failed to get marketplace contractors:', error);
    return {
      success: false,
      message: 'Failed to load contractors',
      contractors: [],
      total: 0,
    };
  }
}
