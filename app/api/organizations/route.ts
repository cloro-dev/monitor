import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: Fetch user's organizations
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch organizations where the user is a member
    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST: Create a new organization
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, logo, metadata } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 },
      );
    }

    // Check if slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization slug already exists' },
        { status: 409 },
      );
    }

    // Create organization and add user as owner
    const organization = await prisma.$transaction(async (tx) => {
      // Create organization with all AI models enabled by default
      const newOrg = await tx.organization.create({
        data: {
          name,
          slug,
          logo,
          metadata,
          aiModels: [
            'CHATGPT',
            'PERPLEXITY',
            'COPILOT',
            'AIMODE',
            'AIOVERVIEW',
          ],
        },
      });

      // Add user as member with owner role
      await tx.member.create({
        data: {
          userId: session.user.id,
          organizationId: newOrg.id,
          role: 'owner',
        },
      });

      // Update user's session with active organization
      await tx.session.updateMany({
        where: {
          userId: session.user.id,
        },
        data: {
          activeOrganizationId: newOrg.id,
        },
      });

      return newOrg;
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH: Update an existing organization
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, name, slug, logo, aiModels } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 },
      );
    }

    // Verify user is a member of the organization
    const membership = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: organizationId,
        role: { in: ['owner', 'admin'] }, // Only owners and admins can update
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You don't have permission to update this organization" },
        { status: 403 },
      );
    }

    // Check if new slug is already taken (if changing)
    if (slug) {
      const existingOrg = await prisma.organization.findFirst({
        where: {
          slug,
          id: { not: organizationId },
        },
      });

      if (existingOrg) {
        return NextResponse.json(
          { error: 'Organization slug already exists' },
          { status: 409 },
        );
      }
    }

    // Update organization
    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(logo !== undefined && { logo }),
        ...(aiModels !== undefined && { aiModels }),
      },
    });

    return NextResponse.json({ organization: updatedOrganization });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
