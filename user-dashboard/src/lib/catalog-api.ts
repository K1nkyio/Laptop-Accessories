import { apiRequest } from "@/lib/api";
import type { CatalogProduct } from "@/lib/catalog";

interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  brand: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  stock: number;
  category_id: string | null;
  subcategory_id: string | null;
  product_type: string | null;
  is_featured: boolean;
}

function toCatalogProduct(product: ApiProduct): CatalogProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description ?? "",
    brand: product.brand,
    price: product.price,
    currency: product.currency,
    image_url: product.image_url,
    stock: product.stock,
    categoryId: product.category_id ?? "",
    subcategoryId: product.subcategory_id,
    productType: product.product_type ?? "Product",
    isFeatured: product.is_featured,
  };
}

export async function fetchProducts(params: {
  categoryId?: string;
  subcategoryId?: string;
  featured?: boolean;
} = {}): Promise<CatalogProduct[]> {
  const search = new URLSearchParams();
  if (params.categoryId) search.set("category_id", params.categoryId);
  if (params.subcategoryId) search.set("subcategory_id", params.subcategoryId);
  if (params.featured) search.set("featured", "true");

  const query = search.toString();
  const data = await apiRequest<{ products: ApiProduct[] }>(`/api/products${query ? `?${query}` : ""}`);
  return data.products.map(toCatalogProduct);
}

export async function fetchProductBySlug(slug: string): Promise<CatalogProduct | null> {
  try {
    const data = await apiRequest<{ product: ApiProduct }>(`/api/products/${slug}`);
    return toCatalogProduct(data.product);
  } catch (_error) {
    return null;
  }
}
