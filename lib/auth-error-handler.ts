"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * Custom hook to handle authentication errors and refresh token issues
 */
export function useAuthErrorHandler() {
  const [isHandling, setIsHandling] = useState(false)
  const router = useRouter()

  const handleAuthError = async (error: any) => {
    if (isHandling) return

    setIsHandling(true)

    try {
      // Check if it's a refresh token error
      if (error?.code === 'refresh_token_not_found' || 
          error?.message?.includes('Invalid Refresh Token') ||
          error?.message?.includes('refresh_token_not_found')) {
        
        console.log("Handling refresh token error...")
        
        const supabase = createClient()
        
        // Clear the current session
        await supabase.auth.signOut()
        
        // Clear any stored tokens
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.clear()
        
        // Redirect to login with error message
        router.push('/auth/login?error=session_expired')
        return
      }
      
      // Handle other auth errors
      if (error?.code === 'invalid_grant' || 
          error?.message?.includes('Invalid credentials')) {
        
        console.log("Handling invalid credentials error...")
        
        const supabase = createClient()
        await supabase.auth.signOut()
        
        router.push('/auth/login?error=invalid_credentials')
        return
      }
      
    } catch (handleError) {
      console.error("Error handling auth error:", handleError)
      // Force logout and redirect
      router.push('/auth/login?error=auth_error')
    } finally {
      setIsHandling(false)
    }
  }

  return { handleAuthError, isHandling }
}

/**
 * Utility function to check if an error is an auth error
 */
export function isAuthError(error: any): boolean {
  return error?.code === 'refresh_token_not_found' ||
         error?.code === 'invalid_grant' ||
         error?.message?.includes('Invalid Refresh Token') ||
         error?.message?.includes('refresh_token_not_found') ||
         error?.message?.includes('Invalid credentials') ||
         error?.__isAuthError === true
}

/**
 * Wrapper function for Supabase operations that handles auth errors
 */
export async function withAuthErrorHandling<T>(
  operation: () => Promise<T>,
  onAuthError?: () => void
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    if (isAuthError(error)) {
      console.log("Auth error detected, handling...")
      
      if (onAuthError) {
        onAuthError()
      } else {
        // Default handling
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = '/auth/login?error=session_expired'
      }
      
      return null
    }
    
    // Re-throw non-auth errors
    throw error
  }
}
