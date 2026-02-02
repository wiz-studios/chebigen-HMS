"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface LoginRedirectButtonProps {
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
}

export function LoginRedirectButton({ className, size = "default" }: LoginRedirectButtonProps) {
  const handleRedirect = async () => {
    try {
      const supabase = createClient()
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear storage
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
      
      // Redirect to login page
      window.location.href = "/auth/login?error=session_expired"
    } catch (error) {
      console.error("Error during redirect:", error)
      window.location.href = "/auth/login?error=auth_error"
    }
  }

  return (
    <Button 
      onClick={handleRedirect} 
      size={size}
      className={`bg-red-600 hover:bg-red-700 ${className || ''}`}
    >
      <LogOut className="h-4 w-4 mr-2" />
      Go to Login
    </Button>
  )
}