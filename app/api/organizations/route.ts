import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logError } from '@/lib/logger';
import { withAuth, apiSuccess, handleApiError } from '@/lib/api-middleware';
import { z } from 'zod';

// GET: Fetch user's organizations
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await withAuth(request);

    if (error) {
      return error;
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

    return apiSuccess({ organizations });
  } catch (error) {
    return handleApiError(error, 'Organizations', 'GET');
  }
}

// POST: Create a new organization
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await withAuth(request);

    if (error) {
      return error;
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

    return apiSuccess({ organization });
  } catch (error) {
    return handleApiError(error, 'Organization', 'Create');
  }
}

// Validation schema for organization update
const updateOrganizationSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  name: z
    .string()
    .min(1, 'Organization name is required')
    .refine((val) => val.trim().length > 0, {
      message: 'Organization name cannot be empty or just whitespace',
    })
    .optional(),
  slug: z.string().optional(),
  logo: z.string().optional(),
  aiModels: z.array(z.string()).optional(),
});

// PATCH: Update an existing organization
export async function PATCH(request: NextRequest) {
  try {
    const { session, error } = await withAuth(request);

    if (error) {
      return error;
    }

    const body = await request.json();

    // Validate with zod
    const validatedData = updateOrganizationSchema.parse(body);
    const { organizationId, name, slug, logo, aiModels } = validatedData;

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
        ...(name && { name: name.trim() }),
        ...(slug && { slug }),
        ...(logo !== undefined && { logo }),
        ...(aiModels !== undefined && { aiModels }),
      },
    });

    return apiSuccess({ organization: updatedOrganization });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    return handleApiError(error, 'Organization', 'Update');
  }
}
