import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract filters
    const query = searchParams.get('query') || '';
    const location = searchParams.get('location') || '';
    const radius = parseInt(searchParams.get('radius') || '25');
    const serviceTypes = searchParams.get('serviceTypes')?.split(',').filter(Boolean) || [];
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const maxPrice = parseInt(searchParams.get('maxPrice') || '10000');
    const verified = searchParams.get('verified') === 'true';
    const licensed = searchParams.get('licensed') === 'true';
    const insured = searchParams.get('insured') === 'true';
    const backgroundChecked = searchParams.get('backgroundChecked') === 'true';
    const minExperience = parseInt(searchParams.get('minExperience') || '0');
    const availability = searchParams.get('availability') || 'any';
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause
    const where: any = {
      isActive: true,
    };

    // Text search
    if (query) {
      where.OR = [
        { businessName: { contains: query, mode: 'insensitive' } },
        { bio: { contains: query, mode: 'insensitive' } },
        { tagline: { contains: query, mode: 'insensitive' } },
        { services: { hasSome: [query] } },
      ];
    }

    // Location search (simplified - in production use geocoding)
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Service types
    if (serviceTypes.length > 0) {
      where.services = { hasSome: serviceTypes };
    }

    // Rating
    if (minRating > 0) {
      where.rating = { gte: minRating };
    }

    // Price
    if (maxPrice < 10000) {
      where.hourlyRate = { lte: maxPrice };
    }

    // Experience
    if (minExperience > 0) {
      where.yearsExperience = { gte: minExperience };
    }

    // Availability
    if (availability !== 'any') {
      where.availability = availability;
    }

    // Verification filters
    if (verified || licensed || insured || backgroundChecked) {
      where.verification = {};

      if (verified) {
        where.verification.verificationStatus = 'verified';
      }
      if (licensed) {
        where.verification.licenseStatus = 'verified';
      }
      if (insured) {
        where.verification.insuranceStatus = 'verified';
      }
      if (backgroundChecked) {
        where.verification.backgroundCheckStatus = 'verified';
      }
    }

    // Build orderBy
    let orderBy: any = {};
    switch (sortBy) {
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'reviews':
        orderBy = { reviewCount: 'desc' };
        break;
      case 'price_low':
        orderBy = { hourlyRate: 'asc' };
        break;
      case 'price_high':
        orderBy = { hourlyRate: 'desc' };
        break;
      case 'experience':
        orderBy = { yearsExperience: 'desc' };
        break;
      case 'recent':
        orderBy = { updatedAt: 'desc' };
        break;
      default:
        // Relevance - prioritize verified, then rating
        orderBy = [
          { verification: { verificationStatus: 'desc' } },
          { rating: 'desc' },
        ];
    }

    // Execute query
    const [contractors, total] = await Promise.all([
      prisma.contractorProfile.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          verification: {
            select: {
              verificationStatus: true,
              badges: true,
              licenseStatus: true,
              insuranceStatus: true,
              backgroundCheckStatus: true,
            },
          },
        },
      }),
      prisma.contractorProfile.count({ where }),
    ]);

    // Calculate pagination
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      contractors,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
      filters: {
        query,
        location,
        radius,
        serviceTypes,
        minRating,
        maxPrice,
        verified,
        licensed,
        insured,
        backgroundChecked,
        minExperience,
        availability,
        sortBy,
      },
    });
  } catch (error) {
    console.error('Error searching contractors:', error);
    return NextResponse.json(
      { error: 'Failed to search contractors' },
      { status: 500 }
    );
  }
}
