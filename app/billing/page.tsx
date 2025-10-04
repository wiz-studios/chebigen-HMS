import { EnhancedBillingDashboard } from "@/components/billing/enhanced-billing-dashboard"
import { requireStaff } from "@/lib/auth"

export default async function BillingPage() {
  const user = await requireStaff()
  return <EnhancedBillingDashboard userRole={user.role} userId={user.id} />
}