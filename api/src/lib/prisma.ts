// Resolves DATABASE_URL / DIRECT_URL from DATA_SOURCE before the client is
// constructed. Prisma reads them from the environment, so this import has to
// come first.
import './data-source';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
