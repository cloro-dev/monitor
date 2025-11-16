"use client";

import React from "react";
import { OrganizationCreationModal } from "@/components/auth/organization-creation-modal";

interface OrganizationRequiredLayoutProps {
  children?: React.ReactNode;
}

export function OrganizationRequiredLayout({}: OrganizationRequiredLayoutProps) {
  const [showOrgModal, setShowOrgModal] = React.useState(true);

  return (
    <>
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
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
