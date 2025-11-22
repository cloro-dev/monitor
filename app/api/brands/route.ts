import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { fetchDomainInfo, isValidDomain } from '@/lib/domain-fetcher';
import { generateBrandPrompts } from '@/lib/ai-service';
import { COUNTRY_NAME_MAP } from '@/lib/countries';
import { z } from 'zod';

// Validation schema
const createBrandSchema = z.object({
  domain: z.string().min(1, 'Domain is required').refine(isValidDomain, {
    message: 'Please enter a valid domain name (e.g., example.com)',
  }),
  defaultCountry: z
    .string()
    .length(2, 'Country code must be exactly 2 characters')
    .refine((code) => COUNTRY_NAME_MAP[code.toUpperCase()], {
      message: 'Invalid country code',
    })
    .optional(),
});

const updateBrandSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  defaultCountry: z
    .string()
    .length(2, 'Country code must be exactly 2 characters')
    .refine((code) => COUNTRY_NAME_MAP[code.toUpperCase()], {
      message: 'Invalid country code',
    })
    .optional(),
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

    // Fetch brands for the organization through the join table
    const brands = await prisma.brand.findMany({
      where: {
        organizationBrands: {
          some: {
            organizationId: activeOrganization.id,
          },
        },
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
    const { domain, defaultCountry } = createBrandSchema.parse(body);

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

    // Check if domain already exists globally
    let brand = await prisma.brand.findUnique({
      where: { domain },
    });

    const isNewBrand = !brand;

    if (brand) {
      // Check if the organization already has access to this brand
      const existingAssociation = await prisma.organization_brand.findUnique({
        where: {
          organizationId_brandId: {
            organizationId: activeOrganization.id,
            brandId: brand.id,
          },
        },
      });

      if (existingAssociation) {
        return NextResponse.json(
          {
            error:
              'Brand with this domain is already available to your organization',
          },
          { status: 409 },
        );
      }
    }

    // Create new brand if it doesn't exist
    if (!brand) {
      const domainInfo = await fetchDomainInfo(domain);

      brand = await prisma.brand.create({
        data: {
          domain: domainInfo.domain,
          name: domainInfo.name,
          description: domainInfo.description,
          defaultCountry: defaultCountry?.toUpperCase(),
        },
      });
    } else {
      // Update existing brand with defaultCountry if needed
      if (
        defaultCountry &&
        brand.defaultCountry !== defaultCountry.toUpperCase()
      ) {
        brand = await prisma.brand.update({
          where: { id: brand.id },
          data: { defaultCountry: defaultCountry.toUpperCase() },
        });
      }
    }

    // Create organization-brand relationship
    await prisma.organization_brand.create({
      data: {
        organizationId: activeOrganization.id,
        brandId: brand.id,
        role: isNewBrand ? 'admin' : 'member', // Brand creator gets admin role for new brands
      },
    });

    // Generate AI prompts for both new and existing brands
    if (brand.description) {
      (async () => {
        try {
          const suggestedPrompts = await generateBrandPrompts(
            brand.name || domain,
            brand.description!,
          );

          if (suggestedPrompts && suggestedPrompts.length > 0) {
            await prisma.prompt.createMany({
              data: suggestedPrompts.map((text) => ({
                text,
                country:
                  defaultCountry?.toUpperCase() || brand.defaultCountry || 'US',
                status: 'SUGGESTED',
                userId: session.user.id,
                brandId: brand.id,
              })),
            });
          }
        } catch (err) {
          console.error('Error generating suggested prompts:', err);
        }
      })();
    }

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
    const { brandId, name, description, defaultCountry } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 },
      );
    }

    const updateData = updateBrandSchema.parse({
      name,
      description,
      defaultCountry,
    });

    // Verify user has permission to update this brand through organization_brand relationship
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Check if user has admin or owner role for this brand in any organization
    const organizationBrand = await prisma.organization_brand.findFirst({
      where: {
        brandId: brandId,
        organization: {
          members: {
            some: {
              userId: session.user.id,
              role: { in: ['owner', 'admin'] },
            },
          },
        },
      },
      include: {
        organization: {
          include: {
            members: {
              where: {
                userId: session.user.id,
                role: { in: ['owner', 'admin'] },
              },
            },
          },
        },
      },
    });

    if (!organizationBrand) {
      return NextResponse.json(
        { error: "You don't have permission to update this brand" },
        { status: 403 },
      );
    }

    // Update brand
    const updatedBrand = await prisma.brand.update({
      where: { id: brandId },
      data: {
        ...updateData,
        ...(defaultCountry && { defaultCountry: defaultCountry.toUpperCase() }),
      },
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

    // Verify user has permission to delete this brand through organization_brand relationship
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Check if user has admin or owner role for this brand in any organization
    const organizationBrand = await prisma.organization_brand.findFirst({
      where: {
        brandId: brandId,
        organization: {
          members: {
            some: {
              userId: session.user.id,
              role: { in: ['owner', 'admin'] },
            },
          },
        },
      },
    });

    if (!organizationBrand) {
      return NextResponse.json(
        { error: "You don't have permission to delete this brand" },
        { status: 403 },
      );
    }

    // Delete the brand (this will cascade delete organization_brand relationships)
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
