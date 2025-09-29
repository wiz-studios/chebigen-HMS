import { requireStaff } from "@/lib/auth"
import { InventoryManagement } from "@/components/inventory/inventory-management"

export default async function InventoryPage() {
  const user = await requireStaff()

  // Only allow certain roles to access inventory
  const allowedRoles = ["superadmin", "pharmacist", "nurse", "doctor"]
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view inventory.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InventoryManagement userRole={user.role} userId={user.id} />
      </div>
    </div>
  )
}
