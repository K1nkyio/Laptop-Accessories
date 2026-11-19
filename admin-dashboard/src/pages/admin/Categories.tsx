import { useEffect, useMemo, useState } from "react";
import { Edit2, FolderTree, HardDrive, Headphones, Laptop, Plus, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAdminCategory, deleteAdminCategory, fetchAdminCategories, fetchAdminProducts, getStoredAdminAuth, updateAdminCategory, type AdminCategory } from "../../lib/admin-api";

const iconPool = [Laptop, Headphones, HardDrive, Wrench, FolderTree];

export default function Categories() {
  const isSuperAdmin = getStoredAdminAuth()?.admin.role === "super_admin";
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const [categoryRows, productRows] = await Promise.all([fetchAdminCategories(), fetchAdminProducts()]);
      setCategories(categoryRows);
      setCounts(
        productRows.reduce<Record<string, number>>((acc, product) => {
          if (product.category_id) acc[product.category_id] = (acc[product.category_id] ?? 0) + 1;
          return acc;
        }, {}),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load categories");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const totalProducts = useMemo(() => Object.values(counts).reduce((sum, count) => sum + count, 0), [counts]);

  return (
    <div className="max-w-[1100px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Categories</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Organize {totalProducts} storefront products into clear shopping paths.
          </p>
        </div>
        <CategoryDialog onSaved={load} />
      </div>

      {error && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] text-warning">
          {error}. Start the API to manage categories.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => {
          const Icon = iconPool[index % iconPool.length];
          return (
            <div key={category.id} className="group rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  <CategoryDialog category={category} onSaved={load} />
                  {isSuperAdmin ? <DeleteCategoryButton category={category} onDeleted={load} /> : null}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-[15px] font-semibold">{category.name}</div>
                <div className="mt-1 text-[12px] text-muted-foreground">{counts[category.id] ?? 0} products</div>
              </div>
              <div className="mt-4 border-t border-border pt-4 text-[12px] text-muted-foreground">
                {category.subcategories?.length ? `${category.subcategories.length} subcategories configured` : "No subcategories yet"}
              </div>
            </div>
          );
        })}

        <CategoryDialog onSaved={load} asTile />
      </div>
    </div>
  );
}

function CategoryDialog({ onSaved, asTile, category }: { onSaved: () => void | Promise<void>; asTile?: boolean; category?: AdminCategory }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [saving, setSaving] = useState(false);
  const editing = Boolean(category);

  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setDescription(category?.description ?? "");
    }
  }, [category, open]);

  const submit = async () => {
    setSaving(true);
    try {
      if (category) {
        await updateAdminCategory(category.id, { name, description });
      } else {
        await createAdminCategory({ name, description });
        setName("");
        setDescription("");
      }
      await onSaved();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {asTile ? (
          <button className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-5 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary">
            <Plus className="mb-2 h-6 w-6" />
            <span className="text-[13px] font-medium">Add category</span>
          </button>
        ) : editing ? (
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${category?.name}`}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button className="gap-2 rounded-full">
            <Plus className="h-4 w-4" /> New category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Laptop stands" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Description</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!name || saving}>
            {saving ? "Saving..." : editing ? "Save changes" : "Save category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryButton({ category, onDeleted }: { category: AdminCategory; onDeleted: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteAdminCategory(category.id);
      await onDeleted();
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label={`Delete ${category.name}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete category?</AlertDialogTitle>
          <AlertDialogDescription>
            Products in {category.name} will be moved to Uncategorized. This also removes its subcategories.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              void remove();
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
