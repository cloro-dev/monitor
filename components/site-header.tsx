'use client'

import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

export function SiteHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <Icon name="LayoutDashboard" className="h-5 w-5" />
          <span className="font-semibold">Monitor Dashboard</span>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2 px-4">
        <Button variant="ghost" size="sm" asChild>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="Github" className="h-4 w-4" />
            <span className="sr-only">GitHub</span>
          </a>
        </Button>
      </div>
    </header>
  )
}