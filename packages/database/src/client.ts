import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis as unknown as { bookstudioPrisma?: PrismaClient };
export const prisma = globalForPrisma.bookstudioPrisma ?? new PrismaClient({log: ['error']});
if (process.env.NODE_ENV !== 'production') globalForPrisma.bookstudioPrisma = prisma;
