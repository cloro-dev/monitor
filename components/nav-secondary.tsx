'use client'

import Link from 'next/link'

import { NavbarItem } from '@/components/app-sidebar'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Icon } from '@/components/ui/icon'

function getDisplayLabel(title: string): string {
  switch (title) {
    case 'changelog':
      return "See what's new"
    case 'feedback':
      return 'Ask for new features'
    case 'support':
      return 'Support'
    case "Need help? We're here!":
      return "Need help? We're here!"
    default:
      return title
  }
}

function getTooltipText(title: string): string {
  switch (title) {
    case 'changelog':
      return 'View recent changes'
    case 'feedback':
      return 'Ask for new features'
    case 'support':
    case "Need help? We're here!":
      return 'Get help'
    default:
      return title
  }
}

export function NavSecondary({
  items,
  ...props
}: {
  items: NavbarItem[]
  children?: React.ReactNode
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                size="sm"
                isActive={item.isActive}
                variant={item.variant}
                className={item.className}
                tooltip={getTooltipText(item.title)}
              >
                {item.url.startsWith('http') || item.url.startsWith('mailto:') ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name={item.icon} />
                    <span>{getDisplayLabel(item.title)}</span>
                  </a>
                ) : item.title === 'changelog' ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                  >
                    <Icon name={item.icon} />
                    <span>{getDisplayLabel(item.title)}</span>
                  </button>
                ) : (
                  <Link href={item.url} onClick={item.onClick}>
                    <Icon name={item.icon} />
                    <span>{getDisplayLabel(item.title)}</span>
                  </Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}