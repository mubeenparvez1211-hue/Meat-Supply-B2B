import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { 
  useListOrders, 
  useListCustomers,
  getListOrdersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/format";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter } from "lucide-react";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  
  const { data: orders, isLoading } = useListOrders({
    status: statusFilter !== "all" ? statusFilter : undefined,
    customerId: customerFilter !== "all" ? parseInt(customerFilter, 10) : undefined
  }, { query: { queryKey: getListOrdersQueryKey({ status: statusFilter !== "all" ? statusFilter : undefined, customerId: customerFilter !== "all" ? parseInt(customerFilter, 10) : undefined }) }});
  
  const { data: customers } = useListCustomers();

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground mt-1">Manage wholesale orders and fulfillment</p>
          </div>
          
          <Link href="/orders/new">
            <Button className="shrink-0 gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Place Order
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border">
          <div className="flex w-full gap-4 flex-col sm:flex-row">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-full sm:w-[220px] bg-background">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers?.map(customer => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>{customer.businessName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : orders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                orders?.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => window.location.href = `/orders/${order.id}`}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      #{order.id.toString().padStart(5, '0')}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {order.customerName}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(order.deliveryDate)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`capitalize
                          ${order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : ''}
                          ${order.status === 'shipped' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                          ${order.status === 'confirmed' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                          ${order.status === 'cancelled' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}
                          ${order.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}
                        `}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.totalCents)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
