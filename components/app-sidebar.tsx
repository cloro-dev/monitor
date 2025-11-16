"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { IconName } from "@/components/ui/icon";
import { authClient } from "@/lib/auth-client";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { useActiveOrganization } from "@/hooks/use-organizations";

export interface NavbarItem {
  title: string;
  url: string;
  icon: IconName;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
  isCollapsible?: boolean;
  variant?: "default" | "outline";
  className?: string;
}

export function AppSidebar({
  session: serverSession,
  ...props
}: React.ComponentProps<typeof Sidebar> & { session?: any }) {
  const { data: clientSession, isPending } = authClient.useSession();
  const { state } = useSidebar();
  const [mounted, setMounted] = React.useState(false);
  const { activeOrganization } = useActiveOrganization();

  // Use server session if provided, otherwise fall back to client session
  const session = serverSession || clientSession;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const mainSections: { title: string; items: NavbarItem[] }[] = [
    {
      title: "",
      items: [
        {
          title: "Prompts",
          url: "/prompts",
          icon: "MessageSquare" as IconName,
        },
      ],
    },
  ];

  const supportSecondaryItems = [
    {
      title: "Settings",
      url: "/settings",
      icon: "Building2" as IconName,
    },
  ];

  // Ensure consistent user data for hydration
  const user = {
    name: (mounted ? session?.user?.name : "User") || "User",
    email: (mounted ? session?.user?.email : "") || "",
    avatar: (mounted ? session?.user?.image : "") || "",
  };

  // Don't render user-specific content while loading or during hydration
  if (isPending || !mounted) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <div
            className={`flex items-center gap-2 py-1 ${
              state === "collapsed" ? "" : "px-2"
            }`}
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">M</span>
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Monitor</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <NavMain sections={mainSections} />
          <NavSecondary items={supportSecondaryItems} className="mt-auto" />
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div
          className={`flex items-center gap-2 py-1 ${
            state === "collapsed" ? "" : "px-2"
          }`}
        >
          {/* Show organization logo or fallback icon */}
          {activeOrganization?.logo ? (
            <Image
              src={activeOrganization.logo}
              alt={activeOrganization.name}
              width={32}
              height={32}
              className="rounded-lg"
            />
          ) : (
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">
                {activeOrganization?.name?.charAt(0)?.toUpperCase() || "M"}
              </span>
            </div>
          )}
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">
              {activeOrganization?.name || "Monitor"}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <NavMain sections={mainSections} />
        <NavSecondary items={supportSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
