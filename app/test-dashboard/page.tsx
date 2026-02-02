import { requireStaff } from "@/lib/auth"

export default async function TestDashboardPage() {
  try {
    console.log("TestDashboard: Starting requireStaff()...")
    const user = await requireStaff()
    console.log("TestDashboard: requireStaff() succeeded, user:", user)
    
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard Test Page</h1>
        <div className="bg-green-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">✅ requireStaff() Success:</h2>
          <pre className="text-sm">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
        <div className="mt-4">
          <a href="/dashboard" className="text-blue-600 underline">
            Go to Real Dashboard
          </a>
        </div>
      </div>
    )
  } catch (error) {
    console.error("TestDashboard: requireStaff() failed:", error)
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard Test Page - Error</h1>
        <div className="bg-red-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">❌ requireStaff() Failed:</h2>
          <pre className="text-sm text-red-600">
            {error instanceof Error ? error.message : "Unknown error"}
          </pre>
        </div>
        <div className="mt-4">
          <a href="/test-lab-tech" className="text-blue-600 underline">
            Go back to Lab Tech Test
          </a>
        </div>
      </div>
    )
  }
}

