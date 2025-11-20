import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { trackPromptById } from '@/lib/tracking-service';
import { waitUntil } from '@vercel/functions';

const updatePromptSchema = z.object({
  text: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(200, 'Prompt must be at most 200 characters')
    .optional(),
  country: z.string().min(1, 'Country is required').optional(),
  brandId: z.string().min(1, 'Brand is required').optional(),
  status: z.enum(['ACTIVE', 'SUGGESTED', 'ARCHIVED']).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updatePromptSchema.parse(body);

    // Check if the prompt exists and belongs to the user
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    const updatedPrompt = await prisma.prompt.update({
      where: {
        id: id,
      },
      data: {
        ...validatedData,
      },
      select: {
        id: true,
        text: true,
        country: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // If status is updated to ACTIVE, trigger tracking
    if (validatedData.status === 'ACTIVE') {
      waitUntil(trackPromptById(updatedPrompt.id));
    }

    return NextResponse.json(updatedPrompt);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Error updating prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the prompt exists and belongs to the user
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    await prisma.prompt.update({
      where: {
        id: id,
      },
      data: {
        status: 'ARCHIVED',
      },
    });

    return NextResponse.json({ message: 'Prompt archived successfully' });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
