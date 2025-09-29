import { requireStaff } from "@/lib/auth"
import { StaffDashboard } from "@/components/dashboard/staff-dashboard"

export default async function DashboardPage() {
  const user = await requireStaff()

  return <StaffDashboard user={user} />
}
