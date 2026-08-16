'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { formatError } from '../utils';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { randomUUID } from 'crypto';

// ============= HOMEOWNER PROFILE =============

export async function getHomeownerProfile() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: { name: true, email: true, image: true },
        },
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            bids: {
              where: { status: 'pending' },
            },
          },
        },
      },
    });

    if (!homeowner) {
      return { success: false, message: 'Homeowner profile not found' };
    }

    // Serialize for client
    return {
      success: true,
      homeowner: {
        ...homeowner,
        bathrooms: homeowner.bathrooms ? Number(homeowner.bathrooms) : null,
      },
    };
  } catch (error) {
    console.error('Failed to get homeowner profile:', error);
    return { success: false, message: formatError(error) };
  }
}

export async function updateHomeownerProfile(data: {
  name?: string;
  homeType?: string;
  interestedServices?: string[];
  projectTimeline?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  yearBuilt?: number;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
  lotSize?: string;
  description?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { userId: session.user.id },
    });

    if (!homeowner) {
      return { success: false, message: 'Homeowner profile not found' };
    }

    await prisma.homeowner.update({
      where: { userId: session.user.id },
      data: {
        name: data.name,
        homeType: data.homeType,
        interestedServices: data.interestedServices,
        projectTimeline: data.projectTimeline,
        address: data.address ? data.address : undefined,
        yearBuilt: data.yearBuilt,
        squareFootage: data.squareFootage,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        lotSize: data.lotSize,
        description: data.description,
      },
    });

    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('Failed to update homeowner profile:', error);
    return { success: false, message: formatError(error) };
  }
}

export async function uploadHomeImages(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { userId: session.user.id },
    });

    if (!homeowner) {
      return { success: false, message: 'Homeowner profile not found' };
    }

    const files = formData.getAll('images') as File[];
    if (!files.length) {
      return { success: false, message: 'No images provided' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const uploadedUrls: string[] = [];

    for (const file of files.slice(0, 10)) { // Max 10 images
      if (!allowedTypes.includes(file.type)) {
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        continue; // Skip files over 5MB
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const folder = `propertyflowhq/homeowners/${homeowner.id}/home`;
      const publicId = `${homeowner.id}-${randomUUID()}`;

      try {
        const result = await uploadToCloudinary(buffer, {
          folder,
          public_id: publicId,
          resource_type: 'image',
        });
        uploadedUrls.push(result.secure_url);
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
      }
    }

    if (uploadedUrls.length === 0) {
      return { success: false, message: 'Failed to upload images' };
    }

    // Append to existing images
    const currentImages = homeowner.images || [];
    await prisma.homeowner.update({
      where: { userId: session.user.id },
      data: {
        images: [...currentImages, ...uploadedUrls],
      },
    });

    return { 
      success: true, 
      message: `${uploadedUrls.length} image(s) uploaded successfully`,
      images: [...currentImages, ...uploadedUrls],
    };
  } catch (error) {
    console.error('Failed to upload home images:', error);
    return { success: false, message: formatError(error) };
  }
}

export async function deleteHomeImage(imageUrl: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { userId: session.user.id },
    });

    if (!homeowner) {
      return { success: false, message: 'Homeowner profile not found' };
    }

    const updatedImages = (homeowner.images || []).filter(img => img !== imageUrl);

    await prisma.homeowner.update({
      where: { userId: session.user.id },
      data: { images: updatedImages },
    });

    return { success: true, message: 'Image deleted', images: updatedImages };
  } catch (error) {
    console.error('Failed to delete home image:', error);
    return { success: false, message: formatError(error) };
  }
}


// ============= CONTRACTOR SEARCH WITH PREFERENCES =============

export async function getRecommendedContractors(options?: {
  limit?: number;
  category?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    // Get homeowner preferences
    const homeowner = await prisma.homeowner.findUnique({
      where: { userId: session.user.id },
      select: {
        interestedServices: true,
        homeType: true,
        projectTimeline: true,
      },
    });

    const interestedServices = homeowner?.interestedServices || [];
    const category = options?.category;
    const limit = options?.limit || 10;

    // Build query - prioritize contractors matching homeowner's interested services
    const where: any = {
      userId: { not: null },
    };

    // If specific category requested, filter by it
    if (category) {
      where.specialties = { has: category };
    } else if (interestedServices.length > 0) {
      // Otherwise use homeowner's preferences
      where.specialties = { hasSome: interestedServices };
    }

    const contractors = await prisma.contractor.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        workOrders: {
          where: { status: 'completed' },
          select: { id: true },
        },
      },
      take: limit,
    });

    // Calculate match score and stats
    const contractorsWithScore = contractors.map(c => {
      // Calculate how many of the homeowner's interested services this contractor offers
      const matchingServices = interestedServices.filter(s => 
        c.specialties.includes(s)
      );
      const matchScore = interestedServices.length > 0 
        ? (matchingServices.length / interestedServices.length) * 100 
        : 50;

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        specialties: c.specialties,
        isPaymentReady: c.isPaymentReady,
        completedJobs: c.workOrders.length,
        rating: 4.5 + Math.random() * 0.5,
        matchScore: Math.round(matchScore),
        matchingServices,
        user: c.user ? {
          id: c.user.id,
          name: c.user.name,
          image: c.user.image,
        } : null,
      };
    });

    // Sort by match score, then by completed jobs
    const sorted = contractorsWithScore.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return b.completedJobs - a.completedJobs;
    });

    return { success: true, contractors: sorted };
  } catch (error) {
    console.error('Failed to get recommended contractors:', error);
    return { success: false, message: formatError(error) };
  }
}

// ============= HOMEOWNER WORK ORDERS =============

export async function getHomeownerWorkOrders(filters?: {
  status?: string;
  category?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { userId: session.user.id },
    });

    if (!homeowner) {
      return { success: false, message: 'Homeowner profile not found' };
    }

    const workOrders = await prisma.homeownerWorkOrder.findMany({
      where: {
        homeownerId: homeowner.id,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.category && { category: filters.category }),
      },
      include: {
        bids: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Serialize decimals
    const serialized = workOrders.map(wo => ({
      ...wo,
      budgetMin: wo.budgetMin ? Number(wo.budgetMin) : null,
      budgetMax: wo.budgetMax ? Number(wo.budgetMax) : null,
      agreedPrice: wo.agreedPrice ? Number(wo.agreedPrice) : null,
      bids: wo.bids.map(b => ({
        ...b,
        amount: Number(b.amount),
        estimatedHours: b.estimatedHours ? Number(b.estimatedHours) : null,
      })),
    }));

    return { success: true, workOrders: serialized };
  } catch (error) {
    console.error('Failed to get homeowner work orders:', error);
    return { success: false, message: formatError(error) };
  }
}

export async function createHomeownerWorkOrder(data: {
  title: string;
  description: string;
  category: string;
  priority?: string;
  budgetMin?: number;
  budgetMax?: number;
  isOpenBid?: boolean;
  bidDeadline?: Date;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { userId: session.user.id },
    });

    if (!homeowner) {
      return { success: false, message: 'Homeowner profile not found' };
    }

    const workOrder = await prisma.homeownerWorkOrder.create({
      data: {
        homeownerId: homeowner.id,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority || 'medium',
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        isOpenBid: data.isOpenBid ?? true,
        bidDeadline: data.bidDeadline,
        address: homeowner.address ?? undefined, // Use homeowner's address by default
      },
    });

    // ✅ NEW: Emit event for work order creation (notifies contractors)
    try {
      const { dbTriggers } = await import('@/lib/event-system');
      await dbTriggers.onWorkOrderCreate(workOrder, 'homeowner');
    } catch (error) {
      console.error('Failed to emit work order event:', error);
    }

    return { 
      success: true, 
      message: 'Job posted successfully',
      workOrderId: workOrder.id,
    };
  } catch (error) {
    console.error('Failed to create work order:', error);
    return { success: false, message: formatError(error) };
  }
}

// ============= DASHBOARD STATS =============

export async function getHomeownerDashboardStats() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { userId: session.user.id },
      include: {
        workOrders: {
          include: {
            bids: true,
          },
        },
      },
    });

    if (!homeowner) {
      return { success: false, message: 'Homeowner profile not found' };
    }

    const workOrders = homeowner.workOrders;
    const activeJobs = workOrders.filter(wo => 
      ['open', 'assigned', 'in_progress'].includes(wo.status)
    ).length;
    const completedJobs = workOrders.filter(wo => wo.status === 'completed').length;
    const pendingBids = workOrders.reduce((sum, wo) => 
      sum + wo.bids.filter(b => b.status === 'pending').length, 0
    );

    // Calculate total spent
    const totalSpent = workOrders
      .filter(wo => wo.status === 'completed' && wo.agreedPrice)
      .reduce((sum, wo) => sum + Number(wo.agreedPrice), 0);

    // Check if home profile is complete
    const profileComplete = Boolean(
      homeowner.address && 
      homeowner.homeType && 
      homeowner.images.length > 0
    );

    return {
      success: true,
      stats: {
        activeJobs,
        completedJobs,
        pendingBids,
        totalSpent,
        profileComplete,
        homeImagesCount: homeowner.images.length,
      },
    };
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return { success: false, message: formatError(error) };
  }
}
