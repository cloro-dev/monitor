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
  const competitorsRel = await prisma.competitor.findMany({
    where: {
      brandId: {
        in: targetBrandIds,
      },
      mentions: {
        gte: 3,
      },
    },
    include: {
      competitor: true, // Include the competitor brand details
    },
    orderBy: [{ mentions: 'desc' }, { createdAt: 'desc' }],
  });

  // 4. Format the response
  const competitors = competitorsRel.map((rel: any) => ({
    id: rel.id,
    brandId: rel.brandId,
    name: rel.competitor.name,
    domain: rel.competitor.domain,
    status: rel.status,
    mentions: rel.mentions,
    createdAt: rel.createdAt,
    brand: brandMap.get(rel.brandId) || 'Unknown',
  }));

  return NextResponse.json(competitors);
}

export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, status } = await req.json();

  if (!id || status === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  try {
    const updatedCompetitor = await prisma.competitor.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedCompetitor);
  } catch (error) {
    console.error('Error updating competitor status:', error);
    return NextResponse.json(
      { error: 'Failed to update competitor status' },
      { status: 500 },
    );
  }
}
