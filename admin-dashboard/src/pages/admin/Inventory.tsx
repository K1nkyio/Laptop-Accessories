import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { AlertTriangle, Package, Plus, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchAdminCategories, fetchAdminProducts, saveAdminProduct, type AdminProduct } from "../../lib/admin-api";

export default function Inventory() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const [productRows, categoryRows] = await Promise.all([fetchAdminProducts(), fetchAdminCategories()]);
      setProducts(productRows);
      setCategoryMap(new Map(categoryRows.map((category) => [category.id, category.name])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load inventory");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const lowStock = useMemo(() => products.filter((product) => product.stock <= 3), [products]);
  const soldOut = useMemo(() => products.filter((product) => product.stock <= 0 || product.status === "out_of_stock"), [products]);
  const totalUnits = useMemo(() => products.reduce((sum, product) => sum + Number(product.stock), 0), [products]);

  const restock = async (product: AdminProduct, quantity = 5) => {
    await saveAdminProduct({ name: product.name, stock: product.stock + quantity, status: "in_stock" }, product.id);
    await load();
  };

  return (
    <div className="max-w-[1300px] space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Inventory</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Track stock levels, restock alerts, and storefront availability.</p>
      </div>

      {error && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] text-warning">
          {error}. Start the API to manage inventory.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon={Package} label="Units in stock" value={String(totalUnits)} tone="primary" />
        <Stat icon={AlertTriangle} label="Low stock items" value={String(lowStock.length)} tone="warning" />
        <Stat icon={TrendingDown} label="Sold out" value={String(soldOut.length)} tone="destructive" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg border border-border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="text-[14px] font-semibold">All inventory</h3>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 text-left font-medium">Product</th>
                  <th className="p-3 text-left font-medium">Stock</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => {
                  const pct = Math.min(100, (product.stock / 12) * 100);
                  const tone = product.stock === 0 ? "destructive" : product.stock <= 3 ? "warning" : "success";
                  return (
                    <tr key={product.id} className="hover:bg-muted/40">
                      <td className="p-3">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {categoryMap.get(product.category_id ?? "") ?? "Uncategorized"} · {product.brand ?? "No brand"}
                        </div>
                      </td>
                      <td className="w-48 p-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-7 font-semibold", tone === "destructive" && "text-destructive", tone === "warning" && "text-warning")}>
                            {product.stock}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                tone === "destructive" && "bg-destructive",
                                tone === "warning" && "bg-warning",
                                tone === "success" && "bg-success",
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {product.stock === 0 ? (
                          <Badge className="bg-destructive/10 text-destructive">Out</Badge>
                        ) : product.stock <= 3 ? (
                          <Badge className="bg-warning/10 text-warning">Low</Badge>
                        ) : (
                          <Badge className="bg-success/10 text-success">OK</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => void restock(product)}>
                          <Plus className="h-3.5 w-3.5" /> Add 5
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning" /> Restock urgently
            </h3>
            <div className="mt-3 space-y-2">
              {lowStock.map((product) => (
                <div key={product.id} className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium">{product.name}</div>
                    <div className="text-[10px] text-muted-foreground">Only {product.stock} left</div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => void restock(product)}>
                    Restock
                  </Button>
                </div>
              ))}
              {!lowStock.length && <div className="text-[12px] text-muted-foreground">No urgent restocks.</div>}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold">
              <TrendingDown className="h-4 w-4 text-destructive" /> Sold out
            </h3>
            <div className="mt-3 space-y-2">
              {soldOut.map((product) => (
                <div key={product.id} className="flex items-center justify-between text-[12px]">
                  <span className="truncate font-medium">{product.name}</span>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => void restock(product, 10)}>
                    Add 10
                  </Button>
                </div>
              ))}
              {!soldOut.length && <div className="text-[12px] text-muted-foreground">Everything has stock.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium", className)}>{children}</span>;
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[24px] font-semibold leading-none">{value}</div>
        <div className="mt-1 text-[12px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
