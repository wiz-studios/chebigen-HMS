import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotificationPreferences } from "@/components/notifications/notification-preferences"
import { NotificationTemplates } from "@/components/notifications/notification-templates"

export default async function NotificationsPage() {
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

  // Check if user has permission to access notifications
  const { data: userData } = await supabase.from("users").select("role, status").eq("id", user.id).single()

  if (!userData || userData.status !== "active") {
    redirect("/unauthorized")
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">Manage your notification preferences and templates</p>
      </div>

      <Tabs defaultValue="preferences" className="space-y-6">
        <TabsList>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences">
          <NotificationPreferences />
        </TabsContent>

        <TabsContent value="templates">
          <NotificationTemplates />
        </TabsContent>
      </Tabs>
    </div>
  )
}
