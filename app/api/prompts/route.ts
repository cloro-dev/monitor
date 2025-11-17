import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createPromptSchema = z.object({
  text: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(200, 'Prompt must be at most 200 characters'),
  country: z.string().min(1, 'Country is required'),
  brandId: z.string().min(1, 'Brand is required'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    const prompts = await prisma.prompt.findMany({
      where: {
        userId: session.user.id,
        ...(brandId && { brandId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        text: true,
        country: true,
        createdAt: true,
        updatedAt: true,
        brand: {
          select: {
            id: true,
            domain: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createPromptSchema.parse(body);

    const prompt = await prisma.prompt.create({
      data: {
        text: validatedData.text,
        country: validatedData.country,
        brandId: validatedData.brandId,
        userId: session.user.id,
      },
      select: {
        id: true,
        text: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(prompt, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
