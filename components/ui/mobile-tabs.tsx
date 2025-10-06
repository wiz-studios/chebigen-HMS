"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useIsMobile } from "@/hooks/use-mobile"

interface MobileTab {
  value: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: number
}

interface MobileTabsProps {
  tabs: MobileTab[]
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function MobileTabs({ tabs, value, onValueChange, children, className = "" }: MobileTabsProps) {
  const isMobile = useIsMobile()

  if (!isMobile) {
    // Return regular tabs for desktop
    return <div className={className}>{children}</div>
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mobile tab navigation */}
      <ScrollArea className="w-full">
        <div className="flex gap-1 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = value === tab.value

            return (
              <Button
                key={tab.value}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onValueChange(tab.value)}
                className={`flex-shrink-0 text-xs px-2 py-2 min-w-0 ${
                  isActive ? "bg-blue-600 text-white" : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                {Icon && <Icon className="h-3 w-3 mr-1 flex-shrink-0" />}
                <span className="whitespace-nowrap text-xs truncate">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center flex-shrink-0">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </Button>
            )
          })}
        </div>
      </ScrollArea>

      {/* Tab content */}
      <div>{children}</div>
    </div>
  )
}

interface MobileTabContentProps {
  value: string
  activeValue: string
  children: React.ReactNode
}

export function MobileTabContent({ value, activeValue, children }: MobileTabContentProps) {
  if (value !== activeValue) return null
  return <div>{children}</div>
}
