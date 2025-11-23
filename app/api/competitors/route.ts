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

  // 1. Get all brands for the organization through the join table to create a lookup map
  const brands = await prisma.brand.findMany({
    where: {
      organizationBrands: {
        some: {
          organizationId: activeOrganization.id,
        },
      },
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
  let formattedCompetitors = competitorsRel.map((rel: any) => ({
    id: rel.id,
    brandId: rel.brandId,
    name: rel.competitor.name,
    domain: rel.competitor.domain,
    status: rel.status,
    mentions: rel.mentions,
    createdAt: rel.createdAt,
    brand: brandMap.get(rel.brandId) || 'Unknown',
    // Initialize metrics
    visibilityScore: null as number | null,
    averageSentiment: null as number | null,
    averagePosition: null as number | null,
  }));

  const includeStats = searchParams.get('includeStats') === 'true';

  if (includeStats && brandId) {
    const selectedBrandName = brandMap.get(brandId) || 'Unknown Brand';
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const results = await prisma.result.findMany({
      where: {
        prompt: { brandId },
        status: 'SUCCESS',
        createdAt: { gte: ninetyDaysAgo },
      },
      select: {
        id: true,
        createdAt: true,
        competitors: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate aggregate metrics for all competitors for the table
    formattedCompetitors = formattedCompetitors.map((comp: any) => {
      const compName = comp.name;
      let mentionCount = 0;
      let totalPosition = 0;
      let positionCount = 0;
      let totalSentiment = 0;
      let sentimentCount = 0;

      results.forEach((r: any) => {
        const rawComps = r.competitors || [];
        let found = false;
        let sentiment: number | null = null;
        let position = -1;

        if (Array.isArray(rawComps) && rawComps.length > 0) {
          // Handle both string (old) and object (new) formats
          const index = rawComps.findIndex((c: any) => {
            const name = typeof c === 'string' ? c : c?.name;
            return name && name.toLowerCase() === compName.toLowerCase();
          });

          if (index !== -1) {
            found = true;
            position = index + 1;
            const match = rawComps[index];
            if (
              typeof match === 'object' &&
              match !== null &&
              typeof match.sentiment === 'number'
            ) {
              sentiment = match.sentiment;
            }
          }
        }

        if (found) {
          mentionCount++;
          totalPosition += position;
          positionCount++;
          if (sentiment !== null) {
            totalSentiment += sentiment;
            sentimentCount++;
          }
        }
      });

      return {
        ...comp,
        visibilityScore:
          results.length > 0 ? (mentionCount / results.length) * 100 : 0,
        averagePosition:
          positionCount > 0 ? totalPosition / positionCount : null,
        averageSentiment:
          sentimentCount > 0 ? totalSentiment / sentimentCount : null,
      };
    });

    // Determine top 5 accepted competitors for the chart based on mentions
    const top5AcceptedCompetitors = formattedCompetitors
      .filter((c: any) => c.status === 'ACCEPTED')
      .sort((a, b) => (b.mentions || 0) - (a.mentions || 0))
      .slice(0, 5);

    // Prepare all brands to be charted (selected brand + top 5 accepted competitors)
    const brandsToChart = [
      { id: brandId, name: selectedBrandName }, // Primary brand
      ...top5AcceptedCompetitors.map((comp) => ({
        id: comp.id,
        name: comp.name,
      })),
    ];

    // Generate Chart Data (Daily Visibility for selected brand and top 5 competitors)
    const chartMap = new Map<string, any>();

    // Pre-fill chartMap with all dates in the 90-day range
    const today = new Date();
    for (
      let d = new Date(ninetyDaysAgo);
      d <= today;
      d.setDate(d.getDate() + 1)
    ) {
      const dateKey = d.toISOString().split('T')[0];
      const dailyEntry: { date: string; [key: string]: number | string } = {
        date: dateKey,
      };
      brandsToChart.forEach((b) => {
        dailyEntry[b.name] = 0; // Initialize mention counts for each brand to 0
      });
      dailyEntry['__dailyTotalResults'] = 0; // Keep track of total results for the day
      chartMap.set(dateKey, dailyEntry);
    }

    // Populate chartMap with actual data from results
    results.forEach((r: any) => {
      const dateKey = r.createdAt.toISOString().split('T')[0];
      const entry = chartMap.get(dateKey);
      if (entry) {
        entry['__dailyTotalResults']++; // Increment total results for this day

        const rawComps = r.competitors || [];
        let allMentionsInResult: string[] = [];

        if (Array.isArray(rawComps) && rawComps.length > 0) {
          allMentionsInResult = (rawComps as any[])
            .map((c) => {
              if (typeof c === 'string') return c;
              return c?.name;
            })
            .filter((name) => name);
        }

        brandsToChart.forEach((brand) => {
          if (
            allMentionsInResult.some(
              (c) => c.toLowerCase() === brand.name.toLowerCase(),
            )
          ) {
            entry[brand.name] = (entry[brand.name] || 0) + 1;
          }
        });
      }
    });

    // Finalize chartData by calculating percentages
    const chartData = Array.from(chartMap.values()).map((entry: any) => {
      const point: any = { date: entry.date };
      const dailyTotalResults = entry['__dailyTotalResults'];

      brandsToChart.forEach((brand) => {
        point[brand.name] =
          dailyTotalResults > 0
            ? ((entry[brand.name] || 0) / dailyTotalResults) * 100
            : 0;
      });
      return point;
    });

    return NextResponse.json({
      selectedBrandName: selectedBrandName,
      competitors: formattedCompetitors, // Return all competitors for the table
      brandsToChart: brandsToChart, // The specific brands (primary + top 5) to use for the chart legend/series
      chartData: chartData,
    });
  }

  return NextResponse.json(formattedCompetitors);
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
