import { getCurrentUser } from "@/lib/auth"

export default async function TestLabTechPage() {
  try {
    const user = await getCurrentUser()
    
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Lab Tech Debug Page</h1>
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">User Data:</h2>
          <pre className="text-sm">
            {user ? JSON.stringify(user, null, 2) : "No user found"}
          </pre>
        </div>
        <div className="mt-4">
          <a href="/dashboard" className="text-blue-600 underline">
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Lab Tech Debug Page - Error</h1>
        <div className="bg-red-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Error:</h2>
          <pre className="text-sm text-red-600">
            {error instanceof Error ? error.message : "Unknown error"}
          </pre>
        </div>
      </div>
    )
  }
}
