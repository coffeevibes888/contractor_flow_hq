import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import 'dotenv/config';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    // Check if ContractorProfile table exists and what columns it has
    const cols: any[] = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'ContractorProfile' ORDER BY ordinal_position`
    );
    console.log('ContractorProfile columns:', cols.map(c => c.column_name));
    console.log('Total columns:', cols.length);
  } catch (e: any) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
