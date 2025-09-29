import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export type UserRole =
  | "superadmin"
  | "doctor"
  | "nurse"
  | "receptionist"
  | "lab_tech"
  | "pharmacist"
  | "accountant"
  | "patient"

export interface User {
  id: string
  full_name: string
  email: string
  role: UserRole
  status: "active" | "inactive" | "suspended" | "pending"
  created_at: string
  updated_at: string
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return null
  }

  const { data: userData, error: userError } = await supabase.from("users").select("*").eq("id", authUser.id).single()

  if (userError || !userData) {
    return null
  }

  return userData as User
}

export async function requireAuth(allowedRoles?: UserRole[]) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  if (user.status !== "active") {
    redirect("/auth/login?error=Account not active")
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect("/unauthorized")
  }

  return user
}

export async function requireSuperAdmin() {
  return await requireAuth(["superadmin"])
}

export async function requireStaff() {
  return await requireAuth(["superadmin", "doctor", "nurse", "receptionist", "lab_tech", "pharmacist", "accountant"])
}

export async function requireClinical() {
  return await requireAuth(["superadmin", "doctor", "nurse"])
}

export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole)
}

export function canViewPatientData(userRole: UserRole): boolean {
  return ["superadmin", "doctor", "nurse", "receptionist", "lab_tech"].includes(userRole)
}

export function canEditPatientData(userRole: UserRole): boolean {
  return ["superadmin", "doctor", "nurse", "receptionist"].includes(userRole)
}

export function canManageUsers(userRole: UserRole): boolean {
  return userRole === "superadmin"
}

export function canViewFinancials(userRole: UserRole): boolean {
  return ["superadmin", "accountant", "receptionist"].includes(userRole)
}

export function canManageFinancials(userRole: UserRole): boolean {
  return ["superadmin", "accountant"].includes(userRole)
}
