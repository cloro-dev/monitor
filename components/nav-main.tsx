'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { NavbarItem } from '@/components/app-sidebar'
import { cn } from '@/lib/utils'
import { useSidebarCollapsible } from '@/hooks/use-sidebar-collapsible'

export function NavMain({
  sections,
}: {
  sections: { title: string; items: NavbarItem[] }[]
}) {
  const pathname = usePathname()
  const { openItems, toggleItem: toggleItemState } = useSidebarCollapsible()

  const isPathActive = (itemUrl: string) => {
    // Handle root path specially to avoid matching all routes
    if (itemUrl === '/') {
      return pathname === '/'
    }
    // Check if current path starts with the item's URL
    return pathname.startsWith(itemUrl)
  }

  const toggleItem = (itemTitle: string, e?: React.MouseEvent) => {
    // Prevent toggle when clicking on the chevron
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    toggleItemState(itemTitle)
  }

  return (
    <>
      {sections.map((section) => (
        <SidebarGroup key={section.title}>
          {!!section.title && (
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
          )}
          <SidebarMenu>
            {section.items.map((item) => {
              const isActive = isPathActive(item.url)
              const hasSubItems = item.items && item.items.length > 0
              const isOpen = openItems[item.title] ?? false

              if (item.isCollapsible) {
                return (
                  <Collapsible
                    key={item.title}
                    open={isOpen}
                    onOpenChange={() => toggleItem(item.title)}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={
                          item.disabled
                            ? `${item.title} (Coming Soon)`
                            : item.title
                        }
                        isActive={isActive}
                      >
                        <Link
                          href={item.url}
                          className="flex w-full items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Icon name={item.icon} />
                            <span>{item.title}</span>
                          </span>
                          <CollapsibleTrigger
                            asChild
                            onClick={(e) => toggleItem(item.title, e)}
                          >
                            <ChevronRight
                              className={cn(
                                'h-4 w-4 transition-transform hover:bg-sidebar-accent rounded',
                                isOpen && 'rotate-90',
                              )}
                            />
                          </CollapsibleTrigger>
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {hasSubItems ? (
                            item.items?.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.url}>
                                <SidebarMenuSubButton
                                  asChild
                                  size="sm"
                                  className="h-5 py-0.5 px-1.5"
                                >
                                  <Link href={subItem.url}>
                                    <span className="truncate text-xs">
                                      {subItem.title}
                                    </span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))
                          ) : (
                            <SidebarMenuSubItem>
                              <span className="text-xs text-muted-foreground px-2">
                                No recent items
                              </span>
                            </SidebarMenuSubItem>
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              }

              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={item.isActive}
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip={
                        item.disabled
                          ? `${item.title} (Coming Soon)`
                          : item.title
                      }
                      isActive={isActive}
                    >
                      {item.disabled ? (
                        <div
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md cursor-not-allowed opacity-50',
                            isActive && 'bg-accent',
                          )}
                        >
                          <Icon name={item.icon} />
                          <span>{item.title}</span>
                        </div>
                      ) : (
                        <Link href={item.url}>
                          <Icon name={item.icon} />
                          <span>{item.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}