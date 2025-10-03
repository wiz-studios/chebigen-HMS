"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { User, UserRole } from "@/lib/auth"
import { UserCheck, UserX, Search, CheckCircle, XCircle, AlertCircle, Trash2 } from "lucide-react"

interface UserManagementProps {
  userRole: UserRole
  onStatsUpdate: () => void
}

interface UserWithDetails extends User {
  patient_count?: number
}

export function UserManagement({ userRole, onStatsUpdate }: UserManagementProps) {
  const [users, setUsers] = useState<UserWithDetails[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    action: "approve" | "reject" | "deactivate" | "delete" | null
    user: UserWithDetails | null
  }>({
    open: false,
    action: null,
    user: null,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Access control based on HMS Access Control Matrix
  const canAccessSystemUsers = () => {
    // System Users: SuperAdmin (Full CRUD), Others (No access)
    return userRole === "superadmin"
  }

  useEffect(() => {
    if (canAccessSystemUsers()) {
      loadUsers()
    } else {
      setUsers([])
      setError("You don't have permission to access system user management. Only superadmins can manage system users.")
    }
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, statusFilter, roleFilter])

  const loadUsers = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

      if (error) throw error

      setUsers(data || [])
    } catch (error) {
      setError("Failed to load users")
      console.error("Error loading users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter)
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }

  const handleUserAction = async (action: "approve" | "reject" | "deactivate" | "delete", user: UserWithDetails) => {
    const supabase = createClient()
    setError(null)
    setSuccess(null)

    try {
      let updateData: Partial<User> = {}
      let auditAction = ""

      switch (action) {
        case "approve":
          updateData = { status: "active" }
          auditAction = "USER_APPROVED"
          break
        case "reject":
          updateData = { status: "inactive" }
          auditAction = "USER_REJECTED"
          break
        case "deactivate":
          updateData = { status: "inactive" }
          auditAction = "USER_DEACTIVATED"
          break
        case "delete":
          // Soft delete
          updateData = { deleted_at: new Date().toISOString() }
          auditAction = "USER_DELETED"
          break
      }

      const { error: updateError } = await supabase.from("users").update(updateData).eq("id", user.id)

      if (updateError) throw updateError

      // Log the action
      await supabase.from("audit_logs").insert({
        user_id: user.id, // Current admin user would be better
        entity: "users",
        entity_id: user.id,
        action: auditAction,
        details: {
          target_user: user.email,
          previous_status: user.status,
          new_status: updateData.status,
        },
        reason: `SuperAdmin ${action} user account`,
        severity: "medium",
      })

      setSuccess(`User ${action} successfully`)
      await loadUsers()
      onStatsUpdate()
    } catch (error) {
      setError(`Failed to ${action} user`)
      console.error(`Error ${action} user:`, error)
    }

    setActionDialog({ open: false, action: null, user: null })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
      case "suspended":
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRoleBadge = (role: UserRole) => {
    const roleColors = {
      superadmin: "bg-red-100 text-red-800",
      doctor: "bg-blue-100 text-blue-800",
      nurse: "bg-green-100 text-green-800",
      receptionist: "bg-purple-100 text-purple-800",
      lab_tech: "bg-yellow-100 text-yellow-800",
      pharmacist: "bg-pink-100 text-pink-800",
      accountant: "bg-indigo-100 text-indigo-800",
      patient: "bg-gray-100 text-gray-800",
    }

    return (
      <Badge className={roleColors[role] || "bg-gray-100 text-gray-800"}>{role.replace("_", " ").toUpperCase()}</Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="nurse">Nurse</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
                <SelectItem value="lab_tech">Lab Tech</SelectItem>
                <SelectItem value="pharmacist">Pharmacist</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() =>
                                  setActionDialog({
                                    open: true,
                                    action: "approve",
                                    user,
                                  })
                                }
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setActionDialog({
                                    open: true,
                                    action: "reject",
                                    user,
                                  })
                                }
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {user.status === "active" && user.role !== "superadmin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setActionDialog({
                                  open: true,
                                  action: "deactivate",
                                  user,
                                })
                              }
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {actionDialog.action?.charAt(0).toUpperCase() + actionDialog.action?.slice(1)}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionDialog.action} the user "{actionDialog.user?.full_name}"?
              {actionDialog.action === "delete" && " This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: null, user: null })}>
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === "delete" ? "destructive" : "default"}
              onClick={() => {
                if (actionDialog.action && actionDialog.user) {
                  handleUserAction(actionDialog.action, actionDialog.user)
                }
              }}
            >
              {actionDialog.action === "approve" && <CheckCircle className="h-4 w-4 mr-2" />}
              {actionDialog.action === "reject" && <XCircle className="h-4 w-4 mr-2" />}
              {actionDialog.action === "deactivate" && <UserX className="h-4 w-4 mr-2" />}
              {actionDialog.action === "delete" && <Trash2 className="h-4 w-4 mr-2" />}
              Confirm {actionDialog.action?.charAt(0).toUpperCase() + actionDialog.action?.slice(1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
