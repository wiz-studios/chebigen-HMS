"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import { Filter, ChevronDown, ChevronUp, MoreVertical } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"

interface Column {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: any) => React.ReactNode
}

interface MobileDataTableProps {
  data: any[]
  columns: Column[]
  title?: string
  description?: string
  searchPlaceholder?: string
  onRowClick?: (row: any) => void
  renderMobileCard?: (row: any, index: number) => React.ReactNode
  actions?: (row: any) => React.ReactNode
  loading?: boolean
  emptyMessage?: string
}

export function MobileDataTable({
  data,
  columns,
  title,
  description,
  searchPlaceholder = "Search...",
  onRowClick,
  renderMobileCard,
  actions,
  loading = false,
  emptyMessage = "No data available",
}: MobileDataTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [showFilters, setShowFilters] = useState(false)
  const isMobile = useIsMobile()

  // Filter data based on search term
  const filteredData = data.filter((row) =>
    columns.some((column) => {
      const value = row[column.key]
      return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    }),
  )

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0

    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(columnKey)
      setSortDirection("asc")
    }
  }

  const defaultMobileCard = (row: any, index: number) => (
    <Card
      key={index}
      className={`mb-3 ${onRowClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={() => onRowClick?.(row)}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          {columns.slice(0, 3).map((column) => (
            <div key={column.key} className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">{column.label}:</span>
              <span className="text-sm text-gray-900">
                {column.render ? column.render(row[column.key], row) : row[column.key]}
              </span>
            </div>
          ))}
          {columns.length > 3 && (
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full mt-2">
                  <MoreVertical className="h-4 w-4 mr-2" />
                  View More Details
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Details</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 space-y-3">
                  {columns.map((column) => (
                    <div key={column.key} className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-gray-600">{column.label}:</span>
                      <span className="text-sm text-gray-900">
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </span>
                    </div>
                  ))}
                  {actions && <div className="pt-4">{actions(row)}</div>}
                </div>
              </DrawerContent>
            </Drawer>
          )}
          {actions && columns.length <= 3 && <div className="pt-2 border-t">{actions(row)}</div>}
        </div>
      </CardContent>
    </Card>
  )

  if (!isMobile) {
    // Desktop table view
    return (
      <Card>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          {/* Search and filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Desktop table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {columns.map((column) => (
                    <th key={column.key} className="text-left p-2">
                      {column.sortable ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort(column.key)}
                          className="h-auto p-0 font-medium"
                        >
                          {column.label}
                          {sortColumn === column.key && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </Button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                  {actions && <th className="text-left p-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8">
                      Loading...
                    </td>
                  </tr>
                ) : sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8 text-gray-500">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row, index) => (
                    <tr
                      key={index}
                      className={`border-b hover:bg-gray-50 ${onRowClick ? "cursor-pointer" : ""}`}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((column) => (
                        <td key={column.key} className="p-2">
                          {column.render ? column.render(row[column.key], row) : row[column.key]}
                        </td>
                      ))}
                      {actions && <td className="p-2">{actions(row)}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Mobile card view
  return (
    <div className="space-y-4">
      {(title || description) && (
        <div>
          {title && <h2 className="text-xl font-semibold text-gray-900">{title}</h2>}
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>
      )}

      {/* Mobile search */}
      <div className="space-y-3">
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />

        {/* Mobile sort */}
        <div className="flex gap-2">
          <Select value={sortColumn || "none"} onValueChange={(value) => setSortColumn(value === "none" ? null : value)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No sorting</SelectItem>
              {columns
                .filter((col) => col.sortable)
                .map((column) => (
                  <SelectItem key={column.key} value={column.key}>
                    {column.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {sortColumn && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
            >
              {sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile cards */}
      <div>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-pulse space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : sortedData.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">{emptyMessage}</p>
            </CardContent>
          </Card>
        ) : (
          sortedData.map((row, index) =>
            renderMobileCard ? renderMobileCard(row, index) : defaultMobileCard(row, index),
          )
        )}
      </div>
    </div>
  )
}
