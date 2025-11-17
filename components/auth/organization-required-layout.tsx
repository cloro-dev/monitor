'use client';

import React from 'react';
import { OrganizationCreationModal } from '@/components/auth/organization-creation-modal';

interface OrganizationRequiredLayoutProps {
  children?: React.ReactNode;
}

export function OrganizationRequiredLayout({}: OrganizationRequiredLayoutProps) {
  const [showOrgModal, setShowOrgModal] = React.useState(true);

  return (
    <>
      <div className="flex min-h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Setting up your workspace...</p>
        </div>
      </div>
      <OrganizationCreationModal
        open={showOrgModal}
        onOpenChange={setShowOrgModal}
      />
    </>
  );
}
