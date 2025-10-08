"use client"

import { createClient } from "@/lib/supabase/client"

export interface SessionInfo {
  isValid: boolean
  user: any | null
  expiresAt: number | null
  timeUntilExpiry: number | null
}

/**
 * Comprehensive session management utility
 */
export class SessionManager {
  private static instance: SessionManager
  private sessionCheckInterval: NodeJS.Timeout | null = null
  private readonly SESSION_CHECK_INTERVAL = 60000 // Check every minute
  private readonly SESSION_WARNING_TIME = 300000 // Warn 5 minutes before expiry

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  /**
   * Get current session information
   */
  async getSessionInfo(): Promise<SessionInfo> {
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        return {
          isValid: false,
          user: null,
          expiresAt: null,
          timeUntilExpiry: null
        }
      }

      const now = Math.floor(Date.now() / 1000)
      const expiresAt = session.expires_at || 0
      const timeUntilExpiry = expiresAt - now

      return {
        isValid: expiresAt > now,
        user: session.user,
        expiresAt,
        timeUntilExpiry: timeUntilExpiry > 0 ? timeUntilExpiry : 0
      }
    } catch (error) {
      console.error("Error getting session info:", error)
      return {
        isValid: false,
        user: null,
        expiresAt: null,
        timeUntilExpiry: null
      }
    }
  }

  /**
   * Check if session is valid and handle expiry
   */
  async validateSession(): Promise<boolean> {
    const sessionInfo = await this.getSessionInfo()
    
    if (!sessionInfo.isValid) {
      await this.forceLogout()
      return false
    }

    // Check if session is about to expire
    if (sessionInfo.timeUntilExpiry && sessionInfo.timeUntilExpiry < this.SESSION_WARNING_TIME) {
      console.warn(`Session expires in ${Math.floor(sessionInfo.timeUntilExpiry / 60)} minutes`)
    }

    return true
  }

  /**
   * Start automatic session monitoring
   */
  startSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval)
    }

    this.sessionCheckInterval = setInterval(async () => {
      const isValid = await this.validateSession()
      if (!isValid) {
        this.stopSessionMonitoring()
      }
    }, this.SESSION_CHECK_INTERVAL)
  }

  /**
   * Stop automatic session monitoring
   */
  stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval)
      this.sessionCheckInterval = null
    }
  }

  /**
   * Force logout and clear all session data
   */
  async forceLogout(): Promise<void> {
    try {
      const supabase = createClient()
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear all storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear Supabase-specific storage
        localStorage.removeItem('supabase.auth.token')
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl) {
          const projectId = supabaseUrl.split('//')[1]?.split('.')[0]
          if (projectId) {
            localStorage.removeItem(`sb-${projectId}-auth-token`)
          }
        }
        
        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=")
          const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
          if (name) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`
          }
        })
      }
      
      // Stop monitoring
      this.stopSessionMonitoring()
      
      // Force redirect
      window.location.href = "/auth/login?error=session_expired"
    } catch (error) {
      console.error("Error during force logout:", error)
      // Force redirect even if there's an error
      window.location.href = "/auth/login?error=auth_error"
    }
  }

  /**
   * Refresh session if possible
   */
  async refreshSession(): Promise<boolean> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error || !data.session) {
        console.log("Session refresh failed:", error?.message)
        return false
      }
      
      console.log("Session refreshed successfully")
      return true
    } catch (error) {
      console.error("Error refreshing session:", error)
      return false
    }
  }

  /**
   * Check if user should be automatically logged out
   */
  async shouldAutoLogout(): Promise<boolean> {
    const sessionInfo = await this.getSessionInfo()
    return !sessionInfo.isValid
  }
}

/**
 * Hook for session management in React components
 */
export function useSessionManager() {
  const sessionManager = SessionManager.getInstance()

  return {
    getSessionInfo: () => sessionManager.getSessionInfo(),
    validateSession: () => sessionManager.validateSession(),
    startMonitoring: () => sessionManager.startSessionMonitoring(),
    stopMonitoring: () => sessionManager.stopSessionMonitoring(),
    forceLogout: () => sessionManager.forceLogout(),
    refreshSession: () => sessionManager.refreshSession(),
    shouldAutoLogout: () => sessionManager.shouldAutoLogout()
  }
}
