import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

/**
 * Seed file for creating ONE showcase contractor per industry.
 * These are demo cards to show potential clients what the platform looks like.
 *
 * Creates:
 * - 9 contractor profiles (1 per specialty shown in the marketplace UI)
 * - A handful of reviews per contractor
 * - Portfolio items per contractor
 * - NO bulk test data, NO fake customers, NO fake landlords
 */

// Industry-relevant cover photos from Unsplash (free to use)
// Each photo matches the contractor's trade so the cards look professional.
const SHOWCASE_CONTRACTORS = [
  {
    specialty: 'Plumbing',
    businessName: 'Anderson Plumbing Co.',
    displayName: 'James Anderson',
    city: 'Atlanta',
    state: 'GA',
    zip: '30301',
    tagline: 'Licensed Plumbing Professional - 14 Years Experience',
    bio: 'Anderson Plumbing Co. has been serving the Atlanta area for 14 years. We specialize in residential and commercial plumbing, from leak repairs to full remodels. Fully licensed, insured, and committed to quality.',
    yearsExperience: 14,
    avgRating: 4.9,
    totalReviews: 87,
    completedJobs: 312,
    hourlyRate: 95,
    // Plumber working on pipes
    coverPhoto: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1200&h=400&fit=crop',
  },
  {
    specialty: 'Electrical',
    businessName: 'Gonzalez Electric Services',
    displayName: 'Michelle Gonzalez',
    city: 'Fort Worth',
    state: 'TX',
    zip: '76101',
    tagline: 'Licensed Electrician - 23 Years Experience',
    bio: 'Gonzalez Electric Services has been the trusted electrician in Fort Worth for over two decades. Panel upgrades, rewiring, smart home installations, and emergency repairs.',
    yearsExperience: 23,
    avgRating: 4.8,
    totalReviews: 134,
    completedJobs: 413,
    hourlyRate: 110,
    // Electrician at work
    coverPhoto: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&h=400&fit=crop',
  },
  {
    specialty: 'HVAC',
    businessName: 'Jackson HVAC Solutions',
    displayName: 'Nancy Jackson',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85001',
    tagline: 'Licensed HVAC Technician - 11 Years Experience',
    bio: 'Jackson HVAC Solutions keeps Phoenix cool. AC installation, furnace repair, duct cleaning, and preventive maintenance for residential and commercial properties.',
    yearsExperience: 11,
    avgRating: 5.0,
    totalReviews: 72,
    completedJobs: 330,
    hourlyRate: 105,
    // HVAC unit / air conditioning
    coverPhoto: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=1200&h=400&fit=crop',
  },
  {
    specialty: 'Carpentry',
    businessName: 'Davis Custom Carpentry',
    displayName: 'Robert Davis',
    city: 'Denver',
    state: 'CO',
    zip: '80201',
    tagline: 'Master Carpenter - 18 Years Experience',
    bio: 'Davis Custom Carpentry builds beautiful, lasting woodwork in Denver. Custom cabinets, trim, framing, decks, and furniture — craftsmanship you can see and feel.',
    yearsExperience: 18,
    avgRating: 4.9,
    totalReviews: 96,
    completedJobs: 275,
    hourlyRate: 90,
    // Carpentry / woodworking
    coverPhoto: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&h=400&fit=crop',
  },
  {
    specialty: 'Painting',
    businessName: 'Torres Painting Pros',
    displayName: 'Maria Torres',
    city: 'San Diego',
    state: 'CA',
    zip: '92101',
    tagline: 'Professional Painter - 9 Years Experience',
    bio: 'Torres Painting Pros delivers flawless interior and exterior painting across San Diego. Color consultation, prep work, and clean finishes every time.',
    yearsExperience: 9,
    avgRating: 4.7,
    totalReviews: 63,
    completedJobs: 198,
    hourlyRate: 75,
    // House painting
    coverPhoto: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=1200&h=400&fit=crop',
  },
  {
    specialty: 'Roofing',
    businessName: 'Wilson Roofing & Repair',
    displayName: 'David Wilson',
    city: 'Dallas',
    state: 'TX',
    zip: '75201',
    tagline: 'Licensed Roofer - 16 Years Experience',
    bio: 'Wilson Roofing & Repair handles everything from shingle replacement to full roof installations in Dallas. Storm damage, inspections, and preventive maintenance.',
    yearsExperience: 16,
    avgRating: 4.8,
    totalReviews: 108,
    completedJobs: 356,
    hourlyRate: 100,
    // Roofing work
    coverPhoto: 'https://images.unsplash.com/photo-1632759145351-1d592919f522?w=1200&h=400&fit=crop',
  },
  {
    specialty: 'Landscaping',
    businessName: 'Green Valley Landscaping',
    displayName: 'Carlos Martinez',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    tagline: 'Professional Landscaper - 12 Years Experience',
    bio: 'Green Valley Landscaping transforms outdoor spaces across Austin. Lawn care, hardscaping, irrigation, tree trimming, and seasonal maintenance.',
    yearsExperience: 12,
    avgRating: 4.9,
    totalReviews: 91,
    completedJobs: 420,
    hourlyRate: 70,
    // Landscaping / garden
    coverPhoto: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1200&h=400&fit=crop',
  },
  {
    specialty: 'General Repairs',
    businessName: 'Thompson Home Services',
    displayName: 'Sarah Thompson',
    city: 'Seattle',
    state: 'WA',
    zip: '98101',
    tagline: 'Licensed General Contractor - 10 Years Experience',
    bio: 'Thompson Home Services is your one-call solution in Seattle. Drywall, fixtures, doors, windows, and all-around handyman work done right the first time.',
    yearsExperience: 10,
    avgRating: 4.8,
    totalReviews: 77,
    completedJobs: 289,
    hourlyRate: 85,
    // General home repair / tools
    coverPhoto: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=1200&h=400&fit=crop',
  },
  {
    specialty: 'Appliance Repair',
    businessName: 'Lee Appliance Experts',
    displayName: 'Kevin Lee',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    tagline: 'Certified Appliance Technician - 8 Years Experience',
    bio: 'Lee Appliance Experts fixes washers, dryers, refrigerators, ovens, and dishwashers across Chicago. Fast diagnostics, fair pricing, same-day service available.',
    yearsExperience: 8,
    avgRating: 4.7,
    totalReviews: 55,
    completedJobs: 245,
    hourlyRate: 80,
    // Appliance / kitchen
    coverPhoto: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=400&fit=crop',
  },
];

// Review templates by rating
const REVIEW_TEMPLATES: Record<number, string[]> = {
  5: [
    'Absolutely fantastic work! Highly professional and completed the job ahead of schedule.',
    'Best contractor I\'ve ever worked with. Attention to detail was impeccable.',
    'Exceeded all expectations. Will definitely hire again for future projects.',
    'Outstanding service from start to finish. Very responsive and professional.',
  ],
  4: [
    'Great work overall. The end result was excellent.',
    'Very satisfied with the quality. Would hire again.',
    'Professional and reliable. Job was completed as promised.',
  ],
};

// Portfolio title templates per specialty
const PORTFOLIO_TITLES: Record<string, string[]> = {
  Plumbing: ['Kitchen Pipe Replacement', 'Bathroom Repiping', 'Water Heater Install'],
  Electrical: ['Panel Upgrade', 'Smart Home Wiring', 'Outdoor Lighting Install'],
  HVAC: ['AC Unit Replacement', 'Duct Cleaning & Sealing', 'Furnace Installation'],
  Carpentry: ['Custom Kitchen Cabinets', 'Deck Build', 'Crown Molding Install'],
  Painting: ['Full Interior Repaint', 'Exterior House Painting', 'Accent Wall Design'],
  Roofing: ['Full Roof Replacement', 'Storm Damage Repair', 'Gutter Installation'],
  Landscaping: ['Backyard Redesign', 'Irrigation System Install', 'Patio Hardscaping'],
  'General Repairs': ['Drywall Repair & Patch', 'Door & Window Replacement', 'Bathroom Fixture Upgrade'],
  'Appliance Repair': ['Refrigerator Compressor Fix', 'Washer Drum Replacement', 'Oven Thermostat Repair'],
};

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSlug(text: string, id: number): string {
  return `${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log('🌱 Starting showcase contractor seeding...');
  console.log('   Creating 1 example contractor per industry (9 total)\n');

  // ── Clean up old marketplace dummy data ──────────────────────────
  // Delete reviews, portfolio items, contractor profiles, and their
  // placeholder user accounts that were created by the old seed script.
  console.log('🧹 Cleaning up old marketplace dummy data...');

  // Delete all contractor reviews
  try { await prisma.contractorReview.deleteMany(); } catch (e) { /* table may not exist */ }

  // Delete all portfolio items
  try { await prisma.contractorPortfolioItem.deleteMany(); } catch (e) { /* table may not exist */ }

  // Delete all contractor profiles
  try { await prisma.contractorProfile.deleteMany(); } catch (e) { /* table may not exist */ }

  // Delete placeholder users (contractor0@example.com ... contractor349@example.com, customer0@example.com ... customer49@example.com)
  try {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { startsWith: 'contractor', endsWith: '@example.com' } },
          { email: { startsWith: 'customer', endsWith: '@example.com' } },
        ],
      },
    });
  } catch (e) { /* ignore */ }

  // Delete dummy landlords created by old seed (landlord-1-*, etc.)
  try {
    await prisma.landlord.deleteMany({
      where: { subdomain: { startsWith: 'landlord-' } },
    });
  } catch (e) { /* ignore */ }

  // Delete dummy properties created by old seed
  try {
    await prisma.unit.deleteMany({
      where: { property: { slug: { contains: '-st-' } } },
    });
    await prisma.property.deleteMany({
      where: { slug: { contains: '-st-' } },
    });
  } catch (e) { /* ignore */ }

  console.log('✅ Old dummy data cleaned up\n');

  // ── Create showcase contractors ──────────────────────────────────
  const contractors = [];

  for (let i = 0; i < SHOWCASE_CONTRACTORS.length; i++) {
    const c = SHOWCASE_CONTRACTORS[i];

    // Create a user account for this contractor
    const user = await prisma.user.create({
      data: {
        name: c.displayName,
        email: `showcase-${c.specialty.toLowerCase().replace(/\s+/g, '-')}@propertyflowhq.com`,
        role: 'user',
      },
    });

    const rankScore =
      (c.avgRating / 5) * 40 +
      Math.min(c.totalReviews / 100, 1) * 20 +
      Math.min(c.completedJobs / 200, 1) * 20 +
      Math.min(c.yearsExperience / 20, 1) * 20;

    const contractor = await prisma.contractorProfile.create({
      data: {
        userId: user.id,
        slug: generateSlug(c.businessName, i),
        businessName: c.businessName,
        displayName: c.displayName,
        tagline: c.tagline,
        bio: c.bio,
        profilePhoto: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.displayName)}&size=200&background=random`,
        coverPhoto: c.coverPhoto,
        email: `contact@${generateSlug(c.businessName, i)}.example.com`,
        phone: `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
        serviceAreas: [c.zip],
        serviceRadius: 30,
        baseCity: c.city,
        baseState: c.state,
        specialties: [c.specialty],
        yearsExperience: c.yearsExperience,
        licenseNumber: `${c.state}-${randomInt(100000, 999999)}`,
        licenseState: c.state,
        insuranceVerified: true,
        backgroundChecked: true,
        isAvailable: true,
        isPublic: true,
        acceptingNewWork: true,
        hourlyRate: c.hourlyRate,
        rankScore,
        avgRating: c.avgRating,
        totalReviews: c.totalReviews,
        completedJobs: c.completedJobs,
        responseRate: randomFloat(0.90, 1.0, 2),
        onTimeRate: randomFloat(0.90, 1.0, 2),
        repeatClientRate: randomFloat(0.50, 0.80, 2),
        identityVerified: true,
        licenseVerifiedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        backgroundCheckDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        instantBookingEnabled: true,
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        isPaymentReady: true,
        themeColor: ['violet', 'emerald', 'blue', 'rose', 'amber'][i % 5],
      },
    });

    contractors.push(contractor);
    console.log(`   ✅ ${c.specialty}: ${c.businessName} (${c.city}, ${c.state})`);
  }

  // ── Create a small set of reviewer accounts ──────────────────────
  console.log('\n⭐ Creating reviews...');
  const reviewerNames = [
    'Alex Rivera', 'Jordan Chen', 'Taylor Brooks', 'Morgan Patel', 'Casey Williams',
  ];
  const reviewers = [];
  for (let i = 0; i < reviewerNames.length; i++) {
    const reviewer = await prisma.user.create({
      data: {
        name: reviewerNames[i],
        email: `showcase-reviewer-${i}@propertyflowhq.com`,
        role: 'user',
      },
    });
    reviewers.push(reviewer);
  }

  // Add 3-5 reviews per contractor
  let reviewCount = 0;
  for (const contractor of contractors) {
    const numReviews = randomInt(3, 5);
    for (let r = 0; r < numReviews; r++) {
      const rating = Math.random() > 0.3 ? 5 : 4;
      const templates = REVIEW_TEMPLATES[rating];
      await prisma.contractorReview.create({
        data: {
          contractorId: contractor.id,
          customerId: reviewers[r % reviewers.length].id,
          overallRating: rating,
          qualityRating: randomFloat(rating - 0.3, rating, 1),
          communicationRating: randomFloat(rating - 0.3, rating, 1),
          timelinessRating: randomFloat(rating - 0.3, rating, 1),
          professionalismRating: randomFloat(rating - 0.3, rating, 1),
          valueRating: randomFloat(rating - 0.3, rating, 1),
          title: rating === 5 ? 'Excellent Service!' : 'Very Good',
          comment: templates[r % templates.length],
          projectType: contractor.specialties[0],
          projectCost: randomFloat(500, 8000, 2),
          verified: true,
          status: 'published',
          createdAt: new Date(Date.now() - randomInt(30, 365) * 24 * 60 * 60 * 1000),
        },
      });
      reviewCount++;
    }
  }
  console.log(`   ✅ Created ${reviewCount} reviews`);

  // ── Create portfolio items per contractor ────────────────────────
  console.log('\n📸 Creating portfolio items...');
  let portfolioCount = 0;
  for (let i = 0; i < contractors.length; i++) {
    const c = SHOWCASE_CONTRACTORS[i];
    const titles = PORTFOLIO_TITLES[c.specialty] || ['Project 1', 'Project 2', 'Project 3'];
    for (let p = 0; p < titles.length; p++) {
      await prisma.contractorPortfolioItem.create({
        data: {
          contractorId: contractors[i].id,
          title: titles[p],
          description: `Professional ${c.specialty.toLowerCase()} work completed in ${c.city}. Client was extremely satisfied with the results.`,
          category: c.specialty.toLowerCase().replace(/\s+/g, '-'),
          images: [
            `https://picsum.photos/seed/showcase-${i}-${p}/800/600`,
            `https://picsum.photos/seed/showcase-${i}-${p + 10}/800/600`,
          ],
          projectDate: new Date(Date.now() - randomInt(60, 365) * 24 * 60 * 60 * 1000),
          budget: randomFloat(1000, 10000, 2),
          duration: randomInt(1, 14),
          location: `${c.city}, ${c.state}`,
          featured: p === 0,
        },
      });
      portfolioCount++;
    }
  }
  console.log(`   ✅ Created ${portfolioCount} portfolio items`);

  // ── Summary ──────────────────────────────────────────────────────
  console.log('\n🎉 Showcase seeding completed!');
  console.log(`\n📊 Summary:`);
  console.log(`   - ${contractors.length} showcase contractor profiles (1 per industry)`);
  console.log(`   - ${portfolioCount} portfolio items`);
  console.log(`   - ${reviewCount} reviews`);
  console.log(`   - ${reviewers.length} reviewer accounts`);
  console.log(`\n✨ Your marketplace now shows 1 polished example per trade.`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding showcase data:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Cleanup handled by script completion
  });
