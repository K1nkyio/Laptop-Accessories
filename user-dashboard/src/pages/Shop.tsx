import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowUpDown, SlidersHorizontal, X } from "lucide-react";

import { StoreNav } from "@/components/StoreNav";
import { StoreFooter } from "@/components/StoreFooter";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getCategories, getSubcategories } from "@/lib/catalog";
import { fetchProducts } from "@/lib/catalog-api";

interface ProductRow extends ProductCardData {
  brand: string | null;
  productType: string;
  subcategoryId: string | null;
}

type SortKey = "price-desc" | "price-asc" | "name-asc";

const Shop = () => {
  const { categorySlug, subcategorySlug } = useParams<{
    categorySlug?: string;
    subcategorySlug?: string;
  }>();

  const categories = getCategories();
  const subcategories = getSubcategories();
  const activeCategory = categories.find((category) => category.slug === categorySlug);
  const categorySubs = subcategories.filter(
    (subcategory) => activeCategory && subcategory.categoryId === activeCategory.id,
  );
  const activeSub = categorySubs.find((subcategory) => subcategory.slug === subcategorySlug);

  const [databaseProducts, setDatabaseProducts] = useState<ProductRow[]>([]);
  const products = databaseProducts;

  useEffect(() => {
    let cancelled = false;

    fetchProducts({ categoryId: activeCategory?.id, subcategoryId: activeSub?.id })
      .then((items) => {
        if (!cancelled) {
          setDatabaseProducts(
            items.map((product) => ({
              id: product.id,
              slug: product.slug,
              name: product.name,
              brand: product.brand,
              price: product.price,
              currency: product.currency,
              image_url: product.image_url,
              stock: product.stock,
              productType: product.productType,
              subcategoryId: product.subcategoryId,
            })) as ProductRow[],
          );
        }
      })
      .catch(() => {
        if (!cancelled) setDatabaseProducts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCategory?.id, activeSub?.id]);

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<"all" | "under-100" | "100-500" | "500-1500" | "over-1500">("all");
  const [sort, setSort] = useState<SortKey>("price-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const brands = useMemo(
    () => Array.from(new Set(products.map((product) => product.brand).filter(Boolean))).sort() as string[],
    [products],
  );
  const types = useMemo(
    () => Array.from(new Set(products.map((product) => product.productType).filter(Boolean))).sort() as string[],
    [products],
  );

  const filtered = useMemo(() => {
    let list = products.slice();

    if (selectedBrands.length) {
      list = list.filter((product) => product.brand && selectedBrands.includes(product.brand));
    }

    if (selectedTypes.length) {
      list = list.filter((product) => product.productType && selectedTypes.includes(product.productType));
    }

    if (priceRange !== "all") {
      list = list.filter((product) => {
        const price = Number(product.price);
        if (priceRange === "under-100") return price < 100;
        if (priceRange === "100-500") return price >= 100 && price < 500;
        if (priceRange === "500-1500") return price >= 500 && price < 1500;
        if (priceRange === "over-1500") return price >= 1500;
        return true;
      });
    }

    list.sort((a, b) => {
      if (sort === "price-asc") return Number(a.price) - Number(b.price);
      if (sort === "price-desc") return Number(b.price) - Number(a.price);
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [priceRange, products, selectedBrands, selectedTypes, sort]);

  const hasActiveFilters =
    selectedBrands.length > 0 || selectedTypes.length > 0 || priceRange !== "all";

  const heading = activeSub?.name ?? activeCategory?.name ?? "All products";
  const subheading = activeSub
    ? `${activeCategory?.name} - ${activeSub.name}`
    : activeCategory?.description ?? "The full catalog. Filter by category, brand, type or price.";

  function clearFilters() {
    setSelectedBrands([]);
    setSelectedTypes([]);
    setPriceRange("all");
  }

  function toggleBrand(brand: string) {
    setSelectedBrands((previous) =>
      previous.includes(brand) ? previous.filter((value) => value !== brand) : [...previous, brand],
    );
  }

  function toggleType(type: string) {
    setSelectedTypes((previous) =>
      previous.includes(type) ? previous.filter((value) => value !== type) : [...previous, type],
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <StoreNav />

      <section className="border-b border-border px-6 pb-8 pt-12">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-3 text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            {activeCategory ? `Catalog - ${activeCategory.name}` : "Catalog"}
          </p>
          <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] font-[500] leading-[1.15] tracking-[-0.03em] text-foreground">
            {heading}
          </h1>
          <p className="mt-3 max-w-[560px] text-[14px] text-muted-foreground">
            {subheading}
          </p>
        </div>
      </section>

      {activeCategory && categorySubs.length > 0 ? (
        <div className="sticky top-[56px] z-40 border-b border-border bg-background px-6">
          <div className="mx-auto flex max-w-[1200px] items-center gap-1 overflow-x-auto py-2">
            <FilterChip
              to={`/shop/${activeCategory.slug}`}
              active={!subcategorySlug}
              label="All"
            />
            {categorySubs.map((subcategory) => (
              <FilterChip
                key={subcategory.id}
                to={`/shop/${activeCategory.slug}/${subcategory.slug}`}
                active={subcategorySlug === subcategory.slug}
                label={subcategory.name}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-b border-border px-6">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen((open) => !open)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 border px-3 text-[13px] transition-colors",
                filtersOpen || hasActiveFilters
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground/80 hover:border-primary/40 hover:text-primary",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters ? (
                <span className="ml-1 text-[11px]">
                  ({selectedBrands.length + selectedTypes.length + (priceRange !== "all" ? 1 : 0)})
                </span>
              ) : null}
            </button>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex h-8 items-center gap-1 px-2 text-[12px] text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            ) : null}
            <span className="hidden text-[12px] text-muted-foreground sm:inline">
              {filtered.length} {filtered.length === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger className="h-8 w-[160px] rounded-none border-border text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="name-asc">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtersOpen ? (
          <div className="mx-auto max-w-[1200px] pb-4">
            <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-3">
              <div className="bg-card p-4">
                <p className="mb-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Brand
                </p>
                {brands.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">-</p>
                ) : (
                  <div className="max-h-[180px] space-y-2 overflow-y-auto pr-2">
                    {brands.map((brand) => (
                      <label key={brand} className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                          checked={selectedBrands.includes(brand)}
                          onCheckedChange={() => toggleBrand(brand)}
                          className="rounded-none"
                        />
                        <span className="text-[13px] text-foreground/80">{brand}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card p-4">
                <p className="mb-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Type
                </p>
                {types.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">-</p>
                ) : (
                  <div className="max-h-[180px] space-y-2 overflow-y-auto pr-2">
                    {types.map((type) => (
                      <label key={type} className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={() => toggleType(type)}
                          className="rounded-none"
                        />
                        <span className="text-[13px] text-foreground/80">{type}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card p-4">
                <p className="mb-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Price
                </p>
                <div className="space-y-2">
                  {[
                    { value: "all", label: "Any price" },
                    { value: "under-100", label: "Under $100" },
                    { value: "100-500", label: "$100 - $500" },
                    { value: "500-1500", label: "$500 - $1,500" },
                    { value: "over-1500", label: "Over $1,500" },
                  ].map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="price"
                        checked={priceRange === option.value}
                        onChange={() => setPriceRange(option.value as typeof priceRange)}
                        className="accent-foreground"
                      />
                      <span className="text-[13px] text-foreground/80">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <section className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-[1200px]">
          {filtered.length === 0 ? (
            <div className="border border-border p-16 text-center">
              <p className="text-[14px] text-muted-foreground">
                {hasActiveFilters ? "No products match these filters." : "Nothing here yet. Check back soon."}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-[13px] text-foreground underline hover:opacity-80"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => (
                <div key={product.id} className="bg-background">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <StoreFooter />
    </div>
  );
};

function FilterChip({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex h-8 shrink-0 items-center border px-3 text-[13px] transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-foreground/70 hover:border-primary/40 hover:text-primary",
      )}
    >
      {label}
    </Link>
  );
}

export default Shop;
