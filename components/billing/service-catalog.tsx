"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Trash2, DollarSign, CheckCircle, AlertCircle } from "lucide-react"

interface ServiceItem {
  id: string
  name: string
  description: string
  category: string
  price: number
  is_active: boolean
  created_at: string
}

interface ServiceCatalogProps {
  userRole: string
  userId?: string
}

export function ServiceCatalog({ userRole, userId }: ServiceCatalogProps) {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [filteredServices, setFilteredServices] = useState<ServiceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<ServiceItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    is_active: true
  })

  const canManageServices = () => {
    return ["superadmin", "accountant"].includes(userRole)
  }

  useEffect(() => {
    if (canManageServices()) {
      loadServices()
    }
  }, [])

  useEffect(() => {
    filterServices()
  }, [services, searchTerm, categoryFilter])

  const loadServices = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      // Check if service_catalog table exists
      const { data, error } = await supabase
        .from("service_catalog")
        .select("*")
        .order("name")

      if (error) {
        // Table doesn't exist - create sample data
        console.log("Service catalog table not available, creating sample data...")
        setServices(getSampleServices())
        return
      }

      setServices(data || [])
    } catch (error) {
      console.error("Error loading services:", error)
      setServices(getSampleServices())
    } finally {
      setIsLoading(false)
    }
  }

  const getSampleServices = (): ServiceItem[] => [
    {
      id: "1",
      name: "General Consultation",
      description: "Standard doctor consultation",
      category: "consultation",
      price: 1500,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: "2", 
      name: "Specialist Consultation",
      description: "Specialist doctor consultation",
      category: "consultation",
      price: 3000,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: "3",
      name: "Blood Test - Basic",
      description: "Complete blood count and basic panel",
      category: "laboratory",
      price: 800,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: "4",
      name: "Blood Test - Comprehensive",
      description: "Full blood panel with liver and kidney function",
      category: "laboratory", 
      price: 1500,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: "5",
      name: "X-Ray - Chest",
      description: "Chest X-ray examination",
      category: "radiology",
      price: 1200,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: "6",
      name: "Ultrasound - Abdomen",
      description: "Abdominal ultrasound examination",
      category: "radiology",
      price: 2500,
      is_active: true,
      created_at: new Date().toISOString()
    }
  ]

  const filterServices = () => {
    let filtered = services

    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(service => service.category === categoryFilter)
    }

    setFilteredServices(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      
      const serviceData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        is_active: formData.is_active
      }

      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from("service_catalog")
          .update(serviceData)
          .eq("id", editingService.id)

        if (error) throw error
        setSuccess("Service updated successfully!")
      } else {
        // Create new service
        const { error } = await supabase
          .from("service_catalog")
          .insert(serviceData)

        if (error) throw error
        setSuccess("Service created successfully!")
      }

      // Reset form
      setFormData({
        name: "",
        description: "",
        category: "",
        price: "",
        is_active: true
      })
      setEditingService(null)
      setShowForm(false)
      
      // Reload services
      loadServices()

    } catch (error) {
      console.error("Error saving service:", error)
      setError("Failed to save service. Please try again.")
    }
  }

  const handleEdit = (service: ServiceItem) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description,
      category: service.category,
      price: service.price.toString(),
      is_active: service.is_active
    })
    setShowForm(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const getCategoryBadge = (category: string) => {
    const colors = {
      consultation: "bg-blue-100 text-blue-800",
      laboratory: "bg-green-100 text-green-800", 
      radiology: "bg-purple-100 text-purple-800",
      procedure: "bg-orange-100 text-orange-800",
      medication: "bg-red-100 text-red-800"
    }
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  if (!canManageServices()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Catalog</CardTitle>
          <CardDescription>Manage service pricing and catalog</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to manage the service catalog. 
              Only SuperAdmins and Accountants can access this feature.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Service Catalog</h3>
          <p className="text-sm text-gray-600">Manage service pricing and catalog</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="consultation">Consultation</SelectItem>
            <SelectItem value="laboratory">Laboratory</SelectItem>
            <SelectItem value="radiology">Radiology</SelectItem>
            <SelectItem value="procedure">Procedure</SelectItem>
            <SelectItem value="medication">Medication</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Services
          </CardTitle>
          <CardDescription>
            {filteredServices.length} services in catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading services...
                    </TableCell>
                  </TableRow>
                ) : filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No services found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.description}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryBadge(service.category)}`}>
                          {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(service.price)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          service.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {service.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Success/Error Messages */}
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Service Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Add New Service"}
            </DialogTitle>
            <DialogDescription>
              {editingService ? "Update service information" : "Add a new service to the catalog"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="laboratory">Laboratory</SelectItem>
                    <SelectItem value="radiology">Radiology</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                    <SelectItem value="medication">Medication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (KES) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingService ? "Update Service" : "Add Service"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
