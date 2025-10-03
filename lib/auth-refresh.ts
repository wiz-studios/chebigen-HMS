"use client"

import { createClient } from "@/lib/supabase/client"

/**
 * Attempts to refresh the user's authentication session
 * Returns true if successful, false if the user needs to re-login
 */
export async function refreshAuthSession(): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Try to refresh the session
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.log("Session refresh failed:", error.message)
      return false
    }
    
    if (data.session) {
      console.log("Session refreshed successfully")
      return true
    }
    
    return false
  } catch (error) {
    console.error("Error refreshing session:", error)
    return false
  }
}

/**
 * Clears all authentication data and redirects to login
 */
export async function clearAuthAndRedirect(): Promise<void> {
  try {
    const supabase = createClient()
    
    // Sign out from Supabase
    await supabase.auth.signOut()
    
    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.clear()
    }
    
    // Redirect to login
    window.location.href = '/auth/login?error=session_expired'
  } catch (error) {
    console.error("Error clearing auth:", error)
    // Force redirect even if there's an error
    window.location.href = '/auth/login?error=auth_error'
  }
}

/**
 * Checks if the current session is valid
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      return false
    }
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000)
    return session.expires_at ? session.expires_at > now : false
  } catch (error) {
    console.error("Error checking session:", error)
    return false
  }
}
