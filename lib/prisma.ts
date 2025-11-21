import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from 'process';

const connectionString = env.DATABASE_URL;
const useSelfSigned = process.env.DB_SSL === 'allow-self-signed';

// If using custom SSL config, strip sslmode from connection string to avoid conflicts
let finalConnectionString = connectionString;
if (useSelfSigned && connectionString) {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    finalConnectionString = url.toString();
  } catch (e) {
    // If URL parsing fails, fallback to original string
    console.warn('Failed to parse DATABASE_URL, using original string');
  }
}

const pool = new Pool({
  connectionString: finalConnectionString,
  ssl: useSelfSigned ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
