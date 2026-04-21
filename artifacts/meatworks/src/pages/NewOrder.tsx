import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { 
  useListCustomers, 
  useListProducts,
  useCreateOrder
} from "@workspace/api-client-react";
import type { OrderInput } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface LineItem {
  id: string;
  productId: number;
  quantityKg: number;
}

export default function NewOrder() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [customerId, setCustomerId] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  
  const { data: customers } = useListCustomers();
  const { data: products } = useListProducts();
  const createOrder = useCreateOrder();

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Math.random().toString(), productId: 0, quantityKg: 0 }]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: number) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const orderTotalCents = useMemo(() => {
    if (!products) return 0;
    return lineItems.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return total;
      return total + (product.pricePerKgCents * item.quantityKg);
    }, 0);
  }, [lineItems, products]);

  const handleSubmit = () => {
    if (!customerId) {
      toast({ title: "Error", description: "Please select a customer", variant: "destructive" });
      return;
    }
    if (!deliveryDate) {
      toast({ title: "Error", description: "Please select a delivery date", variant: "destructive" });
      return;
    }
    if (lineItems.length === 0 || lineItems.some(i => !i.productId || i.quantityKg <= 0)) {
      toast({ title: "Error", description: "Please add valid line items", variant: "destructive" });
      return;
    }

    const payload: OrderInput = {
      customerId: parseInt(customerId, 10),
      deliveryDate: deliveryDate.toISOString().split('T')[0],
      notes,
      items: lineItems.map(i => ({ productId: i.productId, quantityKg: i.quantityKg }))
    };

    createOrder.mutate({ data: payload }, {
      onSuccess: (order) => {
        toast({ title: "Order placed", description: `Order #${order.id} has been created.` });
        setLocation(`/orders/${order.id}`);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error || "Failed to place order", variant: "destructive" });
      }
    });
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <Button variant="outline" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Order</h1>
            <p className="text-muted-foreground mt-1">Create a new wholesale order</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Customer</label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a wholesale account" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.businessName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Delivery Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal bg-background",
                    !deliveryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveryDate ? format(deliveryDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deliveryDate}
                  onSelect={setDeliveryDate}
                  initialFocus
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Order Items</label>
          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-[150px]">Quantity (kg)</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => {
                  const product = products?.find(p => p.id === item.productId);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Select 
                          value={item.productId ? item.productId.toString() : ""} 
                          onValueChange={(val) => updateLineItem(item.id, "productId", parseInt(val, 10))}
                        >
                          <SelectTrigger className="bg-background border-transparent hover:border-border">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products?.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name} ({p.stockKg}kg stock)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min="0.1" 
                          step="0.1" 
                          className="bg-background border-transparent hover:border-border"
                          value={item.quantityKg || ""}
                          onChange={(e) => updateLineItem(item.id, "quantityKg", parseFloat(e.target.value) || 0)}
                          placeholder="0.0"
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product ? formatCurrency(product.pricePerKgCents) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {product ? formatCurrency(product.pricePerKgCents * item.quantityKg) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lineItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-sm">
                      No items added to order.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="p-4 border-t bg-muted/20 flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={addLineItem} className="gap-2">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
              <div className="flex items-center gap-4 text-lg">
                <span className="text-muted-foreground font-medium text-sm uppercase tracking-wider">Total</span>
                <span className="font-bold">{formatCurrency(orderTotalCents)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Order Notes</label>
          <Textarea 
            placeholder="Delivery instructions, specific cut requests, etc." 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button size="lg" onClick={handleSubmit} disabled={createOrder.isPending} className="w-full sm:w-auto">
            {createOrder.isPending ? "Processing..." : "Place Order"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
