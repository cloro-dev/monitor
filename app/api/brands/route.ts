import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { fetchDomainInfo, isValidDomain } from '@/lib/domain-fetcher';
import { z } from 'zod';

// Validation schema
const createBrandSchema = z.object({
  domain: z.string().min(1, 'Domain is required').refine(isValidDomain, {
    message: 'Please enter a valid domain name (e.g., example.com)',
  }),
  organizationId: z.string().min(1, 'Organization ID is required'),
});

const updateBrandSchema = z.object({
  brandName: z.string().optional(),
  faviconUrl: z.string().url().optional(),
});

// GET: Fetch brands for user's active organization
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      return NextResponse.json({ brands: [] });
    }

    // Use active organization if available, otherwise use first organization
    const activeOrganization = userSession.activeOrganizationId
      ? userSession.user.members.find(
          (m) => m.organizationId === userSession.activeOrganizationId,
        )?.organization
      : userSession.user.members[0]?.organization;

    if (!activeOrganization) {
      return NextResponse.json({ brands: [] });
    }

    // Fetch brands for the organization
    const brands = await prisma.brand.findMany({
      where: {
        organizationId: activeOrganization.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ brands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST: Create a new brand
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { domain, organizationId } = createBrandSchema.parse(body);

    // Verify user is a member of the organization
    const membership = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: "You don't have permission to add brands to this organization",
        },
        { status: 403 },
      );
    }

    // Check if domain already exists
    const existingBrand = await prisma.brand.findUnique({
      where: { domain },
    });

    if (existingBrand) {
      return NextResponse.json(
        { error: 'Brand with this domain already exists' },
        { status: 409 },
      );
    }

    // Fetch domain information including brand name and favicon
    const domainInfo = await fetchDomainInfo(domain);

    // Create brand with fetched information
    const brand = await prisma.brand.create({
      data: {
        domain: domainInfo.domain,
        brandName: domainInfo.brandName,
        faviconUrl: domainInfo.faviconUrl,
        organizationId,
      },
    });

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('Error creating brand:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH: Update an existing brand
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { brandId, brandName, faviconUrl } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 },
      );
    }

    const updateData = updateBrandSchema.parse({ brandName, faviconUrl });

    // Verify user is a member of the organization that owns the brand
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: { organization: true },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const membership = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: brand.organizationId,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You don't have permission to update this brand" },
        { status: 403 },
      );
    }

    // Update brand
    const updatedBrand = await prisma.brand.update({
      where: { id: brandId },
      data: updateData,
    });

    return NextResponse.json({ brand: updatedBrand });
  } catch (error) {
    console.error('Error updating brand:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE: Delete a brand
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const brandId = url.searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 },
      );
    }

    // Verify user is a member of the organization that owns the brand
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: { organization: true },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const membership = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: brand.organizationId,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You don't have permission to delete this brand" },
        { status: 403 },
      );
    }

    // Delete brand
    await prisma.brand.delete({
      where: { id: brandId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
