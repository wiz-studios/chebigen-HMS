"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestRoutesPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Route Test Page</CardTitle>
            <CardDescription>Test if all routes are accessible</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  Regular Login
                </Button>
              </Link>
              
              <Link href="/auth/signup">
                <Button variant="outline" className="w-full">
                  Signup
                </Button>
              </Link>
              
              <Link href="/superadmin-login">
                <Button variant="outline" className="w-full">
                  SuperAdmin Login
                </Button>
              </Link>
              
              <Link href="/setup">
                <Button variant="outline" className="w-full">
                  System Setup
                </Button>
              </Link>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Instructions:</h3>
              <ol className="text-blue-700 text-sm space-y-1">
                <li>1. Click each button to test if the route works</li>
                <li>2. If a route doesn't work, check the browser console for errors</li>
                <li>3. If you get redirected back here, there's a middleware issue</li>
                <li>4. If you get a 404, the page doesn't exist</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
