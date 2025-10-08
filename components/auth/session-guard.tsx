"use client"

import { useEffect, useState } from "react"
import { useSessionManager } from "@/lib/session-manager"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, LogOut } from "lucide-react"

interface SessionGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  allowedRoles?: string[]
}

export function SessionGuard({ children, requireAuth = true, allowedRoles }: SessionGuardProps) {
  const [isValidating, setIsValidating] = useState(true)
  const [sessionValid, setSessionValid] = useState(false)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null)
  
  const { getSessionInfo, validateSession, startMonitoring, stopMonitoring, forceLogout, refreshSession } = useSessionManager()
  const router = useRouter()

  useEffect(() => {
    let warningInterval: NodeJS.Timeout | null = null

    const checkSession = async () => {
      try {
        const info = await getSessionInfo()
        setSessionInfo(info)

        if (!requireAuth) {
          setSessionValid(true)
          setIsValidating(false)
          return
        }

        if (!info.isValid) {
          setSessionValid(false)
          setIsValidating(false)
          return
        }

        // Check role-based access
        if (allowedRoles && allowedRoles.length > 0) {
          const userRole = info.user?.user_metadata?.role || info.user?.role
          if (!userRole || !allowedRoles.includes(userRole)) {
            setSessionValid(false)
            setIsValidating(false)
            return
          }
        }

        setSessionValid(true)
        setIsValidating(false)

        // Start session monitoring
        startMonitoring()

        // Set up warning for session expiry
        if (info.timeUntilExpiry && info.timeUntilExpiry > 0) {
          const warningTime = Math.max(300000, info.timeUntilExpiry * 1000 - 300000) // 5 minutes before expiry
          
          warningInterval = setTimeout(() => {
            setShowWarning(true)
            setTimeUntilExpiry(Math.floor(info.timeUntilExpiry! / 60))
          }, warningTime)
        }

      } catch (error) {
        console.error("Session validation error:", error)
        setSessionValid(false)
        setIsValidating(false)
      }
    }

    checkSession()

    return () => {
      if (warningInterval) {
        clearTimeout(warningInterval)
      }
      stopMonitoring()
    }
  }, [requireAuth, allowedRoles, getSessionInfo, validateSession, startMonitoring, stopMonitoring])

  const handleRefreshSession = async () => {
    const refreshed = await refreshSession()
    if (refreshed) {
      setShowWarning(false)
      setTimeUntilExpiry(null)
      // Re-validate session
      const info = await getSessionInfo()
      setSessionInfo(info)
    }
  }

  const handleLogout = async () => {
    await forceLogout()
  }

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Validating session...</p>
        </div>
      </div>
    )
  }

  // Show error if session is invalid
  if (requireAuth && !sessionValid) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="space-y-2">
                <p className="font-medium">Session Expired</p>
                <p className="text-sm">
                  Your session has expired or you don't have permission to access this page.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => router.push('/auth/login')} 
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Go to Login
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Session expiry warning */}
      {showWarning && timeUntilExpiry && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="space-y-2">
                <p className="font-medium">Session Expiring Soon</p>
                <p className="text-sm">
                  Your session will expire in {timeUntilExpiry} minutes.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleRefreshSession} 
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Session
                  </Button>
                  <Button 
                    onClick={handleLogout} 
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {children}
    </>
  )
}
