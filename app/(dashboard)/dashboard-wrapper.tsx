"use client";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { OrganizationCreationModal } from "@/components/auth/organization-creation-modal";
import { Layout } from "@/components/layout";

interface DashboardWrapperProps {
  children: React.ReactNode;
}

export function DashboardWrapper({ children }: DashboardWrapperProps) {
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { data: session } = authClient.useSession();

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
          // Show modal if user has no organizations
          if (data.organizations.length === 0) {
            setShowOrgModal(true);
          }
        }
      } catch (error) {
        console.error("Error checking organization status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkOrganizationStatus();
  }, [session]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        className={`flex flex-1 flex-col gap-4 p-4 pt-0 transition-all duration-200 ${
          showOrgModal ? "blur-sm" : ""
        }`}
      >
        {children}
      </div>
      <OrganizationCreationModal
        open={showOrgModal}
        onOpenChange={setShowOrgModal}
      />
    </Layout>
  );
}
