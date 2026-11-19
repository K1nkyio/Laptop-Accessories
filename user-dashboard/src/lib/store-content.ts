import { apiRequest } from "@/lib/api";

export interface PublicProfile {
  id: string; is_owner: boolean; name: string; designation: string; department: string; biography: string;
  photo_url: string | null; skills: string[]; social_url: string | null; sort_order: number; is_featured: boolean;
}
export interface PublicFaq { id: string; category: string; question: string; answer: string; sort_order: number }
export interface PublicLocation {
  id: string; name: string; description: string; address: string; latitude: number | null; longitude: number | null;
  phone: string; email: string; hours: string; services: string[]; sort_order: number;
}
export interface StoreContent {
  identity: { storeName?: string; email?: string; phone?: string; address?: string; businessHours?: string; whatsappNumber?: string; description?: string; website?: string; linkedin?: string };
  story: { established?: string; history?: string; mission?: string; vision?: string; commitment?: string; future?: string; values?: { title: string; description: string }[] };
  policies: { shipping?: string; coverage?: string; timelines?: string; charges?: string; tracking?: string; pickup?: string; returns?: string; refunds?: string; warranty?: string; damaged?: string };
  profiles: PublicProfile[]; faqs: PublicFaq[]; locations: PublicLocation[];
  settings: { storeName: string; supportPhone: string; whatsappNumber: string; defaultWarranty: string; shippingNote: string };
}
export function fetchStoreContent() { return apiRequest<StoreContent>("/api/store/content"); }
