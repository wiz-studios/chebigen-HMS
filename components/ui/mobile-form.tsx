"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { ArrowLeft } from "lucide-react"

interface MobileFormProps {
  title: string
  description?: string
  onBack?: () => void
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function MobileForm({ title, description, onBack, children, actions, className = "" }: MobileFormProps) {
  const isMobile = useIsMobile()

  if (!isMobile) {
    // Desktop form layout
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
          {children}
          {actions && <div className="flex justify-end gap-2 pt-4 border-t">{actions}</div>}
        </CardContent>
      </Card>
    )
  }

  // Mobile form layout
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Mobile header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
            {description && <p className="text-sm text-gray-600 truncate">{description}</p>}
          </div>
        </div>
      </div>

      {/* Mobile form content */}
      <div className="p-4">
        <div className="space-y-6">{children}</div>
      </div>

      {/* Mobile actions */}
      {actions && (
        <div className="sticky bottom-0 bg-white border-t p-4">
          <div className="flex gap-2">{actions}</div>
        </div>
      )}
    </div>
  )
}

interface MobileFormSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function MobileFormSection({ title, description, children, className = "" }: MobileFormSectionProps) {
  const isMobile = useIsMobile()

  if (!isMobile) {
    return (
      <div className={`space-y-4 ${className}`}>
        {title && (
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
          </div>
        )}
        {children}
      </div>
    )
  }

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader className="pb-4">
          {title && <CardTitle className="text-base">{title}</CardTitle>}
          {description && <CardDescription className="text-sm">{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}
