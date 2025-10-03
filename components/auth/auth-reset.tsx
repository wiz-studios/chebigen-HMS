"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"

export function AuthReset() {
  const [isResetting, setIsResetting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleReset = async () => {
    setIsResetting(true)
    setError(null)
    setMessage(null)

    try {
      const supabase = createClient()
      
      // Sign out completely
      await supabase.auth.signOut()
      
      // Clear all local storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      setMessage("Authentication reset successfully. Please refresh the page and log in again.")
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)
      
    } catch (error) {
      console.error("Error resetting auth:", error)
      setError("Failed to reset authentication. Please try refreshing the page manually.")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Authentication Reset
        </CardTitle>
        <CardDescription>
          If you're experiencing authentication errors, this will clear your session and redirect you to login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={handleReset} 
          disabled={isResetting}
          className="w-full"
        >
          {isResetting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset Authentication"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
