import { Layout } from "@/components/layout/Layout";
import { 
  useGetOrder, 
  useUpdateOrderStatus,
  getGetOrderQueryKey
} from "@workspace/api-client-react";
import type { OrderStatusUpdateStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle2, Truck, Package, XCircle } from "lucide-react";
import { Link, useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const STATUS_ICONS = {
  pending: Clock,
  confirmed: CheckCircle2,
  shipped: Truck,
  delivered: Package,
  cancelled: XCircle
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: order, isLoading, error } = useGetOrder(orderId, {
    query: {
      enabled: !!orderId,
      queryKey: getGetOrderQueryKey(orderId)
    }
  });

  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = (newStatus: OrderStatusUpdateStatus) => {
    updateStatus.mutate({ id: orderId, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
        toast({ title: "Status updated", description: `Order is now ${newStatus}.` });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error || "Failed to update status", variant: "destructive" });
      }
    });
  };

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <h2 className="text-2xl font-bold text-destructive">Order not found</h2>
          <p className="text-muted-foreground mt-2">The order you are looking for does not exist or you do not have access to it.</p>
          <Link href="/orders" className="mt-4">
            <Button variant="outline">Back to Orders</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const StatusIcon = order?.status ? STATUS_ICONS[order.status] : Clock;

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <Button variant="outline" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Order #{order?.id?.toString().padStart(5, '0') || '...'}</h1>
                <p className="text-muted-foreground mt-1">
                  {isLoading ? <Skeleton className="h-4 w-40" /> : `${formatDateTime(order!.createdAt)}`}
                </p>
              </div>
              {order && (
                <Badge 
                  variant="outline" 
                  className={`capitalize px-3 py-1 text-sm flex items-center gap-2
                    ${order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : ''}
                    ${order.status === 'shipped' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                    ${order.status === 'confirmed' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                    ${order.status === 'cancelled' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}
                    ${order.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}
                  `}
                >
                  <StatusIcon className="h-4 w-4" />
                  {order.status}
                </Badge>
              )}
            </div>
            
            {order && order.status !== 'cancelled' && order.status !== 'delivered' && (
              <div className="flex items-center gap-2">
                {order.status === 'pending' && (
                  <>
                    <Button variant="destructive" onClick={() => handleStatusChange('cancelled')} disabled={updateStatus.isPending}>Cancel</Button>
                    <Button onClick={() => handleStatusChange('confirmed')} disabled={updateStatus.isPending}>Confirm Order</Button>
                  </>
                )}
                {order.status === 'confirmed' && (
                  <Button onClick={() => handleStatusChange('shipped')} disabled={updateStatus.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">Mark as Shipped</Button>
                )}
                {order.status === 'shipped' && (
                  <Button onClick={() => handleStatusChange('delivered')} disabled={updateStatus.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">Mark Delivered</Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right pr-6">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-6"><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                        <TableCell className="text-right pr-6"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    order?.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium pl-6">{item.productName}</TableCell>
                        <TableCell>{item.quantityKg} kg</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(item.pricePerKgCents)}</TableCell>
                        <TableCell className="text-right font-medium pr-6">{formatCurrency(item.lineTotalCents)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="p-6 flex flex-col items-end gap-2 bg-muted/10 border-t">
                <div className="flex justify-between w-64 text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{isLoading ? <Skeleton className="h-5 w-20" /> : formatCurrency(order?.totalCents || 0)}</span>
                </div>
                <div className="flex justify-between w-64 text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>—</span>
                </div>
                <Separator className="w-64 my-1" />
                <div className="flex justify-between w-64 text-lg font-bold">
                  <span>Total</span>
                  <span>{isLoading ? <Skeleton className="h-7 w-24" /> : formatCurrency(order?.totalCents || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {isLoading ? (
                  <>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </>
                ) : (
                  <>
                    <div>
                      <div className="font-semibold text-lg">{order?.customerName}</div>
                      <Link href={`/customers`} className="text-sm text-primary hover:underline">View account</Link>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery Information</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Requested Date</div>
                      <div className="font-medium flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        {formatDate(order?.deliveryDate || "")}
                      </div>
                    </div>
                    {order?.notes && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Order Notes</div>
                        <div className="text-sm bg-muted/30 p-3 rounded-md border text-foreground/80 whitespace-pre-wrap">
                          {order.notes}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
