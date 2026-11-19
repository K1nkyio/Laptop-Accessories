import { apiRequest } from "@/lib/api";

export interface StoreSettings {
  storeName: string;
  supportPhone: string;
  whatsappNumber: string;
  defaultWarranty: string;
  shippingNote: string;
  showFeaturedProducts: boolean;
  showWarrantyStrip: boolean;
  showLowStockUrgency: boolean;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
}

export const fallbackSettings: StoreSettings = {
  storeName: "Stacked",
  supportPhone: "+254 700 000 000",
  whatsappNumber: "254700000000",
  defaultWarranty: "Two years on laptops, one year on accessories.",
  shippingNote: "Orders dispatch in 24 hours when stock is available.",
  showFeaturedProducts: true,
  showWarrantyStrip: true,
  showLowStockUrgency: true,
  heroEyebrow: "New arrivals - 2026 ready",
  heroTitle: "Work-ready tech without the buying noise.",
  heroDescription:
    "Shop vetted laptops, docks, keyboards, mice, and carry gear with honest stock status, fast local follow-up, and support that knows the product.",
};

export async function fetchStoreSettings() {
  const data = await apiRequest<{ settings: StoreSettings }>("/api/settings");
  return { ...fallbackSettings, ...data.settings };
}
