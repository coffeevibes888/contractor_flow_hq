import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

/**
 * Cleanup script to remove marketplace dummy data
 * This will delete all dummy contractors, landlords, properties, and related data
 */

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log('🧹 Starting marketplace dummy data cleanup...');
  console.log('⚠️  This will delete:');
  console.log('   - All dummy contractor profiles');
  console.log('   - All dummy landlords and their properties');
  console.log('   - All related reviews, portfolio items, etc.');
  console.log('');

  // Prompt for confirmation
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    readline.question('Are you sure you want to continue? (yes/no): ', resolve);
  });
  readline.close();

  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Cleanup cancelled.');
    return;
  }

  console.log('');
  console.log('🗑️  Deleting dummy data...');

  // Delete dummy contractors and all related data
  console.log('   Deleting contractor profiles...');
  const deletedContractors = await prisma.contractorProfile.deleteMany({
    where: {
      user: {
        email: {
          startsWith: 'contractor',
          endsWith: '@example.com',
        },
      },
    },
  });
  console.log(`   ✅ Deleted ${deletedContractors.count} contractor profiles`);

  // Delete dummy contractor users
  console.log('   Deleting contractor user accounts...');
  const deletedContractorUsers = await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: 'contractor',
        endsWith: '@example.com',
      },
    },
  });
  console.log(`   ✅ Deleted ${deletedContractorUsers.count} contractor users`);

  // Delete dummy customer users
  console.log('   Deleting customer user accounts...');
  const deletedCustomerUsers = await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: 'customer',
        endsWith: '@example.com',
      },
    },
  });
  console.log(`   ✅ Deleted ${deletedCustomerUsers.count} customer users`);

  // Delete dummy landlords (this will cascade to properties, units, etc.)
  console.log('   Deleting landlords and properties...');
  const deletedLandlords = await prisma.landlord.deleteMany({
    where: {
      subdomain: {
        startsWith: 'landlord-',
      },
    },
  });
  console.log(`   ✅ Deleted ${deletedLandlords.count} landlords and their properties`);

  console.log('');
  console.log('✨ Cleanup completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error cleaning up marketplace data:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Cleanup handled by script completion
  });
