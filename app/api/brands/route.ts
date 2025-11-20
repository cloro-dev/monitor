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
});

const updateBrandSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
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

    // Get user's active organization from session (same approach as competitors API)
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

    // Require active organization to be set
    if (!userSession.activeOrganizationId) {
      return NextResponse.json({ brands: [] });
    }

    const activeOrganization = userSession.user.members.find(
      (m: any) => m.organizationId === userSession.activeOrganizationId,
    )?.organization;

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
    const { domain } = createBrandSchema.parse(body);

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
      return NextResponse.json(
        { error: "You don't have any organizations" },
        { status: 403 },
      );
    }

    // Require active organization to be set
    if (!userSession.activeOrganizationId) {
      return NextResponse.json(
        { error: 'No active organization selected' },
        { status: 403 },
      );
    }

    const activeOrganization = userSession.user.members.find(
      (m: any) => m.organizationId === userSession.activeOrganizationId,
    )?.organization;

    if (!activeOrganization) {
      return NextResponse.json(
        { error: 'Active organization not found' },
        { status: 403 },
      );
    }

    // Check if domain already exists (within the user's organization)
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

    // Create brand with fetched information using active organization
    const brand = await prisma.brand.create({
      data: {
        domain: domainInfo.domain,
        name: domainInfo.name,
        description: domainInfo.description,
        faviconUrl: domainInfo.faviconUrl,
        organizationId: activeOrganization.id,
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
    const { brandId, name, description, faviconUrl } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 },
      );
    }

    const updateData = updateBrandSchema.parse({
      name,
      description,
      faviconUrl,
    });

    // Verify user is a member of the organization that owns the brand
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: { organization: true },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    if (!brand.organizationId) {
      return NextResponse.json(
        { error: 'Cannot modify unmanaged brand' },
        { status: 403 },
      );
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

    if (!brand.organizationId) {
      return NextResponse.json(
        { error: 'Cannot delete unmanaged brand' },
        { status: 403 },
      );
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
