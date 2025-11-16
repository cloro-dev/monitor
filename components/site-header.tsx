"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function SiteHeader() {
  const pathname = usePathname();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    if (pathname === "/dashboard/settings") {
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings" },
      ];
    }
    if (pathname === "/dashboard") {
      return [{ label: "Dashboard" }];
    }
    if (pathname.startsWith("/dashboard/api-keys")) {
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "API Keys" },
      ];
    }
    if (pathname.startsWith("/dashboard/logs")) {
      return [{ label: "Dashboard", href: "/dashboard" }, { label: "Logs" }];
    }
    if (pathname.startsWith("/dashboard/account")) {
      return [{ label: "Dashboard", href: "/dashboard" }, { label: "Account" }];
    }
    return [{ label: "Dashboard" }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 justify-between px-4">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList>
            {breadcrumbs.slice(0, -1).map((breadcrumb, index) => (
              <Fragment key={`breadcrumb-${index}`}>
                <BreadcrumbItem className="hidden md:block">
                  {breadcrumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbLink>{breadcrumb.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </Fragment>
            ))}
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate max-w-[200px] sm:max-w-none">
                {breadcrumbs.at(-1)?.label}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
