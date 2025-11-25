import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id || !session.session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { activeOrganizationId } = body;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: 'Missing activeOrganizationId' },
        { status: 400 },
      );
    }

    // Update the session in the database directly
    await prisma.session.update({
      where: {
        id: session.session.id,
      },
      data: {
        activeOrganizationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
