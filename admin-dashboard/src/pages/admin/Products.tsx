import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { ArrowUpDown, Edit2, Filter, ImagePlus, Plus, Search, Star, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  deleteAdminProduct,
  fetchAdminCategories,
  fetchAdminProducts,
  saveAdminProduct,
  uploadAdminImage,
  getStoredAdminAuth,
  type AdminCategory,
  type AdminProduct,
} from "../../lib/admin-api";

type ProductSort = "updated-desc" | "name-asc" | "price-asc" | "price-desc" | "stock-asc";

type ProductForm = {
  name: string;
  brand: string;
  category_id: string;
  price: string;
  discount_price: string;
  stock: string;
  product_type: string;
  condition: string;
  status: string;
  warranty: string;
  description: string;
  specifications: string;
  image_url: string;
  is_featured: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  brand: "",
  category_id: "",
  price: "",
  discount_price: "",
  stock: "0",
  product_type: "Product",
  condition: "New",
  status: "in_stock",
  warranty: "",
  description: "",
  specifications: "",
  image_url: "",
  is_featured: false,
};

const statusBadge = (status: string) => {
  if (status === "in_stock") {
    return <span className="inline-flex h-5 items-center rounded-full bg-success/10 px-2 text-[10px] font-medium text-success">In stock</span>;
  }
  if (status === "out_of_stock") {
    return <span className="inline-flex h-5 items-center rounded-full bg-destructive/10 px-2 text-[10px] font-medium text-destructive">Out</span>;
  }
  return <span className="inline-flex h-5 items-center rounded-full bg-info/10 px-2 text-[10px] font-medium text-info">Coming soon</span>;
};

export default function Products() {
  const isSuperAdmin = getStoredAdminAuth()?.admin.role === "super_admin";
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState<ProductSort>("updated-desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [productRows, categoryRows] = await Promise.all([fetchAdminProducts(), fetchAdminCategories()]);
      setProducts(productRows);
      setCategories(categoryRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const filtered = useMemo(() => {
    const value = search.toLowerCase();
    return products
      .filter((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(value) ||
          (product.brand ?? "").toLowerCase().includes(value) ||
          (categoryMap.get(product.category_id ?? "") ?? "").toLowerCase().includes(value);
        const matchesStatus = statusFilter === "all" || product.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || product.category_id === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        if (sort === "name-asc") return a.name.localeCompare(b.name);
        if (sort === "price-asc") return Number(a.price) - Number(b.price);
        if (sort === "price-desc") return Number(b.price) - Number(a.price);
        if (sort === "stock-asc") return Number(a.stock) - Number(b.stock);
        return new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime();
      });
  }, [categoryFilter, categoryMap, products, search, sort, statusFilter]);

  const allSelected = filtered.length > 0 && selected.length === filtered.length;
  const lowStockCount = products.filter((product) => product.stock <= 3).length;

  const toggleAll = () => setSelected(allSelected ? [] : filtered.map((product) => product.id));
  const toggleOne = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const removeProduct = async (id: string) => {
    await deleteAdminProduct(id);
    setProducts((current) => current.filter((product) => product.id !== id));
    setSelected((current) => current.filter((item) => item !== id));
  };

  const featureSelected = async () => {
    await Promise.all(
      selected.map((id) => {
        const product = products.find((item) => item.id === id);
        return product ? saveAdminProduct({ name: product.name, is_featured: true }, id) : Promise.resolve();
      }),
    );
    setSelected([]);
    await load();
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {products.length} products, {lowStockCount} need attention. Changes here feed the storefront.
          </p>
        </div>
        <ProductDialog categories={categories} onSaved={load} />
      </div>

      {error && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] text-warning">
          {error}. Start the API to manage real products.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, brand, category..." className="h-9 pl-9" />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="in_stock">In stock</SelectItem>
                <SelectItem value="out_of_stock">Out of stock</SelectItem>
                <SelectItem value="coming_soon">Coming soon</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={sort} onValueChange={(value) => setSort(value as ProductSort)}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="updated-desc">Recently updated</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="price-asc">Price low-high</SelectItem>
                <SelectItem value="price-desc">Price high-low</SelectItem>
                <SelectItem value="stock-asc">Lowest stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selected.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5 border-l border-border pl-2">
              <span className="mr-1 text-[12px] text-muted-foreground">{selected.length} selected</span>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void featureSelected()}>
                <Star className="h-3.5 w-3.5" /> Feature
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="w-10 p-3"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>
                <th className="p-3 text-left font-medium">Product</th>
                <th className="p-3 text-left font-medium">Category</th>
                <th className="p-3 text-left font-medium">Price</th>
                <th className="p-3 text-left font-medium">Stock</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Condition</th>
                <th className="w-24 p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-muted/40">
                  <td className="p-3"><Checkbox checked={selected.includes(product.id)} onCheckedChange={() => toggleOne(product.id)} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {product.image_url && <img src={product.image_url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate font-medium">
                          {product.name}
                          {product.is_featured && <Star className="h-3 w-3 fill-warning text-warning" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{product.brand || "No brand"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{categoryMap.get(product.category_id ?? "") ?? "Uncategorized"}</td>
                  <td className="p-3 font-medium">KSh {Number(product.price).toLocaleString()}</td>
                  <td className="p-3"><span className={product.stock <= 3 ? "font-medium text-destructive" : ""}>{product.stock}</span></td>
                  <td className="p-3">{statusBadge(product.status)}</td>
                  <td className="p-3 text-muted-foreground">{product.condition}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <ProductDialog categories={categories} product={product} onSaved={load} />
                      {isSuperAdmin ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => void removeProduct(product.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={8} className="p-8 text-center text-[13px] text-muted-foreground">Loading products...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-[13px] text-muted-foreground">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProductDialog({ categories, product, onSaved }: { categories: AdminCategory[]; product?: AdminProduct; onSaved: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState<ProductForm>(() => productToForm(product));

  useEffect(() => {
    setForm(productToForm(product));
  }, [product]);

  const update = (key: keyof ProductForm, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await saveAdminProduct(
        {
          name: form.name,
          brand: form.brand,
          category_id: form.category_id === "none" ? "" : form.category_id,
          price: Number(form.price || 0),
          discount_price: form.discount_price ? Number(form.discount_price) : null,
          stock: Number(form.stock || 0),
          product_type: form.product_type,
          condition: form.condition,
          status: form.status,
          warranty: form.warranty,
          description: form.description,
          specifications: form.specifications,
          image_url: form.image_url,
          is_featured: form.is_featured,
          currency: "KSh",
        },
        product?.id,
      );
      await onSaved();
      setOpen(false);
      if (!product) setForm(emptyForm);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
          <Button variant="ghost" size="icon" className="h-7 w-7"><Edit2 className="h-3.5 w-3.5" /></Button>
        ) : (
          <Button className="gap-2 rounded-full"><Plus className="h-4 w-4" /> Add product</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <Field label="Product name" colSpan={2}><Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="HP EliteBook 840 G8" /></Field>
          <Field label="Brand"><Input value={form.brand} onChange={(event) => update("brand", event.target.value)} placeholder="HP" /></Field>
          <Field label="Category">
            <Select value={form.category_id || "none"} onValueChange={(value) => update("category_id", value)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Price (KSh)"><Input value={form.price} onChange={(event) => update("price", event.target.value)} type="number" /></Field>
          <Field label="Discount price (KSh)"><Input value={form.discount_price} onChange={(event) => update("discount_price", event.target.value)} type="number" /></Field>
          <Field label="Stock quantity"><Input value={form.stock} onChange={(event) => update("stock", event.target.value)} type="number" /></Field>
          <Field label="Product type"><Input value={form.product_type} onChange={(event) => update("product_type", event.target.value)} placeholder="Laptop, Mouse, Accessory..." /></Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(value) => update("status", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock">In stock</SelectItem>
                <SelectItem value="out_of_stock">Out of stock</SelectItem>
                <SelectItem value="coming_soon">Coming soon</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Condition">
            <Select value={form.condition} onValueChange={(value) => update("condition", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Refurbished">Refurbished</SelectItem>
                <SelectItem value="Used">Used</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Warranty"><Input value={form.warranty} onChange={(event) => update("warranty", event.target.value)} placeholder="6 months" /></Field>
          <Field label="Image URL" colSpan={2}><Input value={form.image_url} onChange={(event) => update("image_url", event.target.value)} placeholder="https://..." /></Field>
          <Field label="Product image" colSpan={2}>
            <ImageDropzone
              imageUrl={form.image_url}
              uploading={uploading}
              onClear={() => update("image_url", "")}
              onUpload={async (file) => {
                setUploading(true);
                setSaveError("");
                try {
                  update("image_url", await uploadAdminImage(file));
                } catch (err) {
                  setSaveError(err instanceof Error ? err.message : "Could not upload image.");
                } finally {
                  setUploading(false);
                }
              }}
            />
          </Field>
          <Field label="Description" colSpan={2}><Textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows={3} /></Field>
          <Field label="Specifications" colSpan={2}><Textarea value={form.specifications} onChange={(event) => update("specifications", event.target.value)} rows={3} /></Field>
          <div className="col-span-2 flex items-center justify-between rounded-md bg-muted/50 p-3">
            <div>
              <div className="text-[13px] font-medium">Featured on storefront</div>
              <div className="text-[11px] text-muted-foreground">Show in homepage shortlist</div>
            </div>
            <Switch checked={form.is_featured} onCheckedChange={(value) => update("is_featured", value)} />
          </div>
          {saveError && (
            <div className="col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              {saveError}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={saving || uploading || !form.name}>{saving ? "Saving..." : "Save product"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImageDropzone({ imageUrl, uploading, onUpload, onClear }: { imageUrl: string; uploading: boolean; onUpload: (file: File) => Promise<void>; onClear: () => void }) {
  const inputId = useMemo(() => `product-image-${Math.random().toString(36).slice(2)}`, []);
  const [dragging, setDragging] = useState(false);
  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void onUpload(file);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={`relative rounded-lg border-2 border-dashed p-4 transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
    >
      {imageUrl ? (
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 overflow-hidden rounded-md bg-muted"><img src={imageUrl} alt="" className="h-full w-full object-cover" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[13px] font-medium"><ImagePlus className="h-4 w-4" /> Product image selected</div>
            <p className="mt-1 truncate text-[12px] text-muted-foreground">{imageUrl}</p>
            <div className="mt-3 flex gap-2">
              <label htmlFor={inputId}><span className="inline-flex h-8 cursor-pointer items-center rounded-md border border-border px-3 text-[12px] hover:bg-muted">Replace</span></label>
              <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 text-destructive hover:text-destructive" onClick={onClear}><X className="h-3.5 w-3.5" /> Remove</Button>
            </div>
          </div>
        </div>
      ) : (
        <label htmlFor={inputId} className="flex cursor-pointer flex-col items-center justify-center py-7 text-center">
          <UploadCloud className="mb-2 h-7 w-7 text-muted-foreground" />
          <span className="text-[13px] font-medium">{uploading ? "Uploading..." : "Drag and drop image here"}</span>
          <span className="mt-1 text-[12px] text-muted-foreground">or click to select an image</span>
        </label>
      )}
      <input id={inputId} type="file" accept="image/*" className="hidden" onChange={(event) => handleFiles(event.target.files)} disabled={uploading} />
    </div>
  );
}

function productToForm(product?: AdminProduct): ProductForm {
  if (!product) return emptyForm;
  return {
    name: product.name,
    brand: product.brand ?? "",
    category_id: product.category_id ?? "",
    price: String(product.price ?? ""),
    discount_price: product.discount_price === null ? "" : String(product.discount_price),
    stock: String(product.stock ?? 0),
    product_type: product.product_type ?? "Product",
    condition: product.condition ?? "New",
    status: product.status ?? "in_stock",
    warranty: product.warranty ?? "",
    description: product.description ?? "",
    specifications: product.specifications ?? "",
    image_url: product.image_url ?? "",
    is_featured: product.is_featured,
  };
}

function Field({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: number }) {
  return (
    <div className={`space-y-1.5 ${colSpan === 2 ? "col-span-2" : ""}`}>
      <Label className="text-[12px]">{label}</Label>
      {children}
    </div>
  );
}
