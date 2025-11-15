import { useState, useEffect } from 'react'

const SIDEBAR_COLLAPSIBLE_KEY = 'sidebar-collapsible-states'

export function useSidebarCollapsible() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSIBLE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSIBLE_KEY, JSON.stringify(openItems))
  }, [openItems])

  const toggleItem = (itemTitle: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [itemTitle]: !prev[itemTitle],
    }))
  }

  return { openItems, toggleItem }
}