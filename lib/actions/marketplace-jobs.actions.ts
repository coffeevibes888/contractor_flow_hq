'use server';

import { prisma } from '@/db/prisma';
import { formatError } from '../utils';

export type JobPosterType = 'homeowner' | 'landlord' | 'agent';

export interface MarketplaceJob {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  budgetMin: number | null;
  budgetMax: number | null;
  isOpenBid: boolean;
  bidDeadline: Date | null;
  createdAt: Date;
  bidCount: number;
  posterType: JobPosterType;
  poster: {
    name: string | null;
    city: string | null;
    state: string | null;
    companyName?: string | null;
  };
  property?: {
    name: string | null;
    address: string | null;
  };
}

export async function getMarketplaceJobs(options?: {
  category?: string;
  priority?: string;
  city?: string;
  state?: string;
  posterType?: JobPosterType;
  minBudget?: number;
  maxBudget?: number;
  sortBy?: 'newest' | 'budget_high' | 'budget_low' | 'deadline';
  limit?: number;
  offset?: number;
}) {
  try {
    const {
      category,
      priority,
      city,
      state,
      posterType,
      minBudget,
      maxBudget,
      sortBy = 'newest',
      limit = 20,
      offset = 0,
    } = options || {};

    const jobs: MarketplaceJob[] = [];

    // Fetch homeowner jobs
    if (!posterType || posterType === 'homeowner') {
      const homeownerWhere: any = {
        status: 'open',
        isOpenBid: true,
      };
      if (category) homeownerWhere.category = category;
      if (priority) homeownerWhere.priority = priority;
      if (minBudget !== undefined) homeownerWhere.budgetMax = { gte: minBudget };
      if (maxBudget !== undefined) homeownerWhere.budgetMin = { lte: maxBudget };

      const homeownerJobs = await prisma.homeownerWorkOrder.findMany({
        where: homeownerWhere,
        include: {
          homeowner: {
            select: { name: true, address: true },
          },
          bids: { select: { id: true } },
        },
      });

      for (const job of homeownerJobs) {
        const address = job.homeowner.address as any;
        jobs.push({
          id: job.id,
          title: job.title,
          description: job.description,
          category: job.category,
          priority: job.priority,
          budgetMin: job.budgetMin ? Number(job.budgetMin) : null,
          budgetMax: job.budgetMax ? Number(job.budgetMax) : null,
          isOpenBid: job.isOpenBid,
          bidDeadline: job.bidDeadline,
          createdAt: job.createdAt,
          bidCount: job.bids.length,
          posterType: 'homeowner',
          poster: {
            name: job.homeowner.name,
            city: address?.city || null,
            state: address?.state || null,
          },
        });
      }
    }

    // Fetch landlord jobs
    if (!posterType || posterType === 'landlord') {
      const landlordWhere: any = {
        status: 'open',
        isOpenBid: true,
      };
      if (category) landlordWhere.category = category;
      if (priority) landlordWhere.priority = priority;
      if (minBudget !== undefined) landlordWhere.budgetMax = { gte: minBudget };
      if (maxBudget !== undefined) landlordWhere.budgetMin = { lte: maxBudget };

      const landlordJobs = await prisma.workOrder.findMany({
        where: landlordWhere,
        include: {
          landlord: {
            select: { name: true, companyName: true, companyAddress: true },
          },
          property: {
            select: { name: true, address: true },
          },
          bids: { select: { id: true } },
        },
      });

      for (const job of landlordJobs) {
        const propAddress = job.property.address as any;
        jobs.push({
          id: job.id,
          title: job.title,
          description: job.description,
          category: 'general', // WorkOrder doesn't have category field
          priority: job.priority,
          budgetMin: job.budgetMin ? Number(job.budgetMin) : null,
          budgetMax: job.budgetMax ? Number(job.budgetMax) : null,
          isOpenBid: job.isOpenBid,
          bidDeadline: job.bidDeadline,
          createdAt: job.createdAt,
          bidCount: job.bids.length,
          posterType: 'landlord',
          poster: {
            name: job.landlord.name,
            companyName: job.landlord.companyName,
            city: propAddress?.city || null,
            state: propAddress?.state || null,
          },
          property: {
            name: job.property.name,
            address: propAddress?.street || null,
          },
        });
      }
    }

    // Fetch agent jobs - temporarily disabled until Prisma client is regenerated
    // TODO: Run `npx prisma generate` to enable agent work orders
    /*
    if (!posterType || posterType === 'agent') {
      const agentWhere: any = {
        status: 'open',
        isOpenBid: true,
      };
      if (category) agentWhere.category = category;
      if (priority) agentWhere.priority = priority;
      if (minBudget !== undefined) agentWhere.budgetMax = { gte: minBudget };
      if (maxBudget !== undefined) agentWhere.budgetMin = { lte: maxBudget };

      const agentJobs = await prisma.agentWorkOrder.findMany({
        where: agentWhere,
        include: {
          agent: {
            select: { name: true, companyName: true },
          },
          listing: {
            select: { title: true, address: true },
          },
          bids: { select: { id: true } },
        },
      });

      for (const job of agentJobs) {
        const jobAddress = job.address as any;
        const listingAddress = job.listing?.address as any;
        jobs.push({
          id: job.id,
          title: job.title,
          description: job.description,
          category: job.category,
          priority: job.priority,
          budgetMin: job.budgetMin ? Number(job.budgetMin) : null,
          budgetMax: job.budgetMax ? Number(job.budgetMax) : null,
          isOpenBid: job.isOpenBid,
          bidDeadline: job.bidDeadline,
          createdAt: job.createdAt,
          bidCount: job.bids.length,
          posterType: 'agent',
          poster: {
            name: job.agent.name,
            companyName: job.agent.companyName,
            city: jobAddress?.city || listingAddress?.city || null,
            state: jobAddress?.state || listingAddress?.state || null,
          },
          property: job.listing ? {
            name: job.listing.title,
            address: listingAddress?.street || null,
          } : undefined,
        });
      }
    }
    */

    // Filter by location if specified
    let filteredJobs = jobs;
    if (city || state) {
      filteredJobs = jobs.filter((job) => {
        if (city && job.poster.city) {
          if (!job.poster.city.toLowerCase().includes(city.toLowerCase())) {
            return false;
          }
        }
        if (state && job.poster.state) {
          if (!job.poster.state.toLowerCase().includes(state.toLowerCase())) {
            return false;
          }
        }
        return true;
      });
    }

    // Sort
    filteredJobs.sort((a, b) => {
      switch (sortBy) {
        case 'budget_high':
          return (b.budgetMax || 0) - (a.budgetMax || 0);
        case 'budget_low':
          return (a.budgetMin || 0) - (b.budgetMin || 0);
        case 'deadline':
          if (!a.bidDeadline) return 1;
          if (!b.bidDeadline) return -1;
          return new Date(a.bidDeadline).getTime() - new Date(b.bidDeadline).getTime();
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    // Paginate
    const total = filteredJobs.length;
    const paginatedJobs = filteredJobs.slice(offset, offset + limit);

    return { success: true, jobs: paginatedJobs, total };
  } catch (error) {
    console.error('Failed to get marketplace jobs:', error);
    return { success: false, message: formatError(error), jobs: [], total: 0 };
  }
}

export async function getMarketplaceJobById(jobId: string, posterType: JobPosterType) {
  try {
    if (posterType === 'homeowner') {
      const job = await prisma.homeownerWorkOrder.findUnique({
        where: { id: jobId },
        include: {
          homeowner: {
            select: {
              name: true,
              address: true,
              homeType: true,
              yearBuilt: true,
              squareFootage: true,
            },
          },
          bids: { select: { id: true, status: true, createdAt: true } },
        },
      });

      if (!job || job.status !== 'open' || !job.isOpenBid) {
        return { success: false, message: 'Job not found or no longer accepting bids' };
      }

      const address = job.homeowner.address as any;
      return {
        success: true,
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          category: job.category,
          priority: job.priority,
          budgetMin: job.budgetMin ? Number(job.budgetMin) : null,
          budgetMax: job.budgetMax ? Number(job.budgetMax) : null,
          isOpenBid: job.isOpenBid,
          bidDeadline: job.bidDeadline,
          createdAt: job.createdAt,
          images: job.images,
          notes: job.notes,
          bidCount: job.bids.length,
          posterType: 'homeowner' as JobPosterType,
          poster: {
            name: job.homeowner.name,
            city: address?.city || null,
            state: address?.state || null,
            homeType: job.homeowner.homeType,
            yearBuilt: job.homeowner.yearBuilt,
            squareFootage: job.homeowner.squareFootage,
          },
        },
      };
    }

    if (posterType === 'landlord') {
      const job = await prisma.workOrder.findUnique({
        where: { id: jobId },
        include: {
          landlord: {
            select: { name: true, companyName: true },
          },
          property: {
            select: { name: true, address: true, type: true },
          },
          bids: { select: { id: true, status: true, createdAt: true } },
          media: { select: { url: true, type: true } },
        },
      });

      if (!job || job.status !== 'open' || !job.isOpenBid) {
        return { success: false, message: 'Job not found or no longer accepting bids' };
      }

      const propAddress = job.property.address as any;
      return {
        success: true,
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          category: 'general', // WorkOrder doesn't have category field
          priority: job.priority,
          budgetMin: job.budgetMin ? Number(job.budgetMin) : null,
          budgetMax: job.budgetMax ? Number(job.budgetMax) : null,
          isOpenBid: job.isOpenBid,
          bidDeadline: job.bidDeadline,
          createdAt: job.createdAt,
          images: job.media.filter(m => m.type === 'image').map(m => m.url),
          notes: job.notes,
          bidCount: job.bids.length,
          posterType: 'landlord' as JobPosterType,
          poster: {
            name: job.landlord.name,
            companyName: job.landlord.companyName,
            city: propAddress?.city || null,
            state: propAddress?.state || null,
          },
          property: {
            name: job.property.name,
            type: job.property.type,
            address: propAddress?.street || null,
          },
        },
      };
    }

    // Agent jobs - temporarily disabled until Prisma client is regenerated
    // TODO: Run `npx prisma generate` to enable agent work orders
    /*
    if (posterType === 'agent') {
      const job = await prisma.agentWorkOrder.findUnique({
        where: { id: jobId },
        include: {
          agent: {
            select: { name: true, companyName: true },
          },
          listing: {
            select: { title: true, address: true, propertyType: true },
          },
          bids: { select: { id: true, status: true, createdAt: true } },
        },
      });

      if (!job || job.status !== 'open' || !job.isOpenBid) {
        return { success: false, message: 'Job not found or no longer accepting bids' };
      }

      const jobAddress = job.address as any;
      const listingAddress = job.listing?.address as any;
      return {
        success: true,
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          category: job.category,
          priority: job.priority,
          budgetMin: job.budgetMin ? Number(job.budgetMin) : null,
          budgetMax: job.budgetMax ? Number(job.budgetMax) : null,
          isOpenBid: job.isOpenBid,
          bidDeadline: job.bidDeadline,
          createdAt: job.createdAt,
          images: job.images,
          notes: job.notes,
          bidCount: job.bids.length,
          posterType: 'agent' as JobPosterType,
          poster: {
            name: job.agent.name,
            companyName: job.agent.companyName,
            city: jobAddress?.city || listingAddress?.city || null,
            state: jobAddress?.state || listingAddress?.state || null,
          },
          property: job.listing ? {
            name: job.listing.title,
            type: job.listing.propertyType,
            address: listingAddress?.street || null,
          } : undefined,
        },
      };
    }
    */

    // For now, agent poster type returns error until Prisma client is regenerated
    if (posterType === 'agent') {
      return { success: false, message: 'Agent jobs are temporarily unavailable. Please try again later.' };
    }

    return { success: false, message: 'Invalid poster type' };
  } catch (error) {
    console.error('Failed to get marketplace job:', error);
    return { success: false, message: formatError(error) };
  }
}
