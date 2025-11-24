import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logError, logInfo } from '@/lib/logger';

export async function GET(request: NextRequest) {
  let slug: string | null = null;

  try {
    const { searchParams } = new URL(request.url);
    slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 },
      );
    }

    // Validate slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format' },
        { status: 400 },
      );
    }

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    logInfo('OrganizationCheckSlug', 'Slug availability check completed', {
      slug,
      exists: !!existingOrg,
      existingOrgId: existingOrg?.id,
    });

    return NextResponse.json({ exists: !!existingOrg });
  } catch (error) {
    logError(
      'OrganizationCheckSlug',
      'Error checking slug availability',
      error,
      {
        slug,
      },
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
