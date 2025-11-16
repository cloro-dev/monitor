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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const { isMobile, state } = useSidebar();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const mainSections: { title: string; items: NavbarItem[] }[] = [
    {
      title: "",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: "BarChart3" as IconName,
        },
        {
          title: "API keys",
          url: "/dashboard/api-keys",
          icon: "Key" as IconName,
        },
        {
          title: "Logs",
          url: "/dashboard/logs",
          icon: "Activity" as IconName,
        },
      ],
    },
  ];

  const supportSecondaryItems = [
    {
      title: "Organization",
      url: "/dashboard/settings/organization",
      icon: "Building2" as IconName,
    },
    {
      title: "Account",
      url: "/dashboard/account",
      icon: "User" as IconName,
    },
    {
      title: "Support",
      url: "https://cloro.dev/contact/",
      icon: "LifeBuoy" as IconName,
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
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
