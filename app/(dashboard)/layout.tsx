import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardErrorBoundary } from '@/components/error/dashboard-error-boundary';
import { OrganizationRequiredLayout } from '@/components/auth/organization-required-layout';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication on server-side
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Check if user has any organizations
  let userOrganizations;
  try {
    userOrganizations = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    // Continue without organizations check - let client handle it
    userOrganizations = [];
  }

  // Determine if user needs organization
  const needsOrganization = userOrganizations.length === 0;

  return (
    <SidebarProvider>
      <AppSidebar session={session} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 pt-0">
          <DashboardErrorBoundary>
            {needsOrganization ? <OrganizationRequiredLayout /> : children}
          </DashboardErrorBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
