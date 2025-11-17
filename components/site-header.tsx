'use client';

import { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { getRouteTitle } from '@/lib/routes';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface SiteHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
}

export function SiteHeader({ breadcrumbs }: SiteHeaderProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs based on route if not provided
  const autoBreadcrumbs: BreadcrumbItem[] = (() => {
    const title = getRouteTitle(pathname);
    return [{ label: title }];
  })();

  // Use provided breadcrumbs or auto-generated ones
  const finalBreadcrumbs = breadcrumbs || autoBreadcrumbs;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList>
            {finalBreadcrumbs.slice(0, -1).map((breadcrumb, index) => (
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
              <BreadcrumbPage className="max-w-[200px] truncate sm:max-w-none">
                {finalBreadcrumbs.at(-1)?.label}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
