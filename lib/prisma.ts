import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, PoolConfig } from 'pg';
import { env } from 'process';

const connectionString = env.DATABASE_URL;
let finalConnectionString = connectionString;
let sslConfig: PoolConfig['ssl'] = undefined; // Default: no explicit SSL config

if (connectionString) {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode');
    if (sslMode === 'require') {
      sslConfig = { rejectUnauthorized: false };
      url.searchParams.delete('sslmode');
      finalConnectionString = url.toString();
    }
  } catch (e) {
    console.warn('Failed to parse DATABASE_URL', e);
  }
}

const pool = new Pool({
  connectionString: finalConnectionString,
  ssl: sslConfig,
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
