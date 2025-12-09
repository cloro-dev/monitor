'use client';

import React from 'react';
import { OrganizationCreationModal } from '@/components/auth/organization-creation-modal';
import { useOrganizations } from '@/hooks/use-organizations';
import { LoadingBoundary } from '@/components/ui/loading-boundary';

interface DashboardLoadingLayoutProps {
  session: any;
  children: React.ReactNode;
}

export function DashboardLoadingLayout({
  children,
}: DashboardLoadingLayoutProps) {
  const { organizations, isLoading, error } = useOrganizations();
  const [showOrgModal, setShowOrgModal] = React.useState(false);

  // Show org modal when user has no organizations
  React.useEffect(() => {
    if (!isLoading && !error && organizations.length === 0) {
      setShowOrgModal(true);
    }
  }, [organizations, isLoading, error]);

  // Show loading state while fetching organizations
  if (isLoading) {
    return (
      <LoadingBoundary isLoading={true}>
        <div />
      </LoadingBoundary>
    );
  }

  // Show error state if organization fetch fails
  if (error) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="text-lg text-destructive">⚠️</div>
          <p className="text-muted-foreground">Unable to load your workspace</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show organization creation modal if user has no organizations
  if (organizations.length === 0) {
    return (
      <>
        <div className="flex min-h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-muted-foreground">
              Setting up your workspace...
            </p>
          </div>
        </div>
        <OrganizationCreationModal
          open={showOrgModal}
          onOpenChange={setShowOrgModal}
        />
      </>
    );
  }

  // Show children if user has organizations
  return <>{children}</>;
}
