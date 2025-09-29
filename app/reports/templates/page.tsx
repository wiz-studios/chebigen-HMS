import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ReportTemplates } from "@/components/reports/report-templates"

export default async function ReportTemplatesPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user has permission to access reports
  const { data: userData } = await supabase.from("users").select("role, status").eq("id", user.id).single()

  if (!userData || userData.status !== "active") {
    redirect("/unauthorized")
  }

  // Only allow certain roles to access reports
  const allowedRoles = ["superadmin", "doctor", "accountant", "admin"]
  if (!allowedRoles.includes(userData.role)) {
    redirect("/unauthorized")
  }

  return (
    <div className="container mx-auto py-6">
      <ReportTemplates />
    </div>
  )
}
