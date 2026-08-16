import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

async function hashPassword(plainPassword: string): Promise<string> {
  const encoder = new TextEncoder();
  const baseKey = process.env.ENCRYPTION_KEY || '';
  const hmacKeyBytes = encoder.encode(baseKey);
  const passwordData = encoder.encode(plainPassword);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    hmacKeyBytes,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign', 'verify']
  );

  const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, passwordData);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in .env file');
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log('🌱 Seeding property management database...');

  // Clean up existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning up existing data...');
  await prisma.user.deleteMany();
  await prisma.landlord.deleteMany();

  // Create Admin User
  console.log('👤 Creating admin user...');
  const adminPassword = await hashPassword('Admin123!');
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@propertyflowhq.com',
      password: adminPassword,
      role: 'admin',
      emailVerified: new Date(),
      twoFactorEnabled: true, // 2FA enabled by default for landlords/admins
    },
  });
  console.log('✅ Admin created:', adminUser.email, '/ Password: Admin123!');

  // Create Landlord for Admin
  console.log('🏢 Creating landlord profile for admin...');
  const landlord = await prisma.landlord.create({
    data: {
      name: 'PropertyFlow Properties',
      ownerUserId: adminUser.id,
      subdomain: 'propertyflow',
      subscriptionTier: 'pro',
      logoUrl: null,
      heroImages: [],
      themeColor: '#8b5cf6', // violet
      companyName: 'PropertyFlow Properties LLC',
      companyAddress: '123 Main Street, Las Vegas, NV 89101',
      aboutBio: 'Professional property management services in Las Vegas.',
    },
  });
  console.log('✅ Landlord created:', landlord.name);

  // Create Super Admin
  console.log('👑 Creating super admin...');
  const superAdminPassword = await hashPassword('SuperAdmin123!');
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@propertyflowhq.com',
      password: superAdminPassword,
      role: 'superAdmin',
      emailVerified: new Date(),
    },
  });
  console.log('✅ Super Admin created:', superAdmin.email, '/ Password: SuperAdmin123!');

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('📝 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:');
  console.log('  Email: admin@propertyflowhq.com');
  console.log('  Password: Admin123!');
  console.log('');
  console.log('Super Admin:');
  console.log('  Email: superadmin@propertyflowhq.com');
  console.log('  Password: SuperAdmin123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  });
