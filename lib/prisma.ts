import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, PoolConfig } from 'pg';
import { env } from 'process';

const connectionString = env.DATABASE_URL;
let finalConnectionString = connectionString;
let sslConfig: PoolConfig['ssl'] = false; // Default to NO SSL (for local dev)

if (connectionString) {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode');

    // Always delete sslmode from the URL after reading it,
    // so our explicit `ssl` config object takes precedence.
    url.searchParams.delete('sslmode');
    finalConnectionString = url.toString();

    if (sslMode === 'no-verify') {
      // Allow self-signed certs (e.g. DigitalOcean managed DBs)
      sslConfig = { rejectUnauthorized: false };
    } else if (sslMode === 'require') {
      // Standard strict SSL
      sslConfig = true;
    }
  } catch (e) {
    console.warn('Failed to parse DATABASE_URL, falling back to default', e);
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
