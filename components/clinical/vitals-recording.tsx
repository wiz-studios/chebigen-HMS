"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { UserRole } from "@/lib/auth"
import { Plus, Search, Activity, TrendingUp, TrendingDown } from "lucide-react"

interface Vitals {
  id: string
  patient_id: string
  encounter_id?: string
  recorded_by: string
  recorded_at: string
  systolic_bp?: number
  diastolic_bp?: number
  heart_rate?: number
  temperature?: number
  respiratory_rate?: number
  oxygen_saturation?: number
  weight?: number
  height?: number
  bmi?: number
  notes?: string
  patient?: {
    first_name: string
    last_name: string
    mrn: string
  }
  recorded_by_user?: {
    full_name: string
  }
}

interface Patient {
  id: string
  mrn: string
  first_name: string
  last_name: string
}

interface VitalsRecordingProps {
  userRole: UserRole
  userId: string
  onStatsUpdate: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export function VitalsRecording({ userRole, userId, onStatsUpdate, onSuccess, onError }: VitalsRecordingProps) {
  const [vitals, setVitals] = useState<Vitals[]>([])
  const [filteredVitals, setFilteredVitals] = useState<Vitals[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVitals, setSelectedVitals] = useState<Vitals | null>(null)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [formData, setFormData] = useState({
    patientId: "",
    systolicBp: "",
    diastolicBp: "",
    heartRate: "",
    temperature: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadVitals()
    loadPatients()
  }, [])

  useEffect(() => {
    filterVitals()
  }, [vitals, searchTerm])

  const loadVitals = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("vitals")
        .select(`
          *,
          patient:patients(first_name, last_name, mrn),
          recorded_by_user:users!vitals_recorded_by_fkey(full_name)
        `)
        .order("recorded_at", { ascending: false })

      if (error) throw error

      setVitals(data || [])
    } catch (error) {
      onError("Failed to load vitals")
      console.error("Error loading vitals:", error)
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

  const filterVitals = () => {
    let filtered = vitals

    if (searchTerm) {
      filtered = filtered.filter(
        (vital) =>
          vital.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vital.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vital.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredVitals(filtered)
  }

  const calculateBMI = (weight: number, height: number) => {
    if (!weight || !height) return null
    const heightInMeters = height / 100
    return Number((weight / (heightInMeters * heightInMeters)).toFixed(1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!formData.patientId) {
      onError("Please select a patient")
      setIsSubmitting(false)
      return
    }

    const supabase = createClient()

    try {
      const weight = formData.weight ? Number.parseFloat(formData.weight) : null
      const height = formData.height ? Number.parseFloat(formData.height) : null
      const bmi = weight && height ? calculateBMI(weight, height) : null

      const { data, error } = await supabase
        .from("vitals")
        .insert({
          patient_id: formData.patientId,
          recorded_by: userId,
          recorded_at: new Date().toISOString(),
          systolic_bp: formData.systolicBp ? Number.parseInt(formData.systolicBp) : null,
          diastolic_bp: formData.diastolicBp ? Number.parseInt(formData.diastolicBp) : null,
          heart_rate: formData.heartRate ? Number.parseInt(formData.heartRate) : null,
          temperature: formData.temperature ? Number.parseFloat(formData.temperature) : null,
          respiratory_rate: formData.respiratoryRate ? Number.parseInt(formData.respiratoryRate) : null,
          oxygen_saturation: formData.oxygenSaturation ? Number.parseInt(formData.oxygenSaturation) : null,
          weight: weight,
          height: height,
          bmi: bmi,
          notes: formData.notes || null,
        })
        .select()
        .single()

      if (error) throw error

      // Log the vitals recording
      await supabase.from("audit_logs").insert({
        entity: "vitals",
        entity_id: data.id,
        action: "VITALS_RECORDED",
        details: {
          patient_id: formData.patientId,
          recorded_by: userId,
          vitals_recorded: Object.keys(formData).filter((key) => formData[key as keyof typeof formData] !== ""),
        },
        reason: "Patient vitals recorded",
        severity: "low",
      })

      onSuccess("Vitals recorded successfully")
      setShowRecordForm(false)
      setFormData({
        patientId: "",
        systolicBp: "",
        diastolicBp: "",
        heartRate: "",
        temperature: "",
        respiratoryRate: "",
        oxygenSaturation: "",
        weight: "",
        height: "",
        notes: "",
      })
      await loadVitals()
      onStatsUpdate()
    } catch (error) {
      onError("Failed to record vitals")
      console.error("Error recording vitals:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canRecordVitals = () => {
    return ["superadmin", "doctor", "nurse"].includes(userRole)
  }

  const getVitalStatus = (value: number | null | undefined, normal: { min: number; max: number }) => {
    if (!value) return null
    if (value < normal.min) return "low"
    if (value > normal.max) return "high"
    return "normal"
  }

  const getStatusIcon = (status: string | null) => {
    if (status === "high") return <TrendingUp className="h-4 w-4 text-red-500" />
    if (status === "low") return <TrendingDown className="h-4 w-4 text-blue-500" />
    return null
  }

  // Normal ranges for vitals
  const normalRanges = {
    systolic: { min: 90, max: 140 },
    diastolic: { min: 60, max: 90 },
    heartRate: { min: 60, max: 100 },
    temperature: { min: 36.1, max: 37.2 },
    respiratoryRate: { min: 12, max: 20 },
    oxygenSaturation: { min: 95, max: 100 },
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Vital Signs</h3>
          <p className="text-sm text-gray-600">Record and monitor patient vital signs</p>
        </div>
        {canRecordVitals() && (
          <Button onClick={() => setShowRecordForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Vitals
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by patient name or MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Vitals Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Date/Time</TableHead>
              <TableHead>BP</TableHead>
              <TableHead>HR</TableHead>
              <TableHead>Temp</TableHead>
              <TableHead>RR</TableHead>
              <TableHead>O2 Sat</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>BMI</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  Loading vitals...
                </TableCell>
              </TableRow>
            ) : filteredVitals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  {searchTerm ? "No vitals found matching your search" : "No vitals recorded"}
                </TableCell>
              </TableRow>
            ) : (
              filteredVitals.map((vital) => (
                <TableRow key={vital.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {vital.patient?.first_name} {vital.patient?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">MRN: {vital.patient?.mrn}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{new Date(vital.recorded_at).toLocaleDateString()}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(vital.recorded_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {vital.systolic_bp && vital.diastolic_bp ? (
                      <div className="flex items-center gap-1">
                        <span>
                          {vital.systolic_bp}/{vital.diastolic_bp}
                        </span>
                        {getStatusIcon(getVitalStatus(vital.systolic_bp, normalRanges.systolic))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {vital.heart_rate ? (
                      <div className="flex items-center gap-1">
                        <span>{vital.heart_rate}</span>
                        {getStatusIcon(getVitalStatus(vital.heart_rate, normalRanges.heartRate))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {vital.temperature ? (
                      <div className="flex items-center gap-1">
                        <span>{vital.temperature}°C</span>
                        {getStatusIcon(getVitalStatus(vital.temperature, normalRanges.temperature))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {vital.respiratory_rate ? (
                      <div className="flex items-center gap-1">
                        <span>{vital.respiratory_rate}</span>
                        {getStatusIcon(getVitalStatus(vital.respiratory_rate, normalRanges.respiratoryRate))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {vital.oxygen_saturation ? (
                      <div className="flex items-center gap-1">
                        <span>{vital.oxygen_saturation}%</span>
                        {getStatusIcon(getVitalStatus(vital.oxygen_saturation, normalRanges.oxygenSaturation))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{vital.weight ? `${vital.weight} kg` : "-"}</TableCell>
                  <TableCell>{vital.bmi ? vital.bmi : "-"}</TableCell>
                  <TableCell>
                    <div className="text-sm">{vital.recorded_by_user?.full_name}</div>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelectedVitals(vital)}>
                      <Activity className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Record Vitals Dialog */}
      <Dialog open={showRecordForm} onOpenChange={setShowRecordForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Vital Signs</DialogTitle>
            <DialogDescription>Record patient vital signs and measurements</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="systolicBp">Systolic BP (mmHg)</Label>
                <Input
                  id="systolicBp"
                  type="number"
                  placeholder="120"
                  value={formData.systolicBp}
                  onChange={(e) => setFormData({ ...formData, systolicBp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diastolicBp">Diastolic BP (mmHg)</Label>
                <Input
                  id="diastolicBp"
                  type="number"
                  placeholder="80"
                  value={formData.diastolicBp}
                  onChange={(e) => setFormData({ ...formData, diastolicBp: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                <Input
                  id="heartRate"
                  type="number"
                  placeholder="72"
                  value={formData.heartRate}
                  onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="respiratoryRate">Respiratory Rate (breaths/min)</Label>
                <Input
                  id="respiratoryRate"
                  type="number"
                  placeholder="16"
                  value={formData.respiratoryRate}
                  onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oxygenSaturation">Oxygen Saturation (%)</Label>
                <Input
                  id="oxygenSaturation"
                  type="number"
                  placeholder="98"
                  value={formData.oxygenSaturation}
                  onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="70.5"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="175"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                />
              </div>
            </div>

            {formData.weight && formData.height && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Calculated BMI:</strong>{" "}
                  {calculateBMI(Number.parseFloat(formData.weight), Number.parseFloat(formData.height))}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Additional notes or observations..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowRecordForm(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Recording..." : "Record Vitals"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vitals Details Dialog */}
      {selectedVitals && (
        <Dialog open={!!selectedVitals} onOpenChange={() => setSelectedVitals(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Vital Signs Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Patient</Label>
                  <p className="font-medium">
                    {selectedVitals.patient?.first_name} {selectedVitals.patient?.last_name}
                  </p>
                  <p className="text-sm text-gray-500">MRN: {selectedVitals.patient?.mrn}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Recorded By</Label>
                  <p className="font-medium">{selectedVitals.recorded_by_user?.full_name}</p>
                  <p className="text-sm text-gray-500">{new Date(selectedVitals.recorded_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Blood Pressure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedVitals.systolic_bp && selectedVitals.diastolic_bp ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">
                          {selectedVitals.systolic_bp}/{selectedVitals.diastolic_bp}
                        </span>
                        <span className="text-sm text-gray-500">mmHg</span>
                        {getStatusIcon(getVitalStatus(selectedVitals.systolic_bp, normalRanges.systolic))}
                      </div>
                    ) : (
                      <span className="text-gray-400">Not recorded</span>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Heart Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedVitals.heart_rate ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{selectedVitals.heart_rate}</span>
                        <span className="text-sm text-gray-500">bpm</span>
                        {getStatusIcon(getVitalStatus(selectedVitals.heart_rate, normalRanges.heartRate))}
                      </div>
                    ) : (
                      <span className="text-gray-400">Not recorded</span>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Temperature</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedVitals.temperature ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{selectedVitals.temperature}</span>
                        <span className="text-sm text-gray-500">°C</span>
                        {getStatusIcon(getVitalStatus(selectedVitals.temperature, normalRanges.temperature))}
                      </div>
                    ) : (
                      <span className="text-gray-400">Not recorded</span>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Oxygen Saturation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedVitals.oxygen_saturation ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{selectedVitals.oxygen_saturation}</span>
                        <span className="text-sm text-gray-500">%</span>
                        {getStatusIcon(getVitalStatus(selectedVitals.oxygen_saturation, normalRanges.oxygenSaturation))}
                      </div>
                    ) : (
                      <span className="text-gray-400">Not recorded</span>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Weight</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedVitals.weight ? (
                      <div>
                        <span className="text-lg font-semibold">{selectedVitals.weight}</span>
                        <span className="text-sm text-gray-500 ml-1">kg</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Not recorded</span>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Height</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedVitals.height ? (
                      <div>
                        <span className="text-lg font-semibold">{selectedVitals.height}</span>
                        <span className="text-sm text-gray-500 ml-1">cm</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Not recorded</span>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">BMI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedVitals.bmi ? (
                      <span className="text-lg font-semibold">{selectedVitals.bmi}</span>
                    ) : (
                      <span className="text-gray-400">Not calculated</span>
                    )}
                  </CardContent>
                </Card>
              </div>

              {selectedVitals.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Notes</Label>
                  <p className="mt-1 text-sm">{selectedVitals.notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedVitals(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
