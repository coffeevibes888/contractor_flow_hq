import { prisma } from '@/db/prisma';

/**
 * Landlord data returned from subdomain detection
 */
export interface LandlordSubdomainData {
  id: string;
  name: string;
  subdomain: string;
  companyName: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  heroImages: string[];
  logoUrl: string | null;
  themeColor: string;
  aboutBio: string | null;
  aboutPhoto: string | null;
  aboutGallery: string[];
  owner: {
    email: string | null;
    phoneNumber: string | null;
  } | null;
}

/**
 * Contractor data returned from subdomain detection
 */
export interface ContractorSubdomainData {
  id: string;
  userId: string;
  businessName: string;
  displayName: string;
  subdomain: string | null;
  slug: string;
  tagline: string | null;
  bio: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  baseCity: string | null;
  baseState: string | null;
  heroImages: string[];
  portfolioImages: string[];
  specialties: string[];
  logoUrl: string | null;
  themeColor: string | null;
  profilePhoto: string | null;
  coverPhoto: string | null;
  avgRating: number;
  totalReviews: number;
  completedJobs: number;
  onTimeRate: number;
  responseRate: number;
  repeatClientRate: number;
  yearsExperience: number | null;
  licenseNumber: string | null;
  insuranceVerified: boolean;
  backgroundChecked: boolean;
  identityVerified: boolean;
  isAvailable: boolean;
  availabilityNotes: string | null;
  hourlyRate: any; // Decimal
  minimumJobSize: any; // Decimal
  serviceAreas: string[];
  serviceRadius: number | null;
  aboutBio: string | null;
  aboutPhoto: string | null;
  aboutGallery: string[];
  // Feature cards
  featureCard1Title: string | null;
  featureCard1Description: string | null;
  featureCard1Icon: string | null;
  featureCard2Title: string | null;
  featureCard2Description: string | null;
  featureCard2Icon: string | null;
  featureCard3Title: string | null;
  featureCard3Description: string | null;
  featureCard3Icon: string | null;
  featureCard4Title: string | null;
  featureCard4Description: string | null;
  featureCard4Icon: string | null;
  featureCard5Title: string | null;
  featureCard5Description: string | null;
  featureCard5Icon: string | null;
  featureCard6Title: string | null;
  featureCard6Description: string | null;
  featureCard6Icon: string | null;
}

/**
 * Agent data returned from subdomain detection
 */
export interface AgentSubdomainData {
  id: string;
  userId: string;
  name: string;
  subdomain: string;
  licenseNumber: string | null;
  licenseState: string | null;
  brokerage: string | null;
  logoUrl: string | null;
  companyName: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  themeColor: string;
  heroImages: string[];
  aboutBio: string | null;
  aboutPhoto: string | null;
  aboutGallery: string[];
  website: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  youtubeUrl: string | null;
  specializations: string[];
  serviceAreas: string[];
  languages: string[];
  yearsExperience: number | null;
  totalSales: number;
  totalListings: number;
  user: {
    email: string | null;
    image: string | null;
    phoneNumber: string | null;
  } | null;
}

/**
 * Result of subdomain entity detection
 */
export type SubdomainEntityResult =
  | { type: 'landlord'; data: LandlordSubdomainData }
  | { type: 'contractor'; data: ContractorSubdomainData }
  | { type: 'agent'; data: AgentSubdomainData }
  | { type: 'not_found' };

/**
 * Detects whether a subdomain belongs to a landlord, contractor, or agent.
 * Checks Landlord table first, then Agent, then ContractorProfile if not found.
 * 
 * @param subdomain - The subdomain string to look up
 * @returns SubdomainEntityResult with entity type and data, or 'not_found'
 */
export async function detectSubdomainEntity(subdomain: string): Promise<SubdomainEntityResult> {
  // First, check if it's a landlord subdomain
  const landlord = await prisma.landlord.findUnique({
    where: { subdomain },
    select: {
      id: true,
      name: true,
      subdomain: true,
      companyName: true,
      companyEmail: true,
      companyPhone: true,
      companyAddress: true,
      heroImages: true,
      logoUrl: true,
      themeColor: true,
      aboutBio: true,
      aboutPhoto: true,
      aboutGallery: true,
      owner: {
        select: {
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  if (landlord) {
    return { type: 'landlord', data: landlord };
  }

  // Second, check if it's an agent subdomain
  const agent = await prisma.agent.findUnique({
    where: { subdomain },
    include: {
      user: {
        select: {
          email: true,
          image: true,
          phoneNumber: true,
        },
      },
    },
  });

  if (agent) {
    return { type: 'agent', data: agent as AgentSubdomainData };
  }

  // If not a landlord or agent, check if it's a contractor subdomain or slug
  // Contractors can use either their subdomain or slug
  const contractor = await prisma.contractorProfile.findFirst({
    where: {
      OR: [
        { subdomain },
        { slug: subdomain },
      ],
    },
    select: {
      id: true,
      userId: true,
      businessName: true,
      displayName: true,
      subdomain: true,
      slug: true,
      tagline: true,
      bio: true,
      email: true,
      phone: true,
      website: true,
      baseCity: true,
      baseState: true,
      heroImages: true,
      portfolioImages: true,
      specialties: true,
      logoUrl: true,
      themeColor: true,
      profilePhoto: true,
      coverPhoto: true,
      avgRating: true,
      totalReviews: true,
      completedJobs: true,
      onTimeRate: true,
      responseRate: true,
      repeatClientRate: true,
      yearsExperience: true,
      licenseNumber: true,
      insuranceVerified: true,
      backgroundChecked: true,
      identityVerified: true,
      isAvailable: true,
      availabilityNotes: true,
      hourlyRate: true,
      minimumJobSize: true,
      serviceAreas: true,
      serviceRadius: true,
      aboutBio: true,
      aboutPhoto: true,
      aboutGallery: true,
      featureCard1Title: true,
      featureCard1Description: true,
      featureCard1Icon: true,
      featureCard2Title: true,
      featureCard2Description: true,
      featureCard2Icon: true,
      featureCard3Title: true,
      featureCard3Description: true,
      featureCard3Icon: true,
      featureCard4Title: true,
      featureCard4Description: true,
      featureCard4Icon: true,
      featureCard5Title: true,
      featureCard5Description: true,
      featureCard5Icon: true,
      featureCard6Title: true,
      featureCard6Description: true,
      featureCard6Icon: true,
    },
  });

  if (contractor) {
    return { type: 'contractor', data: contractor };
  }

  return { type: 'not_found' };
}

/**
 * Gets the canonical subdomain path for a contractor.
 * Uses subdomain if set, otherwise falls back to slug.
 * 
 * @param contractor - Contractor data with subdomain and slug
 * @returns The subdomain path to use in URLs
 */
export function getContractorSubdomainPath(contractor: { subdomain: string | null; slug: string }): string {
  return contractor.subdomain || contractor.slug;
}
