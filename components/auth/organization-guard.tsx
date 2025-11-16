"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { OrganizationCreationModal } from "./organization-creation-modal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

interface OrganizationGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function OrganizationGuard({ children, fallback }: OrganizationGuardProps) {
  const { data: session } = authClient.useSession();
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOrganizationStatus = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/organizations");
        if (response.ok) {
          const data = await response.json();
          const hasOrg = data.organizations && data.organizations.length > 0;
          setHasOrganization(hasOrg);

          // Show modal if user has no organizations
          if (!hasOrg) {
            setShowOrgModal(true);
          }
        }
      } catch (error) {
        console.error("Error checking organization status:", error);
        setHasOrganization(false);
      } finally {
        setLoading(false);
      }
    };

    checkOrganizationStatus();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user doesn't have an organization, show fallback or modal
  if (hasOrganization === false) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-64">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Organization Required</CardTitle>
            <CardDescription>
              You need to create an organization to access this feature.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <OrganizationCreationModal
              open={showOrgModal}
              onOpenChange={setShowOrgModal}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has organization, show children
  return (
    <>
      {children}
      {/* Keep modal available but closed */}
      <OrganizationCreationModal
        open={showOrgModal}
        onOpenChange={setShowOrgModal}
      />
    </>
  );
}