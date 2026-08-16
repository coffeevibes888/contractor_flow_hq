/**
 * Seed core accounts on a fresh database.
 *
 * Creates:
 *   - 1 super admin (real email)
 *   - 1 demo tenant (no subscription)
 *   - 1 demo agent  (no subscription)
 *   - 1 demo homeowner (no subscription)
 *   - 1 demo contractor (lifetime enterprise)
 *   - 3 real contractor accounts for the launch friend businesses
 *     (lifetime enterprise on each)
 *
 * "Lifetime" = subscriptionStatus 'active', subscriptionTier 'enterprise',
 * subscriptionEndsAt year 2100. No trial, no Stripe.
 *
 * Run with: npx tsx db/seed-accounts.ts
 *
 * Idempotent — safe to re-run. Existing users by email are left untouched
 * except for role/password updates if you uncomment the section below.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const LIFETIME_END = new Date('2100-01-01T00:00:00Z');

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: 'superAdmin' | 'tenant' | 'agent' | 'homeowner' | 'contractor';
  // Contractor-only metadata for ContractorProfile
  contractor?: {
    businessName: string;
    displayName: string;
    slug: string;
  };
  // Agent-only metadata
  agent?: {
    licenseNumber?: string;
  };
};

const SUPER_ADMIN_PW = 'NewLove2044$';
const SHARED_PW = 'NewLife101$';

const ACCOUNTS: SeedUser[] = [
  {
    name: 'Property Flow HQ',
    email: 'propertyflowhq@gmail.com',
    password: SUPER_ADMIN_PW,
    role: 'superAdmin',
  },
  {
    name: 'Demo Tenant',
    email: 'tenant@propertyflowhq.com',
    password: SHARED_PW,
    role: 'tenant',
  },
  {
    name: 'Demo Agent',
    email: 'agent@propertyflowhq.com',
    password: SHARED_PW,
    role: 'agent',
    agent: {},
  },
  {
    name: 'Demo Homeowner',
    email: 'homeowner@propertyflowhq.com',
    password: SHARED_PW,
    role: 'homeowner',
  },
  {
    name: 'Demo Contractor',
    email: 'contractor@propertyflowhq.com',
    password: SHARED_PW,
    role: 'contractor',
    contractor: {
      businessName: 'Demo Contractor',
      displayName: 'Demo Contractor',
      slug: 'demo-contractor',
    },
  },
  {
    name: 'Vegas Warrior',
    email: 'vegaswarrior888@gmail.com',
    password: SHARED_PW,
    role: 'contractor',
    contractor: {
      businessName: 'Vegas Warrior',
      displayName: 'Vegas Warrior',
      slug: 'vegas-warrior',
    },
  },
  {
    name: 'Coffee Vibes',
    email: 'coffeevibes888@gmail.com',
    password: SHARED_PW,
    role: 'contractor',
    contractor: {
      businessName: 'Coffee Vibes',
      displayName: 'Coffee Vibes',
      slug: 'coffee-vibes',
    },
  },
  {
    name: 'Earth Angel Allen',
    email: 'earthangelallen888@gmail.com',
    password: SHARED_PW,
    role: 'contractor',
    contractor: {
      businessName: 'Earth Angel Allen',
      displayName: 'Earth Angel Allen',
      slug: 'earth-angel-allen',
    },
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set in .env');

  const adapter = new PrismaNeon({ connectionString: url });
  const prisma: any = new PrismaClient({ adapter });

  console.log('🌱 Seeding accounts on fresh database...\n');

  for (const acct of ACCOUNTS) {
    const passwordHash = await bcrypt.hash(acct.password, 12);

    const user = await prisma.user.upsert({
      where: { email: acct.email },
      update: {
        // Re-running this script updates the password and role on existing
        // accounts so credentials always match what's in this file.
        name: acct.name,
        password: passwordHash,
        role: acct.role,
        emailVerified: new Date(),
        onboardingCompleted: true,
      },
      create: {
        name: acct.name,
        email: acct.email,
        password: passwordHash,
        role: acct.role,
        emailVerified: new Date(),
        onboardingCompleted: true,
      },
    });

    // ContractorProfile + lifetime enterprise
    if (acct.role === 'contractor' && acct.contractor) {
      await prisma.contractorProfile.upsert({
        where: { userId: user.id },
        update: {
          subscriptionTier: 'enterprise',
          subscriptionStatus: 'active',
          subscriptionEndsAt: LIFETIME_END,
          trialStatus: 'active',
          trialEndDate: LIFETIME_END,
        },
        create: {
          userId: user.id,
          slug: acct.contractor.slug,
          businessName: acct.contractor.businessName,
          displayName: acct.contractor.displayName,
          email: acct.email,
          isPublic: false, // hidden until profile is filled in
          acceptingNewWork: false,
          subscriptionTier: 'enterprise',
          subscriptionStatus: 'active',
          subscriptionEndsAt: LIFETIME_END,
          trialStatus: 'active',
          trialEndDate: LIFETIME_END,
        },
      });
    }

    // Agent profile (also gets lifetime enterprise so the SubscriptionGate
    // lets them into the agent dashboard — gate is unchanged)
    if (acct.role === 'agent') {
      await prisma.agent.upsert({
        where: { userId: user.id },
        update: {
          subscriptionTier: 'enterprise',
          subscriptionStatus: 'active',
          subscriptionEndsAt: LIFETIME_END,
          trialStatus: 'active',
          trialEndDate: LIFETIME_END,
        },
        create: {
          userId: user.id,
          name: acct.name,
          subdomain: 'demo-agent',
          subscriptionTier: 'enterprise',
          subscriptionStatus: 'active',
          subscriptionEndsAt: LIFETIME_END,
          trialStatus: 'active',
          trialEndDate: LIFETIME_END,
        },
      });
    }

    // Homeowner profile (no subscription field on this model)
    if (acct.role === 'homeowner') {
      await prisma.homeowner.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          name: 'Demo Home',
        },
      });
    }

    console.log(`  ✓ ${acct.role.padEnd(11)} ${acct.email}`);
  }

  // Super admin needs a Landlord row so the landlord-side SubscriptionGate
  // lets them into /admin/* dashboards (the gate fetches landlord by
  // ownerUserId and redirects to /onboarding if it's missing). We also
  // overwrite the subscription fields every run, because the onboarding
  // flow may have created a 'starter / incomplete' row which the gate
  // would still bounce.
  const superAdmin = await prisma.user.findUnique({
    where: { email: 'propertyflowhq@gmail.com' },
  });

  if (superAdmin) {
    const existing = await prisma.landlord.findFirst({
      where: { ownerUserId: superAdmin.id },
    });

    const subscriptionFields = {
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      subscriptionEndsAt: LIFETIME_END,
      trialStatus: 'active',
      trialStartDate: new Date(),
      trialEndDate: LIFETIME_END,
    };

    if (!existing) {
      await prisma.landlord.create({
        data: {
          name: 'Property Flow HQ',
          subdomain: 'propertyflowhq',
          ownerUserId: superAdmin.id,
          companyName: 'Property Flow HQ',
          ...subscriptionFields,
        },
      });
      console.log('  ✓ landlord    propertyflowhq (super admin) created');
    } else {
      await prisma.landlord.update({
        where: { id: existing.id },
        data: subscriptionFields,
      });
      console.log('  ✓ landlord    propertyflowhq (super admin) refreshed');
    }
  }

  console.log('\n📝 Login credentials');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Super Admin:  propertyflowhq@gmail.com / ${SUPER_ADMIN_PW}`);
  console.log(`All others:   <email above> / ${SHARED_PW}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
