"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { UserRole } from "@/lib/auth"
import { Plus, Search, Eye, TestTube, Upload } from "lucide-react"

interface LabResult {
  id: string
  patient_id: string
  ordered_by: string
  test_name: string
  test_type: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  ordered_date: string
  collected_date?: string
  result_date?: string
  result_value?: string
  reference_range?: string
  unit?: string
  abnormal_flag?: string
  notes?: string
  created_at: string
  patient?: {
    first_name: string
    last_name: string
    mrn: string
  }
  ordered_by_user?: {
    full_name: string
  }
}

interface Patient {
  id: string
  mrn: string
  first_name: string
  last_name: string
}

interface LabResultsManagementProps {
  userRole: UserRole
  userId: string
  onStatsUpdate: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

const LAB_TEST_TYPES = [
  { value: "blood", label: "Blood Test" },
  { value: "urine", label: "Urine Test" },
  { value: "stool", label: "Stool Test" },
  { value: "culture", label: "Culture" },
  { value: "biopsy", label: "Biopsy" },
  { value: "imaging", label: "Imaging" },
  { value: "other", label: "Other" },
]

const COMMON_TESTS = [
  "Complete Blood Count (CBC)",
  "Basic Metabolic Panel (BMP)",
  "Comprehensive Metabolic Panel (CMP)",
  "Lipid Panel",
  "Liver Function Tests (LFT)",
  "Thyroid Function Tests",
  "Hemoglobin A1C",
  "Urinalysis",
  "Blood Glucose",
  "Creatinine",
  "Electrolytes",
  "Coagulation Studies",
]

export function LabResultsManagement({
  userRole,
  userId,
  onStatsUpdate,
  onSuccess,
  onError,
}: LabResultsManagementProps) {
  const [labResults, setLabResults] = useState<LabResult[]>([])
  const [filteredResults, setFilteredResults] = useState<LabResult[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [showResultForm, setShowResultForm] = useState(false)
  const [formData, setFormData] = useState({
    patientId: "",
    testName: "",
    testType: "blood",
    notes: "",
  })
  const [resultData, setResultData] = useState({
    resultValue: "",
    referenceRange: "",
    unit: "",
    abnormalFlag: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadLabResults()
    loadPatients()
  }, [userId])

  useEffect(() => {
    filterResults()
  }, [labResults, searchTerm, statusFilter])

  const loadLabResults = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      let query = supabase.from("lab_tests").select(`
          *,
          patient:patients(first_name, last_name, mrn),
          ordered_by_user:users!lab_tests_ordered_by_fkey(full_name)
        `)

      // Filter by user role
      if (userRole === "doctor") {
        query = query.eq("ordered_by", userId)
      }

      const { data, error } = await query.order("ordered_date", { ascending: false })

      if (error) throw error

      setLabResults(data || [])
    } catch (error) {
      onError("Failed to load lab results")
      console.error("Error loading lab results:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPatients = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase.from("patients").select("id, mrn, first_name, last_name")

      if (error) throw error

      setPatients(data || [])
    } catch (error) {
      console.error("Error loading patients:", error)
    }
  }

  const filterResults = () => {
    let filtered = labResults

    if (searchTerm) {
      filtered = filtered.filter(
        (result) =>
          result.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.test_name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((result) => result.status === statusFilter)
    }

    setFilteredResults(filtered)
  }

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!formData.patientId || !formData.testName) {
      onError("Please fill in all required fields")
      setIsSubmitting(false)
      return
    }

    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from("lab_tests")
        .insert({
          patient_id: formData.patientId,
          ordered_by: userId,
          test_name: formData.testName,
          test_type: formData.testType,
          status: "pending",
          ordered_date: new Date().toISOString(),
          notes: formData.notes || null,
        })
        .select()
        .single()

      if (error) throw error

      // Log the lab order
      await supabase.from("audit_logs").insert({
        entity: "lab_tests",
        entity_id: data.id,
        action: "LAB_ORDERED",
        details: {
          patient_id: formData.patientId,
          test_name: formData.testName,
          test_type: formData.testType,
          ordered_by: userId,
        },
        reason: "Lab test ordered",
        severity: "low",
      })

      onSuccess("Lab test ordered successfully")
      setShowOrderForm(false)
      setFormData({
        patientId: "",
        testName: "",
        testType: "blood",
        notes: "",
      })
      await loadLabResults()
      onStatsUpdate()
    } catch (error) {
      onError("Failed to order lab test")
      console.error("Error ordering lab test:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!selectedResult || !resultData.resultValue) {
      onError("Please enter the result value")
      setIsSubmitting(false)
      return
    }

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("lab_tests")
        .update({
          result_value: resultData.resultValue,
          reference_range: resultData.referenceRange || null,
          unit: resultData.unit || null,
          abnormal_flag: resultData.abnormalFlag || null,
          notes: resultData.notes || null,
          result_date: new Date().toISOString(),
          status: "completed",
        })
        .eq("id", selectedResult.id)

      if (error) throw error

      // Log the result entry
      await supabase.from("audit_logs").insert({
        entity: "lab_tests",
        entity_id: selectedResult.id,
        action: "RESULT_ENTERED",
        details: {
          result_value: resultData.resultValue,
          abnormal_flag: resultData.abnormalFlag,
          entered_by: userId,
        },
        reason: "Lab result entered",
        severity: "low",
      })

      onSuccess("Lab result entered successfully")
      setShowResultForm(false)
      setSelectedResult(null)
      setResultData({
        resultValue: "",
        referenceRange: "",
        unit: "",
        abnormalFlag: "",
        notes: "",
      })
      await loadLabResults()
      onStatsUpdate()
    } catch (error) {
      onError("Failed to enter lab result")
      console.error("Error entering lab result:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusUpdate = async (resultId: string, newStatus: LabResult["status"]) => {
    const supabase = createClient()

    try {
      const updateData: any = { status: newStatus }
      if (newStatus === "in_progress") {
        updateData.collected_date = new Date().toISOString()
      }

      const { error } = await supabase.from("lab_tests").update(updateData).eq("id", resultId)

      if (error) throw error

      // Log the status change
      await supabase.from("audit_logs").insert({
        entity: "lab_tests",
        entity_id: resultId,
        action: "STATUS_UPDATED",
        details: {
          new_status: newStatus,
          updated_by: userId,
        },
        reason: `Lab test status changed to ${newStatus}`,
        severity: "low",
      })

      onSuccess(`Lab result ${newStatus.replace("_", " ")} successfully`)
      await loadLabResults()
      onStatsUpdate()
    } catch (error) {
      onError("Failed to update lab result status")
      console.error("Error updating lab result:", error)
    }
  }

  const canOrderLabs = () => {
    return ["superadmin", "doctor"].includes(userRole)
  }

  const canEnterResults = () => {
    return ["superadmin", "lab_tech"].includes(userRole)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      in_progress: { color: "bg-blue-100 text-blue-800", label: "In Progress" },
      completed: { color: "bg-green-100 text-green-800", label: "Completed" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    }

    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getAbnormalFlagBadge = (flag: string | null | undefined) => {
    if (!flag) return null

    const flagConfig = {
      high: { color: "bg-red-100 text-red-800", label: "High" },
      low: { color: "bg-blue-100 text-blue-800", label: "Low" },
      critical: { color: "bg-red-200 text-red-900", label: "Critical" },
      abnormal: { color: "bg-orange-100 text-orange-800", label: "Abnormal" },
    }

    const config = flagConfig[flag as keyof typeof flagConfig] || {
      color: "bg-gray-100 text-gray-800",
      label: flag,
    }

    return <Badge className={config.color}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Laboratory Results</h3>
          <p className="text-sm text-gray-600">Order lab tests and manage results</p>
        </div>
        <div className="flex gap-2">
          {canOrderLabs() && (
            <Button onClick={() => setShowOrderForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Order Lab Test
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search lab results..."
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
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lab Results Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Test Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Ordered Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Ordered By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading lab results...
                </TableCell>
              </TableRow>
            ) : filteredResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  {searchTerm || statusFilter !== "all"
                    ? "No lab results found matching your filters"
                    : "No lab tests ordered"}
                </TableCell>
              </TableRow>
            ) : (
              filteredResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {result.patient?.first_name} {result.patient?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">MRN: {result.patient?.mrn}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{result.test_name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{result.test_type.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{new Date(result.ordered_date).toLocaleDateString()}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(result.ordered_date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(result.status)}</TableCell>
                  <TableCell>
                    {result.result_value ? (
                      <div>
                        <div className="font-medium">
                          {result.result_value} {result.unit}
                        </div>
                        {result.abnormal_flag && getAbnormalFlagBadge(result.abnormal_flag)}
                      </div>
                    ) : (
                      <span className="text-gray-400">Pending</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{result.ordered_by_user?.full_name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedResult(result)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {canEnterResults() && result.status === "pending" && (
                        <Button size="sm" onClick={() => handleStatusUpdate(result.id, "in_progress")}>
                          <TestTube className="h-4 w-4 mr-1" />
                          Collect
                        </Button>
                      )}
                      {canEnterResults() && result.status === "in_progress" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedResult(result)
                            setShowResultForm(true)
                          }}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Enter Result
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

      {/* Order Lab Test Dialog */}
      <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Lab Test</DialogTitle>
            <DialogDescription>Order a laboratory test for a patient</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOrderSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient">
                Patient <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.patientId}
                onValueChange={(value) => setFormData({ ...formData, patientId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} (MRN: {patient.mrn})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testName">
                Test Name <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.testName}
                onValueChange={(value) => setFormData({ ...formData, testName: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a test" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TESTS.map((test) => (
                    <SelectItem key={test} value={test}>
                      {test}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testType">Test Type</Label>
              <Select
                value={formData.testType}
                onValueChange={(value) => setFormData({ ...formData, testType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAB_TEST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Clinical Notes</Label>
              <Textarea
                id="notes"
                placeholder="Clinical indication or special instructions..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowOrderForm(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Ordering..." : "Order Test"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enter Result Dialog */}
      <Dialog open={showResultForm} onOpenChange={setShowResultForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enter Lab Result</DialogTitle>
            <DialogDescription>
              Enter the result for {selectedResult?.test_name} - {selectedResult?.patient?.first_name}{" "}
              {selectedResult?.patient?.last_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResultSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resultValue">
                Result Value <span className="text-red-500">*</span>
              </Label>
              <Input
                id="resultValue"
                placeholder="Enter the test result value"
                value={resultData.resultValue}
                onChange={(e) => setResultData({ ...resultData, resultValue: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="mg/dL, mmol/L, etc."
                  value={resultData.unit}
                  onChange={(e) => setResultData({ ...resultData, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceRange">Reference Range</Label>
                <Input
                  id="referenceRange"
                  placeholder="Normal range"
                  value={resultData.referenceRange}
                  onChange={(e) => setResultData({ ...resultData, referenceRange: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="abnormalFlag">Abnormal Flag</Label>
              <Select
                value={resultData.abnormalFlag || ""} // Updated default value to be a non-empty string
                onValueChange={(value) => setResultData({ ...resultData, abnormalFlag: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select if abnormal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="abnormal">Abnormal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resultNotes">Result Notes</Label>
              <Textarea
                id="resultNotes"
                placeholder="Additional notes about the result..."
                value={resultData.notes}
                onChange={(e) => setResultData({ ...resultData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowResultForm(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Result"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lab Result Details Dialog */}
      {selectedResult && !showResultForm && (
        <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Lab Result Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Patient</Label>
                  <p className="font-medium">
                    {selectedResult.patient?.first_name} {selectedResult.patient?.last_name}
                  </p>
                  <p className="text-sm text-gray-500">MRN: {selectedResult.patient?.mrn}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Ordered By</Label>
                  <p className="font-medium">{selectedResult.ordered_by_user?.full_name}</p>
                  <p className="text-sm text-gray-500">{new Date(selectedResult.ordered_date).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Test Name</Label>
                  <p className="font-medium">{selectedResult.test_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Test Type</Label>
                  <Badge variant="outline">{selectedResult.test_type.toUpperCase()}</Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedResult.status)}</div>
              </div>

              {selectedResult.result_value && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Result</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Value</Label>
                        <p className="text-lg font-semibold">
                          {selectedResult.result_value} {selectedResult.unit}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Reference Range</Label>
                        <p className="font-medium">{selectedResult.reference_range || "Not specified"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Flag</Label>
                        <div>
                          {getAbnormalFlagBadge(selectedResult.abnormal_flag) || (
                            <span className="text-green-600">Normal</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedResult.result_date && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Result Date</Label>
                        <p className="font-medium">{new Date(selectedResult.result_date).toLocaleString()}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {selectedResult.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Notes</Label>
                  <p className="mt-1 text-sm">{selectedResult.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedResult(null)}>
                  Close
                </Button>
                {canEnterResults() && selectedResult.status === "in_progress" && !selectedResult.result_value && (
                  <Button
                    onClick={() => {
                      setShowResultForm(true)
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Enter Result
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
