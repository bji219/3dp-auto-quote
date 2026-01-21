import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma client configuration for serverless environments (Netlify, Vercel)
// Uses connection pooling and optimized settings for Supabase
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
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
