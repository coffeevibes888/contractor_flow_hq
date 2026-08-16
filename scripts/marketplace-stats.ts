import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

/**
 * Display statistics about marketplace dummy data
 */

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log('');
  console.log('📊 Marketplace Dummy Data Statistics');
  console.log('=====================================');
  console.log('');

  // Count dummy contractors
  const contractorCount = await prisma.contractorProfile.count({
    where: {
      user: {
        email: {
          startsWith: 'contractor',
          endsWith: '@example.com',
        },
      },
    },
  });

  // Count dummy landlords
  const landlordCount = await prisma.landlord.count({
    where: {
      subdomain: {
        startsWith: 'landlord-',
      },
    },
  });

  // Count properties from dummy landlords
  const propertyCount = await prisma.property.count({
    where: {
      landlord: {
        subdomain: {
          startsWith: 'landlord-',
        },
      },
    },
  });

  // Count units from dummy properties
  const unitCount = await prisma.unit.count({
    where: {
      property: {
        landlord: {
          subdomain: {
            startsWith: 'landlord-',
          },
        },
      },
    },
  });

  // Count portfolio items from dummy contractors
  const portfolioCount = await prisma.contractorPortfolioItem.count({
    where: {
      contractor: {
        user: {
          email: {
            startsWith: 'contractor',
            endsWith: '@example.com',
          },
        },
      },
    },
  });

  // Count reviews from dummy contractors
  const reviewCount = await prisma.contractorReview.count({
    where: {
      contractor: {
        user: {
          email: {
            startsWith: 'contractor',
            endsWith: '@example.com',
          },
        },
      },
    },
  });

  // Get contractor stats
  const contractorStats = await prisma.contractorProfile.aggregate({
    where: {
      user: {
        email: {
          startsWith: 'contractor',
          endsWith: '@example.com',
        },
      },
    },
    _avg: {
      avgRating: true,
      totalReviews: true,
      completedJobs: true,
      yearsExperience: true,
    },
    _max: {
      avgRating: true,
      totalReviews: true,
      completedJobs: true,
    },
  });

  // Get property stats
  const unitStats = await prisma.unit.aggregate({
    where: {
      property: {
        landlord: {
          subdomain: {
            startsWith: 'landlord-',
          },
        },
      },
    },
    _avg: {
      rentAmount: true,
      bedrooms: true,
      bathrooms: true,
      sizeSqFt: true,
    },
    _min: {
      rentAmount: true,
    },
    _max: {
      rentAmount: true,
    },
  });

  // Count by subscription tier
  const tierCounts = await prisma.contractorProfile.groupBy({
    by: ['subscriptionTier'],
    where: {
      user: {
        email: {
          startsWith: 'contractor',
          endsWith: '@example.com',
        },
      },
    },
    _count: true,
  });

  // Count by specialty (top 10)
  const contractors = await prisma.contractorProfile.findMany({
    where: {
      user: {
        email: {
          startsWith: 'contractor',
          endsWith: '@example.com',
        },
      },
    },
    select: {
      specialties: true,
    },
  });

  const specialtyCounts: Record<string, number> = {};
  contractors.forEach((c) => {
    c.specialties.forEach((s) => {
      specialtyCounts[s] = (specialtyCounts[s] || 0) + 1;
    });
  });

  const topSpecialties = Object.entries(specialtyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Count properties by city (top 10)
  const properties = await prisma.property.findMany({
    where: {
      landlord: {
        subdomain: {
          startsWith: 'landlord-',
        },
      },
    },
    select: {
      address: true,
    },
  });

  const cityCounts: Record<string, number> = {};
  properties.forEach((p: any) => {
    const city = p.address?.city;
    if (city) {
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    }
  });

  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Display results
  console.log('📈 Overview');
  console.log('─────────────────────────────────────');
  console.log(`Contractors:        ${contractorCount.toLocaleString()}`);
  console.log(`Landlords:          ${landlordCount.toLocaleString()}`);
  console.log(`Properties:         ${propertyCount.toLocaleString()}`);
  console.log(`Units:              ${unitCount.toLocaleString()}`);
  console.log(`Portfolio Items:    ${portfolioCount.toLocaleString()}`);
  console.log(`Reviews:            ${reviewCount.toLocaleString()}`);
  console.log('');

  console.log('👷 Contractor Statistics');
  console.log('─────────────────────────────────────');
  console.log(`Avg Rating:         ${contractorStats._avg.avgRating?.toFixed(2) || 'N/A'} ⭐`);
  console.log(`Avg Reviews:        ${Math.round(contractorStats._avg.totalReviews || 0)}`);
  console.log(`Avg Completed Jobs: ${Math.round(contractorStats._avg.completedJobs || 0)}`);
  console.log(`Avg Experience:     ${Math.round(contractorStats._avg.yearsExperience || 0)} years`);
  console.log(`Max Reviews:        ${contractorStats._max.totalReviews || 0}`);
  console.log(`Max Completed Jobs: ${contractorStats._max.completedJobs || 0}`);
  console.log('');

  console.log('💼 Subscription Tiers');
  console.log('─────────────────────────────────────');
  tierCounts.forEach((tier) => {
    const percentage = ((tier._count / contractorCount) * 100).toFixed(1);
    console.log(`${tier.subscriptionTier?.padEnd(12)}: ${tier._count.toString().padStart(3)} (${percentage}%)`);
  });
  console.log('');

  console.log('🔧 Top 10 Specialties');
  console.log('─────────────────────────────────────');
  topSpecialties.forEach(([specialty, count], index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${specialty.padEnd(25)} ${count}`);
  });
  console.log('');

  console.log('🏠 Property Statistics');
  console.log('─────────────────────────────────────');
  console.log(`Avg Rent:           $${unitStats._avg.rentAmount?.toFixed(2) || 'N/A'}/month`);
  console.log(`Rent Range:         $${unitStats._min.rentAmount || 0} - $${unitStats._max.rentAmount || 0}`);
  console.log(`Avg Bedrooms:       ${unitStats._avg.bedrooms?.toFixed(1) || 'N/A'}`);
  console.log(`Avg Bathrooms:      ${unitStats._avg.bathrooms?.toFixed(1) || 'N/A'}`);
  console.log(`Avg Size:           ${Math.round(unitStats._avg.sizeSqFt || 0).toLocaleString()} sq ft`);
  console.log('');

  console.log('🌆 Top 10 Cities');
  console.log('─────────────────────────────────────');
  topCities.forEach(([city, count], index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${city.padEnd(20)} ${count}`);
  });
  console.log('');

  console.log('✨ Your marketplace is looking great!');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error fetching marketplace stats:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Cleanup handled by script completion
  });
