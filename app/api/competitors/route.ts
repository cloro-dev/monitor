import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get brandId from query parameters
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get('brandId');

  // Get user's active organization from session
  const userSession = await prisma.session.findFirst({
    where: {
      userId: session.user.id,
    },
    include: {
      user: {
        include: {
          members: {
            include: {
              organization: true,
            },
          },
        },
      },
    },
  });

  if (!userSession?.user.members.length) {
    return NextResponse.json([]);
  }

  // Require active organization to be set
  if (!userSession.activeOrganizationId) {
    return NextResponse.json([]);
  }

  const activeOrganization = userSession.user.members.find(
    (m: any) => m.organizationId === userSession.activeOrganizationId,
  )?.organization;

  if (!activeOrganization) {
    return NextResponse.json([]);
  }

  // 1. Get all brands for the organization to create a lookup map
  const brands = await prisma.brand.findMany({
    where: {
      organizationId: activeOrganization.id,
    },
    select: {
      id: true,
      name: true,
    },
  });
  const brandMap = new Map(brands.map((brand: any) => [brand.id, brand.name]));
  const brandIds = Array.from(brandMap.keys());

  // 2. Filter brands if brandId is provided
  const targetBrandIds = brandId ? [brandId] : brandIds;

  // 3. Fetch competitors associated with the target brands
  const brandCompetitors = await prisma.brandCompetitors.findMany({
    where: {
      brandId: {
        in: targetBrandIds,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 4. Format the response
  const competitors = brandCompetitors.map((competitor: any) => ({
    ...competitor,
    brand: brandMap.get(competitor.brandId) || 'Unknown',
  }));

  return NextResponse.json(competitors);
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { brandId, name, status } = await req.json();

  const competitor = await prisma.brandCompetitors.upsert({
    where: {
      brandId_name: {
        brandId,
        name,
      },
    },
    update: {
      status,
    },
    create: {
      brandId,
      name,
      status,
    },
  });

  return NextResponse.json(competitor);
}
