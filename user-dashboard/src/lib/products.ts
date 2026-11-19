// Maps product slugs to bundled product images.
// PostgreSQL-backed products can still provide image_url values through the API.
import laptop1 from "@/assets/product-laptop-1.jpg";
import laptop2 from "@/assets/product-laptop-2.jpg";
import laptop3 from "@/assets/product-laptop-3.jpg";
import laptop4 from "@/assets/product-laptop-4.jpg";
import mouse1 from "@/assets/product-mouse-1.jpg";
import mouse2 from "@/assets/product-mouse-2.jpg";
import keyboard from "@/assets/product-keyboard.jpg";
import dock1 from "@/assets/product-dock-1.jpg";
import dock2 from "@/assets/product-dock-2.jpg";
import bag from "@/assets/product-bag.jpg";
import { API_URL } from "@/lib/api";

// Generic per-category fallback pool (cycled by hash of slug)
const FALLBACK_POOL = [laptop1, laptop2, laptop3, laptop4, mouse1, mouse2, keyboard, dock1, dock2, bag];

const SLUG_IMAGE_MAP: Record<string, string> = {
  "macbook-pro-14-m4": laptop1,
  "dell-xps-15": laptop2,
  "thinkpad-x1-carbon-g12": laptop4,
  "rog-zephyrus-g16": laptop3,
  "alienware-m18-r2": laptop3,
  "mx-master-3s": mouse1,
  "apple-magic-mouse": mouse2,
  "keychron-k2-pro": keyboard,
  "peak-design-everyday-20l": bag,
  "bellroy-classic-brief": bag,
};

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getProductImage(slug: string, fallback?: string | null): string {
  if (SLUG_IMAGE_MAP[slug]) return SLUG_IMAGE_MAP[slug];
  if (fallback) {
    return fallback.startsWith("/") ? new URL(fallback, API_URL).toString() : fallback;
  }
  return FALLBACK_POOL[hashSlug(slug) % FALLBACK_POOL.length];
}

export function formatPrice(price: number, currency = "USD"): string {
  const currencyCode = currency === "KSh" ? "KES" : currency;
  return new Intl.NumberFormat(currencyCode === "KES" ? "en-KE" : "en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(price);
}
