import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { auth } from '../lib/auth';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // Create user using Better Auth's internal methods
  // Better Auth uses scrypt for password hashing
  const result = await auth.api.signUpEmail({
    body: {
      email: 'ric@cloro.dev',
      password: 'ric@cloro.dev',
      name: 'Ric',
    },
  });

  if (result.user) {
    console.log('✅ Successfully created user:');
    console.log(`   Email: ${result.user.email}`);
    console.log(`   Name: ${result.user.name}`);
    console.log(`   ID: ${result.user.id}`);
  } else {
    console.error('❌ Failed to create user');
  }

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });