"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Menu,
  Home,
  Users,
  Calendar,
  FileText,
  Activity,
  Package,
  BarChart3,
  Bell,
  Settings,
  Shield,
  Stethoscope,
} from "lucide-react"
import type { User } from "@/lib/auth"

interface MobileNavigationProps {
  user: User
  unreadNotifications?: number
}

export function MobileNavigation({ user, unreadNotifications = 0 }: MobileNavigationProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isMobile = useIsMobile()

  if (!isMobile) return null

  const getNavigationItems = () => {
    const baseItems = [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: Home,
        roles: ["doctor", "nurse", "receptionist", "lab_tech", "pharmacist", "accountant", "admin", "superadmin"],
      },
      {
        title: "Patients",
        href: "/patients",
        icon: Users,
        roles: ["doctor", "nurse", "receptionist", "admin", "superadmin"],
      },
      {
        title: "Appointments",
        href: "/appointments",
        icon: Calendar,
        roles: ["doctor", "nurse", "receptionist", "admin", "superadmin"],
      },
      {
        title: "Clinical",
        href: "/clinical",
        icon: FileText,
        roles: ["doctor", "nurse", "lab_tech", "admin", "superadmin"],
      },
      {
        title: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        roles: ["doctor", "accountant", "admin", "superadmin"],
      },
      {
        title: "Inventory",
        href: "/inventory",
        icon: Package,
        roles: ["pharmacist", "nurse", "admin", "superadmin"],
      },
      {
        title: "Reports",
        href: "/reports",
        icon: Activity,
        roles: ["doctor", "accountant", "admin", "superadmin"],
      },
      {
        title: "Notifications",
        href: "/notifications",
        icon: Bell,
        roles: ["doctor", "nurse", "receptionist", "lab_tech", "pharmacist", "accountant", "admin", "superadmin"],
        badge: unreadNotifications > 0 ? unreadNotifications : undefined,
      },
    ]

    if (user.role === "superadmin") {
      baseItems.push({
        title: "Admin Panel",
        href: "/superadmin",
        icon: Shield,
        roles: ["superadmin"],
      })
    }

    return baseItems.filter((item) => item.roles.includes(user.role))
  }

  const navigationItems = getNavigationItems()

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      doctor: "Doctor",
      nurse: "Nurse",
      receptionist: "Receptionist",
      lab_tech: "Lab Technician",
      pharmacist: "Pharmacist",
      accountant: "Accountant",
      admin: "Admin",
      superadmin: "SuperAdmin",
    }
    return roleNames[role as keyof typeof roleNames] || role
  }

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      doctor: "bg-blue-100 text-blue-800",
      nurse: "bg-green-100 text-green-800",
      receptionist: "bg-purple-100 text-purple-800",
      lab_tech: "bg-yellow-100 text-yellow-800",
      pharmacist: "bg-pink-100 text-pink-800",
      accountant: "bg-indigo-100 text-indigo-800",
      admin: "bg-gray-100 text-gray-800",
      superadmin: "bg-red-100 text-red-800",
    }
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">Hospital Management</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-600 truncate">{user.full_name}</p>
                  <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>{getRoleDisplayName(user.role)}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-4">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "secondary" : "ghost"}
                    className={`w-full justify-start h-12 px-4 ${
                      isActive ? "bg-blue-50 text-blue-700 border-blue-200" : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      window.location.href = item.href
                      setOpen(false)
                    }}
                  >
                    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.title}</span>
                    {item.badge && (
                      <Badge
                        variant="destructive"
                        className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </Badge>
                    )}
                  </Button>
                )
              })}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start h-12 px-4 text-gray-700 hover:bg-gray-50"
              onClick={() => {
                window.location.href = "/settings"
                setOpen(false)
              }}
            >
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
