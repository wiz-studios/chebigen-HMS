import { requireSuperAdmin } from "@/lib/auth"
import { SuperAdminDashboard } from "@/components/superadmin/dashboard"

export default async function SuperAdminPage() {
  const user = await requireSuperAdmin()

  return <SuperAdminDashboard user={user} />
}
