import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Get database URL from either Netlify Supabase integration or manual config
const getDatabaseUrl = () => {
  // Netlify Supabase integration uses SUPABASE_DATABASE_URL
  if (process.env.SUPABASE_DATABASE_URL) {
    return process.env.SUPABASE_DATABASE_URL;
  }
  // Manual configuration uses DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // Fallback for build-time when DB not needed
  return 'postgresql://placeholder';
};

// Prisma client configuration for serverless environments (Netlify, Vercel)
// Uses connection pooling and optimized settings for Supabase
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

// Prevent hot reload issues in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Handle graceful shutdown
if (process.env.NETLIFY || process.env.VERCEL) {
  // Serverless: don't disconnect (connections are short-lived)
  // Prisma will auto-disconnect when the function ends
} else {
  // Local dev: disconnect on process exit
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
