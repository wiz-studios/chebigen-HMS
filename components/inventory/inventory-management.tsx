"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UserRole } from "@/lib/auth"
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  ShoppingCart,
  Truck,
  Calendar,
  DollarSign,
  Edit,
  Eye,
} from "lucide-react"

interface InventoryItem {
  id: string
  name: string
  description: string
  sku: string
  unit_of_measure: string
  unit_cost: number
  reorder_level: number
  max_stock_level: number
  is_controlled_substance: boolean
  expiry_tracking: boolean
  category: { name: string }
  supplier: { name: string }
  total_stock: number
  reserved_stock: number
  available_stock: number
  low_stock: boolean
  expired_items: number
}

interface InventoryStats {
  totalItems: number
  lowStockItems: number
  expiredItems: number
  totalValue: number
}

interface InventoryManagementProps {
  userRole: UserRole
  userId: string
}

export function InventoryManagement({ userRole, userId }: InventoryManagementProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    lowStockItems: 0,
    expiredItems: 0,
    totalValue: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [showAddItem, setShowAddItem] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadInventoryData()
  }, [])

  useEffect(() => {
    filterItems()
  }, [items, searchTerm, categoryFilter, stockFilter])

  const loadInventoryData = async () => {
    const supabase = createClient()
    setIsLoading(true)

    try {
      // Load inventory items with stock information
      const { data: itemsData, error: itemsError } = await supabase
        .from("inventory_items")
        .select(`
          *,
          category:inventory_categories(name),
          supplier:suppliers(name),
          stock:inventory_stock(quantity_available, quantity_reserved, expiry_date)
        `)
        .is("deleted_at", null)
        .order("name")

      if (itemsError) throw itemsError

      // Process items to calculate stock levels
      const processedItems =
        itemsData?.map((item) => {
          const totalStock = item.stock?.reduce((sum: number, s: any) => sum + s.quantity_available, 0) || 0
          const reservedStock = item.stock?.reduce((sum: number, s: any) => sum + s.quantity_reserved, 0) || 0
          const availableStock = totalStock - reservedStock
          const lowStock = availableStock <= item.reorder_level

          // Count expired items
          const today = new Date().toISOString().split("T")[0]
          const expiredItems = item.stock?.filter((s: any) => s.expiry_date && s.expiry_date < today).length || 0

          return {
            ...item,
            total_stock: totalStock,
            reserved_stock: reservedStock,
            available_stock: availableStock,
            low_stock: lowStock,
            expired_items: expiredItems,
          }
        }) || []

      setItems(processedItems)

      // Calculate stats
      const totalItems = processedItems.length
      const lowStockItems = processedItems.filter((item) => item.low_stock).length
      const expiredItems = processedItems.reduce((sum, item) => sum + item.expired_items, 0)
      const totalValue = processedItems.reduce((sum, item) => sum + item.available_stock * item.unit_cost, 0)

      setStats({
        totalItems,
        lowStockItems,
        expiredItems,
        totalValue,
      })
    } catch (error) {
      setError("Failed to load inventory data")
      console.error("Error loading inventory:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterItems = () => {
    let filtered = items

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category?.name === categoryFilter)
    }

    if (stockFilter === "low") {
      filtered = filtered.filter((item) => item.low_stock)
    } else if (stockFilter === "expired") {
      filtered = filtered.filter((item) => item.expired_items > 0)
    }

    setFilteredItems(filtered)
  }

  const canManageInventory = () => {
    return ["superadmin", "pharmacist"].includes(userRole)
  }

  const canViewInventory = () => {
    return ["superadmin", "pharmacist", "nurse", "doctor"].includes(userRole)
  }

  const getStockBadge = (item: InventoryItem) => {
    if (item.expired_items > 0) {
      return <Badge variant="destructive">Expired Items</Badge>
    }
    if (item.low_stock) {
      return <Badge className="bg-orange-100 text-orange-800">Low Stock</Badge>
    }
    if (item.available_stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>
    }
    return <Badge className="bg-green-100 text-green-800">In Stock</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  if (!canViewInventory()) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">You don't have permission to view inventory.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Items</CardTitle>
            <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Inventory items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Items need reordering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Expired Items</CardTitle>
            <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-red-600">{stats.expiredItems}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Items past expiry</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Available stock value</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="items" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Inventory Items</CardTitle>
                  <CardDescription>Manage hospital inventory and stock levels</CardDescription>
                </div>
                {canManageInventory() && (
                  <Button onClick={() => setShowAddItem(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search items by name, SKU, or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Medications">Medications</SelectItem>
                    <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Stock Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock Levels</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="expired">Expired Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Items Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock Level</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading inventory...
                        </TableCell>
                      </TableRow>
                    ) : filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          {searchTerm || categoryFilter !== "all" || stockFilter !== "all"
                            ? "No items found matching your filters"
                            : "No inventory items found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-gray-500">{item.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {item.sku}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.category?.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>
                                {item.available_stock} {item.unit_of_measure}
                              </div>
                              {item.reserved_stock > 0 && (
                                <div className="text-gray-500">({item.reserved_stock} reserved)</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                          <TableCell>{getStockBadge(item)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              {canManageInventory() && (
                                <>
                                  <Button size="sm" variant="outline">
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="outline">
                                    <ShoppingCart className="h-4 w-4 mr-1" />
                                    Order
                                  </Button>
                                </>
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
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Manage purchase orders and deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Truck className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Purchase order management coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Stock Transactions</CardTitle>
              <CardDescription>View inventory movement history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Transaction history coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
