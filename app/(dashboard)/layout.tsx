import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardErrorBoundary } from '@/components/error/dashboard-error-boundary';
import { DashboardLoadingLayout } from '@/components/auth/dashboard-loading-layout';
import { headers } from 'next/headers';
import { getCachedAuthAndOrgSession } from '@/lib/session-cache';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication with caching
  const authData = await getCachedAuthAndOrgSession(await headers());

  if (!authData?.user?.id) {
    redirect('/login');
  }

  return (
    <SidebarProvider>
      <AppSidebar session={authData} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 px-8 pt-0">
          <DashboardErrorBoundary>
            <DashboardLoadingLayout session={authData}>
              {children}
            </DashboardLoadingLayout>
          </DashboardErrorBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
