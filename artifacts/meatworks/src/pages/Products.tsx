import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import type { Product, ProductInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/format";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Layers, X } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CATEGORIES = ["beef", "pork", "chicken", "lamb", "veal", "game"] as const;
type Category = (typeof CATEGORIES)[number];

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(CATEGORIES),
  cut: z.string().min(1, "Cut is required"),
  origin: z.string().min(1, "Origin is required"),
  grade: z.string().min(1, "Grade is required"),
  pricePerKgCents: z.coerce.number().min(1, "Price must be positive"),
  stockKg: z.coerce.number().min(0, "Stock cannot be negative"),
  unit: z.string().default("kg"),
  imageUrl: z.string().default(""),
  description: z.string().default(""),
});

type ProductFormValues = z.infer<typeof productSchema>;

type BulkRow = {
  name: string;
  category: Category;
  cut: string;
  origin: string;
  grade: string;
  pricePerKg: string;
  stockKg: string;
};

const emptyBulkRow = (): BulkRow => ({
  name: "",
  category: "beef",
  cut: "",
  origin: "",
  grade: "",
  pricePerKg: "",
  stockKg: "",
});

export default function Products() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyBulkRow(), emptyBulkRow(), emptyBulkRow()]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products, isLoading } = useListProducts({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    search: search || undefined,
  }, { query: { queryKey: getListProductsQueryKey({ category: categoryFilter !== "all" ? categoryFilter : undefined, search: search || undefined }) } });

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "", category: "beef", cut: "", origin: "", grade: "",
      pricePerKgCents: 0, stockKg: 0, unit: "kg", imageUrl: "", description: "",
    },
  });

  const visibleIds = useMemo(() => (products ?? []).map((p) => p.id), [products]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = !allVisibleSelected && visibleIds.some((id) => selectedIds.has(id));

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) visibleIds.forEach((id) => next.add(id));
      else visibleIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const toggleOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const onAddSubmit = (data: ProductFormValues) => {
    createProduct.mutate({ data: data as ProductInput }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setIsAddOpen(false);
        form.reset();
        toast({ title: "Product added", description: `${data.name} has been added to catalog.` });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.error || "Failed to add product", variant: "destructive" });
      },
    });
  };

  const onEditSubmit = (data: ProductFormValues) => {
    if (!editingProduct) return;
    updateProduct.mutate({ id: editingProduct.id, data: data as ProductInput }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setEditingProduct(null);
        toast({ title: "Product updated", description: `${data.name} has been updated.` });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.error || "Failed to update product", variant: "destructive" });
      },
    });
  };

  const handleDelete = () => {
    if (!deletingProduct) return;
    deleteProduct.mutate({ id: deletingProduct.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDeletingProduct(null);
        toast({ title: "Product deleted", description: `${deletingProduct.name} has been removed.` });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.error || "Failed to delete product", variant: "destructive" });
      },
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await deleteProduct.mutateAsync({ id });
        ok++;
      } catch {
        fail++;
      }
    }
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    clearSelection();
    setConfirmBulkDelete(false);
    toast({
      title: fail === 0 ? "Products deleted" : "Bulk delete completed with errors",
      description: `${ok} deleted${fail > 0 ? `, ${fail} failed` : ""}.`,
      variant: fail === 0 ? "default" : "destructive",
    });
  };

  const updateBulkRow = (idx: number, patch: Partial<BulkRow>) => {
    setBulkRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addBulkRow = () => setBulkRows((rows) => [...rows, emptyBulkRow()]);
  const removeBulkRow = (idx: number) => setBulkRows((rows) => rows.filter((_, i) => i !== idx));

  const handleBulkSubmit = async () => {
    const rowsToSave = bulkRows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.name.trim() && r.cut.trim() && r.origin.trim() && r.grade.trim() && r.pricePerKg && r.stockKg);
    if (rowsToSave.length === 0) {
      toast({ title: "No complete rows", description: "Fill in name, cut, origin, grade, price, and stock for at least one row.", variant: "destructive" });
      return;
    }
    setIsBulkSubmitting(true);
    let ok = 0;
    let fail = 0;
    for (const { r } of rowsToSave) {
      const data: ProductInput = {
        name: r.name.trim(),
        category: r.category,
        cut: r.cut.trim(),
        origin: r.origin.trim(),
        grade: r.grade.trim(),
        pricePerKgCents: Math.round(parseFloat(r.pricePerKg) * 100),
        stockKg: parseFloat(r.stockKg),
        unit: "kg",
        imageUrl: "",
        description: "",
      };
      try {
        await createProduct.mutateAsync({ data });
        ok++;
      } catch {
        fail++;
      }
    }
    setIsBulkSubmitting(false);
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    if (fail === 0) {
      setIsBulkAddOpen(false);
      setBulkRows([emptyBulkRow(), emptyBulkRow(), emptyBulkRow()]);
    }
    toast({
      title: fail === 0 ? "Products added" : "Bulk add completed with errors",
      description: `${ok} added${fail > 0 ? `, ${fail} failed` : ""}.`,
      variant: fail === 0 ? "default" : "destructive",
    });
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      category: product.category as any,
      cut: product.cut,
      origin: product.origin,
      grade: product.grade,
      pricePerKgCents: product.pricePerKgCents,
      stockKg: product.stockKg,
      unit: product.unit,
      imageUrl: product.imageUrl,
      description: product.description,
    });
  };

  const selectedCount = selectedIds.size;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
            <p className="text-muted-foreground mt-1">Manage cuts, pricing, and inventory</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Dialog open={isBulkAddOpen} onOpenChange={(open) => { setIsBulkAddOpen(open); if (!open) setBulkRows([emptyBulkRow(), emptyBulkRow(), emptyBulkRow()]); }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-bulk-add">
                  <Layers className="h-4 w-4" />
                  Bulk Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle>Bulk Add Products</DialogTitle>
                  <DialogDescription>
                    Add multiple products at once. Empty rows are skipped. Price is in dollars per kg.
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="w-[60px]">#</TableHead>
                        <TableHead className="min-w-[180px]">Name</TableHead>
                        <TableHead className="w-[130px]">Category</TableHead>
                        <TableHead className="min-w-[130px]">Cut</TableHead>
                        <TableHead className="min-w-[150px]">Origin</TableHead>
                        <TableHead className="w-[120px]">Grade</TableHead>
                        <TableHead className="w-[110px]">$ / kg</TableHead>
                        <TableHead className="w-[110px]">Stock (kg)</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                          <TableCell>
                            <Input value={row.name} onChange={(e) => updateBulkRow(idx, { name: e.target.value })} placeholder="Product name" />
                          </TableCell>
                          <TableCell>
                            <Select value={row.category} onValueChange={(v) => updateBulkRow(idx, { category: v as Category })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map((c) => (
                                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input value={row.cut} onChange={(e) => updateBulkRow(idx, { cut: e.target.value })} placeholder="Ribeye" />
                          </TableCell>
                          <TableCell>
                            <Input value={row.origin} onChange={(e) => updateBulkRow(idx, { origin: e.target.value })} placeholder="Country / region" />
                          </TableCell>
                          <TableCell>
                            <Input value={row.grade} onChange={(e) => updateBulkRow(idx, { grade: e.target.value })} placeholder="Prime" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" value={row.pricePerKg} onChange={(e) => updateBulkRow(idx, { pricePerKg: e.target.value })} placeholder="32.00" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.1" value={row.stockKg} onChange={(e) => updateBulkRow(idx, { stockKg: e.target.value })} placeholder="50" />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeBulkRow(idx)}
                              disabled={bulkRows.length === 1}
                              aria-label="Remove row"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <DialogFooter className="flex !justify-between sm:!justify-between gap-2">
                  <Button type="button" variant="outline" onClick={addBulkRow} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Row
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsBulkAddOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={handleBulkSubmit} disabled={isBulkSubmitting}>
                      {isBulkSubmitting ? "Saving..." : "Save All"}
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => form.reset()} className="shrink-0 gap-2">
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Product Name</FormLabel>
                          <FormControl><Input placeholder="e.g. Wagyu Ribeye A5" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="cut" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cut</FormLabel>
                          <FormControl><Input placeholder="e.g. Ribeye" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="origin" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Origin</FormLabel>
                          <FormControl><Input placeholder="e.g. Japan" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="grade" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade</FormLabel>
                          <FormControl><Input placeholder="e.g. A5" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="pricePerKgCents" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price / kg (cents)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="stockKg" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock (kg)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createProduct.isPending}>
                        {createProduct.isPending ? "Adding..." : "Save Product"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Dialog */}
          <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Product Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="cut" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cut</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="origin" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origin</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="grade" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="pricePerKgCents" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price / kg (cents)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="stockKg" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock (kg)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={updateProduct.isPending}>
                      {updateProduct.isPending ? "Saving..." : "Update Product"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Single Delete Confirmation */}
          <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {deletingProduct?.name}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Bulk Delete Confirmation */}
          <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedCount} {selectedCount === 1 ? "product" : "products"}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the selected products from your catalog. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete {selectedCount}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center justify-between gap-4 bg-destructive/10 border border-destructive/30 px-4 py-3 rounded-lg" data-testid="bulk-action-bar">
            <div className="text-sm font-medium">
              {selectedCount} {selectedCount === 1 ? "product" : "products"} selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearSelection}>Clear</Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => setConfirmBulkDelete(true)}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                    onCheckedChange={(c) => toggleAllVisible(!!c)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Specs</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : products?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              ) : (
                products?.map((product) => {
                  const checked = selectedIds.has(product.id);
                  return (
                    <TableRow key={product.id} className="hover:bg-muted/50" data-state={checked ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => toggleOne(product.id, !!c)}
                          aria-label={`Select ${product.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {product.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize bg-background">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.origin} • {product.grade} • {product.cut}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(product.pricePerKgCents)}<span className="text-muted-foreground font-normal text-xs">/kg</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-medium ${product.stockKg < 50 ? 'text-destructive' : ''}`}>
                          {product.stockKg} kg
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(product)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeletingProduct(product)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
