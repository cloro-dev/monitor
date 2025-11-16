"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Settings, ChevronDown } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  role: string;
}

export function OrganizationSwitcher() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, [session]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations);

        // Find active organization from session
        if (session && 'activeOrganizationId' in session) {
          const active = data.organizations.find((org: Organization) =>
            org.id === (session as any).activeOrganizationId
          );
          setActiveOrganization(active || data.organizations[0] || null);
        } else if (data.organizations.length > 0) {
          setActiveOrganization(data.organizations[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchOrganization = async (organizationId: string) => {
    try {
      const response = await fetch("/api/organizations/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ organizationId }),
      });

      if (response.ok) {
        const organization = organizations.find(org => org.id === organizationId);
        setActiveOrganization(organization || null);
        router.refresh(); // Refresh to update session data
      }
    } catch (error) {
      console.error("Error switching organization:", error);
    }
  };

  const handleCreateOrganization = () => {
    router.push("/dashboard/settings/organization?action=create");
  };

  const handleManageSettings = () => {
    router.push("/dashboard/settings/organization");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3">
        <div className="h-6 w-6 animate-pulse rounded bg-muted"></div>
        <div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
      </div>
    );
  }

  if (!activeOrganization) {
    return (
      <div className="flex items-center gap-2 p-3">
        <Building2 className="h-6 w-6" />
        <span className="text-sm font-medium">No Organization</span>
        <Button size="sm" variant="outline" onClick={handleCreateOrganization}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start p-2 h-auto hover:bg-muted/50"
          >
            <div className="flex items-center gap-3 w-full">
              {activeOrganization.logo ? (
                <Image
                  src={activeOrganization.logo}
                  alt={activeOrganization.name}
                  width={24}
                  height={24}
                  className="rounded"
                />
              ) : (
                <Building2 className="h-6 w-6 text-muted-foreground" />
              )}
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-sm font-medium truncate">
                  {activeOrganization.name}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {activeOrganization.role}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSwitchOrganization(org.id)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 w-full">
                {org.logo ? (
                  <Image
                    src={org.logo}
                    alt={org.name}
                    width={16}
                    height={16}
                    className="rounded"
                  />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm truncate">{org.name}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {org.role}
                  </span>
                </div>
                {org.id === activeOrganization.id && (
                  <span className="text-xs text-primary">Active</span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCreateOrganization} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleManageSettings} className="cursor-pointer">
            <Settings className="h-4 w-4 mr-2" />
            Manage Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}