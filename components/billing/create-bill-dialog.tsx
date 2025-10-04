"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, DollarSign } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { CreateBillRequest, ItemType } from "@/lib/types/billing"

interface CreateBillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateBillRequest) => void
}

interface Patient {
  id: string
  first_name: string
  last_name: string
  mrn: string
  contact?: string
}

interface BillItem {
  item_type: ItemType
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

export function CreateBillDialog({ open, onOpenChange, onSubmit }: CreateBillDialogProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<string>("")
  const [items, setItems] = useState<BillItem[]>([
    { item_type: 'appointment', description: '', quantity: 1, unit_price: 0, total_price: 0 }
  ])
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadPatients()
    }
  }, [open])

  const loadPatients = async () => {
    const supabase = createClient()
    console.log('Loading patients for billing...')
    
    const { data, error } = await supabase
      .from('patients')
      .select('id, first_name, last_name, mrn, contact')
      .order('first_name')

    console.log('Patient query result:', { data, error })

    if (error) {
      console.error('Error loading patients:', error)
      return
    }

    // Transform the data to match the expected interface
    const transformedPatients = (data || []).map(patient => ({
      id: patient.id,
      first_name: patient.first_name,
      last_name: patient.last_name,
      mrn: patient.mrn,
      contact: patient.contact || ''
    }))

    console.log('Transformed patients:', transformedPatients)
    setPatients(transformedPatients)
  }

  const addItem = () => {
    setItems([...items, { 
      item_type: 'appointment', 
      description: '', 
      quantity: 1, 
      unit_price: 0, 
      total_price: 0 
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof BillItem, value: any) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Recalculate total_price
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price
    }
    
    setItems(updatedItems)
  }

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0)
  }

  const handleSubmit = async () => {
    console.log("Form submission started")
    console.log("Selected patient:", selectedPatient)
    console.log("Items:", items)
    console.log("Notes:", notes)
    
    if (!selectedPatient || items.some(item => !item.description || item.unit_price <= 0)) {
      console.log("Form validation failed")
      return
    }

    setIsLoading(true)
    try {
      const billData: CreateBillRequest = {
        patient_id: selectedPatient,
        items: items.filter(item => item.description && item.unit_price > 0),
        notes: notes || undefined
      }

      console.log("Submitting bill data:", billData)
      await onSubmit(billData)
      console.log("Bill submission completed successfully")
      
      // Reset form
      setSelectedPatient("")
      setItems([{ item_type: 'appointment', description: '', quantity: 1, unit_price: 0, total_price: 0 }])
      setNotes("")
    } catch (error) {
      console.error('Error creating bill:', error)
      alert(`Error creating bill: ${error.message || error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Bill</DialogTitle>
          <DialogDescription>
            Create a new bill for a patient with detailed items and pricing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient">Select Patient</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a patient..." />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name} 
                    {patient.mrn && ` (MRN: ${patient.mrn})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bill Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Bill Items</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Item {index + 1}</CardTitle>
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`item_type_${index}`}>Type</Label>
                        <Select
                          value={item.item_type}
                          onValueChange={(value: ItemType) => updateItem(index, 'item_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="appointment">Appointment</SelectItem>
                            <SelectItem value="lab_test">Lab Test</SelectItem>
                            <SelectItem value="procedure">Procedure</SelectItem>
                            <SelectItem value="medication">Medication</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`quantity_${index}`}>Quantity</Label>
                        <Input
                          id={`quantity_${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`description_${index}`}>Description</Label>
                      <Input
                        id={`description_${index}`}
                        placeholder="Enter item description..."
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`unit_price_${index}`}>Unit Price</Label>
                        <Input
                          id={`unit_price_${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Total Price</Label>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {formatCurrency(item.total_price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Bill Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Bill Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Items:</span>
                  <span className="font-medium">{items.filter(item => item.description && item.unit_price > 0).length}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(getTotalAmount())}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedPatient || getTotalAmount() <= 0 || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Bill'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
