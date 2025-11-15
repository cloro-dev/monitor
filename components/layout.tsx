'use client'

import { AppSidebar } from './app-sidebar'
import { SidebarInset, SidebarProvider } from './ui/sidebar'
import { SiteHeader } from './site-header'

export function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}