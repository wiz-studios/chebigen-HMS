"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts"
import { BillingStats } from "@/lib/types/billing"
import { TrendingUp, TrendingDown, DollarSign, Receipt } from "lucide-react"

interface BillingReportsProps {
  stats: BillingStats
}

const COLORS = {
  pending: '#f59e0b',
  paid: '#10b981',
  partial: '#3b82f6',
  cancelled: '#ef4444'
}

export function BillingReports({ stats }: BillingReportsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  // Prepare data for charts
  const statusData = [
    { name: 'Pending', value: stats.billsByStatus.pending, color: COLORS.pending },
    { name: 'Paid', value: stats.billsByStatus.paid, color: COLORS.paid },
    { name: 'Partial', value: stats.billsByStatus.partial, color: COLORS.partial },
    { name: 'Cancelled', value: stats.billsByStatus.cancelled, color: COLORS.cancelled }
  ]

  const revenueData = stats.revenueByMonth.map(item => ({
    month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    revenue: item.revenue,
    bills: item.bills
  }))

  const totalOutstanding = stats.pendingAmount + stats.partialAmount

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              From paid bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending + Partial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Bill</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.averageBillAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per bill amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalBills}
            </div>
            <p className="text-xs text-muted-foreground">
              All bills created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bills by Status - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Bills by Status</CardTitle>
            <CardDescription>
              Distribution of bills by payment status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Month - Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>
              Monthly revenue over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Pending Bills</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.billsByStatus.pending}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(stats.pendingAmount)} outstanding
                </p>
              </div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Pending
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Paid Bills</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.billsByStatus.paid}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(stats.totalRevenue)} collected
                </p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Paid
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Partial Bills</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.billsByStatus.partial}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(stats.partialAmount)} remaining
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Partial
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Cancelled Bills</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.billsByStatus.cancelled}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(stats.cancelledAmount)} lost
                </p>
              </div>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Cancelled
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Table */}
      {revenueData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Details</CardTitle>
            <CardDescription>
              Detailed breakdown of monthly revenue and bill counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Month</th>
                    <th className="text-right py-2">Revenue</th>
                    <th className="text-right py-2">Bills</th>
                    <th className="text-right py-2">Avg per Bill</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">{item.month}</td>
                      <td className="text-right py-2 font-medium text-green-600">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="text-right py-2">{item.bills}</td>
                      <td className="text-right py-2">
                        {formatCurrency(item.bills > 0 ? item.revenue / item.bills : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
