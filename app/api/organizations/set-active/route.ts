import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logError, logInfo } from '@/lib/logger';

/**
 * API route to set the active organization for the current user's session.
 */
export async function POST(request: NextRequest) {
  let session: any = null;
  let body: any = null;

  try {
    session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id || !session.session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    body = await request.json();
    const { organizationId } = body;
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 },
      );
    }

    // Verify the user is a member of the organization they are trying to set as active
    const membership = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: organizationId,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 },
      );
    }

    // Update the session with the active organization ID
    await prisma.session.update({
      where: {
        id: session.session.id,
      },
      data: {
        activeOrganizationId: organizationId,
      },
    });

    logInfo('OrganizationSetActive', 'Active organization set successfully', {
      userId: session.user.id,
      sessionId: session.session.id,
      organizationId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(
      'OrganizationSetActive',
      'Error setting active organization',
      error,
      {
        userId: session?.user?.id,
        sessionId: session?.session?.id,
        organizationId: body?.organizationId,
      },
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
