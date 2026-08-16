import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaNeon({ connectionString });

// Base Prisma client without extensions - use for new models
// that aren't yet recognized by the extended client
const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prismaBase: any =
  globalForPrisma.prismaBase ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaBase = prismaBase;
}
