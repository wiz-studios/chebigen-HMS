"use client"

import { createClient } from "@/lib/supabase/client"

export interface SessionTimeoutConfig {
  warningTime: number // milliseconds before expiry to show warning
  autoLogoutTime: number // milliseconds before expiry to auto logout
  checkInterval: number // how often to check session (milliseconds)
}

const DEFAULT_CONFIG: SessionTimeoutConfig = {
  warningTime: 300000, // 5 minutes
  autoLogoutTime: 60000, // 1 minute
  checkInterval: 30000 // 30 seconds
}

export class SessionTimeoutManager {
  private static instance: SessionTimeoutManager
  private config: SessionTimeoutConfig
  private checkInterval: NodeJS.Timeout | null = null
  private warningShown = false
  private onWarning?: () => void
  private onLogout?: () => void

  private constructor(config: Partial<SessionTimeoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  static getInstance(config?: Partial<SessionTimeoutConfig>): SessionTimeoutManager {
    if (!SessionTimeoutManager.instance) {
      SessionTimeoutManager.instance = new SessionTimeoutManager(config)
    }
    return SessionTimeoutManager.instance
  }

  /**
   * Start monitoring session timeout
   */
  start(onWarning?: () => void, onLogout?: () => void): void {
    this.onWarning = onWarning
    this.onLogout = onLogout
    this.warningShown = false

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.checkInterval = setInterval(() => {
      this.checkSessionTimeout()
    }, this.config.checkInterval)
  }

  /**
   * Stop monitoring session timeout
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.warningShown = false
  }

  /**
   * Check if session is about to expire
   */
  private async checkSessionTimeout(): Promise<void> {
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        this.handleLogout()
        return
      }

      const now = Math.floor(Date.now() / 1000)
      const expiresAt = session.expires_at || 0
      const timeUntilExpiry = (expiresAt - now) * 1000 // Convert to milliseconds

      // Check if session is expired
      if (timeUntilExpiry <= 0) {
        this.handleLogout()
        return
      }

      // Check if we should show warning
      if (timeUntilExpiry <= this.config.warningTime && !this.warningShown) {
        this.handleWarning()
      }

      // Check if we should auto logout
      if (timeUntilExpiry <= this.config.autoLogoutTime) {
        this.handleLogout()
      }

    } catch (error) {
      console.error("Error checking session timeout:", error)
      this.handleLogout()
    }
  }

  /**
   * Handle session warning
   */
  private handleWarning(): void {
    this.warningShown = true
    if (this.onWarning) {
      this.onWarning()
    }
  }

  /**
   * Handle automatic logout
   */
  private handleLogout(): void {
    this.stop()
    if (this.onLogout) {
      this.onLogout()
    } else {
      // Default logout behavior
      this.performLogout()
    }
  }

  /**
   * Perform logout and redirect
   */
  private async performLogout(): Promise<void> {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      
      // Clear all storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear cookies
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=")
          const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
          if (name) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          }
        })
      }
      
      // Redirect to login
      window.location.href = "/auth/login?error=session_expired"
    } catch (error) {
      console.error("Error during logout:", error)
      window.location.href = "/auth/login?error=auth_error"
    }
  }

  /**
   * Get time until session expires
   */
  async getTimeUntilExpiry(): Promise<number> {
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        return 0
      }

      const now = Math.floor(Date.now() / 1000)
      const expiresAt = session.expires_at || 0
      return Math.max(0, (expiresAt - now) * 1000)
    } catch (error) {
      console.error("Error getting time until expiry:", error)
      return 0
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
        return false
      }
      
      this.warningShown = false
      return true
    } catch (error) {
      console.error("Error refreshing session:", error)
      return false
    }
  }
}

/**
 * Hook for session timeout management
 */
export function useSessionTimeout(config?: Partial<SessionTimeoutConfig>) {
  const timeoutManager = SessionTimeoutManager.getInstance(config)

  return {
    startTimeout: (onWarning?: () => void, onLogout?: () => void) => 
      timeoutManager.start(onWarning, onLogout),
    stopTimeout: () => timeoutManager.stop(),
    getTimeUntilExpiry: () => timeoutManager.getTimeUntilExpiry(),
    refreshSession: () => timeoutManager.refreshSession()
  }
}
