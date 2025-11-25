import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardErrorBoundary } from '@/components/error/dashboard-error-boundary';
import { DashboardLoadingLayout } from '@/components/auth/dashboard-loading-layout';
import { headers } from 'next/headers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication on server-side (no database queries)
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <SidebarProvider>
      <AppSidebar session={session} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 px-8 pt-0">
          <DashboardErrorBoundary>
            <DashboardLoadingLayout session={session}>
              {children}
            </DashboardLoadingLayout>
          </DashboardErrorBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
