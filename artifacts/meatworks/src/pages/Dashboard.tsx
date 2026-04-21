import { Layout } from "@/components/layout/Layout";
import { 
  useGetDashboardSummary, 
  useGetRecentOrders, 
  useGetTopProducts, 
  useGetLowStock,
  useGetSalesByCategory,
  getGetDashboardSummaryQueryKey,
  getGetRecentOrdersQueryKey,
  getGetTopProductsQueryKey,
  getGetLowStockQueryKey,
  getGetSalesByCategoryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowUpRight, ArrowDownRight, Package, AlertTriangle, TrendingUp, Users, ShoppingCart, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() }});
  const { data: recentOrders, isLoading: isLoadingOrders } = useGetRecentOrders({ query: { queryKey: getGetRecentOrdersQueryKey() }});
  const { data: topProducts, isLoading: isLoadingProducts } = useGetTopProducts({ query: { queryKey: getGetTopProductsQueryKey() }});
  const { data: lowStock, isLoading: isLoadingStock } = useGetLowStock({ query: { queryKey: getGetLowStockQueryKey() }});
  const { data: salesByCategory, isLoading: isLoadingSales } = useGetSalesByCategory({ query: { queryKey: getGetSalesByCategoryQueryKey() }});

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your wholesale operations</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-7 w-24" /> : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(summary?.totalRevenueCents || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {(summary?.revenueChangePct || 0) >= 0 ? (
                      <span className="text-emerald-500 flex items-center"><ArrowUpRight className="h-3 w-3 mr-1" />{summary?.revenueChangePct}%</span>
                    ) : (
                      <span className="text-destructive flex items-center"><ArrowDownRight className="h-3 w-3 mr-1" />{summary?.revenueChangePct}%</span>
                    )}
                    from last month
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders This Month</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-7 w-16" /> : (
                <div className="text-2xl font-bold">{summary?.ordersThisMonth || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.pendingOrders || 0} pending fulfillment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-7 w-16" /> : (
                <div className="text-2xl font-bold">{summary?.activeCustomers || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Wholesale accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Catalog & Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-7 w-16" /> : (
                <div className="text-2xl font-bold">{summary?.totalProducts || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {summary?.lowStockCount ? (
                  <span className="text-amber-500 font-medium flex items-center"><AlertTriangle className="h-3 w-3 mr-1"/>{summary.lowStockCount} low stock alerts</span>
                ) : (
                  <span>All products stocked</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Chart */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
              <CardDescription>Revenue distribution across meat types</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {isLoadingSales ? <Skeleton className="h-[300px] w-full" /> : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByCategory || []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="category" 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                        style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `$${value / 100}`}
                        style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                        labelFormatter={(label: string) => label.charAt(0).toUpperCase() + label.slice(1)}
                      />
                      <Bar dataKey="totalRevenueCents" radius={[4, 4, 0, 0]}>
                        {salesByCategory?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card className="col-span-3 flex flex-col">
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest wholesale transactions</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {isLoadingOrders ? (
                <div className="space-y-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders?.map(order => (
                    <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors -mx-2 cursor-pointer">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm">{order.customerName}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold text-sm">{formatCurrency(order.totalCents)}</span>
                        <Badge variant={order.status === 'delivered' ? 'secondary' : order.status === 'pending' ? 'outline' : 'default'} className="text-[10px] px-1 py-0 h-4">
                          {order.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  {(!recentOrders || recentOrders.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No recent orders found.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Cuts</CardTitle>
              <CardDescription>Highest revenue products</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProducts ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {topProducts?.map(product => (
                    <div key={product.productId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                          {product.category.substring(0, 2)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{product.productName}</span>
                          <span className="text-xs text-muted-foreground">{product.totalKg}kg sold</span>
                        </div>
                      </div>
                      <span className="font-bold text-sm">{formatCurrency(product.totalRevenueCents)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>Products requiring immediate restock</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStock ? (
                <div className="space-y-4">
                  {[1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {lowStock?.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-2 bg-destructive/5 rounded-md border border-destructive/20">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-foreground">{product.name}</span>
                        <span className="text-xs text-muted-foreground">{product.origin} • {product.grade}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-destructive">{product.stockKg} kg</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining</span>
                      </div>
                    </div>
                  ))}
                  {(!lowStock || lowStock.length === 0) && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      Inventory levels look good.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
